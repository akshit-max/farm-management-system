import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";
import { isManager } from "@/lib/rbac";
import { z } from "zod";

const updateStageSchema = z.object({
  stage_name: z.string().min(1, "Stage name is required").optional(),
  expected_duration_days: z.number().min(1).optional(),
  expected_weight: z.number().min(0.01).optional(),
  feed_requirement: z.number().optional().nullable(),
  water_requirement: z.number().optional().nullable(),
  electricity_requirement: z.number().optional().nullable(),
  display_order: z.number().min(0).optional(),
  active_status: z.boolean().optional(),
});

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isManager(session)) return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });

  try {
    const body = await req.json();
    const parsedData = updateStageSchema.parse(body);

    const stage = await db.stageDefinition.findUnique({ where: { id } });
    if (!stage || stage.deleted_at || stage.farm_id !== farmId) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (parsedData.display_order !== undefined && parsedData.display_order !== stage.display_order) {
      const existingOrder = await db.stageDefinition.findFirst({
        where: { animal_category_id: stage.animal_category_id, display_order: parsedData.display_order, deleted_at: null },
      });
      if (existingOrder) return NextResponse.json({ error: "Display order unique per category" }, { status: 400 });
    }

    const updated = await db.stageDefinition.update({
      where: { id },
      data: parsedData,
    });

    await logAudit(session.user.id, farmId, "UPDATE", "StageDefinition", id);
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.flatten().fieldErrors }, { status: 400 });
    return NextResponse.json({ error: "Failed to update stage" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isManager(session)) return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });

  try {
    const stage = await db.stageDefinition.findUnique({ where: { id } });
    if (!stage || stage.farm_id !== farmId) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await db.stageDefinition.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    await logAudit(session.user.id, farmId, "DELETE", "StageDefinition", id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete stage" }, { status: 500 });
  }
}
