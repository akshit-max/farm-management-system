import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  console.log("=== CRITICAL ISSUE #2: CASH POSITION ===");
  const payments = await prisma.customerPayment.findMany({ where: { deleted_at: null } });
  const expenses = await prisma.expense.findMany({ where: { deleted_at: null } });
  const batches = await prisma.animalBatch.findMany({ where: { deleted_at: null } });
  const water = await prisma.waterUsage.findMany({ where: { deleted_at: null } });
  const electric = await prisma.electricityUsage.findMany({ where: { deleted_at: null } });

  const totalCashIn = payments.reduce((acc, p) => acc + p.amount, 0);
  const rawExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  const batchPurchases = batches.reduce((acc, b) => acc + (b.initial_quantity * b.cost_per_animal), 0);
  const waterCost = water.reduce((acc, w) => acc + w.total_cost, 0);
  const electricCost = electric.reduce((acc, e) => acc + e.total_cost, 0);

  const totalCashOut = rawExpenses + batchPurchases + waterCost + electricCost;
  const cashPosition = totalCashIn - totalCashOut;

  console.log({
    totalCashIn,
    totalCashOut,
    cashPosition,
    breakdownOut: { rawExpenses, batchPurchases, waterCost, electricCost },
    recordsCount: { payments: payments.length, expenses: expenses.length, batches: batches.length, water: water.length, electric: electric.length }
  });

  console.log("\n=== CRITICAL ISSUE #3: COST PER KG ===");
  const allBatches = await prisma.animalBatch.findMany({ where: { deleted_at: null } });
  const totalAnimalCost = allBatches.reduce((acc, b) => acc + (b.initial_quantity * b.cost_per_animal), 0);
  
  const slaughterExpenses = await prisma.expense.aggregate({
    _sum: { amount: true },
    where: { deleted_at: null, category: { in: ['Slaughter', 'Processing', 'Butchery'] } }
  });
  
  const feedConsumption = await prisma.feedConsumption.aggregate({
    _sum: { cost: true },
    where: { deleted_at: null }
  });

  const totalProductionCost = totalAnimalCost + (feedConsumption._sum.cost || 0) + (slaughterExpenses._sum.amount || 0);

  const slaughterYields = await prisma.slaughterYield.aggregate({
    _sum: { usable_meat_weight: true },
    where: { deleted_at: null, slaughter_record: { deleted_at: null } }
  });
  
  const totalMeatYield = slaughterYields._sum.usable_meat_weight || 0;
  const costPerKg = totalMeatYield > 0 ? totalProductionCost / totalMeatYield : 0;

  console.log({
    totalAnimalCost,
    feedCost: feedConsumption._sum.cost,
    slaughterCost: slaughterExpenses._sum.amount,
    totalProductionCost,
    totalMeatYield,
    costPerKg
  });

  console.log("\n=== CRITICAL ISSUE #4: CONSISTENCY AUDIT ===");
  const salesInvoices = await prisma.salesInvoice.findMany({ where: { deleted_at: null }, include: { payments: true } });
  
  let totalRevenue = 0;
  let totalReceivables = 0;

  for (const inv of salesInvoices) {
    totalRevenue += inv.total;
    if (inv.payment_status !== 'PAID') {
        const paid = inv.payments.filter(p => !p.deleted_at).reduce((acc, p) => acc + p.amount, 0);
        totalReceivables += (inv.total - paid);
    }
  }

  console.log({
    totalRevenue,
    totalReceivables,
    paymentsReceived: totalCashIn,
    salesInvoicesCount: salesInvoices.length
  });
}

run().catch(console.error);
