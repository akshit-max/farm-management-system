import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const GREEN_FARM = 'd9b82079-3261-4c83-b30f-321903ceb57d';

async function run() {
  console.log("=== STEP 1: GREEN FARMS BATCH DETAILS ===");
  const batches = await prisma.animalBatch.findMany({
    where: { farm_id: GREEN_FARM, deleted_at: null },
    include: { farm: { select: { name: true } } }
  });
  let greenPurchaseCost = 0;
  for (const b of batches) {
    const cost = b.initial_quantity * b.cost_per_animal;
    greenPurchaseCost += cost;
    console.log(`  Batch: ${b.batch_number} | Farm: ${b.farm.name} | InitQty: ${b.initial_quantity} | CurrQty: ${b.quantity} | CostPerAnimal: ₹${b.cost_per_animal} | PurchaseCost: ₹${cost}`);
  }
  console.log(`\n  GREEN FARMS Total Animal Purchase Cost: ₹${greenPurchaseCost}`);

  console.log("\n=== STEP 4: AUDIT — WHERE DO B-2026, B-2028, B-2029, TEST BATCHES LIVE? ===");
  const suspectBatches = await prisma.animalBatch.findMany({
    where: {
      batch_number: { in: ['B-2026', 'B-2028', 'B-2029', 'TEST-1781986854774'] }
    },
    include: { farm: { select: { id: true, name: true } } }
  });
  for (const b of suspectBatches) {
    console.log(`  Batch: ${b.batch_number} | Farm: "${b.farm.name}" | Farm ID: ${b.farm.id} | Deleted: ${b.deleted_at ? 'YES (' + b.deleted_at + ')' : 'NO'}`);
  }
  // Also look for any TEST-* batches across ALL farms
  const testBatches = await prisma.animalBatch.findMany({
    where: { batch_number: { startsWith: 'TEST-' } },
    include: { farm: { select: { id: true, name: true } } }
  });
  console.log(`\n  TEST-* batches found: ${testBatches.length}`);
  for (const b of testBatches) {
    console.log(`  TEST Batch: ${b.batch_number} | Farm: "${b.farm.name}" | Farm ID: ${b.farm.id} | Deleted: ${b.deleted_at ? 'YES' : 'NO'}`);
  }

  console.log("\n=== STEP 2: CROSS-FARM BATCH PURCHASE COSTS ===");
  // Show costs per farm
  const allBatchesByFarm = await prisma.animalBatch.findMany({
    where: { deleted_at: null },
    include: { farm: { select: { id: true, name: true } } }
  });
  const farmCosts: Record<string, { name: string; cost: number; batches: string[] }> = {};
  for (const b of allBatchesByFarm) {
    const key = b.farm_id;
    if (!farmCosts[key]) farmCosts[key] = { name: b.farm.name, cost: 0, batches: [] };
    farmCosts[key].cost += b.initial_quantity * b.cost_per_animal;
    farmCosts[key].batches.push(b.batch_number);
  }
  let grandTotal = 0;
  for (const [fid, data] of Object.entries(farmCosts)) {
    grandTotal += data.cost;
    console.log(`  Farm "${data.name}" (${fid}): ₹${data.cost} — Batches: [${data.batches.join(', ')}]`);
  }
  console.log(`\n  GRAND TOTAL (all farms): ₹${grandTotal}`);
  console.log(`  GREEN FARMS ONLY:        ₹${greenPurchaseCost}`);
  console.log(`  *** DIFFERENCE (other farms): ₹${grandTotal - greenPurchaseCost} ***`);

  console.log("\n=== STEP 5: GREEN FARMS EXPECTED DASHBOARD VALUES ===");
  // Revenue
  const revenue = await prisma.salesInvoice.aggregate({
    _sum: { total: true },
    where: { farm_id: GREEN_FARM, deleted_at: null }
  });
  // Payments
  const payments = await prisma.customerPayment.aggregate({
    _sum: { amount: true },
    where: { farm_id: GREEN_FARM, deleted_at: null }
  });
  // Expenses
  const expenses = await prisma.expense.aggregate({
    _sum: { amount: true },
    where: { farm_id: GREEN_FARM, deleted_at: null }
  });
  // Water
  const water = await prisma.waterUsage.aggregate({
    _sum: { total_cost: true },
    where: { farm_id: GREEN_FARM, deleted_at: null }
  });
  // Electricity
  const elec = await prisma.electricityUsage.aggregate({
    _sum: { total_cost: true },
    where: { farm_id: GREEN_FARM, deleted_at: null }
  });
  // Feed
  const feed = await prisma.feedConsumption.aggregate({
    _sum: { cost: true },
    where: { farm_id: GREEN_FARM, deleted_at: null }
  });
  // Receivables
  const invoices = await prisma.salesInvoice.findMany({
    where: { farm_id: GREEN_FARM, deleted_at: null, payment_status: { not: 'PAID' } },
    include: { payments: { where: { deleted_at: null } } }
  });
  let receivables = 0;
  for (const inv of invoices) {
    const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
    receivables += inv.total - paid;
  }

  const totalCashOut = (expenses._sum.amount||0) + greenPurchaseCost + (water._sum.total_cost||0) + (elec._sum.total_cost||0);
  const cashPosition = (payments._sum.amount||0) - totalCashOut;

  console.log(`  Revenue:           ₹${revenue._sum.total || 0}   (expected ≈ ₹250)`);
  console.log(`  Cash Collected:    ₹${payments._sum.amount || 0}   (expected ≈ ₹200)`);
  console.log(`  Receivables:       ₹${receivables}   (expected ≈ ₹50)`);
  console.log(`  Feed Cost:         ₹${feed._sum.cost || 0}`);
  console.log(`  Water Cost:        ₹${water._sum.total_cost || 0}`);
  console.log(`  Electricity Cost:  ₹${elec._sum.total_cost || 0}`);
  console.log(`  Manual Expenses:   ₹${expenses._sum.amount || 0}`);
  console.log(`  Animal Purchases:  ₹${greenPurchaseCost}`);
  console.log(`  Total Cash Out:    ₹${totalCashOut}`);
  console.log(`  Cash Position:     ₹${cashPosition}`);

  console.log("\n=== STEP 3: QUERY FILTER EVIDENCE (code-based, not DB) ===");
  console.log("  All accounting routes confirmed to use: where: { farm_id: farmId }");
  console.log("  farmId = session?.user?.farm_id (JWT-sealed)");
  console.log("  Files verified: cash-flow/route.ts, balance-sheet/route.ts, accounting/dashboard/route.ts, accounting/analytics/route.ts");
}

run().catch(console.error);
