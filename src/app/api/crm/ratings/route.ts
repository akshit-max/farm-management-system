import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { isOwner, isManager } from "@/lib/rbac";
import { logAuditEvent } from "@/lib/auditLogger";

export async function GET(req: NextRequest) {
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  if (!(isOwner(session) || isManager(session))) {
    return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type"); // "customer" or "supplier"

  try {
    if (type === "customer") {
      const customers = await db.customer.findMany({
        where: { farm_id: farmId, status: "ACTIVE" },
        include: { sales_invoices: { where: { deleted_at: null }, include: { payments: { where: { deleted_at: null } } } } }
      });

      const report = customers.map(c => {
        // Calculate dynamic score (1-5)
        let score = 3; // Baseline
        let revenue = 0;
        let latePayments = 0;
        let totalPayments = 0;

        for (const inv of c.sales_invoices) {
          revenue += inv.total;
          const paid = inv.payments.reduce((sum: number, p: any) => sum + p.amount, 0);
          if (inv.payment_status !== 'PAID' && new Date() > new Date(inv.invoice_date.getTime() + 30 * 24 * 60 * 60 * 1000)) {
            latePayments++;
          }
          totalPayments += inv.payments.length;
        }

        if (revenue > 10000) score += 1;
        if (revenue > 50000) score += 1;
        if (latePayments > 2) score -= 1;
        if (latePayments > 5) score -= 1;

        score = Math.max(1, Math.min(5, score)); // Clamp 1-5

        return {
          id: c.id,
          name: c.company_name,
          type: "Customer",
          calculatedRating: score,
          overrideRating: c.rating_override,
          finalRating: c.rating_override !== null ? c.rating_override : score,
          overrideReason: c.rating_override_reason,
          overrideAt: c.rating_override_at
        };
      });
      return NextResponse.json({ data: report });
    } else {
      const suppliers = await db.supplier.findMany({
        where: { farm_id: farmId, status: "ACTIVE" },
        include: { feed_types: { include: { consumptions: { include: { batch: { include: { mortalities: true } } } } } } }
      });

      const report = suppliers.map(s => {
        let score = 3;
        let volume = 0;
        let mortalities = 0;
        
        for (const ft of s.feed_types) {
          for (const fc of ft.consumptions) {
            volume += fc.quantity_kg;
            if (fc.batch) mortalities += fc.batch.mortalities.reduce((acc: number, m: any) => acc + m.quantity, 0);
          }
        }

        if (volume > 5000) score += 1;
        if (volume > 20000) score += 1;
        if (mortalities > 50) score -= 1;
        if (mortalities > 200) score -= 1;

        score = Math.max(1, Math.min(5, score));

        return {
          id: s.id,
          name: s.company_name,
          type: "Supplier",
          calculatedRating: score,
          overrideRating: s.rating_override,
          finalRating: s.rating_override !== null ? s.rating_override : score,
          overrideReason: s.rating_override_reason,
          overrideAt: s.rating_override_at
        };
      });
      return NextResponse.json({ data: report });
    }
  } catch (error) {
    console.error("CRM Ratings Error:", error);
    return NextResponse.json({ error: "Failed to fetch ratings" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const farmId = session?.user?.farm_id;
  const userId = session?.user?.id;
  if (!userId || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  if (!(isOwner(session) || isManager(session))) {
    return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });
  }

  try {
    const { id, type, rating, reason } = await req.json();

    if (rating !== null && (rating < 1 || rating > 5)) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
    }

    if (rating !== null && !reason) {
      return NextResponse.json({ error: "Reason is required for override" }, { status: 400 });
    }

    if (type === "Customer") {
      const before = await db.customer.findUnique({ where: { id } });
      if (!before || before.farm_id !== farmId) return NextResponse.json({ error: "Not found" }, { status: 404 });

      await db.customer.update({
        where: { id },
        data: {
          rating_override: rating,
          rating_override_reason: rating ? reason : null,
          rating_override_by: rating ? userId : null,
          rating_override_at: rating ? new Date() : null,
        }
      });

      await logAuditEvent({
        farmId,
        userId,
        module: "CRM",
        action: "OVERRIDE_CUSTOMER_RATING",
        entityType: "Customer",
        entityId: id,
        severity: "CRITICAL",
        reason: reason,
        beforeSnapshot: { rating_override: before.rating_override },
        afterSnapshot: { rating_override: rating }
      });
    } else if (type === "Supplier") {
      const before = await db.supplier.findUnique({ where: { id } });
      if (!before || before.farm_id !== farmId) return NextResponse.json({ error: "Not found" }, { status: 404 });

      await db.supplier.update({
        where: { id },
        data: {
          rating_override: rating,
          rating_override_reason: rating ? reason : null,
          rating_override_by: rating ? userId : null,
          rating_override_at: rating ? new Date() : null,
        }
      });

      await logAuditEvent({
        farmId,
        userId,
        module: "CRM",
        action: "OVERRIDE_SUPPLIER_RATING",
        entityType: "Supplier",
        entityId: id,
        severity: "CRITICAL",
        reason: reason,
        beforeSnapshot: { rating_override: before.rating_override },
        afterSnapshot: { rating_override: rating }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("CRM Ratings Update Error:", error);
    return NextResponse.json({ error: "Failed to update rating" }, { status: 500 });
  }
}
