import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { isOwner } from "@/lib/rbac";
import { getStorageProvider } from "@/lib/storageProvider";
import { logAuditEvent } from "@/lib/auditLogger";
import ExcelJS from "exceljs";

const SHEET_NAMES: Record<string, string> = {
  animalBatches: "Animal Batches",
  mortalities: "Mortalities",
  vaccinations: "Vaccinations",
  rooms: "Rooms",
  feedConsumptions: "Feed",
  waterUsages: "Water",
  electricityUsages: "Electricity",
  inventoryItems: "Inventory",
  slaughterRecords: "Slaughter",
  salesInvoices: "Sales",
  customerPayments: "Payments",
  customers: "Customers",
  suppliers: "Suppliers",
  expenses: "Expenses",
  auditLogs: "Audit Logs",
  financialPeriods: "Financial Periods",
  feedTypes: "Feed Types",
  animalCategories: "Animal Categories",
  salesInvoiceItems: "Sales Items"
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: backupId } = await params;
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
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
    const snapshot = JSON.parse(buffer.toString('utf-8'));

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Farm ERP Security Backup Engine";
    workbook.lastModifiedBy = session.user.id;
    workbook.created = new Date();
    workbook.modified = new Date();

    if (snapshot.data) {
      for (const [key, rows] of Object.entries(snapshot.data)) {
        if (Array.isArray(rows)) {
          const sheetName = SHEET_NAMES[key] || key.substring(0, 31);
          const sheet = workbook.addWorksheet(sheetName.substring(0, 31));

          if (rows.length > 0) {
            // Flatten nested objects minimally if needed, but for MVP standard columns are enough
            const columns = Object.keys(rows[0]).map(k => ({ header: k, key: k, width: 20 }));
            sheet.columns = columns;

            rows.forEach((row: any) => {
              // Convert nested objects to string to prevent ExcelJS crash
              const sanitizedRow: any = {};
              for (const [k, v] of Object.entries(row)) {
                if (typeof v === 'object' && v !== null) {
                  sanitizedRow[k] = JSON.stringify(v);
                } else {
                  sanitizedRow[k] = v;
                }
              }
              sheet.addRow(sanitizedRow);
            });
            
            // Basic header styling
            sheet.getRow(1).font = { bold: true };
            sheet.getRow(1).fill = { type: 'pattern', pattern:'solid', fgColor:{ argb:'FFEEEEEE' } };
          }
        }
      }
    }

    const excelBuffer = await workbook.xlsx.writeBuffer();

    await logAuditEvent({
      userId: session.user.id,
      farmId,
      module: "SECURITY",
      action: "DOWNLOAD_BACKUP_EXCEL",
      entityType: "BackupHistory",
      entityId: backup.id,
      severity: "WARNING",
      reason: "Full database Excel extraction"
    });

    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '_');
    const response = new NextResponse(excelBuffer as unknown as BodyInit);
    response.headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    response.headers.set('Content-Disposition', `attachment; filename="Farm_Backup_${dateStr}.xlsx"`);
    return response;
  } catch (error: any) {
    console.error("Backup Excel download failed", error);
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}
