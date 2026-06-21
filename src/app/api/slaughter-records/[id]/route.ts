import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { logAuditEvent } from "@/lib/auditLogger";
import { checkFinancialLock } from "@/lib/financialLock";
import { isManager } from "@/lib/rbac";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isManager(session)) return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });

  try {
    const existing = await db.slaughterRecord.findFirst({
      where: { id, farm_id: farmId, deleted_at: null },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await checkFinancialLock(farmId, existing.slaughter_date);

    // Note: We don't restore batch quantity on slaughter delete. It's too complex and might result in negative values if animals were further processed or died.
    // Soft delete slaughter record only.
    await db.slaughterRecord.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    await logAuditEvent({
      userId: session.user.id,
      farmId,
      module: "SLAUGHTER",
      action: "DELETE_SLAUGHTER",
      entityType: "SlaughterRecord",
      entityId: id,
      severity: "WARNING",
      beforeSnapshot: existing,
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message?.includes("LOCKED")) {
      return NextResponse.json(JSON.parse(error.message), { status: 423 });
    }
    return NextResponse.json({ error: "Failed to delete slaughter record" }, { status: 500 });
  }
}
