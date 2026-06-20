import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { isManager, isAccountant } from "@/lib/rbac";
import { resolveDateRange } from "@/lib/dateUtils";

export async function GET(req: NextRequest) {
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isManager(session) && !isAccountant(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "month";
  const { dateFilter } = resolveDateRange(period, searchParams.get("startDate"), searchParams.get("endDate"));

  
  try {
    // 1. ANIMAL METRICS & ROOMS & STAGES
    const activeBatchesP = db.animalBatch.findMany({
      where: { farm_id: farmId, deleted_at: null, status: "ACTIVE" },
      include: { animal_category: true, room: true, current_stage: true }
    });

    const allBatchesP = db.animalBatch.findMany({
      where: { farm_id: farmId, deleted_at: null }
    });

    const mortalitiesP = db.mortality.findMany({
      where: { batch: { farm_id: farmId }, deleted_at: null, ...(dateFilter ? { date: dateFilter } : {}) },
      include: { batch: { include: { animal_category: true } } }
    });

    // 2. FEED METRICS
    const feedConsumptionsP = db.feedConsumption.findMany({
      where: { farm_id: farmId, deleted_at: null, ...(dateFilter ? { date: dateFilter } : {}) },
      include: { batch: true }
    });

    // 3. UTILITY METRICS
    const waterUsagesP = db.waterUsage.aggregate({
      _sum: { actual_consumption_liters: true, total_cost: true },
      where: { farm_id: farmId, deleted_at: null, ...(dateFilter ? { date: dateFilter } : {}) }
    });
    
    const elecUsagesP = db.electricityUsage.aggregate({
      _sum: { units_consumed: true, total_cost: true },
      where: { farm_id: farmId, deleted_at: null, ...(dateFilter ? { date: dateFilter } : {}) }
    });

    // Need raw usages for trends
    const waterTrendP = db.waterUsage.findMany({
      where: { farm_id: farmId, deleted_at: null, ...(dateFilter ? { date: dateFilter } : {}) },
      orderBy: { date: 'asc' }
    });
    const elecTrendP = db.electricityUsage.findMany({
      where: { farm_id: farmId, deleted_at: null, ...(dateFilter ? { date: dateFilter } : {}) },
      orderBy: { date: 'asc' }
    });

    // 4. FINANCIAL METRICS
    const salesInvoicesP = db.salesInvoice.findMany({
      where: { farm_id: farmId, deleted_at: null, ...(dateFilter ? { invoice_date: dateFilter } : {}) },
      include: { customer: true }
    });
    
    // For Receivables, we need all-time revenue and payments, but the prompt says "Analytics" should respect date filters...
    // Actually, outstanding/receivables is usually an absolute metric, but if filtered by date, it might just show new receivables?
    // Let's stick to global receivables for KPI, and date-filtered for trends.
    const allSalesP = db.salesInvoice.aggregate({
      _sum: { total: true },
      where: { farm_id: farmId, deleted_at: null }
    });
    const allPaymentsP = db.customerPayment.aggregate({
      _sum: { amount: true },
      where: { farm_id: farmId, deleted_at: null }
    });

    const expensesP = db.expense.findMany({
      where: { farm_id: farmId, deleted_at: null, ...(dateFilter ? { expense_date: dateFilter } : {}) },
      orderBy: { expense_date: 'asc' }
    });

    // 5. INVENTORY METRICS
    const inventoryItemsP = db.inventoryItem.findMany({
      where: { farm_id: farmId, deleted_at: null }
    });
    
    // Payments for outstanding balance
    const paymentsDetailP = db.customerPayment.findMany({
      where: { farm_id: farmId, deleted_at: null },
      include: { customer: true }
    });

    // 6. SLAUGHTER METRICS
    const slaughterRecordsP = db.slaughterRecord.findMany({
      where: { farm_id: farmId, deleted_at: null, ...(dateFilter ? { slaughter_date: dateFilter } : {}) },
      include: { slaughterYield: true, wasteRecord: true, batch: true }
    });

    // 7. SUPPLIER METRICS
    const feedTypesP = db.feedType.findMany({
      where: { farm_id: farmId, deleted_at: null },
      include: { supplier: true }
    });
    // Wait, purchases from suppliers are tracked via Inventory and FeedType cost, but we don't have explicit purchase orders.
    // We'll estimate supplier distribution based on what we have.

    const [
      activeBatches, allBatches, mortalities, feedConsumptions, waterUsages, elecUsages,
      waterTrend, elecTrend, salesInvoices, allSales, allPayments, expenses,
      inventoryItems, paymentsDetail, slaughterRecords, feedTypes
    ] = await Promise.all([
      activeBatchesP, allBatchesP, mortalitiesP, feedConsumptionsP, waterUsagesP, elecUsagesP,
      waterTrendP, elecTrendP, salesInvoicesP, allSalesP, allPaymentsP, expensesP,
      inventoryItemsP, paymentsDetailP, slaughterRecordsP, feedTypesP
    ]);

    // --- AGGREGATIONS --- //

    // Animal Metrics
    const liveAnimals = activeBatches.reduce((sum, b) => sum + b.quantity, 0);
    const mortalityCount = mortalities.reduce((sum, m) => sum + m.quantity, 0);
    const mortalityRate = liveAnimals + mortalityCount > 0 
      ? (mortalityCount / (liveAnimals + mortalityCount)) * 100 
      : 0;

    // Feed Metrics
    const feedConsumed = feedConsumptions.reduce((sum, f) => sum + f.quantity_kg, 0);
    const feedCost = feedConsumptions.reduce((sum, f) => sum + f.cost, 0);
    const feedCostPerAnimal = liveAnimals > 0 ? feedCost / liveAnimals : 0;
    const feedEfficiency = liveAnimals > 0 ? feedConsumed / liveAnimals : 0;

    // Utility Metrics
    const waterConsumed = waterUsages._sum.actual_consumption_liters || 0;
    const waterCost = waterUsages._sum.total_cost || 0;
    const elecConsumed = elecUsages._sum.units_consumed || 0;
    const elecCost = elecUsages._sum.total_cost || 0;

    const waterPerAnimal = liveAnimals > 0 ? waterConsumed / liveAnimals : 0;
    const elecPerAnimal = liveAnimals > 0 ? elecConsumed / liveAnimals : 0;

    // Financial Metrics
    const revenue = salesInvoices.reduce((sum, s) => sum + s.total, 0);
    const manualExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalExpenses = manualExpenses + feedCost + waterCost + elecCost;
    const netProfit = revenue - totalExpenses;
    
    const totalReceivables = Math.max(0, (allSales._sum.total || 0) - (allPayments._sum.amount || 0));

    // Inventory Metrics
    const inventoryQuantity = inventoryItems.reduce((sum, i) => sum + i.quantity, 0);
    const inventoryValue = inventoryItems.reduce((sum, i) => sum + (i.quantity * i.cost_basis), 0);

    // Chart: Revenue & Expense Trend
    // Group by date (YYYY-MM-DD)
    const financialTrendMap: Record<string, { date: string, revenue: number, expense: number, profit: number }> = {};
    
    salesInvoices.forEach(s => {
      const d = new Date(s.invoice_date).toISOString().split('T')[0];
      if (!financialTrendMap[d]) financialTrendMap[d] = { date: d, revenue: 0, expense: 0, profit: 0 };
      financialTrendMap[d].revenue += s.total;
      financialTrendMap[d].profit += s.total;
    });

    expenses.forEach(e => {
      const d = new Date(e.expense_date).toISOString().split('T')[0];
      if (!financialTrendMap[d]) financialTrendMap[d] = { date: d, revenue: 0, expense: 0, profit: 0 };
      financialTrendMap[d].expense += e.amount;
      financialTrendMap[d].profit -= e.amount;
    });

    feedConsumptions.forEach(f => {
      const d = new Date(f.date).toISOString().split('T')[0];
      if (!financialTrendMap[d]) financialTrendMap[d] = { date: d, revenue: 0, expense: 0, profit: 0 };
      financialTrendMap[d].expense += f.cost;
      financialTrendMap[d].profit -= f.cost;
    });

    waterTrend.forEach(w => {
      const d = new Date(w.date).toISOString().split('T')[0];
      if (!financialTrendMap[d]) financialTrendMap[d] = { date: d, revenue: 0, expense: 0, profit: 0 };
      financialTrendMap[d].expense += w.total_cost;
      financialTrendMap[d].profit -= w.total_cost;
    });

    elecTrend.forEach(e => {
      const d = new Date(e.date).toISOString().split('T')[0];
      if (!financialTrendMap[d]) financialTrendMap[d] = { date: d, revenue: 0, expense: 0, profit: 0 };
      financialTrendMap[d].expense += e.total_cost;
      financialTrendMap[d].profit -= e.total_cost;
    });

    const financialTrend = Object.values(financialTrendMap).sort((a, b) => a.date.localeCompare(b.date));

    // Chart: Mortality Trend & By Category
    const mortalityTrendMap: Record<string, number> = {};
    const mortalityByCategoryMap: Record<string, number> = {};
    
    mortalities.forEach(m => {
      const d = new Date(m.date).toISOString().split('T')[0];
      mortalityTrendMap[d] = (mortalityTrendMap[d] || 0) + m.quantity;
      
      const cat = m.batch?.animal_category?.name || "Unknown";
      mortalityByCategoryMap[cat] = (mortalityByCategoryMap[cat] || 0) + m.quantity;
    });

    const mortalityTrend = Object.entries(mortalityTrendMap).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date));
    const mortalityByCategory = Object.entries(mortalityByCategoryMap).map(([category, count]) => ({ category, count }));

    // Chart: Feed Trend & Feed By Batch
    const feedTrendMap: Record<string, { date: string, quantity: number, cost: number }> = {};
    const feedByBatchMap: Record<string, number> = {};

    feedConsumptions.forEach(f => {
      const d = new Date(f.date).toISOString().split('T')[0];
      if (!feedTrendMap[d]) feedTrendMap[d] = { date: d, quantity: 0, cost: 0 };
      feedTrendMap[d].quantity += f.quantity_kg;
      feedTrendMap[d].cost += f.cost;

      const batchNo = f.batch?.batch_number || "Unknown";
      feedByBatchMap[batchNo] = (feedByBatchMap[batchNo] || 0) + f.quantity_kg;
    });

    const feedTrend = Object.values(feedTrendMap).sort((a, b) => a.date.localeCompare(b.date));
    const feedByBatch = Object.entries(feedByBatchMap).map(([batch, quantity]) => ({ batch, quantity }));

    // Utility Trends
    const waterTrendChart = waterTrend.map(w => ({ date: new Date(w.date).toISOString().split('T')[0], consumption: w.actual_consumption_liters, cost: w.total_cost }));
    const elecTrendChart = elecTrend.map(e => ({ date: new Date(e.date).toISOString().split('T')[0], consumption: e.units_consumed, cost: e.total_cost }));

    // Inventory Distribution
    const inventoryDistMap: Record<string, number> = {};
    inventoryItems.forEach(i => {
      const cat = i.category || "Uncategorized";
      inventoryDistMap[cat] = (inventoryDistMap[cat] || 0) + i.quantity;
    });
    const inventoryDistribution = Object.entries(inventoryDistMap).map(([name, value]) => ({ name, value }));

    // Slaughter Analytics
    const slaughterTrendMap: Record<string, number> = {};
    const batchYieldMap: Record<string, { count: number, totalYield: number }> = {};
    let totalMeatProduced = 0;
    let totalWaste = 0;

    slaughterRecords.forEach(s => {
      const d = new Date(s.slaughter_date).toISOString().split('T')[0];
      slaughterTrendMap[d] = (slaughterTrendMap[d] || 0) + s.quantity_slaughtered;

      if (s.slaughterYield) {
        totalMeatProduced += s.slaughterYield.usable_meat_weight || 0;
        
        const batchNo = s.batch?.batch_number || "Unknown";
        if (!batchYieldMap[batchNo]) batchYieldMap[batchNo] = { count: 0, totalYield: 0 };
        batchYieldMap[batchNo].count++;
        batchYieldMap[batchNo].totalYield += s.slaughterYield.yield_percentage || 0;
      }
      
      if (s.wasteRecord) {
        totalWaste += s.wasteRecord.total_waste || 0;
      }
    });

    const slaughterTrend = Object.entries(slaughterTrendMap).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date));
    const batchYieldComparison = Object.entries(batchYieldMap).map(([batch, data]) => ({
      batch,
      avgYield: data.count > 0 ? data.totalYield / data.count : 0
    }));

    const avgYield = slaughterRecords.filter(s => s.slaughterYield).length > 0 
      ? batchYieldComparison.reduce((s, b) => s + b.avgYield, 0) / batchYieldComparison.length 
      : 0;

    // Room Analytics
    const roomMap: Record<string, { capacity: number, occupancy: number }> = {};
    activeBatches.forEach(b => {
      if (b.room) {
        const rName = b.room.name;
        if (!roomMap[rName]) roomMap[rName] = { capacity: b.room.capacity || 0, occupancy: 0 };
        roomMap[rName].occupancy += b.quantity;
      }
    });
    const roomOccupancy = Object.entries(roomMap).map(([room, data]) => ({
      room,
      capacity: data.capacity,
      occupancy: data.occupancy,
      utilization: data.capacity > 0 ? (data.occupancy / data.capacity) * 100 : 0
    }));

    // Stage Analytics
    const stageMap: Record<string, number> = {};
    activeBatches.forEach(b => {
      if (b.current_stage) {
        stageMap[b.current_stage.stage_name] = (stageMap[b.current_stage.stage_name] || 0) + b.quantity;
      }
    });
    const stageDistribution = Object.entries(stageMap).map(([name, value]) => ({ name, value }));

    // Customer Analytics
    const customerRevMap: Record<string, number> = {};
    const customerOutstandingMap: Record<string, { revenue: number, paid: number }> = {};
    
    salesInvoices.forEach(s => {
      const cName = s.customer?.company_name || "Unknown";
      customerRevMap[cName] = (customerRevMap[cName] || 0) + s.total;
      
      if (!customerOutstandingMap[cName]) customerOutstandingMap[cName] = { revenue: 0, paid: 0 };
      customerOutstandingMap[cName].revenue += s.total;
    });
    
    paymentsDetail.forEach(p => {
      const cName = p.customer?.company_name || "Unknown";
      if (!customerOutstandingMap[cName]) customerOutstandingMap[cName] = { revenue: 0, paid: 0 };
      customerOutstandingMap[cName].paid += p.amount;
    });

    const topCustomers = Object.entries(customerRevMap).map(([customer, revenue]) => ({ customer, revenue })).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    const customerDistribution = Object.entries(customerRevMap).map(([name, value]) => ({ name, value }));
    const outstandingBalances = Object.entries(customerOutstandingMap)
      .map(([customer, data]) => ({ customer, outstanding: Math.max(0, data.revenue - data.paid) }))
      .filter(c => c.outstanding > 0)
      .sort((a, b) => b.outstanding - a.outstanding)
      .slice(0, 5);

    // Supplier Analytics
    const supplierDistMap: Record<string, number> = {};
    feedTypes.forEach(f => {
      const sName = f.supplier?.company_name || "Unknown";
      supplierDistMap[sName] = (supplierDistMap[sName] || 0) + 1; // Basic count since we don't have direct purchase orders
    });
    const supplierDistribution = Object.entries(supplierDistMap).map(([name, value]) => ({ name, value }));
    const topSuppliers = Object.entries(supplierDistMap).map(([supplier, count]) => ({ supplier, count })).sort((a, b) => b.count - a.count).slice(0, 5);

    // Growth Analytics
    // 1. Revenue Growth Trend (Cumulative)
    const revGrowthMap: Record<string, number> = {};
    salesInvoices.forEach(s => {
      const d = new Date(s.invoice_date).toISOString().split('T')[0];
      revGrowthMap[d] = (revGrowthMap[d] || 0) + s.total;
    });
    let cumulativeRev = 0;
    const revenueGrowthTrend = Object.entries(revGrowthMap).sort((a, b) => a[0].localeCompare(b[0])).map(([date, amount]) => {
      cumulativeRev += amount;
      return { date, revenue: cumulativeRev };
    });

    // 2. Animal Growth Trend (Arrivals - Mortalities - Slaughters)
    const animalGrowthEvents: { date: string, diff: number }[] = [];
    allBatches.forEach(b => {
      animalGrowthEvents.push({ date: new Date(b.arrival_date).toISOString().split('T')[0], diff: b.initial_quantity });
    });
    mortalities.forEach(m => {
      animalGrowthEvents.push({ date: new Date(m.date).toISOString().split('T')[0], diff: -m.quantity });
    });
    slaughterRecords.forEach(s => {
      animalGrowthEvents.push({ date: new Date(s.slaughter_date).toISOString().split('T')[0], diff: -s.quantity_slaughtered });
    });
    
    // Aggregate by date
    const dailyAnimalDiffMap: Record<string, number> = {};
    animalGrowthEvents.forEach(e => {
      dailyAnimalDiffMap[e.date] = (dailyAnimalDiffMap[e.date] || 0) + e.diff;
    });
    let cumulativeAnimals = 0;
    const animalGrowthTrend = Object.entries(dailyAnimalDiffMap).sort((a, b) => a[0].localeCompare(b[0])).map(([date, diff]) => {
      cumulativeAnimals += diff;
      return { date, population: Math.max(0, cumulativeAnimals) };
    });

    // 3. Inventory Growth Trend (Using created_at of items)
    const invGrowthMap: Record<string, number> = {};
    inventoryItems.forEach(i => {
      const d = new Date(i.created_at).toISOString().split('T')[0];
      invGrowthMap[d] = (invGrowthMap[d] || 0) + (i.quantity * i.cost_basis);
    });
    let cumulativeInv = 0;
    const inventoryGrowthTrend = Object.entries(invGrowthMap).sort((a, b) => a[0].localeCompare(b[0])).map(([date, value]) => {
      cumulativeInv += value;
      return { date, value: cumulativeInv };
    });

    return NextResponse.json({
      data: {
        kpis: {
          liveAnimals, mortalityCount, mortalityRate,
          feedConsumed, feedCost, feedCostPerAnimal, feedEfficiency,
          waterConsumed, waterCost, elecConsumed, elecCost, waterPerAnimal, elecPerAnimal,
          revenue, expenses: totalExpenses, netProfit, receivables: totalReceivables,
          inventoryQuantity, inventoryValue
        },
        charts: {
          financialTrend,
          mortalityTrend,
          mortalityByCategory,
          feedTrend,
          feedByBatch,
          waterTrend: waterTrendChart,
          elecTrend: elecTrendChart,
          inventoryDistribution,
          slaughterTrend,
          batchYieldComparison,
          roomOccupancy,
          stageDistribution,
          topCustomers,
          customerDistribution,
          outstandingBalances,
          supplierDistribution,
          topSuppliers,
          revenueGrowthTrend,
          animalGrowthTrend,
          inventoryGrowthTrend
        },
        slaughterMetrics: {
          avgYield, totalMeatProduced, totalWaste
        }
      }
    });

  } catch (error) {
    console.error("Analytics Error:", error);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
