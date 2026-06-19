import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";
import { isManager } from "@/lib/rbac";
import { z } from "zod";

const createWaterUsageSchema = z.object({
  room_id: z.string().min(1, "Room is required"),
  batch_id: z.string().optional().nullable(),
  date: z.string().or(z.date()).transform(d => new Date(d)),
  allocation_liters: z.coerce.number().min(0.01, "Allocation must be > 0"),
  actual_consumption_liters: z.coerce.number().min(0.01, "Consumption must be > 0"),
  source: z.string().min(1, "Source is required"),
  cost_per_liter: z.coerce.number().min(0, "Cost must be >= 0"),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const usages = await db.waterUsage.findMany({
      where: { farm_id: farmId, deleted_at: null },
      include: { room: true, batch: { include: { animal_category: true } } },
      orderBy: { date: "desc" },
    });
    return NextResponse.json({ data: usages });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch water usage" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isManager(session)) return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });

  try {
    const body = await req.json();
    const parsedData = createWaterUsageSchema.parse(body);

    const roomCheck = await db.room.findFirst({
      where: { id: parsedData.room_id, farm_id: farmId, deleted_at: null }
    });
    if (!roomCheck) return NextResponse.json({ error: "Invalid room" }, { status: 400 });

    if (parsedData.batch_id) {
      const batchCheck = await db.animalBatch.findFirst({
        where: { id: parsedData.batch_id, farm_id: farmId, deleted_at: null }
      });
      if (!batchCheck) return NextResponse.json({ error: "Invalid batch" }, { status: 400 });
    }

    const total_cost = parsedData.actual_consumption_liters * parsedData.cost_per_liter;

    const waterUsage = await db.waterUsage.create({
      data: { 
        farm_id: farmId, 
        ...parsedData,
        total_cost 
      },
    });

    await logAudit(session.user.id, farmId, "CREATE", "WaterUsage", waterUsage.id);
    return NextResponse.json(waterUsage, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.flatten().fieldErrors }, { status: 400 });
    return NextResponse.json({ error: "Failed to log water usage" }, { status: 500 });
  }
}
