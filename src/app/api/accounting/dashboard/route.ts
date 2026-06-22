import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { isManager, isAccountant, isOwner } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isManager(session) && !isAccountant(session) && !isOwner(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // 1. Profit & Loss Metrics
    const sales = await db.salesInvoice.aggregate({ _sum: { total: true }, where: { farm_id: farmId, deleted_at: null } });
    const expenses = await db.expense.aggregate({ _sum: { amount: true }, where: { farm_id: farmId, deleted_at: null } });
    const feed = await db.feedConsumption.aggregate({ _sum: { cost: true }, where: { farm_id: farmId, deleted_at: null } });
    const water = await db.waterUsage.aggregate({ _sum: { total_cost: true }, where: { farm_id: farmId, deleted_at: null } });
    const electricity = await db.electricityUsage.aggregate({ _sum: { total_cost: true }, where: { farm_id: farmId, deleted_at: null } });

    const totalRevenue = sales._sum.total || 0;
    const manualExpenses = expenses._sum.amount || 0;
    const feedCost = feed._sum.cost || 0;
    const waterCost = water._sum.total_cost || 0;
    const electricityCost = electricity._sum.total_cost || 0;
    
    // Note: Currently mimicking the existing P&L logic to avoid breaking any expectations before the audit.
    const totalExpenses = manualExpenses + feedCost + waterCost + electricityCost;
    const netProfit = totalRevenue - totalExpenses;

    // 2. Balance Sheet / Cash Position Metrics
    const payments = await db.customerPayment.findMany({ where: { farm_id: farmId, deleted_at: null } });
    const batches = await db.animalBatch.findMany({ where: { farm_id: farmId, deleted_at: null } });
    
    const totalCashIn = payments.reduce((acc, p) => acc + p.amount, 0);
    const expensesRaw = await db.expense.findMany({ where: { farm_id: farmId, deleted_at: null } });
    const waterUsages = await db.waterUsage.findMany({ where: { farm_id: farmId, deleted_at: null } });
    const electricUsages = await db.electricityUsage.findMany({ where: { farm_id: farmId, deleted_at: null } });

    const totalCashOut = expensesRaw.reduce((acc, e) => acc + e.amount, 0) +
                         batches.reduce((acc, b) => acc + (b.initial_quantity * b.cost_per_animal), 0) +
                         waterUsages.reduce((acc, w) => acc + w.total_cost, 0) +
                         electricUsages.reduce((acc, e) => acc + e.total_cost, 0);
    const cashPosition = totalCashIn - totalCashOut;

    // Receivables
    const invoices = await db.salesInvoice.findMany({
      where: { farm_id: farmId, deleted_at: null, payment_status: { not: 'PAID' } },
      include: { payments: true }
    });
    let receivables = 0;
    for (const inv of invoices) {
      const paid = inv.payments.filter(p => !p.deleted_at).reduce((acc, p) => acc + p.amount, 0);
      receivables += (inv.total - paid);
    }

    // Feed Inventory
    const feeds = await db.feedType.findMany({ where: { farm_id: farmId, deleted_at: null } });
    const feedInventoryValue = feeds.reduce((acc, f) => acc + (f.stock_quantity * f.cost_per_kg), 0);

    // Live Animal Asset Value
    const liveAnimals = batches.filter(b => b.status === 'ACTIVE');
    const liveAnimalAssetValue = liveAnimals.reduce((acc, b) => acc + (b.quantity * b.cost_per_animal), 0);

    // Payables (Currently un-implemented in schema, returning 0)
    const payables = 0;

    // 3. Expense Breakdown
    const expenseBreakdown = [
      { name: "Manual Expenses", value: manualExpenses },
      { name: "Feed", value: feedCost },
      { name: "Water", value: waterCost },
      { name: "Electricity", value: electricityCost }
    ];

    // 4. Recent Financial Activity (Combines Payments and Expenses)
    const recentExpenses = expensesRaw.map(e => ({
      id: e.id,
      date: e.expense_date,
      type: 'EXPENSE',
      description: e.description,
      amount: e.amount,
      category: e.category
    }));
    
    const recentPayments = payments.map(p => ({
      id: p.id,
      date: p.payment_date,
      type: 'PAYMENT_RECEIVED',
      description: `Payment via ${p.payment_method}`,
      amount: p.amount,
      category: 'Revenue'
    }));

    const recentActivity = [...recentExpenses, ...recentPayments]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    // 5. Revenue Trend (Last 6 Months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const recentInvoices = await db.salesInvoice.findMany({
      where: {
        farm_id: farmId,
        deleted_at: null,
        invoice_date: { gte: sixMonthsAgo }
      }
    });

    const trendMap = new Map();
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.toLocaleString('default', { month: 'short', year: 'numeric' });
      trendMap.set(key, 0);
    }

    recentInvoices.forEach(inv => {
      const key = inv.invoice_date.toLocaleString('default', { month: 'short', year: 'numeric' });
      if (trendMap.has(key)) {
        trendMap.set(key, trendMap.get(key) + inv.total);
      }
    });

    const revenueTrend = Array.from(trendMap.entries()).reverse().map(([month, amount]) => ({
      month,
      amount
    }));

    return NextResponse.json({
      data: {
        metrics: {
          totalRevenue,
          totalExpenses,
          netProfit,
          receivables,
          payables,
          cashPosition,
          liveAnimalAssetValue,
          feedInventoryValue
        },
        expenseBreakdown,
        recentActivity,
        revenueTrend
      }
    });
  } catch (error) {
    console.error("Accounts Dashboard API Error:", error);
    return NextResponse.json({ error: "Failed to load dashboard data" }, { status: 500 });
  }
}
