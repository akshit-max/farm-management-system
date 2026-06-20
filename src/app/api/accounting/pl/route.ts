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
    const [sales, expenses, feed, water, electricity] = await Promise.all([
      db.salesInvoice.aggregate({
        _sum: { total: true },
        where: { farm_id: farmId, deleted_at: null, ...(dateFilter ? { invoice_date: dateFilter } : {}) }
      }),
      db.expense.aggregate({
        _sum: { amount: true },
        where: { farm_id: farmId, deleted_at: null, ...(dateFilter ? { expense_date: dateFilter } : {}) }
      }),
      db.feedConsumption.aggregate({
        _sum: { cost: true },
        where: { farm_id: farmId, deleted_at: null, ...(dateFilter ? { date: dateFilter } : {}) }
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

    // Fetch expense categories breakdown
    const expenseBreakdown = await db.expense.groupBy({
      by: ['category'],
      _sum: { amount: true },
      where: { farm_id: farmId, deleted_at: null, ...(dateFilter ? { expense_date: dateFilter } : {}) }
    });

    const totalRevenue = sales._sum.total || 0;
    const manualExpenses = expenses._sum.amount || 0;
    const feedCost = feed._sum.cost || 0;
    const waterCost = water._sum.total_cost || 0;
    const electricityCost = electricity._sum.total_cost || 0;

    const totalExpenses = manualExpenses + feedCost + waterCost + electricityCost;
    const netProfit = totalRevenue - totalExpenses;
    const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    return NextResponse.json({
      data: {
        revenue: { total: totalRevenue },
        expenses: {
          total: totalExpenses,
          feed: feedCost,
          water: waterCost,
          electricity: electricityCost,
          manual: manualExpenses,
          breakdown: expenseBreakdown.map(e => ({ category: e.category, amount: e._sum.amount || 0 }))
        },
        profit: netProfit,
        margin: netMargin
      }
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch P&L data" }, { status: 500 });
  }
}
