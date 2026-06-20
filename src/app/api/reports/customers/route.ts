import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { isManager, isAccountant } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isManager(session) && !isAccountant(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "month";
  const startParam = searchParams.get("startDate");
  const endParam = searchParams.get("endDate");

  let startDate: Date | undefined;
  let endDate: Date | undefined;
  const now = new Date();

  if (startParam && endParam) {
    startDate = new Date(startParam);
    endDate = new Date(endParam);
    endDate.setHours(23, 59, 59, 999);
  } else if (period === "today") {
    startDate = new Date(now.setHours(0,0,0,0));
    endDate = new Date(now.setHours(23,59,59,999));
  } else if (period === "week") {
    startDate = new Date(now);
    startDate.setDate(now.getDate() - now.getDay());
    startDate.setHours(0,0,0,0);
    endDate = new Date(now);
    endDate.setHours(23,59,59,999);
  } else if (period === "month") {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  } else if (period === "year") {
    startDate = new Date(now.getFullYear(), 0, 1);
    endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
  }

  const dateFilter = startDate && endDate ? { gte: startDate, lte: endDate } : undefined;

  try {
    const [sales, payments, allSales] = await Promise.all([
      db.salesInvoice.findMany({
        where: { farm_id: farmId, deleted_at: null, ...(dateFilter ? { invoice_date: dateFilter } : {}) },
        include: { customer: true }
      }),
      db.customerPayment.findMany({
        where: { farm_id: farmId, deleted_at: null }
      }),
      db.salesInvoice.findMany({ where: { farm_id: farmId, deleted_at: null } })
    ]);

    const cMap: Record<string, any> = {};
    sales.forEach(s => {
      const cId = s.customer_id || 'Unknown';
      if (!cMap[cId]) cMap[cId] = { name: s.customer?.company_name || 'Unknown', revenue: 0, count: 0, lastDate: s.invoice_date };
      cMap[cId].revenue += s.total;
      cMap[cId].count++;
      if (s.invoice_date > cMap[cId].lastDate) cMap[cId].lastDate = s.invoice_date;
    });

    const outMap: Record<string, number> = {};
    allSales.forEach(s => {
      const cId = s.customer_id || 'Unknown';
      outMap[cId] = (outMap[cId] || 0) + s.total;
    });
    payments.forEach(p => {
      const cId = p.customer_id || 'Unknown';
      outMap[cId] = (outMap[cId] || 0) - p.amount;
    });

    const rows = Object.entries(cMap).map(([cId, d]) => ({
      customer: d.name,
      revenue: d.revenue,
      count: d.count,
      lastDate: new Date(d.lastDate).toISOString().split('T')[0],
      outstanding: Math.max(0, outMap[cId] || 0)
    })).sort((a, b) => b.revenue - a.revenue);

    const distribution = rows.map(r => ({ name: r.customer, value: r.revenue })).slice(0, 10);

    return NextResponse.json({ data: { rows, charts: { distribution } } });
  } catch (error) {
    console.error("customers report error:", error);
    return NextResponse.json({ error: "Failed to fetch report data" }, { status: 500 });
  }
}