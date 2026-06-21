import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { isOwner, isManager } from "@/lib/rbac";

export async function POST(req: NextRequest) {
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  if (!(isOwner(session) || isManager(session))) {
    return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });
  }

  try {
    const { id, type, credit_limit, credit_days, risk_level, preferred_status } = await req.json();

    if (credit_limit !== undefined && credit_limit < 0) {
      return NextResponse.json({ error: "Credit limit must be >= 0" }, { status: 400 });
    }
    if (credit_days !== undefined && credit_days < 0) {
      return NextResponse.json({ error: "Credit days must be >= 0" }, { status: 400 });
    }

    if (type === "Customer") {
      const before = await db.customer.findUnique({ where: { id } });
      if (!before || before.farm_id !== farmId) return NextResponse.json({ error: "Not found" }, { status: 404 });

      await db.customer.update({
        where: { id },
        data: {
          credit_limit: credit_limit !== undefined ? credit_limit : before.credit_limit,
          credit_days: credit_days !== undefined ? credit_days : before.credit_days,
          risk_level: risk_level !== undefined ? risk_level : before.risk_level,
        }
      });
    } else if (type === "Supplier") {
      const before = await db.supplier.findUnique({ where: { id } });
      if (!before || before.farm_id !== farmId) return NextResponse.json({ error: "Not found" }, { status: 404 });

      await db.supplier.update({
        where: { id },
        data: {
          credit_days: credit_days !== undefined ? credit_days : before.credit_days,
          preferred_status: preferred_status !== undefined ? preferred_status : before.preferred_status,
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Payment Terms Update Error:", error);
    return NextResponse.json({ error: "Failed to update payment terms" }, { status: 500 });
  }
}
