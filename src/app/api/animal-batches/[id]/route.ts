import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const updateBatchSchema = z.object({
  room_id: z.string().uuid().optional(),
  current_stage_id: z.string().uuid().optional(),
  average_weight: z.number().min(0).optional(),
  notes: z.string().optional().nullable(),
  status: z.string().optional(),
  expected_sale_date: z.string().datetime().optional().nullable(),
});

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const batch = await db.animalBatch.findUnique({
      where: { id, deleted_at: null },
      include: {
        animal_category: true,
        room: true,
        current_stage: true,
        mortalities: { where: { deleted_at: null } },
        vaccinations: { where: { deleted_at: null } },
      },
    });

    if (!batch || batch.farm_id !== farmId) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(batch);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const parsedData = updateBatchSchema.parse(body);

    const batch = await db.animalBatch.findUnique({ where: { id } });
    if (!batch || batch.deleted_at || batch.farm_id !== farmId) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (parsedData.room_id && parsedData.room_id !== batch.room_id) {
      const room = await db.room.findUnique({
        where: { id: parsedData.room_id },
        include: { animal_batches: { where: { deleted_at: null, status: "ACTIVE" } } },
      });
      if (!room || room.farm_id !== farmId) return NextResponse.json({ error: "Target room not found" }, { status: 404 });

      const allowedStages = room.allowed_stages.split(",").map((s) => s.trim());
      const stageId = parsedData.current_stage_id || batch.current_stage_id;
      if (!allowedStages.includes(stageId) && room.allowed_stages !== "*") {
        return NextResponse.json({ error: "Stage not allowed in target room" }, { status: 400 });
      }

      const currentOccupancy = room.animal_batches.reduce((sum, b) => sum + b.quantity, 0);
      if (currentOccupancy + batch.quantity > room.capacity) {
        return NextResponse.json({ error: "Target room capacity exceeded" }, { status: 400 });
      }
    }

    const updated = await db.animalBatch.update({
      where: { id },
      data: {
        ...parsedData,
        expected_sale_date: parsedData.expected_sale_date ? new Date(parsedData.expected_sale_date) : undefined,
      },
    });

    await logAudit(session.user.id, farmId, "UPDATE", "AnimalBatch", id);
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.flatten().fieldErrors }, { status: 400 });
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const batch = await db.animalBatch.findUnique({ where: { id } });
    if (!batch || batch.farm_id !== farmId) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await db.animalBatch.update({
      where: { id },
      data: { deleted_at: new Date(), status: "DELETED" },
    });

    await logAudit(session.user.id, farmId, "DELETE", "AnimalBatch", id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
