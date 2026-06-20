import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";
import { isManager } from "@/lib/rbac";
import { z } from "zod";

const createBatchSchema = z.object({
  batch_number: z.string().min(1),
  animal_category_id: z.string().uuid(),
  room_id: z.string().uuid(),
  current_stage_id: z.string().uuid(),
  arrival_date: z.string().datetime(),
  quantity: z.number().min(1),
  initial_weight: z.number().min(0),
  average_weight: z.number().min(0),
  cost_per_animal: z.number().min(0),
  notes: z.string().optional(),
  expected_sale_date: z.string().datetime().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get("roomId");

  try {
    const batches = await db.animalBatch.findMany({
      where: {
        farm_id: farmId,
        deleted_at: null,
        ...(roomId ? { room_id: roomId } : {}),
      },
      include: {
        animal_category: { select: { name: true } },
        room: { select: { name: true } },
        current_stage: { select: { stage_name: true } },
      },
      orderBy: { created_at: "desc" },
    });
    return NextResponse.json({ data: batches });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch batches" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isManager(session)) return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });

  try {
    const body = await req.json();
    const parsedData = createBatchSchema.parse(body);

    const room = await db.room.findUnique({
      where: { id: parsedData.room_id },
      include: { animal_batches: { where: { deleted_at: null, status: "ACTIVE" } } },
    });

    if (!room || room.farm_id !== farmId) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    const allowedStages = room.allowed_stages.split(",").map((s) => s.trim());
    if (!allowedStages.includes(parsedData.current_stage_id) && room.allowed_stages !== "*") {
      return NextResponse.json({ error: "Selected stage is not allowed in this room" }, { status: 400 });
    }

    const currentOccupancy = room.animal_batches.reduce((sum, b) => sum + b.quantity, 0);
    if (currentOccupancy + parsedData.quantity > room.capacity) {
      return NextResponse.json({ error: `Room capacity exceeded. Max: ${room.capacity}, Current: ${currentOccupancy}, New: ${parsedData.quantity}` }, { status: 400 });
    }

    const batch = await db.animalBatch.create({
      data: {
        farm_id: farmId,
        batch_number: parsedData.batch_number,
        animal_category_id: parsedData.animal_category_id,
        room_id: parsedData.room_id,
        current_stage_id: parsedData.current_stage_id,
        arrival_date: new Date(parsedData.arrival_date),
        quantity: parsedData.quantity,
        initial_quantity: parsedData.quantity,
        initial_weight: parsedData.initial_weight,
        average_weight: parsedData.average_weight,
        cost_per_animal: parsedData.cost_per_animal,
        notes: parsedData.notes,
        expected_sale_date: parsedData.expected_sale_date ? new Date(parsedData.expected_sale_date) : null,
      },
    });

    await logAudit(session.user.id, farmId, "CREATE", "AnimalBatch", batch.id);
    return NextResponse.json(batch, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.flatten().fieldErrors }, { status: 400 });
    return NextResponse.json({ error: "Failed to create batch" }, { status: 500 });
  }
}
