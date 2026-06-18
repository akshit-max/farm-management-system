import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const updateCategorySchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  description: z.string().optional(),
  mortality_percentage: z.number().min(0).max(100).optional(),
  sale_options: z.string().optional(),
  active_status: z.boolean().optional(),
});

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const category = await db.animalCategory.findUnique({ where: { id, deleted_at: null } });
    if (!category || category.farm_id !== farmId) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(category);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const parsedData = updateCategorySchema.parse(body);

    const category = await db.animalCategory.findUnique({ where: { id } });
    if (!category || category.deleted_at || category.farm_id !== farmId) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (parsedData.name && parsedData.name !== category.name) {
      const existing = await db.animalCategory.findFirst({
        where: { farm_id: farmId, name: parsedData.name, deleted_at: null },
      });
      if (existing) return NextResponse.json({ error: "Category name must be unique per farm" }, { status: 400 });
    }

    const updated = await db.animalCategory.update({
      where: { id },
      data: parsedData,
    });

    await logAudit(session.user.id, farmId, "UPDATE", "AnimalCategory", id);
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.flatten().fieldErrors }, { status: 400 });
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const category = await db.animalCategory.findUnique({ where: { id } });
    if (!category || category.farm_id !== farmId) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await db.animalCategory.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    await logAudit(session.user.id, farmId, "DELETE", "AnimalCategory", id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
