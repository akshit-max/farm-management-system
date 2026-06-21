import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { logAuditEvent } from "@/lib/auditLogger";
import { checkFinancialLock } from "@/lib/financialLock";
import { isManager } from "@/lib/rbac";
import { z } from "zod";

const createFeedConsumptionSchema = z.object({
  batch_id: z.string().min(1, "Batch is required"),
  feed_type_id: z.string().min(1, "Feed type is required"),
  date: z.string().min(1, "Date is required"),
  quantity_kg: z.coerce.number().min(0.01, "Quantity must be > 0"),
  cost: z.coerce.number().min(0, "Cost must be >= 0"),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const consumptions = await db.feedConsumption.findMany({
      where: { farm_id: farmId, deleted_at: null },
      include: { 
        batch: true,
        feed_type: true
      },
      orderBy: { date: "desc" },
    });
    return NextResponse.json({ data: consumptions });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch feed consumptions" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isManager(session)) return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });

  try {
    const body = await req.json();
    const parsedData = createFeedConsumptionSchema.parse(body);

    await checkFinancialLock(farmId, new Date(parsedData.date));

    // Verify batch belongs to farm
    const batch = await db.animalBatch.findFirst({
      where: { id: parsedData.batch_id, farm_id: farmId, deleted_at: null }
    });
    if (!batch) return NextResponse.json({ error: "Batch not found or unauthorized" }, { status: 400 });

    // Transaction to create consumption and reduce stock
    const result = await db.$transaction(async (tx) => {
      const feedType = await tx.feedType.findFirst({
        where: { id: parsedData.feed_type_id, farm_id: farmId, deleted_at: null }
      });
      if (!feedType) throw new Error("Feed type not found");

      if (feedType.stock_quantity < parsedData.quantity_kg) {
        throw new Error(`Insufficient stock. Current stock: ${feedType.stock_quantity} kg`);
      }

      // Create consumption
      const consumption = await tx.feedConsumption.create({
        data: {
          farm_id: farmId,
          batch_id: parsedData.batch_id,
          feed_type_id: parsedData.feed_type_id,
          date: new Date(parsedData.date),
          quantity_kg: parsedData.quantity_kg,
          cost: parsedData.cost,
          notes: parsedData.notes,
        }
      });

      // Update stock
      await tx.feedType.update({
        where: { id: feedType.id },
        data: { stock_quantity: feedType.stock_quantity - parsedData.quantity_kg }
      });

      return consumption;
    });

    await logAuditEvent({
      userId: session.user.id,
      farmId,
      module: "FEED",
      action: "CREATE_FEED_CONSUMPTION",
      entityType: "FeedConsumption",
      entityId: result.id,
      severity: "INFO",
      afterSnapshot: result,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    if (error.message?.includes("LOCKED")) {
      return NextResponse.json(JSON.parse(error.message), { status: 423 });
    }
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.flatten().fieldErrors }, { status: 400 });
    return NextResponse.json({ error: error.message || "Failed to record consumption" }, { status: 500 });
  }
}
