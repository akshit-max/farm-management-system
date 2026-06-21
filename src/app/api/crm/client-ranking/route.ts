import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { isOwner, isManager, isAccountant } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  if (!(isOwner(session) || isManager(session) || isAccountant(session))) {
    return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });
  }

  try {
    const customers = await db.customer.findMany({
      where: { farm_id: farmId, status: "ACTIVE" },
      include: {
        sales_invoices: {
          where: { deleted_at: null },
          include: { payments: { where: { deleted_at: null } } }
        }
      }
    });

    const report = customers.map(customer => {
      let revenue = 0;
      let orderCount = 0;
      let outstandingBalance = 0;
      let totalDaysToPay = 0;
      let paidInvoicesCount = 0;

      for (const inv of customer.sales_invoices) {
        orderCount++;
        revenue += inv.total;

        const paid = inv.payments.reduce((sum: number, p: any) => sum + p.amount, 0);
        outstandingBalance += (inv.total - paid);

        if (inv.payment_status === 'PAID' && inv.payments.length > 0) {
          // Find the last payment date
          const lastPaymentDate = new Date(Math.max(...inv.payments.map((p: any) => new Date(p.payment_date).getTime())));
          const daysToPay = Math.max(0, (lastPaymentDate.getTime() - new Date(inv.invoice_date).getTime()) / (1000 * 3600 * 24));
          totalDaysToPay += daysToPay;
          paidInvoicesCount++;
        }
      }

      const avgOrderValue = orderCount > 0 ? revenue / orderCount : 0;
      const avgDaysToPay = paidInvoicesCount > 0 ? totalDaysToPay / paidInvoicesCount : 0;

      return {
        id: customer.id,
        name: customer.company_name,
        company: customer.company_name,
        revenue,
        orderCount,
        avgOrderValue,
        outstandingBalance,
        avgDaysToPay
      };
    });

    report.sort((a, b) => b.revenue - a.revenue);

    return NextResponse.json({ data: report });
  } catch (error) {
    console.error("Client Ranking Error:", error);
    return NextResponse.json({ error: "Failed to generate client ranking" }, { status: 500 });
  }
}
