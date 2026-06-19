import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";
import { isManager } from "@/lib/rbac";
import { z } from "zod";

const createStageSchema = z.object({
  animal_category_id: z.string().uuid(),
  stage_name: z.string().min(1, "Stage name is required"),
  expected_duration_days: z.number().min(1, "Duration must be > 0"),
  expected_weight: z.number().min(0.01, "Weight must be > 0"),
  feed_requirement: z.number().optional(),
  water_requirement: z.number().optional(),
  electricity_requirement: z.number().optional(),
  display_order: z.number().min(0),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get("categoryId");

  try {
    const stages = await db.stageDefinition.findMany({
      where: {
        farm_id: farmId,
        deleted_at: null,
        ...(categoryId ? { animal_category_id: categoryId } : {}),
      },
      orderBy: { display_order: "asc" },
      include: { animal_category: { select: { name: true } } },
    });

    return NextResponse.json({ data: stages });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch stages" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isManager(session)) return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });

  try {
    const body = await req.json();
    const parsedData = createStageSchema.parse(body);

    const existingOrder = await db.stageDefinition.findFirst({
      where: {
        animal_category_id: parsedData.animal_category_id,
        display_order: parsedData.display_order,
        deleted_at: null,
      },
    });

    if (existingOrder) return NextResponse.json({ error: "Display order must be unique per category" }, { status: 400 });

    const stage = await db.stageDefinition.create({
      data: { farm_id: farmId, ...parsedData },
    });

    await logAudit(session.user.id, farmId, "CREATE", "StageDefinition", stage.id);
    return NextResponse.json(stage, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.flatten().fieldErrors }, { status: 400 });
    return NextResponse.json({ error: "Failed to create stage" }, { status: 500 });
  }
}
