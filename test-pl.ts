import { PrismaClient } from '@prisma/client'; 
const prisma = new PrismaClient(); 

async function run() { 
  const sales = await prisma.salesInvoice.aggregate({ _sum: { total: true }, where: { deleted_at: null } }); 
  const expenses = await prisma.expense.aggregate({ _sum: { amount: true }, where: { deleted_at: null } }); 
  const feed = await prisma.feedConsumption.aggregate({ _sum: { cost: true }, where: { deleted_at: null } }); 
  const water = await prisma.waterUsage.aggregate({ _sum: { total_cost: true }, where: { deleted_at: null } }); 
  const electricity = await prisma.electricityUsage.aggregate({ _sum: { total_cost: true }, where: { deleted_at: null } }); 
  
  const totalRevenue = sales._sum.total || 0; 
  const manualExpenses = expenses._sum.amount || 0; 
  const feedCost = feed._sum.cost || 0; 
  const waterCost = water._sum.total_cost || 0; 
  const electricityCost = electricity._sum.total_cost || 0; 
  
  const totalExpenses = manualExpenses + feedCost + waterCost + electricityCost; 
  const netProfit = totalRevenue - totalExpenses; 
  
  console.log('BEFORE P&L:', { totalRevenue, totalExpenses, netProfit, manualExpenses, feedCost, waterCost, electricityCost }); 
  
  // Calculate After (with COGS)
  const invoiceItems = await prisma.salesInvoiceItem.findMany({
    where: { deleted_at: null, invoice: { deleted_at: null } },
    include: { batch: { include: { feedConsumptions: true } } }
  });

  let totalCOGS = 0;
  for (const item of invoiceItems) {
    if (item.batch) {
      const initialCost = item.batch.initial_quantity * item.batch.cost_per_animal;
      const batchFeedCost = item.batch.feedConsumptions.reduce((sum, f) => sum + f.cost, 0);
      
      // Let's also include slaughter cost if we can, but since slaughter expenses are global, we might not be able to easily allocate them per batch unless we use proportional allocation. The user approved:
      // "Approved COGS Components: Animal Purchase Cost, Feed Consumption Cost, Slaughter Costs"
      // Wait, we can't allocate slaughter costs to a batch accurately if they are global expenses without batch relation.
      // We will just sum global slaughter expenses into COGS.
      const unitCost = (initialCost + batchFeedCost) / item.batch.initial_quantity;
      totalCOGS += (item.quantity * unitCost);
    }
  }
  
  const slaughterExpensesAgg = await prisma.expense.aggregate({
    _sum: { amount: true },
    where: { deleted_at: null, category: { in: ['Slaughter', 'Processing', 'Butchery'] } }
  });
  const slaughterCosts = slaughterExpensesAgg._sum.amount || 0;
  
  totalCOGS += slaughterCosts;
  
  // After P&L
  // Operating Expenses = Manual Expenses (excluding Slaughter) + Water + Electricity
  const manualExSlaughter = manualExpenses - slaughterCosts;
  const operatingExpenses = manualExSlaughter + waterCost + electricityCost;
  const grossProfit = totalRevenue - totalCOGS;
  const afterNetProfit = grossProfit - operatingExpenses;
  
  console.log('AFTER P&L:', { totalRevenue, totalCOGS, grossProfit, operatingExpenses, afterNetProfit });
} 

run();
