const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const invoices = await prisma.salesInvoice.findMany({
    where: { payment_status: { in: ['PAID', 'PARTIAL'] }, deleted_at: null },
    include: { payments: { where: { deleted_at: null } }, customer: true }
  });
  
  const mismatches = invoices.filter(inv => inv.payments.length === 0);
  
  console.log('=== Historical Invoice Audit Report ===');
  if(mismatches.length === 0) {
    console.log('No inconsistent invoices found.');
  } else {
    mismatches.forEach(inv => {
      console.log(`- Invoice Number: ${inv.invoice_number} | Customer: ${inv.customer.company_name} | Total: ₹${inv.total} | Status: ${inv.payment_status}`);
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
