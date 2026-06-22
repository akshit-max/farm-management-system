import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { logAuditEvent } from "@/lib/auditLogger";
import { checkFinancialLock } from "@/lib/financialLock";
import { isManager } from "@/lib/rbac";
import { z } from "zod";

const createElectricityUsageSchema = z.object({
  meter_id: z.string().min(1, "Meter is required"),
  room_id: z.string().min(1, "Room is required"),
  date: z.string().or(z.date()).transform(d => new Date(d)),
  units_consumed: z.coerce.number().min(0.01, "Units must be > 0"),
  cost_per_unit: z.coerce.number().min(0, "Cost must be >= 0"),
  equipment_type: z.string().min(1, "Equipment type is required"),
  notes: z.string().optional(),
  client_request_id: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const usages = await db.electricityUsage.findMany({
      where: { farm_id: farmId, deleted_at: null },
      include: { meter: true, room: true },
      orderBy: { date: "desc" },
    });
    return NextResponse.json({ data: usages });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch electricity usage" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isManager(session)) return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });

  try {
    const body = await req.json();
    const parsedData = createElectricityUsageSchema.parse(body);

    if (parsedData.client_request_id) {
      const existing = await db.electricityUsage.findUnique({
        where: { client_request_id: parsedData.client_request_id }
      });
      if (existing) {
        return NextResponse.json(existing, { status: 200 });
      }
    }

    await checkFinancialLock(farmId, parsedData.date);

    const meterCheck = await db.utilityMeter.findFirst({
      where: { id: parsedData.meter_id, farm_id: farmId, deleted_at: null }
    });
    if (!meterCheck) return NextResponse.json({ error: "Invalid meter" }, { status: 400 });

    const roomCheck = await db.room.findFirst({
      where: { id: parsedData.room_id, farm_id: farmId, deleted_at: null }
    });
    if (!roomCheck) return NextResponse.json({ error: "Invalid room" }, { status: 400 });

    const total_cost = parsedData.units_consumed * parsedData.cost_per_unit;

    const usage = await db.electricityUsage.create({
      data: { farm_id: farmId, ...parsedData, total_cost, sync_status: 'SYNCED' },
    });

    await logAuditEvent({
      userId: session.user.id,
      farmId,
      module: "ELECTRICITY",
      action: "CREATE_ELECTRICITY_USAGE",
      entityType: "ElectricityUsage",
      entityId: usage.id,
      severity: "INFO",
      afterSnapshot: usage,
    });
    return NextResponse.json(usage, { status: 201 });
  } catch (error: any) {
    if (error.message?.includes("LOCKED")) {
      return NextResponse.json(JSON.parse(error.message), { status: 423 });
    }
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.flatten().fieldErrors }, { status: 400 });
    return NextResponse.json({ error: "Failed to log electricity usage" }, { status: 500 });
  }
}
