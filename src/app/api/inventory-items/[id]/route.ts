import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";
import { isManager } from "@/lib/rbac";
import { z } from "zod";

const updateInventorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.string().min(1, "Category is required"),
  quantity: z.coerce.number().min(0, "Quantity must be >= 0"),
  unit: z.string().min(1, "Unit is required"),
  cost_basis: z.coerce.number().min(0, "Cost basis must be >= 0"),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isManager(session)) return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });

  try {
    const existing = await db.inventoryItem.findFirst({
      where: { id, farm_id: farmId, deleted_at: null },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const parsedData = updateInventorySchema.parse(body);

    const duplicateCheck = await db.inventoryItem.findFirst({
      where: { farm_id: farmId, name: parsedData.name, deleted_at: null, id: { not: id } },
    });
    if (duplicateCheck) {
      return NextResponse.json({ error: "Inventory item with this name already exists" }, { status: 400 });
    }

    const item = await db.inventoryItem.update({
      where: { id },
      data: parsedData,
    });

    await logAudit(session.user.id, farmId, "UPDATE", "InventoryItem", id);
    return NextResponse.json(item);
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.flatten().fieldErrors }, { status: 400 });
    return NextResponse.json({ error: "Failed to update inventory item" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isManager(session)) return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });

  try {
    const existing = await db.inventoryItem.findFirst({
      where: { id, farm_id: farmId, deleted_at: null },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await db.inventoryItem.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    await logAudit(session.user.id, farmId, "DELETE", "InventoryItem", id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete inventory item" }, { status: 500 });
  }
}
