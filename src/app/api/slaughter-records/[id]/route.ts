import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";
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

    // Note: We don't restore batch quantity on slaughter delete. It's too complex and might result in negative values if animals were further processed or died.
    // Soft delete slaughter record only.
    await db.slaughterRecord.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    await logAudit(session.user.id, farmId, "DELETE", "SlaughterRecord", id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete slaughter record" }, { status: 500 });
  }
}
