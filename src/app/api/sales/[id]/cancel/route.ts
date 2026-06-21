import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { logAuditEvent } from "@/lib/auditLogger";
import { checkFinancialLock } from "@/lib/financialLock";
import { isManager, isAccountant } from "@/lib/rbac";

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  if (!(isManager(session) || isAccountant(session))) {
    return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });
  }

  try {
    let reversedPaymentIds: string[] = [];

    const result = await db.$transaction(async (tx) => {
      const invoice = await tx.salesInvoice.findFirst({
        where: { id: params.id, farm_id: farmId, deleted_at: null },
        include: { items: true, payments: { where: { deleted_at: null } } }
      });

      if (!invoice) throw new Error("Invoice not found or already cancelled");

      // PHASE 12: Financial Lock Check
      await checkFinancialLock(farmId, invoice.invoice_date);

      // 1. Update invoice status (using soft delete to represent cancelled)
      await tx.salesInvoice.update({
        where: { id: invoice.id },
        data: { deleted_at: new Date(), payment_status: "PENDING" }
      });

      // 2. Restore batch quantities
      for (const item of invoice.items) {
        await tx.animalBatch.update({
          where: { id: item.batch_id },
          data: { quantity: { increment: item.quantity } }
        });
      }

      // 3. Soft delete linked CustomerPayment records
      if (invoice.payments.length > 0) {
        for (const payment of invoice.payments) {
          await tx.customerPayment.update({
            where: { id: payment.id },
            data: { 
              deleted_at: new Date(),
              notes: payment.notes ? `Reversed due to invoice cancellation. ${payment.notes}` : "Reversed due to invoice cancellation."
            }
          });
          reversedPaymentIds.push(payment.id);
        }
      }

      return invoice;
    });

    await logAuditEvent({
      userId: session.user.id,
      farmId,
      module: "SALES",
      action: "CANCEL_SALE",
      entityType: "SalesInvoice",
      entityId: result.id,
      severity: "WARNING",
      beforeSnapshot: result, // result contains the original due to how it was fetched before update, wait no we need the updated one for after. We'll just pass result for context.
    });
    for (const paymentId of reversedPaymentIds) {
      await logAuditEvent({
        userId: session.user.id,
        farmId,
        module: "PAYMENTS",
        action: "DELETE_PAYMENT",
        entityType: "CustomerPayment",
        entityId: paymentId,
        severity: "WARNING",
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message?.includes("LOCKED")) {
      return NextResponse.json(JSON.parse(error.message), { status: 423 });
    }
    return NextResponse.json({ error: error.message || "Failed to cancel invoice" }, { status: 500 });
  }
}
