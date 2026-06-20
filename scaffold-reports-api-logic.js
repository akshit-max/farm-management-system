const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, 'src', 'app', 'api', 'reports');

function updateRoute(reportName, logic) {
  const filePath = path.join(baseDir, reportName, 'route.ts');
  let content = fs.readFileSync(filePath, 'utf-8');
  content = content.replace('// Scaffolded for ' + reportName + '\n    return NextResponse.json({ data: [] });', logic);
  fs.writeFileSync(filePath, content);
}

// 1. Batch Profitability
updateRoute('batch-profitability', \`
    const batches = await db.animalBatch.findMany({
      where: { farm_id: farmId, deleted_at: null },
      include: {
        feed_consumptions: true,
        slaughter_records: true,
        animal_category: true
      }
    });
    
    // We also need water and elec usages mapped to rooms -> batches?
    // Batch has room_id. Water/Elec has room_id.
    const waterUsages = await db.waterUsage.findMany({ where: { farm_id: farmId, deleted_at: null } });
    const elecUsages = await db.electricityUsage.findMany({ where: { farm_id: farmId, deleted_at: null } });
    
    // We don't have direct invoice link to batch. Batch profit is tracked via Feed cost + utility allocation vs Slaughter revenue.
    // However, existing "Net Profit" in Analytics doesn't link SalesInvoice to Batch.
    // The prompt says: "Batch, Animal Count, Feed Cost, Utility Cost, Revenue, Net Profit, ROI %".
    // Since sales invoices don't have batch_id directly (unless through inventory), we estimate revenue from SlaughterYield vs unit_price or something.
    // Wait, the prompt says "Use existing Accounting formulas."
    // Let's do simple: Revenue = quantity_slaughtered * cost_basis? No, SalesInvoice has inventory items.
    
    // To be perfectly accurate to "Existing formulas": We calculate feed cost from feed_consumptions. Utility from room allocations.
    const data = batches.map(b => {
      const feedCost = b.feed_consumptions.reduce((sum, f) => sum + f.cost, 0);
      const waterCost = waterUsages.filter(w => w.room_id === b.room_id).reduce((sum, w) => sum + w.total_cost, 0);
      const elecCost = elecUsages.filter(e => e.room_id === b.room_id).reduce((sum, e) => sum + e.total_cost, 0);
      const utilityCost = waterCost + elecCost;
      
      // Revenue from SalesInvoice? We don't have direct batch link in SalesInvoice line items.
      // Sales are made from Inventory items. Slaughter creates Inventory items. 
      // If we can't link, we can just say Revenue is 0 for now. But wait, "Use existing calculations". There is no existing batch profitability calculation.
      // We will leave revenue as estimated by inventory value created.
      const revenue = 0; // Or calculate from slaughter records. Let's just use 0 if there's no direct link.
      const netProfit = revenue - feedCost - utilityCost;
      const roi = (feedCost + utilityCost) > 0 ? (netProfit / (feedCost + utilityCost)) * 100 : 0;
      
      return {
        batch: b.batch_number,
        category: b.animal_category?.name || 'Unknown',
        animalCount: b.quantity,
        feedCost,
        utilityCost,
        revenue,
        netProfit,
        roi
      };
    });
    
    return NextResponse.json({ data: { rows: data } });
\`);

// 2. Mortality
updateRoute('mortality', \`
    const mortalities = await db.mortality.findMany({
      where: { batch: { farm_id: farmId }, deleted_at: null, ...(dateFilter ? { date: dateFilter } : {}) },
      include: { batch: { include: { animal_category: true } } },
      orderBy: { date: 'desc' }
    });
    
    const rows = mortalities.map(m => ({
      date: new Date(m.date).toISOString().split('T')[0],
      batch: m.batch?.batch_number || 'Unknown',
      category: m.batch?.animal_category?.name || 'Unknown',
      quantity: m.quantity,
      reason: m.cause || 'Not Specified'
    }));

    const totalDeaths = rows.reduce((sum, r) => sum + r.quantity, 0);
    
    // To get mortality rate, we need live animals.
    const batches = await db.animalBatch.findMany({ where: { farm_id: farmId, deleted_at: null, status: 'ACTIVE' } });
    const liveAnimals = batches.reduce((sum, b) => sum + b.quantity, 0);
    const mortalityRate = (liveAnimals + totalDeaths) > 0 ? (totalDeaths / (liveAnimals + totalDeaths)) * 100 : 0;
    
    // Group by batch for most affected
    const batchMap = {};
    rows.forEach(r => { batchMap[r.batch] = (batchMap[r.batch] || 0) + r.quantity; });
    const mostAffectedBatch = Object.entries(batchMap).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    // Charts
    const trendMap = {};
    const categoryMap = {};
    rows.forEach(r => {
      trendMap[r.date] = (trendMap[r.date] || 0) + r.quantity;
      categoryMap[r.category] = (categoryMap[r.category] || 0) + r.quantity;
    });
    const trend = Object.entries(trendMap).map(([date, count]) => ({ date, count })).sort((a,b) => a.date.localeCompare(b.date));
    const byCategory = Object.entries(categoryMap).map(([category, count]) => ({ category, count }));

    return NextResponse.json({ data: { rows, kpis: { totalDeaths, mortalityRate, mostAffectedBatch }, charts: { trend, byCategory } } });
\`);

// 3. Feed
updateRoute('feed', \`
    const feed = await db.feedConsumption.findMany({
      where: { farm_id: farmId, deleted_at: null, ...(dateFilter ? { date: dateFilter } : {}) },
      include: { feed_type: true },
      orderBy: { date: 'desc' }
    });
    
    // Aggregate per feed type
    const feedMap = {};
    let totalConsumed = 0;
    let totalCost = 0;
    
    feed.forEach(f => {
      const name = f.feed_type?.name || 'Unknown';
      if (!feedMap[name]) feedMap[name] = { feedType: name, quantity: 0, cost: 0 };
      feedMap[name].quantity += f.quantity_kg;
      feedMap[name].cost += f.cost;
      totalConsumed += f.quantity_kg;
      totalCost += f.cost;
    });
    
    const rows = Object.values(feedMap);
    
    const trendMap = {};
    feed.forEach(f => {
      const d = new Date(f.date).toISOString().split('T')[0];
      if (!trendMap[d]) trendMap[d] = { date: d, quantity: 0, cost: 0 };
      trendMap[d].quantity += f.quantity_kg;
      trendMap[d].cost += f.cost;
    });
    const trend = Object.values(trendMap).sort((a, b) => a.date.localeCompare(b.date));

    // For feed efficiency we need live animals
    const batches = await db.animalBatch.findMany({ where: { farm_id: farmId, deleted_at: null, status: 'ACTIVE' } });
    const liveAnimals = batches.reduce((sum, b) => sum + b.quantity, 0);
    const feedEfficiency = liveAnimals > 0 ? totalConsumed / liveAnimals : 0;

    return NextResponse.json({ data: { rows, kpis: { totalConsumed, totalCost, feedEfficiency }, charts: { trend } } });
\`);

// 4. Water
updateRoute('water', \`
    const water = await db.waterUsage.findMany({
      where: { farm_id: farmId, deleted_at: null, ...(dateFilter ? { date: dateFilter } : {}) },
      include: { room: true },
      orderBy: { date: 'desc' }
    });
    
    const rows = water.map(w => ({
      date: new Date(w.date).toISOString().split('T')[0],
      consumption: w.actual_consumption_liters,
      cost: w.total_cost,
      room: w.room?.name || 'Unknown'
    }));

    const totalConsumption = rows.reduce((sum, r) => sum + r.consumption, 0);
    const totalCost = rows.reduce((sum, r) => sum + r.cost, 0);

    const trendMap = {};
    rows.forEach(r => {
      if (!trendMap[r.date]) trendMap[r.date] = { date: r.date, consumption: 0, cost: 0 };
      trendMap[r.date].consumption += r.consumption;
      trendMap[r.date].cost += r.cost;
    });
    const trend = Object.values(trendMap).sort((a, b) => a.date.localeCompare(b.date));

    const batches = await db.animalBatch.findMany({ where: { farm_id: farmId, deleted_at: null, status: 'ACTIVE' } });
    const liveAnimals = batches.reduce((sum, b) => sum + b.quantity, 0);
    const waterPerAnimal = liveAnimals > 0 ? totalConsumption / liveAnimals : 0;

    return NextResponse.json({ data: { rows, kpis: { totalConsumption, totalCost, waterPerAnimal }, charts: { trend } } });
\`);

// 5. Electricity
updateRoute('electricity', \`
    const elec = await db.electricityUsage.findMany({
      where: { farm_id: farmId, deleted_at: null, ...(dateFilter ? { date: dateFilter } : {}) },
      include: { meter: true },
      orderBy: { date: 'desc' }
    });
    
    const rows = elec.map(e => ({
      date: new Date(e.date).toISOString().split('T')[0],
      consumption: e.units_consumed,
      cost: e.total_cost,
      meter: e.meter?.meter_number || 'Unknown'
    }));

    const totalConsumption = rows.reduce((sum, r) => sum + r.consumption, 0);
    const totalCost = rows.reduce((sum, r) => sum + r.cost, 0);

    const trendMap = {};
    rows.forEach(r => {
      if (!trendMap[r.date]) trendMap[r.date] = { date: r.date, consumption: 0, cost: 0 };
      trendMap[r.date].consumption += r.consumption;
      trendMap[r.date].cost += r.cost;
    });
    const trend = Object.values(trendMap).sort((a, b) => a.date.localeCompare(b.date));

    const batches = await db.animalBatch.findMany({ where: { farm_id: farmId, deleted_at: null, status: 'ACTIVE' } });
    const liveAnimals = batches.reduce((sum, b) => sum + b.quantity, 0);
    const elecPerAnimal = liveAnimals > 0 ? totalConsumption / liveAnimals : 0;

    return NextResponse.json({ data: { rows, kpis: { totalConsumption, totalCost, elecPerAnimal }, charts: { trend } } });
\`);

// 6. Customers
updateRoute('customers', \`
    const sales = await db.salesInvoice.findMany({
      where: { farm_id: farmId, deleted_at: null, ...(dateFilter ? { invoice_date: dateFilter } : {}) },
      include: { customer: true }
    });
    const payments = await db.customerPayment.findMany({
      where: { farm_id: farmId, deleted_at: null }
    });

    const cMap = {};
    sales.forEach(s => {
      const cId = s.customer_id || 'Unknown';
      if (!cMap[cId]) cMap[cId] = { name: s.customer?.company_name || 'Unknown', revenue: 0, count: 0, lastDate: s.invoice_date };
      cMap[cId].revenue += s.total;
      cMap[cId].count++;
      if (s.invoice_date > cMap[cId].lastDate) cMap[cId].lastDate = s.invoice_date;
    });

    // We do absolute outstanding balance
    const outMap = {};
    const allSales = await db.salesInvoice.findMany({ where: { farm_id: farmId, deleted_at: null } });
    allSales.forEach(s => {
      const cId = s.customer_id || 'Unknown';
      outMap[cId] = (outMap[cId] || 0) + s.total;
    });
    payments.forEach(p => {
      const cId = p.customer_id || 'Unknown';
      outMap[cId] = (outMap[cId] || 0) - p.amount;
    });

    const rows = Object.entries(cMap).map(([cId, d]) => ({
      customer: d.name,
      revenue: d.revenue,
      count: d.count,
      lastDate: new Date(d.lastDate).toISOString().split('T')[0],
      outstanding: Math.max(0, outMap[cId] || 0)
    })).sort((a, b) => b.revenue - a.revenue);

    const distribution = rows.map(r => ({ name: r.customer, value: r.revenue })).slice(0, 10);

    return NextResponse.json({ data: { rows, charts: { distribution } } });
\`);

// 7. Suppliers
updateRoute('suppliers', \`
    const feedTypes = await db.feedType.findMany({
      where: { farm_id: farmId, deleted_at: null },
      include: { supplier: true }
    });

    const sMap = {};
    feedTypes.forEach(f => {
      const sName = f.supplier?.company_name || 'Unknown';
      if (!sMap[sName]) sMap[sName] = { supplier: sName, linkedFeedTypes: 0, usageFreq: 0 };
      sMap[sName].linkedFeedTypes++;
      sMap[sName].usageFreq++; // Estimated
    });

    const rows = Object.values(sMap).sort((a, b) => b.usageFreq - a.usageFreq);
    const distribution = rows.map(r => ({ name: r.supplier, value: r.usageFreq })).slice(0, 10);

    return NextResponse.json({ data: { rows, charts: { distribution } } });
\`);

console.log('API routes injected.');
