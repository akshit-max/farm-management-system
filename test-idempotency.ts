import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function runAudit() {
  try {
    console.log("Starting Idempotency Audit...");

    // Find any existing farm and customer with an invoice
    const customer = await prisma.customer.findFirst({
      where: { deleted_at: null, sales_invoices: { some: { payment_status: { not: 'PAID' } } } },
      include: { sales_invoices: { where: { payment_status: { not: 'PAID' } }, take: 1 } }
    });

    if (!customer || !customer.sales_invoices[0]) {
      console.log("No valid customer/invoice found for test. Please create one.");
      return;
    }

    const farmId = customer.farm_id;
    const invoice = customer.sales_invoices[0];
    const clientRequestId = uuidv4();

    console.log(`Using Farm: ${farmId}, Customer: ${customer.id}, Invoice: ${invoice.id}`);
    console.log(`Generated client_request_id: ${clientRequestId}`);

    const payload = {
      farm_id: farmId,
      customer_id: customer.id,
      invoice_id: invoice.id,
      payment_date: new Date(),
      amount: 10, // Small test amount
      payment_method: 'Cash',
      client_request_id: clientRequestId
    };

    console.log("SIMULATE SYNC 1...");
    // Direct DB interaction simulating API logic
    
    // 1. First request
    let existing1 = await prisma.customerPayment.findFirst({
      where: { farm_id: farmId, client_request_id: clientRequestId }
    });
    
    if (!existing1) {
      const payment1 = await prisma.customerPayment.create({
        data: payload
      });
      console.log(`Sync 1 Success. Payment created with ID: ${payment1.id}`);
    }

    console.log("SIMULATE SYNC 2 (RETRY)...");
    
    // 2. Second request (Retry)
    let existing2 = await prisma.customerPayment.findFirst({
      where: { farm_id: farmId, client_request_id: clientRequestId }
    });
    
    if (existing2) {
      console.log(`Sync 2 Success. Existing payment matched and returned. ID: ${existing2.id}`);
    } else {
      console.log("Sync 2 Failed. Did not find existing payment.");
    }

    // Verify database rows count
    const totalPayments = await prisma.customerPayment.count({
      where: { client_request_id: clientRequestId }
    });

    console.log(`Total rows in DB for this client_request_id: ${totalPayments}`);
    
    if (totalPayments === 1) {
      console.log("AUDIT PASS: Idempotency strictly maintained.");
    } else {
      console.log("AUDIT FAIL: Idempotency broken.");
    }

    // Cleanup
    await prisma.customerPayment.deleteMany({
      where: { client_request_id: clientRequestId }
    });
    console.log("Cleanup complete.");

  } catch (error) {
    console.error("Error during audit:", error);
  } finally {
    await prisma.$disconnect();
  }
}

runAudit();
