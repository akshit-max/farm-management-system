const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orphanPayments = await prisma.customerPayment.findMany({
    where: { 
      deleted_at: null,
      invoice: { deleted_at: { not: null } }
    },
    include: { invoice: true }
  });

  if (orphanPayments.length === 0) {
    console.log('No orphaned payments found. Clean state.');
    return;
  }

  console.log(`Found ${orphanPayments.length} orphaned payments linked to cancelled invoices:`);
  
  for (const payment of orphanPayments) {
    console.log(`- Invoice: ${payment.invoice.invoice_number} | Payment Amount: ₹${payment.amount} | Date: ${payment.payment_date}`);
    
    // Safely soft-delete them
    await prisma.customerPayment.update({
      where: { id: payment.id },
      data: { 
        deleted_at: new Date(),
        notes: `Reversed due to invoice cancellation. Original notes: ${payment.notes || ''}`
      }
    });
  }

  console.log('Successfully reversed all orphaned payments.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
