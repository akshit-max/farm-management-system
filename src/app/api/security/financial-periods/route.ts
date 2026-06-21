import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { isManager, isAccountant, isOwner } from "@/lib/rbac";
import { logAuditEvent } from "@/lib/auditLogger";

export async function GET(req: NextRequest) {
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  if (!(isManager(session) || isAccountant(session))) {
    return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });
  }

  try {
    const periods = await db.financialPeriod.findMany({
      where: { farm_id: farmId },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });
    return NextResponse.json({ data: periods });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch periods" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  // Only Owners can lock/unlock
  if (!isOwner(session)) {
    await logAuditEvent({
      userId: session.user.id,
      farmId,
      module: "SECURITY",
      action: "UNAUTHORIZED_LOCK_ATTEMPT",
      entityType: "FinancialPeriod",
      entityId: "SYSTEM",
      severity: "WARNING",
      reason: "Non-owner attempted to modify financial period"
    });
    return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });
  }

  try {
    const { year, month, action, reason } = await req.json();

    if (action === "UNLOCK" && (!reason || reason.trim().length < 10)) {
      return NextResponse.json({ error: "A detailed reason (min 10 characters) is required to unlock a period." }, { status: 400 });
    }

    // Fetch existing for proper diffing
    const existing = await db.financialPeriod.findUnique({
      where: { farm_id_year_month: { farm_id: farmId, year, month } }
    });

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    const targetStatus = action === "LOCK" ? "LOCKED" : "OPEN";

    // Upsert the period
    const period = await db.financialPeriod.upsert({
      where: { farm_id_year_month: { farm_id: farmId, year, month } },
      update: {
        status: targetStatus,
        ...(action === "LOCK" ? {
          locked_by: session.user.id,
          locked_at: new Date(),
          lock_reason: reason || null,
        } : {
          unlocked_by: session.user.id,
          unlocked_at: new Date(),
          unlock_reason: reason,
        })
      },
      create: {
        farm_id: farmId,
        year,
        month,
        start_date: startDate,
        end_date: endDate,
        status: targetStatus,
        ...(action === "LOCK" ? {
          locked_by: session.user.id,
          locked_at: new Date(),
          lock_reason: reason || null,
        } : {
          unlocked_by: session.user.id,
          unlocked_at: new Date(),
          unlock_reason: reason,
        })
      }
    });

    await logAuditEvent({
      userId: session.user.id,
      farmId,
      module: "SECURITY",
      action: action === "LOCK" ? "LOCK_PERIOD" : "UNLOCK_PERIOD",
      entityType: "FinancialPeriod",
      entityId: period.id,
      severity: action === "LOCK" ? "WARNING" : "CRITICAL",
      reason: reason || "Security Policy Execution",
      beforeSnapshot: existing || { status: "OPEN" },
      afterSnapshot: period
    });

    return NextResponse.json({ success: true, data: period });
  } catch (error) {
    return NextResponse.json({ error: "Failed to modify financial period" }, { status: 500 });
  }
}
