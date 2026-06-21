import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { isOwner } from "@/lib/rbac";
import { getStorageProvider } from "@/lib/storageProvider";
import { logAuditEvent } from "@/lib/auditLogger";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: backupId } = await params;
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  // Strict Owner-only per instructions
  if (!isOwner(session)) return NextResponse.json({ error: "Unauthorized role. Owner access required." }, { status: 403 });

  try {
    const backup = await db.backupHistory.findFirst({
      where: { id: backupId, farm_id: farmId }
    });

    if (!backup) return NextResponse.json({ error: "Backup not found" }, { status: 404 });

    const storage = getStorageProvider();
    const exists = await storage.exists(backup.storage_path!);
    if (!exists) return NextResponse.json({ error: "Backup file missing from storage" }, { status: 404 });

    const buffer = await storage.download(backup.storage_path!);

    await logAuditEvent({
      userId: session.user.id,
      farmId,
      module: "SECURITY",
      action: "DOWNLOAD_BACKUP_JSON",
      entityType: "BackupHistory",
      entityId: backup.id,
      severity: "WARNING",
      reason: "Full database JSON extraction"
    });

    const response = new NextResponse(buffer as unknown as BodyInit);
    response.headers.set('Content-Type', 'application/json');
    response.headers.set('Content-Disposition', `attachment; filename="Farm_Backup_${backup.id}.json"`);
    return response;
  } catch (error: any) {
    console.error("Backup JSON download failed", error);
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}
