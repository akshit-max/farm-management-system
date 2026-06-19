import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";
import { isManager } from "@/lib/rbac";
import { z } from "zod";

const createUtilityMeterSchema = z.object({
  meter_name: z.string().min(1, "Meter name is required"),
  meter_number: z.string().min(1, "Meter number is required"),
  room_id: z.string().optional().nullable(),
  status: z.string().default("ACTIVE"),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const meters = await db.utilityMeter.findMany({
      where: { farm_id: farmId, deleted_at: null },
      include: { room: true },
      orderBy: { meter_name: "asc" },
    });
    return NextResponse.json({ data: meters });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch utility meters" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isManager(session)) return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });

  try {
    const body = await req.json();
    const parsedData = createUtilityMeterSchema.parse(body);

    const existing = await db.utilityMeter.findFirst({
      where: { farm_id: farmId, meter_number: parsedData.meter_number, deleted_at: null },
    });
    if (existing) {
      return NextResponse.json({ error: "Meter with this number already exists" }, { status: 400 });
    }

    const meter = await db.utilityMeter.create({
      data: { farm_id: farmId, ...parsedData },
    });

    await logAudit(session.user.id, farmId, "CREATE", "UtilityMeter", meter.id);
    return NextResponse.json(meter, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.flatten().fieldErrors }, { status: 400 });
    return NextResponse.json({ error: "Failed to create utility meter" }, { status: 500 });
  }
}
