import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";
import { isManager } from "@/lib/rbac";
import { z } from "zod";

const updateWaterUsageSchema = z.object({
  room_id: z.string().min(1, "Room is required"),
  batch_id: z.string().optional().nullable(),
  date: z.string().or(z.date()).transform(d => new Date(d)),
  allocation_liters: z.coerce.number().min(0.01, "Allocation must be > 0"),
  actual_consumption_liters: z.coerce.number().min(0.01, "Consumption must be > 0"),
  source: z.string().min(1, "Source is required"),
  cost_per_liter: z.coerce.number().min(0, "Cost must be >= 0"),
  notes: z.string().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isManager(session)) return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });

  try {
    const existing = await db.waterUsage.findFirst({
      where: { id, farm_id: farmId, deleted_at: null },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const parsedData = updateWaterUsageSchema.parse(body);

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

    const waterUsage = await db.waterUsage.update({
      where: { id },
      data: { ...parsedData, total_cost },
    });

    await logAudit(session.user.id, farmId, "UPDATE", "WaterUsage", id);
    return NextResponse.json(waterUsage);
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.flatten().fieldErrors }, { status: 400 });
    return NextResponse.json({ error: "Failed to update water usage" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isManager(session)) return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });

  try {
    const existing = await db.waterUsage.findFirst({
      where: { id, farm_id: farmId, deleted_at: null },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await db.waterUsage.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    await logAudit(session.user.id, farmId, "DELETE", "WaterUsage", id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete water usage" }, { status: 500 });
  }
}
