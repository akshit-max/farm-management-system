import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const FARM_ID = 'd9b82079-3261-4c83-b30f-321903ceb57d';

async function auditPaymentTerms() {
  console.log("=== SCREEN 1: PAYMENT TERMS ===");
  const customers = await prisma.customer.findMany({ where: { farm_id: FARM_ID } });
  console.log(`Customers found: ${customers.length}`);
  for (const c of customers) {
    console.log(`${c.company_name} | Limit: ${c.credit_limit} | Days: ${c.credit_days}`);
  }
}

async function auditCRMRatings() {
  console.log("\n=== SCREEN 2: CRM RATINGS ===");
  const customers = await prisma.customer.findMany({
    where: { farm_id: FARM_ID, status: "ACTIVE" },
    include: { sales_invoices: { where: { deleted_at: null }, include: { payments: { where: { deleted_at: null } } } } }
  });

  for (const c of customers) {
    let score = 3;
    let revenue = 0;
    let latePayments = 0;

    for (const inv of c.sales_invoices) {
      revenue += inv.total;
      if (inv.payment_status !== 'PAID' && new Date() > new Date(inv.invoice_date.getTime() + 30 * 24 * 60 * 60 * 1000)) {
        latePayments++;
      }
    }

    if (revenue > 10000) score += 1;
    if (revenue > 50000) score += 1;
    if (latePayments > 2) score -= 1;
    if (latePayments > 5) score -= 1;
    score = Math.max(1, Math.min(5, score));

    console.log(`Customer: ${c.company_name} | Calc: ${score} | Override: ${c.rating_override} | Final: ${c.rating_override !== null ? c.rating_override : score}`);
  }

  const suppliers = await prisma.supplier.findMany({
    where: { farm_id: FARM_ID, status: "ACTIVE" },
    include: { feed_types: { include: { consumptions: { include: { batch: { include: { mortalities: true } } } } } } }
  });

  for (const s of suppliers) {
    let score = 3;
    let volume = 0;
    let mortalities = 0;
    
    for (const ft of s.feed_types) {
      for (const fc of ft.consumptions) {
        volume += fc.quantity_kg;
        if (fc.batch) mortalities += fc.batch.mortalities.reduce((acc: any, m: any) => acc + m.quantity, 0);
      }
    }

    if (volume > 5000) score += 1;
    if (volume > 20000) score += 1;
    if (mortalities > 50) score -= 1;
    if (mortalities > 200) score -= 1;
    score = Math.max(1, Math.min(5, score));

    console.log(`Supplier: ${s.company_name} | Calc: ${score} | Override: ${s.rating_override} | Final: ${s.rating_override !== null ? s.rating_override : score}`);
  }
}

async function run() {
  await auditPaymentTerms();
  await auditCRMRatings();
}
run().catch(console.error).finally(() => prisma.$disconnect());
