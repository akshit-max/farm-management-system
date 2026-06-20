const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const invoices = await prisma.salesInvoice.findMany({
    where: { deleted_at: null },
    include: { payments: { where: { deleted_at: null } }, customer: true }
  });
  
  const mismatches = invoices.filter(inv => {
    const paid = inv.payments.reduce((s,p) => s+p.amount, 0);
    const expectedStatus = paid === 0 ? 'PENDING' : (paid >= inv.total ? 'PAID' : 'PARTIAL');
    return inv.payment_status !== expectedStatus;
  });
  
  console.log('Mismatches:', JSON.stringify(mismatches.map(i => ({ 
    invoice_number: i.invoice_number, 
    customer: i.customer.company_name,
    total: i.total,
    current_status: i.payment_status,
    linked_payment_count: i.payments.length,
    linked_payment_amount: i.payments.reduce((s,p)=>s+p.amount,0)
  })), null, 2));
}

main().finally(() => prisma.$disconnect());
