import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { isManager, isAccountant } from "@/lib/rbac";
import { resolveDateRange } from "@/lib/dateUtils";

export async function GET(req: NextRequest) {
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isManager(session) && !isAccountant(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "all";

  // For P&L, 'all' means no date restriction. For named periods, use shared helper.
  const { dateFilter } = period === "all"
    ? { dateFilter: undefined }
    : resolveDateRange(period, searchParams.get("startDate"), searchParams.get("endDate"));

  try {
    const [sales, expenses, water, electricity] = await Promise.all([
      db.salesInvoice.aggregate({
        _sum: { total: true },
        where: { farm_id: farmId, deleted_at: null, ...(dateFilter ? { invoice_date: dateFilter } : {}) }
      }),
      db.expense.aggregate({
        _sum: { amount: true },
        where: { farm_id: farmId, deleted_at: null, ...(dateFilter ? { expense_date: dateFilter } : {}) }
      }),
      db.waterUsage.aggregate({
        _sum: { total_cost: true },
        where: { farm_id: farmId, deleted_at: null, ...(dateFilter ? { date: dateFilter } : {}) }
      }),
      db.electricityUsage.aggregate({
        _sum: { total_cost: true },
        where: { farm_id: farmId, deleted_at: null, ...(dateFilter ? { date: dateFilter } : {}) }
      })
    ]);

    const totalRevenue = sales._sum.total || 0;
    const allManualExpenses = expenses._sum.amount || 0;
    const waterCost = water._sum.total_cost || 0;
    const electricityCost = electricity._sum.total_cost || 0;

    // --- COGS CALCULATION ---
    // 1. Calculate proportional cost of sold animals (Purchase Cost + Feed Cost)
    const invoiceItems = await db.salesInvoiceItem.findMany({
      where: { 
        invoice: { farm_id: farmId, deleted_at: null, ...(dateFilter ? { invoice_date: dateFilter } : {}) },
        deleted_at: null 
      },
      include: { batch: { include: { feedConsumptions: true } } }
    });

    let proportionalAnimalAndFeedCOGS = 0;
    for (const item of invoiceItems) {
      if (item.batch && item.batch.initial_quantity > 0) {
        const initialCost = item.batch.initial_quantity * item.batch.cost_per_animal;
        const batchFeedCost = item.batch.feedConsumptions.reduce((sum, f) => sum + f.cost, 0);
        const unitCost = (initialCost + batchFeedCost) / item.batch.initial_quantity;
        proportionalAnimalAndFeedCOGS += (item.quantity * unitCost);
      }
    }

    // 2. Global Slaughter Costs (Approved for COGS inclusion)
    const slaughterExpenses = await db.expense.aggregate({
      _sum: { amount: true },
      where: { farm_id: farmId, deleted_at: null, category: { in: ['Slaughter', 'Processing', 'Butchery'] }, ...(dateFilter ? { expense_date: dateFilter } : {}) }
    });
    const slaughterCOGS = slaughterExpenses._sum.amount || 0;

    const totalCOGS = proportionalAnimalAndFeedCOGS + slaughterCOGS;
    const grossProfit = totalRevenue - totalCOGS;

    // --- OPERATING EXPENSES ---
    // Remove slaughter costs from the general manual expenses since they are now in COGS
    const operatingManualExpenses = allManualExpenses - slaughterCOGS;
    const totalOperatingExpenses = operatingManualExpenses + waterCost + electricityCost;
    
    const netProfit = grossProfit - totalOperatingExpenses;
    const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Fetch expense categories breakdown (exclude Slaughter for overhead view, but keep others)
    const expenseBreakdown = await db.expense.groupBy({
      by: ['category'],
      _sum: { amount: true },
      where: { farm_id: farmId, deleted_at: null, category: { notIn: ['Slaughter', 'Processing', 'Butchery'] }, ...(dateFilter ? { expense_date: dateFilter } : {}) }
    });

    return NextResponse.json({
      data: {
        revenue: { total: totalRevenue },
        expenses: {
          total: totalOperatingExpenses + totalCOGS, // Send total combined for backwards UI compatibility if needed
          cogs: totalCOGS,
          operating: totalOperatingExpenses,
          water: waterCost,
          electricity: electricityCost,
          manual: operatingManualExpenses,
          breakdown: expenseBreakdown.map(e => ({ category: e.category, amount: e._sum.amount || 0 }))
        },
        profit: netProfit,
        grossProfit: grossProfit,
        margin: netMargin
      }
    });
  } catch (error) {
    console.error("P&L Calculation Error:", error);
    return NextResponse.json({ error: "Failed to fetch P&L data" }, { status: 500 });
  }
}
