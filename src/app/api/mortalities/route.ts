import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";
import { isManager } from "@/lib/rbac";
import { z } from "zod";

const createMortalitySchema = z.object({
  batch_id: z.string().uuid(),
  quantity: z.number().min(1, "Must be at least 1"),
  cause: z.string().min(1, "Cause is required"),
  date: z.string().datetime(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isManager(session)) return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });

  try {
    const body = await req.json();
    const parsedData = createMortalitySchema.parse(body);

    const batch = await db.animalBatch.findUnique({
      where: { id: parsedData.batch_id },
    });

    if (!batch || batch.deleted_at || batch.farm_id !== farmId) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    if (parsedData.quantity > batch.quantity) {
      return NextResponse.json({ error: "Mortality quantity cannot exceed current batch quantity" }, { status: 400 });
    }

    const [mortality, updatedBatch] = await db.$transaction([
      db.mortality.create({
        data: {
          batch_id: parsedData.batch_id,
          quantity: parsedData.quantity,
          cause: parsedData.cause,
          date: new Date(parsedData.date),
          notes: parsedData.notes,
        },
      }),
      db.animalBatch.update({
        where: { id: batch.id },
        data: { quantity: batch.quantity - parsedData.quantity },
      }),
    ]);

    await logAudit(session.user.id, farmId, "CREATE", "Mortality", mortality.id);
    return NextResponse.json(mortality, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.flatten().fieldErrors }, { status: 400 });
    return NextResponse.json({ error: "Failed to create mortality record" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const batchId = searchParams.get("batchId");

  try {
    const mortalities = await db.mortality.findMany({
      where: {
        deleted_at: null,
        batch: { farm_id: farmId },
        ...(batchId ? { batch_id: batchId } : {}),
      },
      orderBy: { date: "desc" },
    });
    return NextResponse.json({ data: mortalities });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch mortalities" }, { status: 500 });
  }
}
