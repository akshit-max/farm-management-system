import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const customer = await db.customer.findFirst({
      where: { id, farm_id: farmId, deleted_at: null },
      include: {
        sales_invoices: {
          where: { deleted_at: null },
          orderBy: { invoice_date: "desc" }
        },
        payments: {
          where: { deleted_at: null },
          orderBy: { payment_date: "desc" }
        }
      }
    });

    if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

    const totalSales = customer.sales_invoices.reduce((sum, inv) => sum + inv.total, 0);
    const totalPayments = customer.payments.reduce((sum, p) => sum + p.amount, 0);
    const outstanding = totalSales - totalPayments;

    return NextResponse.json({
      data: {
        customer,
        metrics: {
          total_sales: totalSales,
          total_payments: totalPayments,
          outstanding_balance: outstanding,
          invoice_count: customer.sales_invoices.length,
          last_payment_date: customer.payments.length > 0 ? customer.payments[0].payment_date : null
        }
      }
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch customer ledger" }, { status: 500 });
  }
}
