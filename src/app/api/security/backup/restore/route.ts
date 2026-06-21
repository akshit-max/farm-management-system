import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { isManager } from "@/lib/rbac";
import { getStorageProvider } from "@/lib/storageProvider";
import { logAuditEvent } from "@/lib/auditLogger";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isManager(session)) return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });

  try {
    const { backup_id, is_dry_run = true } = await req.json();

    const backup = await db.backupHistory.findFirst({
      where: { id: backup_id, farm_id: farmId }
    });

    if (!backup) return NextResponse.json({ error: "Backup not found" }, { status: 404 });

    // 1. Fetch from Storage
    const storage = getStorageProvider();
    const exists = await storage.exists(backup.storage_path!);
    if (!exists) return NextResponse.json({ error: "Backup file missing from storage" }, { status: 404 });

    const buffer = await storage.download(backup.storage_path!);

    // 2. Cryptographic Checksum Validation
    const computedChecksum = crypto.createHash('sha256').update(buffer).digest('hex');
    if (computedChecksum !== backup.checksum) {
      // Security Event Logging
      await logAuditEvent({
        userId: session.user.id,
        farmId,
        module: "SECURITY",
        action: "RESTORE_BACKUP",
        entityType: "BackupHistory",
        entityId: backup.id,
        severity: "CRITICAL",
        reason: "Checksum mismatch during dry run validation"
      });
      return NextResponse.json({ error: "CORRUPT BACKUP: Checksum validation failed" }, { status: 400 });
    }

    // 3. Parse JSON Data
    const payload = JSON.parse(buffer.toString('utf-8'));

    // 4. Dry Run Analysis Report
    const analysis = {
      timestamp: payload.timestamp,
      version: payload.version,
      checksum_match: true,
      records: {
        financialPeriods: payload.data.financialPeriods?.length || 0,
        salesInvoices: payload.data.salesInvoices?.length || 0,
        customerPayments: payload.data.customerPayments?.length || 0,
        expenses: payload.data.expenses?.length || 0,
        animalBatches: payload.data.animalBatches?.length || 0,
        waterUsages: payload.data.waterUsages?.length || 0,
        auditLogs: payload.data.auditLogs?.length || 0,
        notifications: payload.data.notifications?.length || 0,
        customers: payload.data.customers?.length || 0,
        suppliers: payload.data.suppliers?.length || 0,
      },
      warning: "This is a DRY RUN validation report. No data was mutated."
    };

    if (is_dry_run) {
      await logAuditEvent({
        userId: session.user.id,
        farmId,
        module: "SECURITY",
        action: "DRY_RUN_RESTORE",
        entityType: "BackupHistory",
        entityId: backup.id,
        severity: "INFO"
      });
      return NextResponse.json({ success: true, analysis });
    }

    // If actual restore is triggered (Phase 13+), we would execute here.
    // For Phase 12, actual restore is blocked to prevent accidental overwrite in production.
    return NextResponse.json({ error: "Actual restore blocked in Phase 12 for safety. Dry run successful." }, { status: 403 });

  } catch (error: any) {
    return NextResponse.json({ error: "Restore validation failed", details: error.message }, { status: 500 });
  }
}
