import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { isManager } from "@/lib/rbac";
import { getStorageProvider } from "@/lib/storageProvider";
import { logAuditEvent } from "@/lib/auditLogger";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isManager(session)) return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });

  try {
    const history = await db.backupHistory.findMany({
      where: { farm_id: farmId },
      orderBy: { created_at: "desc" },
      take: 10
    });
    const serializedHistory = history.map(h => ({ ...h, file_size: Number(h.file_size) }));
    return NextResponse.json({ data: serializedHistory });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch backups" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isManager(session)) return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });

  try {
    // Phase 12 JSON Aggregation Engine for Disaster Recovery
    const snapshot = {
      timestamp: new Date().toISOString(),
      farm_id: farmId,
      version: "1.0",
      data: {
        financialPeriods: await db.financialPeriod.findMany({ where: { farm_id: farmId } }),
        customers: await db.customer.findMany({ where: { farm_id: farmId } }),
        suppliers: await db.supplier.findMany({ where: { farm_id: farmId } }),
        animalCategories: await db.animalCategory.findMany({ where: { farm_id: farmId } }),
        animalBatches: await db.animalBatch.findMany({ where: { farm_id: farmId } }),
        feedTypes: await db.feedType.findMany({ where: { farm_id: farmId } }),
        salesInvoices: await db.salesInvoice.findMany({ where: { farm_id: farmId }, include: { items: true } }),
        customerPayments: await db.customerPayment.findMany({ where: { farm_id: farmId } }),
        expenses: await db.expense.findMany({ where: { farm_id: farmId } }),
        waterUsages: await db.waterUsage.findMany({ where: { farm_id: farmId } }),
        electricityUsages: await db.electricityUsage.findMany({ where: { farm_id: farmId } }),
        feedConsumptions: await db.feedConsumption.findMany({ where: { farm_id: farmId } }),
        slaughterRecords: await db.slaughterRecord.findMany({ where: { farm_id: farmId } }),
        auditLogs: await db.auditLog.findMany({ where: { farm_id: farmId } }),
        notifications: await db.notification.findMany({ where: { farm_id: farmId } }),
        mortalities: await db.mortality.findMany({ where: { batch: { farm_id: farmId } } }),
        vaccinations: await db.vaccination.findMany({ where: { batch: { farm_id: farmId } } }),
        rooms: await db.room.findMany({ where: { farm_id: farmId } }),
        inventoryItems: await db.inventoryItem.findMany({ where: { farm_id: farmId } }),
        salesInvoiceItems: await db.salesInvoiceItem.findMany({ where: { invoice: { farm_id: farmId } } }),
      }
    };

    const payloadString = JSON.stringify(snapshot);
    const buffer = Buffer.from(payloadString, 'utf-8');
    
    // Hash for Data Integrity
    const checksum = crypto.createHash('sha256').update(buffer).digest('hex');
    const key = `backup_${farmId}_${Date.now()}.json`;

    // Secure Storage Provider
    const storage = getStorageProvider();
    const storagePath = await storage.upload(key, buffer);

    // Record Immutable History
    const history = await db.backupHistory.create({
      data: {
        farm_id: farmId,
        created_by: session.user.id,
        type: "FULL",
        storage_path: storagePath,
        file_size: buffer.length,
        checksum,
        status: "SUCCESS",
      }
    });

    await logAuditEvent({
      userId: session.user.id,
      farmId,
      module: "SECURITY",
      action: "CREATE_BACKUP",
      entityType: "BackupHistory",
      entityId: history.id,
      severity: "INFO",
      reason: "Manual Phase 12 Security Request"
    });

    return NextResponse.json({ success: true, backup: { ...history, file_size: Number(history.file_size) } });
  } catch (error: any) {
    console.error("Backup failed", error);
    await db.backupHistory.create({
      data: {
        farm_id: farmId || "UNKNOWN",
        created_by: session?.user?.id || "SYSTEM",
        type: "FULL",
        storage_path: "",
        file_size: 0,
        checksum: "",
        status: "FAILED"
      }
    });
    return NextResponse.json({ error: "Backup failed" }, { status: 500 });
  }
}
