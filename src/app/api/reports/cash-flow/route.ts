import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { isOwner, isManager, isAccountant } from "@/lib/rbac";
import { checkFinancialLock } from "@/lib/financialLock"; // Just for reference, reports don't lock but they respect locked periods in some contexts (e.g., distinguishing closed vs open).

export async function GET(req: NextRequest) {
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  if (!(isOwner(session) || isManager(session) || isAccountant(session))) {
    return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const startDateStr = searchParams.get("startDate");
  const endDateStr = searchParams.get("endDate");

  if (!startDateStr || !endDateStr) {
    return NextResponse.json({ error: "Missing date range" }, { status: 400 });
  }

  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);

  try {
    // 1. Operating Cash Inflow
    const customerPayments = await db.customerPayment.findMany({
      where: {
        farm_id: farmId,
        payment_date: { gte: startDate, lte: endDate },
        deleted_at: null,
      }
    });
    
    // Sometimes cash sales are recorded directly without a separate payment record.
    // If the system assumes all revenue is cash unless marked otherwise, we might include it.
    // But standard accounting: Cash Inflow = Customer Payments.
    const cashReceived = customerPayments.reduce((sum, p) => sum + p.amount, 0);

    // 2. Operating Cash Outflow
    const expenses = await db.expense.findMany({
      where: {
        farm_id: farmId,
        expense_date: { gte: startDate, lte: endDate },
        deleted_at: null,
      }
    });

    // Also include animal batch purchases as outflows if they represent cash paid.
    const batches = await db.animalBatch.findMany({
      where: {
        farm_id: farmId,
        arrival_date: { gte: startDate, lte: endDate },
        deleted_at: null,
      }
    });

    const waterUsages = await db.waterUsage.findMany({
      where: {
        farm_id: farmId,
        date: { gte: startDate, lte: endDate },
        deleted_at: null,
      }
    });

    const electricityUsages = await db.electricityUsage.findMany({
      where: {
        farm_id: farmId,
        date: { gte: startDate, lte: endDate },
        deleted_at: null,
      }
    });

    const expenseTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
    const batchTotal = batches.reduce((sum, b) => sum + (b.initial_quantity * b.cost_per_animal), 0);
    const waterTotal = waterUsages.reduce((sum, w) => sum + w.total_cost, 0);
    const electricityTotal = electricityUsages.reduce((sum, e) => sum + e.total_cost, 0);

    const cashPaid = expenseTotal + batchTotal + waterTotal + electricityTotal;

    const netMovement = cashReceived - cashPaid;

    // Calculate opening cash (everything before startDate)
    // Inflow before start
    const priorPayments = await db.customerPayment.findMany({
      where: { farm_id: farmId, payment_date: { lt: startDate }, deleted_at: null }
    });
    const priorIn = priorPayments.reduce((sum, p) => sum + p.amount, 0);

    // Outflow before start
    const priorExpenses = await db.expense.findMany({
      where: { farm_id: farmId, expense_date: { lt: startDate }, deleted_at: null }
    });
    const priorBatches = await db.animalBatch.findMany({
      where: { farm_id: farmId, arrival_date: { lt: startDate }, deleted_at: null }
    });
    const priorWater = await db.waterUsage.findMany({
      where: { farm_id: farmId, date: { lt: startDate }, deleted_at: null }
    });
    const priorElectricity = await db.electricityUsage.findMany({
      where: { farm_id: farmId, date: { lt: startDate }, deleted_at: null }
    });

    const priorOut = priorExpenses.reduce((sum, e) => sum + e.amount, 0) +
                     priorBatches.reduce((sum, b) => sum + (b.initial_quantity * b.cost_per_animal), 0) +
                     priorWater.reduce((sum, w) => sum + w.total_cost, 0) +
                     priorElectricity.reduce((sum, e) => sum + e.total_cost, 0);

    const openingCash = priorIn - priorOut;
    const closingCash = openingCash + netMovement;

    return NextResponse.json({
      metrics: {
        openingCash,
        cashReceived,
        cashPaid,
        netMovement,
        closingCash
      },
      breakdown: {
        inflows: {
          customerPayments: cashReceived
        },
        outflows: {
          expenses: expenseTotal,
          animalPurchases: batchTotal,
          water: waterTotal,
          electricity: electricityTotal
        }
      }
    });

  } catch (error) {
    console.error("Cash Flow Report Error:", error);
    return NextResponse.json({ error: "Failed to generate cash flow report" }, { status: 500 });
  }
}
