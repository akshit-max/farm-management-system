import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const FARM_ID = 'd9b82079-3261-4c83-b30f-321903ceb57d';

async function count(table: string, extra = '') {
  const result = await prisma.$queryRawUnsafe<any[]>(
    `SELECT COUNT(*) as cnt FROM ${table} WHERE farm_id = '${FARM_ID}'::uuid AND deleted_at IS NULL ${extra}`
  );
  return Number(result[0].cnt);
}

async function run() {
  console.log(`=== COMPLETENESS REPORT: Farm d9b82079 (aditya@gmail.com) ===\n`);

  // Animals & Batches
  const batches = await prisma.animalBatch.findMany({
    where: { farm_id: FARM_ID, deleted_at: null },
    include: { animal_category: true, feedConsumptions: { where: { deleted_at: null } } }
  });
  const activeBatches = batches.filter(b => b.status === 'ACTIVE');
  const totalAnimals = batches.reduce((s, b) => s + b.quantity, 0);

  console.log("--- ANIMALS & BATCHES ---");
  console.log(`  Total Batches:    ${batches.length}`);
  console.log(`  Active Batches:   ${activeBatches.length}`);
  console.log(`  Total Animals:    ${totalAnimals}`);
  for (const b of batches) {
    console.log(`    Batch: ${b.batch_number} | Status: ${b.status} | Qty: ${b.quantity} | Category: ${b.animal_category?.name || 'NONE'} | Feed Records: ${b.feedConsumptions.length}`);
  }

  // Rooms
  const rooms = await prisma.room.findMany({ where: { farm_id: FARM_ID, deleted_at: null } });
  console.log(`\n--- ROOMS ---`);
  console.log(`  Total Rooms: ${rooms.length}`);
  for (const r of rooms) console.log(`    Room: ${r.name} | Capacity: ${r.capacity}`);

  // Feed
  const feedTypes = await prisma.feedType.findMany({ where: { farm_id: FARM_ID, deleted_at: null } });
  const feedConsumptions = await prisma.feedConsumption.findMany({ where: { farm_id: FARM_ID, deleted_at: null } });
  console.log(`\n--- FEED ---`);
  console.log(`  Feed Types:        ${feedTypes.length}`);
  console.log(`  Feed Consumptions: ${feedConsumptions.length}`);
  for (const f of feedTypes) console.log(`    FeedType: ${f.name} | Stock: ${f.stock_quantity} kg | Cost/kg: ${f.cost_per_kg}`);

  // Water
  const waterUsages = await prisma.waterUsage.findMany({ where: { farm_id: FARM_ID, deleted_at: null } });
  console.log(`\n--- WATER ---`);
  console.log(`  Water Records: ${waterUsages.length}`);
  for (const w of waterUsages) console.log(`    Date: ${w.date.toISOString().split('T')[0]} | Cost: ${w.total_cost}`);

  // Electricity
  const elecUsages = await prisma.electricityUsage.findMany({ where: { farm_id: FARM_ID, deleted_at: null } });
  const meters = await prisma.utilityMeter.findMany({ where: { farm_id: FARM_ID, deleted_at: null } });
  console.log(`\n--- ELECTRICITY ---`);
  console.log(`  Utility Meters:     ${meters.length}`);
  console.log(`  Electricity Records: ${elecUsages.length}`);

  // Mortality
  const mortality = await prisma.mortality.findMany({ where: { batch: { farm_id: FARM_ID }, deleted_at: null } });
  console.log(`\n--- MORTALITY ---`);
  console.log(`  Mortality Records: ${mortality.length}`);

  // Slaughter
  const slaughter = await prisma.slaughterRecord.findMany({
    where: { farm_id: FARM_ID, deleted_at: null },
    include: { slaughterYield: true }
  });
  console.log(`\n--- SLAUGHTER ---`);
  console.log(`  Slaughter Records: ${slaughter.length}`);
  for (const s of slaughter) {
    console.log(`    Batch: ${s.batch_id} | Qty: ${s.quantity_slaughtered} | Yield: ${s.slaughterYield?.usable_meat_weight ?? 'NO YIELD RECORD'} kg`);
  }

  // Sales
  const invoices = await prisma.salesInvoice.findMany({
    where: { farm_id: FARM_ID, deleted_at: null },
    include: { payments: { where: { deleted_at: null } }, items: { where: { deleted_at: null } } }
  });
  let totalRevenue = 0, totalPaid = 0;
  console.log(`\n--- SALES INVOICES ---`);
  console.log(`  Total Invoices: ${invoices.length}`);
  for (const inv of invoices) {
    const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
    totalRevenue += inv.total;
    totalPaid += paid;
    console.log(`    Invoice: ${inv.invoice_number} | Total: ${inv.total} | Paid: ${paid} | Status: ${inv.payment_status} | Items: ${inv.items.length}`);
  }
  console.log(`  Total Revenue: ${totalRevenue} | Collected: ${totalPaid} | Outstanding: ${totalRevenue - totalPaid}`);

  // Payments
  const payments = await prisma.customerPayment.findMany({ where: { farm_id: FARM_ID, deleted_at: null } });
  console.log(`\n--- CUSTOMER PAYMENTS ---`);
  console.log(`  Total Payments: ${payments.length}`);
  for (const p of payments) console.log(`    Amount: ${p.amount} | Date: ${p.payment_date.toISOString().split('T')[0]}`);

  // Expenses
  const expenses = await prisma.expense.findMany({ where: { farm_id: FARM_ID, deleted_at: null } });
  console.log(`\n--- EXPENSES ---`);
  console.log(`  Total Expenses: ${expenses.length}`);
  for (const e of expenses) console.log(`    Category: ${e.category} | Amount: ${e.amount} | Date: ${e.expense_date.toISOString().split('T')[0]}`);

  // Customers
  const customers = await prisma.customer.findMany({ where: { farm_id: FARM_ID, deleted_at: null } });
  console.log(`\n--- CUSTOMERS (CRM) ---`);
  console.log(`  Total Customers: ${customers.length}`);
  for (const c of customers) console.log(`    ${c.company_name} | Status: ${c.status} | Rating: ${(c as any).rating ?? 'N/A'} | Credit Limit: ${c.credit_limit}`);

  // Suppliers
  const suppliers = await prisma.supplier.findMany({ where: { farm_id: FARM_ID, deleted_at: null } });
  console.log(`\n--- SUPPLIERS ---`);
  console.log(`  Total Suppliers: ${suppliers.length}`);
  for (const s of suppliers) console.log(`    ${s.company_name} | Status: ${s.status}`);

  // Inventory
  const inventory = await prisma.inventoryItem.findMany({ where: { farm_id: FARM_ID, deleted_at: null } });
  console.log(`\n--- MEAT INVENTORY ---`);
  console.log(`  Total Inventory Items: ${inventory.length}`);
  for (const i of inventory) console.log(`    ${i.name} | Qty: ${i.quantity} | Category: ${i.category}`);

  // Financial Periods / Locks
  const periods = await prisma.financialPeriod.findMany({ where: { farm_id: FARM_ID } });
  console.log(`\n--- FINANCIAL PERIODS (Phase 12 Locks) ---`);
  console.log(`  Locked Periods: ${periods.length}`);

  // Notifications/Alerts
  const alerts = await prisma.$queryRaw<any[]>`SELECT COUNT(*) as cnt FROM notifications WHERE farm_id = ${FARM_ID}::uuid`;
  console.log(`\n--- ALERTS/NOTIFICATIONS ---`);
  console.log(`  Total Alerts: ${Number(alerts[0].cnt)}`);

  // Summary
  console.log(`\n=== MODULE STATUS SUMMARY ===`);
  const modules = [
    { name: 'Animals/Batches',   ok: batches.length > 0 },
    { name: 'Rooms',             ok: rooms.length > 0 },
    { name: 'Feed Types',        ok: feedTypes.length > 0 },
    { name: 'Feed Consumptions', ok: feedConsumptions.length > 0 },
    { name: 'Water Usage',       ok: waterUsages.length > 0 },
    { name: 'Utility Meters',    ok: meters.length > 0 },
    { name: 'Electricity',       ok: elecUsages.length > 0 },
    { name: 'Mortality',         ok: mortality.length > 0 },
    { name: 'Slaughter',         ok: slaughter.length > 0 },
    { name: 'Meat Inventory',    ok: inventory.length > 0 },
    { name: 'Sales Invoices',    ok: invoices.length > 0 },
    { name: 'Customer Payments', ok: payments.length > 0 },
    { name: 'Expenses',          ok: expenses.length > 0 },
    { name: 'Customers',         ok: customers.length > 0 },
    { name: 'Suppliers',         ok: suppliers.length > 0 },
    { name: 'Financial Locks',   ok: periods.length > 0 },
    { name: 'Alerts',            ok: Number(alerts[0].cnt) > 0 },
  ];
  for (const m of modules) {
    console.log(`  ${m.ok ? '✓' : '✗ EMPTY'} ${m.name}`);
  }
}

run().catch(console.error);
