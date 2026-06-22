import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { logAuditEvent } from "@/lib/auditLogger";
import { checkFinancialLock } from "@/lib/financialLock";
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
  client_request_id: z.string().optional(),
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

    if (parsedData.client_request_id) {
      const existing = await db.waterUsage.findUnique({
        where: { client_request_id: parsedData.client_request_id }
      });
      if (existing) {
        return NextResponse.json(existing, { status: 200 });
      }
    }

    await checkFinancialLock(farmId, parsedData.date);

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
        total_cost,
        sync_status: 'SYNCED'
      },
    });

    await logAuditEvent({
      userId: session.user.id,
      farmId,
      module: "WATER",
      action: "CREATE_WATER_USAGE",
      entityType: "WaterUsage",
      entityId: waterUsage.id,
      severity: "INFO",
      afterSnapshot: waterUsage,
    });
    return NextResponse.json(waterUsage, { status: 201 });
  } catch (error: any) {
    if (error.message?.includes("LOCKED")) {
      return NextResponse.json(JSON.parse(error.message), { status: 423 });
    }
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.flatten().fieldErrors }, { status: 400 });
    return NextResponse.json({ error: "Failed to log water usage" }, { status: 500 });
  }
}
