import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  // CRON AUTHENTICATION
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized cron access" }, { status: 401 });
  }

  try {
    const farms = await db.farm.findMany({ where: { deleted_at: null } });
    let totalGenerated = 0;
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 37); // Cover 30 + 7 days window

    for (const farm of farms) {
      const farmId = farm.id;
      const newAlerts: any[] = [];

      const todayStr = now.toISOString().split('T')[0];

      // 1. Feed Low Stock
      const feeds = await db.feedType.findMany({ where: { farm_id: farmId, deleted_at: null } });
      feeds.forEach(feed => {
        if (feed.stock_quantity <= (feed.reorder_level || 0)) {
          newAlerts.push({ farm_id: farmId, title: 'Feed Low Stock', description: `${feed.name} stock (${feed.stock_quantity}) is at or below reorder level (${feed.reorder_level}).`, severity: 'WARNING', type: 'FEED', fingerprint: `FEED_LOW_${feed.id}_${todayStr}` });
        }
      });

      // 2. Vaccination Reminders
      const vaccinations = await db.vaccination.findMany({ where: { batch: { farm_id: farmId }, status: 'PENDING', deleted_at: null }, include: { batch: true } });
      vaccinations.forEach(vacc => {
        const daysUntil = (new Date(vacc.due_date).getTime() - now.getTime()) / 86400000;
        if (daysUntil < 0) {
          newAlerts.push({ farm_id: farmId, title: 'Vaccination Overdue', description: `Vaccination ${vacc.vaccine_name} for Batch ${vacc.batch?.batch_number} is overdue!`, severity: 'CRITICAL', type: 'VACCINATION', fingerprint: `VACC_OVERDUE_${vacc.id}_${todayStr}` });
        } else if (daysUntil <= 7) {
          newAlerts.push({ farm_id: farmId, title: 'Vaccination Due Soon', description: `Vaccination ${vacc.vaccine_name} for Batch ${vacc.batch?.batch_number} is due in ${Math.ceil(daysUntil)} days.`, severity: 'INFO', type: 'VACCINATION', fingerprint: `VACC_DUE_${vacc.id}_${todayStr}` });
        }
      });

      // P0: Bound queries with date windows
      const [mortalities, waterUsages, elecUsages, activeBatches, sales, expenses, rawQtys] = await Promise.all([
        db.mortality.findMany({ where: { batch: { farm_id: farmId }, deleted_at: null, date: { gte: thirtyDaysAgo } } }),
        db.waterUsage.findMany({ where: { farm_id: farmId, deleted_at: null, date: { gte: thirtyDaysAgo } } }),
        db.electricityUsage.findMany({ where: { farm_id: farmId, deleted_at: null, date: { gte: thirtyDaysAgo } } }),
        db.animalBatch.findMany({ where: { farm_id: farmId, deleted_at: null, status: 'ACTIVE' }, include: { current_stage: true, feedConsumptions: { where: { deleted_at: null } }, salesInvoiceItems: { where: { deleted_at: null, invoice: { deleted_at: null } }, include: { invoice: true } } } }),
        db.salesInvoice.findMany({ where: { farm_id: farmId, deleted_at: null, invoice_date: { gte: thirtyDaysAgo } } }),
        db.expense.findMany({ where: { farm_id: farmId, deleted_at: null, expense_date: { gte: thirtyDaysAgo } } }),
        db.$queryRaw<{id: string, initial_quantity: number}[]>`SELECT id, initial_quantity FROM animal_batches WHERE farm_id = ${farmId}::uuid`
      ]);

      const qtyMap = new Map(rawQtys.map(q => [q.id, q.initial_quantity]));
      const rooms = await db.room.findMany({ where: { farm_id: farmId, deleted_at: null } });

      // 3. Mortality Spike (P1: Percentage-based)
      const mortByBatch: Record<string, any[]> = {};
      mortalities.forEach(m => { if (!mortByBatch[m.batch_id]) mortByBatch[m.batch_id] = []; mortByBatch[m.batch_id].push(m); });

      activeBatches.forEach(b => {
        const initialQty = qtyMap.get(b.id) ?? b.initial_quantity ?? 1;
        if (initialQty <= 0) return;

        const records = mortByBatch[b.id] || [];
        let last7 = 0; let prev30 = 0;
        records.forEach(r => {
          const daysAgo = (now.getTime() - new Date(r.date).getTime()) / 86400000;
          if (daysAgo <= 7) last7 += r.quantity;
          else if (daysAgo <= 37) prev30 += r.quantity;
        });

        const last7Rate = last7 / initialQty;
        const prev30AvgRate = (prev30 / initialQty) / (30/7);

        if (prev30AvgRate > 0 && last7Rate > prev30AvgRate * 2 && last7Rate >= 0.01) { // At least 1% mortality
          newAlerts.push({ farm_id: farmId, title: 'Mortality Spike Detected', description: `Batch ${b.batch_number} has ${Math.round(last7Rate * 100)}% mortality in 7 days, exceeding baseline (${Math.round(prev30AvgRate * 100)}%).`, severity: 'CRITICAL', type: 'MORTALITY', fingerprint: `MORT_SPIKE_${b.id}_${now.toISOString().split('T')[0]}` });
        }
      });

      // 4. Room Capacity
      const roomOccupancy: Record<string, number> = {};
      activeBatches.forEach(b => { roomOccupancy[b.room_id] = (roomOccupancy[b.room_id] || 0) + b.quantity; });
      rooms.forEach(r => {
        const occ = roomOccupancy[r.id] || 0;
        if (occ >= r.capacity) newAlerts.push({ farm_id: farmId, title: 'Room Over Capacity', description: `Room ${r.name} is at or over capacity (${occ}/${r.capacity}).`, severity: 'CRITICAL', type: 'ROOM', fingerprint: `ROOM_FULL_${r.id}_${todayStr}` });
        else if (occ >= r.capacity * 0.9) newAlerts.push({ farm_id: farmId, title: 'Room Near Capacity', description: `Room ${r.name} is at ${Math.round((occ/r.capacity)*100)}% capacity.`, severity: 'WARNING', type: 'ROOM', fingerprint: `ROOM_NEAR_FULL_${r.id}_${todayStr}` });
      });

      // 5. Water Spike
      const waterByRoom: Record<string, any[]> = {};
      waterUsages.forEach(w => { if (!waterByRoom[w.room_id]) waterByRoom[w.room_id] = []; waterByRoom[w.room_id].push(w); });
      Object.entries(waterByRoom).forEach(([roomId, records]) => {
        let last7 = 0; let prev30 = 0;
        records.forEach(r => {
          const daysAgo = (now.getTime() - new Date(r.date).getTime()) / 86400000;
          if (daysAgo <= 7) last7 += r.total_consumption;
          else if (daysAgo <= 37) prev30 += r.total_consumption;
        });
        const prev30Avg = prev30 / (30/7);
        if (prev30Avg > 0 && last7 > prev30Avg * 1.5) newAlerts.push({ farm_id: farmId, title: 'Water Usage Spike Detected', description: `Room ${roomId} used ${last7}L in 7 days, exceeding baseline (${Math.round(prev30Avg)}L).`, severity: 'WARNING', type: 'WATER', fingerprint: `WATER_SPIKE_${roomId}_${now.toISOString().split('T')[0]}` });
      });

      // 6. Electricity Spike
      const elecByMeter: Record<string, any[]> = {};
      elecUsages.forEach(e => { if (!elecByMeter[e.meter_id]) elecByMeter[e.meter_id] = []; elecByMeter[e.meter_id].push(e); });
      Object.entries(elecByMeter).forEach(([meterId, records]) => {
        let last7 = 0; let prev30 = 0;
        records.forEach(r => {
          const daysAgo = (now.getTime() - new Date(r.date).getTime()) / 86400000;
          if (daysAgo <= 7) last7 += r.total_consumption;
          else if (daysAgo <= 37) prev30 += r.total_consumption;
        });
        const prev30Avg = prev30 / (30/7);
        if (prev30Avg > 0 && last7 > prev30Avg * 1.5) newAlerts.push({ farm_id: farmId, title: 'Electricity Usage Spike Detected', description: `Meter ${meterId} used ${last7}kWh in 7 days, exceeding baseline (${Math.round(prev30Avg)}kWh).`, severity: 'WARNING', type: 'ELECTRICITY', fingerprint: `ELEC_SPIKE_${meterId}_${now.toISOString().split('T')[0]}` });
      });

      // 7. Stage Transition
      activeBatches.forEach(b => {
        if (b.current_stage?.expected_duration_days && b.current_stage.expected_duration_days > 0 && b.current_stage.display_order === 1) {
          const daysInStage = (now.getTime() - new Date(b.arrival_date).getTime()) / 86400000;
          if (daysInStage > b.current_stage.expected_duration_days + 3) newAlerts.push({ farm_id: farmId, title: 'Stage Transition Overdue', description: `Batch ${b.batch_number} has been in ${b.current_stage.stage_name} for ${Math.round(daysInStage)} days (Expected: ${b.current_stage.expected_duration_days}).`, severity: 'INFO', type: 'STAGE', fingerprint: `STAGE_LATE_${b.id}_${b.current_stage_id}_${todayStr}` });
        }
      });

      // P1: Profit Drop / Break Even (Corrected Math)
      let totalFarmCost = 0;
      let totalFarmRev = 0;

      activeBatches.forEach(b => {
        const feedCost = b.feedConsumptions.reduce((sum, f) => sum + f.cost, 0);
        const wCost = waterUsages.filter(w => w.room_id === b.room_id).reduce((sum, w) => sum + w.total_cost, 0);
        const eCost = elecUsages.filter(e => e.room_id === b.room_id).reduce((sum, e) => sum + e.total_cost, 0);
        const initialQty = qtyMap.get(b.id) ?? b.initial_quantity ?? 0;
        const purchaseCost = initialQty * b.cost_per_animal;
        const totalCost = feedCost + wCost + eCost + purchaseCost;
        const revenue = b.salesInvoiceItems.reduce((sum, item) => sum + item.amount, 0);

        totalFarmCost += totalCost;
        totalFarmRev += revenue;
      });

      const currentMonthRev = sales.filter(s => new Date(s.invoice_date).getMonth() === now.getMonth()).reduce((sum, s) => sum + s.total, 0);
      const currentMonthExp = expenses.filter(e => new Date(e.expense_date).getMonth() === now.getMonth()).reduce((sum, e) => sum + e.amount, 0);
      const currentProfit = currentMonthRev - currentMonthExp;
      
      const prevMonth = new Date(now); prevMonth.setMonth(now.getMonth() - 1);
      const prevMonthRev = sales.filter(s => new Date(s.invoice_date).getMonth() === prevMonth.getMonth()).reduce((sum, s) => sum + s.total, 0);
      const prevMonthExp = expenses.filter(e => new Date(e.expense_date).getMonth() === prevMonth.getMonth()).reduce((sum, e) => sum + e.amount, 0);
      const prevProfit = prevMonthRev - prevMonthExp;

      if (prevProfit > 0 && currentProfit < prevProfit * 0.7 && currentProfit > 0) {
        newAlerts.push({ farm_id: farmId, title: 'Profit Drop Warning', description: `Current month general profit (₹${currentProfit}) is significantly lower than last month (₹${prevProfit}).`, severity: 'WARNING', type: 'PROFIT', fingerprint: `PROFIT_DROP_${now.getFullYear()}_${now.getMonth()}` });
      }

      if (totalFarmRev > 0 && totalFarmRev <= totalFarmCost) {
        newAlerts.push({ farm_id: farmId, title: 'Break-even Alert', description: `Total active batch overhead (₹${totalFarmCost}) exceeds revenue (₹${totalFarmRev}).`, severity: 'CRITICAL', type: 'BREAK_EVEN', fingerprint: `BREAK_EVEN_${now.toISOString().split('T')[0]}` });
      }

      // P0: Insert with skipDuplicates (relies on @@unique constraint)
      if (newAlerts.length > 0) {
        const res = await (db as any).notification.createMany({
          data: newAlerts,
          skipDuplicates: true
        });
        totalGenerated += res.count;
      }
    }

    return NextResponse.json({ success: true, generated: totalGenerated });
  } catch (error) {
    console.error("Alert Generation Error:", error);
    return NextResponse.json({ error: "Failed to generate alerts" }, { status: 500 });
  }
}
