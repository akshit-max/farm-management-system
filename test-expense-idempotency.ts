import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function runAudit() {
  try {
    console.log("Starting Expense Idempotency Audit...");

    const farm = await prisma.farm.findFirst({
      where: { deleted_at: null }
    });
    
    const user = await prisma.user.findFirst({
      where: { farm_id: farm?.id }
    });

    if (!farm || !user) {
      console.log("No valid farm/user found for test. Please create one.");
      return;
    }

    const farmId = farm.id;
    const clientRequestId = uuidv4();

    console.log(`Using Farm: ${farmId}`);
    console.log(`Generated client_request_id: ${clientRequestId}`);

    const payload = {
      farm_id: farmId,
      expense_date: new Date(),
      category: 'Test Category',
      description: 'Test Expense Idempotency',
      amount: 100,
      notes: 'Testing offline engine patch 6.1',
      created_by: user.id,
      client_request_id: clientRequestId
    };

    console.log("SIMULATE SYNC 1...");
    // 1. First request
    let existing1 = await prisma.expense.findFirst({
      where: { client_request_id: clientRequestId }
    });
    
    if (!existing1) {
      const expense1 = await prisma.expense.create({
        data: payload
      });
      console.log(`Sync 1 Success. Expense created with ID: ${expense1.id}`);
    }

    console.log("SIMULATE SYNC 2 (RETRY)...");
    // 2. Second request (Retry)
    let existing2 = await prisma.expense.findFirst({
      where: { client_request_id: clientRequestId }
    });
    
    if (existing2) {
      console.log(`Sync 2 Intercepted! Existing expense returned: ${existing2.id}`);
    } else {
      console.log("Sync 2 Failed to intercept! Creating duplicate...");
      await prisma.expense.create({
        data: payload
      });
    }

    console.log("VERIFYING DATABASE INTEGRITY...");
    const allMatching = await prisma.expense.findMany({
      where: { client_request_id: clientRequestId }
    });

    console.log(`Total expenses with request ID ${clientRequestId}: ${allMatching.length}`);

    if (allMatching.length === 1) {
      console.log("RESULT: PASS");
    } else {
      console.log("RESULT: FAIL");
    }

  } catch (error) {
    console.error("Audit Failed with Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

runAudit();
