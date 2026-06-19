const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const invoices = await prisma.salesInvoice.findMany({
    where: { payment_status: { in: ['PAID', 'PARTIAL'] }, deleted_at: null },
    include: { payments: { where: { deleted_at: null } } }
  });
  
  const mismatches = invoices.filter(inv => inv.payments.length === 0);
  
  if (mismatches.length === 0) {
    console.log('No inconsistent invoices found to fix.');
    return;
  }
  
  console.log(`Found ${mismatches.length} inconsistent invoice(s). Fixing...`);
  
  for (const inv of mismatches) {
    await prisma.salesInvoice.update({
      where: { id: inv.id },
      data: { payment_status: 'PENDING' }
    });
    console.log(`Fixed Invoice ${inv.invoice_number}: Reset status to PENDING.`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
