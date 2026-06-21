import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { isManager, isAccountant } from "@/lib/rbac";
import { logAuditEvent } from "@/lib/auditLogger";

export async function GET(req: NextRequest) {
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  if (!(isManager(session) || isAccountant(session))) {
    return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const severity = searchParams.get("severity");
  const moduleName = searchParams.get("module");

  try {
    const filters: any = { farm_id: farmId };
    if (severity) filters.severity = severity;
    if (moduleName) filters.module = moduleName;

    const logs = await db.auditLog.findMany({
      where: filters,
      orderBy: { created_at: "desc" },
      take: 100, // Limit to 100 for MVP
    });

    // Removed VIEW_AUDIT_LOGS to reduce noise

    return NextResponse.json({ data: logs });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
  }
}
