import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";
import { isManager, isAccountant } from "@/lib/rbac";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(isManager(session) || isAccountant(session))) return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });

  try {
    const payment = await db.customerPayment.findFirst({
      where: { id, farm_id: farmId, deleted_at: null },
    });
    if (!payment) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await db.$transaction(async (tx) => {
      await tx.customerPayment.update({
        where: { id },
        data: { deleted_at: new Date() }
      });

      // Recalculate invoice status
      const invoice = await tx.salesInvoice.findUnique({
        where: { id: payment.invoice_id },
        include: { payments: { where: { deleted_at: null } } }
      });

      if (invoice) {
        const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
        const newStatus = totalPaid === 0 ? "PENDING" : (Math.abs(invoice.total - totalPaid) < 0.01 ? "PAID" : "PARTIAL");
        
        await tx.salesInvoice.update({
          where: { id: invoice.id },
          data: { payment_status: newStatus }
        });
      }
    });

    await logAudit(session.user.id, farmId, "DELETE", "CustomerPayment", id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete payment" }, { status: 500 });
  }
}
