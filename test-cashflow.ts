import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  // Get farm_id from first active farm (or we can pass it)
  const farm = await prisma.farm.findFirst();
  if (!farm) { console.log('No farm found'); return; }
  const farmId = farm.id;
  console.log('=== FARM ISOLATION CHECK ===');
  console.log('farm_id used for all queries:', farmId);

  console.log('\n=== CASH INFLOWS: CustomerPayment (deleted_at IS NULL) ===');
  const payments = await prisma.customerPayment.findMany({
    where: { farm_id: farmId, deleted_at: null },
    orderBy: { payment_date: 'asc' }
  });
  let totalInflows = 0;
  console.log('Source Type | Record ID | Date | Amount');
  for (const p of payments) {
    console.log(`Payment | ${p.id} | ${p.payment_date.toISOString().split('T')[0]} | ₹${p.amount}`);
    totalInflows += p.amount;
  }
  console.log(`\nTotal Inflows = ₹${totalInflows} (${payments.length} records)`);

  console.log('\n=== CASH OUTFLOWS: Expense (deleted_at IS NULL) ===');
  const expenses = await prisma.expense.findMany({
    where: { farm_id: farmId, deleted_at: null },
    orderBy: { expense_date: 'asc' }
  });
  let totalExpenses = 0;
  console.log('Source Type | Record ID | Category | Date | Amount');
  for (const e of expenses) {
    console.log(`Expense | ${e.id} | ${e.category} | ${e.expense_date.toISOString().split('T')[0]} | ₹${e.amount}`);
    totalExpenses += e.amount;
  }
  console.log(`\nTotal Expenses = ₹${totalExpenses} (${expenses.length} records)`);

  console.log('\n=== CASH OUTFLOWS: AnimalBatch purchases (deleted_at IS NULL) ===');
  const batches = await prisma.animalBatch.findMany({
    where: { farm_id: farmId, deleted_at: null },
    orderBy: { arrival_date: 'asc' }
  });
  let totalBatchCost = 0;
  console.log('Source Type | Batch ID | Batch Number | Date | Qty | CostPerAnimal | Total');
  for (const b of batches) {
    const cost = b.initial_quantity * b.cost_per_animal;
    console.log(`AnimalBatch | ${b.id} | ${b.batch_number} | ${b.arrival_date.toISOString().split('T')[0]} | ${b.initial_quantity} | ₹${b.cost_per_animal} | ₹${cost}`);
    totalBatchCost += cost;
  }
  console.log(`\nTotal Batch Purchases = ₹${totalBatchCost} (${batches.length} batches)`);

  console.log('\n=== CASH OUTFLOWS: WaterUsage (deleted_at IS NULL) ===');
  const water = await prisma.waterUsage.findMany({
    where: { farm_id: farmId, deleted_at: null },
    orderBy: { date: 'asc' }
  });
  let totalWater = 0;
  console.log('Source Type | Record ID | Date | Amount');
  for (const w of water) {
    console.log(`WaterUsage | ${w.id} | ${w.date.toISOString().split('T')[0]} | ₹${w.total_cost}`);
    totalWater += w.total_cost;
  }
  console.log(`\nTotal Water = ₹${totalWater} (${water.length} records)`);

  console.log('\n=== CASH OUTFLOWS: ElectricityUsage (deleted_at IS NULL) ===');
  const electricity = await prisma.electricityUsage.findMany({
    where: { farm_id: farmId, deleted_at: null },
    orderBy: { date: 'asc' }
  });
  let totalElec = 0;
  console.log('Source Type | Record ID | Date | Amount');
  for (const e of electricity) {
    console.log(`Electricity | ${e.id} | ${e.date.toISOString().split('T')[0]} | ₹${e.total_cost}`);
    totalElec += e.total_cost;
  }
  console.log(`\nTotal Electricity = ₹${totalElec} (${electricity.length} records)`);

  const totalOutflows = totalExpenses + totalBatchCost + totalWater + totalElec;
  const netPosition = totalInflows - totalOutflows;

  console.log('\n=== DUPLICATE CHECK: Does any batch cost also appear as a manual Expense? ===');
  // Check for any expense with category like 'Animal', 'Purchase', 'Batch' that might duplicate batch costs
  const potentialDuplicates = await prisma.expense.findMany({
    where: { farm_id: farmId, deleted_at: null, category: { in: ['Animal Purchase', 'Animals', 'Livestock', 'Batch', 'Stock Purchase'] } }
  });
  console.log(`Potential duplicate expense categories found: ${potentialDuplicates.length}`);
  for (const d of potentialDuplicates) {
    console.log(`  ⚠ DUPLICATE RISK: Expense | ${d.id} | ${d.category} | ₹${d.amount}`);
  }
  if (potentialDuplicates.length === 0) console.log('  ✓ No duplicate animal purchase entries found in Expense table.');

  console.log('\n=== FINAL RECONCILIATION SUMMARY ===');
  console.log(`Cash Inflows:  ₹${totalInflows}`);
  console.log(`Cash Outflows:`);
  console.log(`  Manual Expenses:   ₹${totalExpenses}`);
  console.log(`  Animal Purchases:  ₹${totalBatchCost}`);
  console.log(`  Water Usage:       ₹${totalWater}`);
  console.log(`  Electricity:       ₹${totalElec}`);
  console.log(`  Total Outflows:    ₹${totalOutflows}`);
  console.log(`Net Cash Position: ₹${totalInflows} - ₹${totalOutflows} = ₹${netPosition}`);
}

run().catch(console.error);
