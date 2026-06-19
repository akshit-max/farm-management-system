import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";
import { isManager, isAccountant } from "@/lib/rbac";
import { z } from "zod";

const updateSalesSchema = z.object({
  payment_status: z.enum(["PENDING", "PARTIAL", "PAID"]),
  notes: z.string().optional(),
});

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  if (!(isManager(session) || isAccountant(session))) {
    return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsedData = updateSalesSchema.parse(body);

    const invoice = await db.salesInvoice.updateMany({
      where: { id: params.id, farm_id: farmId, deleted_at: null },
      data: parsedData,
    });

    if (invoice.count === 0) return NextResponse.json({ error: "Not found or cannot edit cancelled invoice" }, { status: 404 });

    await logAudit(session.user.id, farmId, "UPDATE", "SalesInvoice", params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.flatten().fieldErrors }, { status: 400 });
    return NextResponse.json({ error: "Failed to update invoice" }, { status: 500 });
  }
}
