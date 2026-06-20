import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { isManager, isAccountant } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(isManager(session) || isAccountant(session))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const [salesAggregate, paymentsAggregate, invoicesCount] = await Promise.all([
      db.salesInvoice.aggregate({
        where: { farm_id: farmId, deleted_at: null },
        _sum: { total: true },
      }),
      db.customerPayment.aggregate({
        where: { farm_id: farmId, deleted_at: null },
        _sum: { amount: true },
      }),
      db.salesInvoice.count({
        where: { farm_id: farmId, deleted_at: null },
      }),
    ]);

    const totalRevenue = salesAggregate._sum.total || 0;
    const paidRevenue = paymentsAggregate._sum.amount || 0;
    
    // Formula from requirement: Receivables = SUM(invoice totals) - SUM(payments)
    const receivables = Math.max(0, totalRevenue - paidRevenue);
    
    // Pending Revenue is effectively the Outstanding Balance (Receivables)
    const pendingRevenue = receivables;

    return NextResponse.json({
      data: {
        total: totalRevenue,
        pending: pendingRevenue,
        paid: paidRevenue,
        invoices: invoicesCount,
      },
    });
  } catch (error) {
    console.error("Sales KPIs Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch sales KPIs" },
      { status: 500 }
    );
  }
}
