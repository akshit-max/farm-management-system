import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const newAlerts: any[] = [];
    const now = new Date();

    // 1. Feed Low Stock
    const feeds = await db.feedType.findMany({ where: { farm_id: farmId, deleted_at: null } });
    feeds.forEach(feed => {
      if (feed.stock_quantity <= (feed.reorder_level || 0)) {
        newAlerts.push({
          farm_id: farmId,
          title: 'Feed Low Stock',
          description: `${feed.name} stock (${feed.stock_quantity}) is at or below reorder level (${feed.reorder_level}).`,
          severity: 'WARNING',
          type: 'FEED',
          fingerprint: `FEED_LOW_${feed.id}`
        });
      }
    });

    // 2. Vaccination Reminders
    const vaccinations = await db.vaccination.findMany({
      where: { batch: { farm_id: farmId }, status: 'PENDING', deleted_at: null },
      include: { batch: true }
    });
    vaccinations.forEach(vacc => {
      const daysUntil = (new Date(vacc.due_date).getTime() - now.getTime()) / (1000 * 3600 * 24);
      if (daysUntil < 0) {
        newAlerts.push({
          farm_id: farmId,
          title: 'Vaccination Overdue',
          description: `Vaccination ${vacc.vaccine_name} for Batch ${vacc.batch?.batch_number} is overdue!`,
          severity: 'CRITICAL',
          type: 'VACCINATION',
          fingerprint: `VACC_OVERDUE_${vacc.id}`
        });
      } else if (daysUntil <= 7) {
        newAlerts.push({
          farm_id: farmId,
          title: 'Vaccination Due Soon',
          description: `Vaccination ${vacc.vaccine_name} for Batch ${vacc.batch?.batch_number} is due in ${Math.ceil(daysUntil)} days.`,
          severity: 'INFO',
          type: 'VACCINATION',
          fingerprint: `VACC_DUE_${vacc.id}`
        });
      }
    });

    // 3. Mortality Spike
    const mortalities = await db.mortality.findMany({
      where: { batch: { farm_id: farmId }, deleted_at: null },
      orderBy: { date: 'desc' }
    });
    
    // Group by batch
    const mortByBatch: Record<string, any[]> = {};
    mortalities.forEach(m => {
      if (!mortByBatch[m.batch_id]) mortByBatch[m.batch_id] = [];
      mortByBatch[m.batch_id].push(m);
    });

    Object.entries(mortByBatch).forEach(([batchId, records]) => {
      let last7 = 0;
      let prev30 = 0;
      records.forEach(r => {
        const daysAgo = (now.getTime() - new Date(r.date).getTime()) / (1000 * 3600 * 24);
        if (daysAgo <= 7) last7 += r.quantity;
        else if (daysAgo <= 37) prev30 += r.quantity;
      });
      const prev30Avg = prev30 / (30/7); // 7-day average of the previous 30 days
      if (prev30Avg > 0 && last7 > prev30Avg * 2) {
        newAlerts.push({
          farm_id: farmId,
          title: 'Mortality Spike Detected',
          description: `Batch ${batchId} has ${last7} deaths in 7 days, exceeding baseline (${Math.round(prev30Avg)}).`,
          severity: 'CRITICAL',
          type: 'MORTALITY',
          fingerprint: `MORT_SPIKE_${batchId}_${now.toISOString().split('T')[0]}`
        });
      }
    });

    // 4. Room Capacity
    const [rooms, batches] = await Promise.all([
      db.room.findMany({ where: { farm_id: farmId, deleted_at: null } }),
      db.animalBatch.findMany({ where: { farm_id: farmId, deleted_at: null, status: 'ACTIVE' } })
    ]);
    
    const roomOccupancy: Record<string, number> = {};
    batches.forEach(b => {
      roomOccupancy[b.room_id] = (roomOccupancy[b.room_id] || 0) + b.quantity;
    });

    rooms.forEach(r => {
      const occ = roomOccupancy[r.id] || 0;
      if (occ >= r.capacity) {
        newAlerts.push({
          farm_id: farmId, title: 'Room Over Capacity',
          description: `Room ${r.name} is at or over capacity (${occ}/${r.capacity}).`,
          severity: 'CRITICAL', type: 'ROOM', fingerprint: `ROOM_FULL_${r.id}`
        });
      } else if (occ >= r.capacity * 0.9) {
        newAlerts.push({
          farm_id: farmId, title: 'Room Near Capacity',
          description: `Room ${r.name} is at ${Math.round((occ/r.capacity)*100)}% capacity.`,
          severity: 'WARNING', type: 'ROOM', fingerprint: `ROOM_NEAR_FULL_${r.id}`
        });
      }
    });

    // 5. Water Spike
    const waterUsages = await db.waterUsage.findMany({ where: { farm_id: farmId, deleted_at: null } });
    const waterByRoom: Record<string, any[]> = {};
    waterUsages.forEach(w => {
      if (!waterByRoom[w.room_id]) waterByRoom[w.room_id] = [];
      waterByRoom[w.room_id].push(w);
    });

    Object.entries(waterByRoom).forEach(([roomId, records]) => {
      let last7 = 0; let prev30 = 0;
      records.forEach(r => {
        const daysAgo = (now.getTime() - new Date(r.date).getTime()) / (1000 * 3600 * 24);
        if (daysAgo <= 7) last7 += r.total_consumption;
        else if (daysAgo <= 37) prev30 += r.total_consumption;
      });
      const prev30Avg = prev30 / (30/7);
      if (prev30Avg > 0 && last7 > prev30Avg * 1.5) {
        newAlerts.push({
          farm_id: farmId, title: 'Water Usage Spike Detected',
          description: `Room ${roomId} used ${last7}L in 7 days, exceeding baseline (${Math.round(prev30Avg)}L).`,
          severity: 'WARNING', type: 'WATER', fingerprint: `WATER_SPIKE_${roomId}_${now.toISOString().split('T')[0]}`
        });
      }
    });

    // 6. Electricity Spike
    const elecUsages = await db.electricityUsage.findMany({ where: { farm_id: farmId, deleted_at: null } });
    const elecByMeter: Record<string, any[]> = {};
    elecUsages.forEach(e => {
      if (!elecByMeter[e.meter_id]) elecByMeter[e.meter_id] = [];
      elecByMeter[e.meter_id].push(e);
    });

    Object.entries(elecByMeter).forEach(([meterId, records]) => {
      let last7 = 0; let prev30 = 0;
      records.forEach(r => {
        const daysAgo = (now.getTime() - new Date(r.date).getTime()) / (1000 * 3600 * 24);
        if (daysAgo <= 7) last7 += r.total_consumption;
        else if (daysAgo <= 37) prev30 += r.total_consumption;
      });
      const prev30Avg = prev30 / (30/7);
      if (prev30Avg > 0 && last7 > prev30Avg * 1.5) {
        newAlerts.push({
          farm_id: farmId, title: 'Electricity Usage Spike Detected',
          description: `Meter ${meterId} used ${last7}kWh in 7 days, exceeding baseline (${Math.round(prev30Avg)}kWh).`,
          severity: 'WARNING', type: 'ELECTRICITY', fingerprint: `ELEC_SPIKE_${meterId}_${now.toISOString().split('T')[0]}`
        });
      }
    });

    // 7. Stage Transition
    const activeBatches = await db.animalBatch.findMany({
      where: { farm_id: farmId, deleted_at: null, status: 'ACTIVE' },
      include: { current_stage: true }
    });
    activeBatches.forEach(b => {
      if (b.current_stage?.expected_duration_days && b.current_stage.expected_duration_days > 0) {
        // We lack a 'stage_started_at' field, so we approximate using arrival_date for simplicity if it's the first stage,
        // or just skip safely as instructed if unavailable.
        // Actually, we can check if arrival_date + expected_duration_days < now (assuming single stage for now)
        // Wait, "If unavailable: Skip safely". Since we don't track stage entry date reliably, skip safely.
        // However, we can use arrival_date if they are in display_order 1
        if (b.current_stage.display_order === 1) {
          const daysInStage = (now.getTime() - new Date(b.arrival_date).getTime()) / (1000 * 3600 * 24);
          if (daysInStage > b.current_stage.expected_duration_days + 3) {
            newAlerts.push({
              farm_id: farmId, title: 'Stage Transition Overdue',
              description: `Batch ${b.batch_number} has been in ${b.current_stage.stage_name} for ${Math.round(daysInStage)} days (Expected: ${b.current_stage.expected_duration_days}).`,
              severity: 'INFO', type: 'STAGE', fingerprint: `STAGE_LATE_${b.id}_${b.current_stage_id}`
            });
          }
        }
      }
    });

    // 8 & 9. Profit Drop / Break Even
    const [sales, expenses] = await Promise.all([
      db.salesInvoice.findMany({ where: { farm_id: farmId, deleted_at: null } }),
      db.expense.findMany({ where: { farm_id: farmId, deleted_at: null } })
    ]);
    
    // Split into current month vs previous month for Profit Drop
    const currentMonthRev = sales.filter(s => new Date(s.invoice_date).getMonth() === now.getMonth()).reduce((sum, s) => sum + s.total, 0);
    const currentMonthExp = expenses.filter(e => new Date(e.expense_date).getMonth() === now.getMonth()).reduce((sum, e) => sum + e.amount, 0);
    const currentProfit = currentMonthRev - currentMonthExp;

    const prevMonth = new Date(now); prevMonth.setMonth(now.getMonth() - 1);
    const prevMonthRev = sales.filter(s => new Date(s.invoice_date).getMonth() === prevMonth.getMonth()).reduce((sum, s) => sum + s.total, 0);
    const prevMonthExp = expenses.filter(e => new Date(e.expense_date).getMonth() === prevMonth.getMonth()).reduce((sum, e) => sum + e.amount, 0);
    const prevProfit = prevMonthRev - prevMonthExp;

    if (prevProfit > 0 && currentProfit < prevProfit * 0.7 && currentProfit > 0) {
      newAlerts.push({
        farm_id: farmId, title: 'Profit Drop Warning',
        description: `Current month profit (₹${currentProfit}) is significantly lower than last month (₹${prevProfit}).`,
        severity: 'WARNING', type: 'PROFIT', fingerprint: `PROFIT_DROP_${now.getFullYear()}_${now.getMonth()}`
      });
    }
    
    const totalRev = sales.reduce((sum, s) => sum + s.total, 0);
    const totalExp = expenses.reduce((sum, e) => sum + e.amount, 0);
    
    if (totalRev > 0 && totalRev <= totalExp) {
      newAlerts.push({
        farm_id: farmId, title: 'Break-even Alert',
        description: `Total expenses (₹${totalExp}) exceed or equal total revenue (₹${totalRev}).`,
        severity: 'CRITICAL', type: 'BREAK_EVEN', fingerprint: `BREAK_EVEN_${now.toISOString().split('T')[0]}`
      });
    }

    // Insert new alerts safely
    const existingUnread = await (db as any).notification.findMany({
      where: { farm_id: farmId, is_read: false, deleted_at: null },
      select: { fingerprint: true }
    });
    
    const existingFingerprints = new Set(existingUnread.map((a: any) => a.fingerprint));
    
    const toInsert = newAlerts.filter(a => !existingFingerprints.has(a.fingerprint));
    
    if (toInsert.length > 0) {
      await (db as any).notification.createMany({ data: toInsert });
    }

    return NextResponse.json({ success: true, generated: toInsert.length });
  } catch (error) {
    console.error("Alert Generation Error:", error);
    return NextResponse.json({ error: "Failed to generate alerts" }, { status: 500 });
  }
}
