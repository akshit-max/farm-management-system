import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";
import { isManager } from "@/lib/rbac";
import { z } from "zod";

const createCategorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  mortality_percentage: z.number().min(0).max(100),
  sale_options: z.string().optional(),
  client_request_id: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) {
    return NextResponse.json({ error: "Unauthorized or no farm assigned" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";

  try {
    const where = {
      farm_id: farmId,
      deleted_at: null,
      ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
    };

    const categories = await db.animalCategory.findMany({
      where,
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json({ data: categories });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) {
    return NextResponse.json({ error: "Unauthorized or no farm assigned" }, { status: 401 });
  }
  if (!isManager(session)) return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });

  try {
    const body = await req.json();
    const parsedData = createCategorySchema.parse(body);

    if (parsedData.client_request_id) {
      const existingReq = await db.animalCategory.findFirst({
        where: { farm_id: farmId, client_request_id: parsedData.client_request_id }
      });
      if (existingReq) {
        return NextResponse.json(existingReq, { status: 200 });
      }
    }

    const existing = await db.animalCategory.findFirst({
      where: { farm_id: farmId, name: parsedData.name, deleted_at: null },
    });

    if (existing) {
      return NextResponse.json({ error: "Category name must be unique per farm" }, { status: 400 });
    }

    const category = await db.animalCategory.create({
      data: { farm_id: farmId, ...parsedData, sync_status: 'SYNCED' },
    });

    await logAudit(session.user.id, farmId, "CREATE", "AnimalCategory", category.id);

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.flatten().fieldErrors }, { status: 400 });
    console.error(error);
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}
