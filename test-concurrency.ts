import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function runConcurrencyTest() {
  const FARM_ID = 'd9b82079-3261-4c83-b30f-321903ceb57d';
  
  // 1. Create a dummy customer
  const customer = await prisma.customer.create({
    data: {
      farm_id: FARM_ID,
      company_name: 'Concurrent Test Customer',
      customer_type: 'WHOLESALER',
      credit_limit: 10000,
    }
  });

  // 2. Add an existing invoice to make outstanding = 8000
  await prisma.salesInvoice.create({
    data: {
      farm_id: FARM_ID,
      customer_id: customer.id,
      invoice_number: 'INV-TEST-OLD',
      invoice_date: new Date(),
      total: 8000,
      subtotal: 8000,
      payment_status: 'PENDING',
    }
  });

  // 3. Define the transaction logic exactly as it is in the API
  const makeSale = async (invNumber: string) => {
    try {
      await prisma.$transaction(async (tx) => {
        // Read outstanding balance
        const txCustomer = await tx.customer.findUnique({
          where: { id: customer.id },
          include: { sales_invoices: { where: { deleted_at: null }, include: { payments: { where: { deleted_at: null } } } } }
        });

        let currentOutstanding = 0;
        if (txCustomer) {
          for (const inv of txCustomer.sales_invoices) {
            const paid = inv.payments.reduce((sum: number, p: any) => sum + p.amount, 0);
            currentOutstanding += (inv.total - paid);
          }
        }

        const newTotal = 1500;
        const projectedOutstanding = currentOutstanding + newTotal;

        // Artificial delay to force concurrency overlap
        await new Promise(res => setTimeout(res, 500));

        if (txCustomer && txCustomer.credit_limit !== null && projectedOutstanding > txCustomer.credit_limit) {
          throw new Error("CREDIT_LIMIT_EXCEEDED: Credit limit exceeded");
        }

        // Insert new invoice
        await tx.salesInvoice.create({
          data: {
            farm_id: FARM_ID,
            customer_id: customer.id,
            invoice_number: invNumber,
            invoice_date: new Date(),
            total: newTotal,
            subtotal: newTotal,
            payment_status: 'PENDING',
          }
        });

      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      return "SUCCESS";
    } catch (err: any) {
      return err.message;
    }
  };

  // 4. Run simultaneously
  console.log("Starting concurrent transactions...");
  const results = await Promise.all([
    makeSale('INV-TEST-A'),
    makeSale('INV-TEST-B')
  ]);

  console.log("Transaction A Result:", results[0]);
  console.log("Transaction B Result:", results[1]);

  // Cleanup
  await prisma.salesInvoice.deleteMany({ where: { customer_id: customer.id } });
  await prisma.customer.delete({ where: { id: customer.id } });
}

runConcurrencyTest()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
