import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";
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
    const result = await db.$transaction(async (tx) => {
      const invoice = await tx.salesInvoice.findFirst({
        where: { id: params.id, farm_id: farmId, deleted_at: null },
        include: { items: true }
      });

      if (!invoice) throw new Error("Invoice not found or already cancelled");

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

      return invoice;
    });

    await logAudit(session.user.id, farmId, "CANCEL", "SalesInvoice", result.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to cancel invoice" }, { status: 500 });
  }
}
