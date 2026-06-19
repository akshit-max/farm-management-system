import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";
import { isManager } from "@/lib/rbac";
import { z } from "zod";

const updateFeedTypeSchema = z.object({
  name: z.string().min(1, "Feed name is required"),
  supplier_id: z.string().optional().nullable(),
  cost_per_kg: z.coerce.number().min(0, "Cost must be >= 0"),
  stock_quantity: z.coerce.number().min(0, "Stock must be >= 0"),
  reorder_level: z.coerce.number().min(0, "Reorder level must be >= 0"),
  feed_efficiency_baseline: z.coerce.number().optional().nullable(),
  notes: z.string().optional(),
});

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isManager(session)) return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });

  try {
    const body = await req.json();
    const parsedData = updateFeedTypeSchema.parse(body);

    const existing = await db.feedType.findFirst({
      where: { farm_id: farmId, name: parsedData.name, id: { not: params.id }, deleted_at: null },
    });
    if (existing) {
      return NextResponse.json({ error: "Feed type with this name already exists" }, { status: 400 });
    }

    const feedType = await db.feedType.updateMany({
      where: { id: params.id, farm_id: farmId },
      data: parsedData,
    });

    if (feedType.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await logAudit(session.user.id, farmId, "UPDATE", "FeedType", params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.flatten().fieldErrors }, { status: 400 });
    return NextResponse.json({ error: "Failed to update feed type" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isManager(session)) return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });

  try {
    // Check if consumptions exist (cannot delete if yes, must soft delete)
    const consumptions = await db.feedConsumption.count({
      where: { feed_type_id: params.id },
    });
    
    // We strictly use soft delete for FeedType
    const result = await db.feedType.updateMany({
      where: { id: params.id, farm_id: farmId },
      data: { deleted_at: new Date() },
    });

    if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await logAudit(session.user.id, farmId, "DELETE", "FeedType", params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete feed type" }, { status: 500 });
  }
}
