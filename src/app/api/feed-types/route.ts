import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";
import { isManager } from "@/lib/rbac";
import { z } from "zod";

const createFeedTypeSchema = z.object({
  name: z.string().min(1, "Feed name is required"),
  supplier_id: z.string().optional().nullable(),
  cost_per_kg: z.coerce.number().min(0, "Cost must be >= 0"),
  stock_quantity: z.coerce.number().min(0, "Stock must be >= 0"),
  reorder_level: z.coerce.number().min(0, "Reorder level must be >= 0"),
  feed_efficiency_baseline: z.coerce.number().optional().nullable(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const feedTypes = await db.feedType.findMany({
      where: { farm_id: farmId, deleted_at: null },
      include: { supplier: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ data: feedTypes });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch feed types" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isManager(session)) return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });

  try {
    const body = await req.json();
    const parsedData = createFeedTypeSchema.parse(body);

    const existing = await db.feedType.findFirst({
      where: { farm_id: farmId, name: parsedData.name, deleted_at: null },
    });
    if (existing) {
      return NextResponse.json({ error: "Feed type with this name already exists" }, { status: 400 });
    }

    const feedType = await db.feedType.create({
      data: { farm_id: farmId, ...parsedData },
    });

    await logAudit(session.user.id, farmId, "CREATE", "FeedType", feedType.id);
    return NextResponse.json(feedType, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.flatten().fieldErrors }, { status: 400 });
    return NextResponse.json({ error: "Failed to create feed type" }, { status: 500 });
  }
}
