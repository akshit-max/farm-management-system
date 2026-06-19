import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";
import { isManager } from "@/lib/rbac";
import { z } from "zod";

const updateElectricityUsageSchema = z.object({
  meter_id: z.string().min(1, "Meter is required"),
  room_id: z.string().min(1, "Room is required"),
  date: z.string().or(z.date()).transform(d => new Date(d)),
  units_consumed: z.coerce.number().min(0.01, "Units must be > 0"),
  cost_per_unit: z.coerce.number().min(0, "Cost must be >= 0"),
  equipment_type: z.string().min(1, "Equipment type is required"),
  notes: z.string().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isManager(session)) return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });

  try {
    const existing = await db.electricityUsage.findFirst({
      where: { id, farm_id: farmId, deleted_at: null },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const parsedData = updateElectricityUsageSchema.parse(body);

    const meterCheck = await db.utilityMeter.findFirst({
      where: { id: parsedData.meter_id, farm_id: farmId, deleted_at: null }
    });
    if (!meterCheck) return NextResponse.json({ error: "Invalid meter" }, { status: 400 });

    const roomCheck = await db.room.findFirst({
      where: { id: parsedData.room_id, farm_id: farmId, deleted_at: null }
    });
    if (!roomCheck) return NextResponse.json({ error: "Invalid room" }, { status: 400 });

    const total_cost = parsedData.units_consumed * parsedData.cost_per_unit;

    const usage = await db.electricityUsage.update({
      where: { id },
      data: { ...parsedData, total_cost },
    });

    await logAudit(session.user.id, farmId, "UPDATE", "ElectricityUsage", id);
    return NextResponse.json(usage);
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.flatten().fieldErrors }, { status: 400 });
    return NextResponse.json({ error: "Failed to update electricity usage" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isManager(session)) return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });

  try {
    const existing = await db.electricityUsage.findFirst({
      where: { id, farm_id: farmId, deleted_at: null },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await db.electricityUsage.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    await logAudit(session.user.id, farmId, "DELETE", "ElectricityUsage", id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete electricity usage" }, { status: 500 });
  }
}
