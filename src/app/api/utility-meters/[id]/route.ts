import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";
import { isManager } from "@/lib/rbac";
import { z } from "zod";

const updateUtilityMeterSchema = z.object({
  meter_name: z.string().min(1, "Meter name is required"),
  meter_number: z.string().min(1, "Meter number is required"),
  room_id: z.string().optional().nullable(),
  status: z.string().default("ACTIVE"),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isManager(session)) return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });

  try {
    const existing = await db.utilityMeter.findFirst({
      where: { id, farm_id: farmId, deleted_at: null },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const parsedData = updateUtilityMeterSchema.parse(body);

    const duplicateCheck = await db.utilityMeter.findFirst({
      where: { farm_id: farmId, meter_number: parsedData.meter_number, deleted_at: null, id: { not: id } },
    });
    if (duplicateCheck) {
      return NextResponse.json({ error: "Meter with this number already exists" }, { status: 400 });
    }

    const meter = await db.utilityMeter.update({
      where: { id },
      data: parsedData,
    });

    await logAudit(session.user.id, farmId, "UPDATE", "UtilityMeter", id);
    return NextResponse.json(meter);
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.flatten().fieldErrors }, { status: 400 });
    return NextResponse.json({ error: "Failed to update utility meter" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isManager(session)) return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });

  try {
    const existing = await db.utilityMeter.findFirst({
      where: { id, farm_id: farmId, deleted_at: null },
      include: { electricity_usages: { where: { deleted_at: null } } },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (existing.electricity_usages.length > 0) {
      return NextResponse.json({ error: "Cannot delete meter with existing usage records" }, { status: 400 });
    }

    await db.utilityMeter.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    await logAudit(session.user.id, farmId, "DELETE", "UtilityMeter", id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete utility meter" }, { status: 500 });
  }
}
