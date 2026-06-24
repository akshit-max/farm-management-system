import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";
import { isManager } from "@/lib/rbac";
import { z } from "zod";

const createInventorySchema = z.object({
  id: z.string().uuid().optional(),
  client_request_id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  category: z.string().min(1, "Category is required"),
  quantity: z.coerce.number().min(0, "Quantity must be >= 0"),
  unit: z.string().min(1, "Unit is required"),
  cost_basis: z.coerce.number().min(0, "Cost basis must be >= 0"),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const items = await db.inventoryItem.findMany({
      where: { farm_id: farmId, deleted_at: null },
      orderBy: { name: "asc" },
      include: { source_slaughter: true }
    });
    return NextResponse.json({ data: items });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch inventory items" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isManager(session)) return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });

  try {
    const body = await req.json();
    const parsedData = createInventorySchema.parse(body);

    if (parsedData.client_request_id) {
      const existingReq = await db.inventoryItem.findFirst({
        where: { client_request_id: parsedData.client_request_id }
      });
      if (existingReq) return NextResponse.json(existingReq, { status: 200 });
    }

    const duplicateCheck = await db.inventoryItem.findFirst({
      where: { farm_id: farmId, name: parsedData.name, deleted_at: null },
    });
    if (duplicateCheck) {
      if (parsedData.client_request_id) {
         // Safely merge offline quantities into the existing server stock using Weighted Average Cost (WAC)
         const existingQty = duplicateCheck.quantity;
         const existingCost = duplicateCheck.cost_basis;
         const incomingQty = parsedData.quantity;
         const incomingCost = parsedData.cost_basis;
         
         const totalQty = existingQty + incomingQty;
         const weightedCost = totalQty > 0 
           ? ((existingQty * existingCost) + (incomingQty * incomingCost)) / totalQty
           : existingCost;

         const mergedItem = await db.inventoryItem.update({
           where: { id: duplicateCheck.id },
           data: {
             quantity: { increment: incomingQty },
             cost_basis: weightedCost
             // category and unit are intentionally omitted to preserve the server's truth
           }
         });
         await logAudit(session.user.id, farmId, "UPDATE", "InventoryItem", duplicateCheck.id);
         return NextResponse.json(mergedItem, { status: 200 });
      }
      return NextResponse.json({ error: "Inventory item with this name already exists" }, { status: 400 });
    }

    const item = await db.inventoryItem.create({
      data: { farm_id: farmId, ...parsedData },
    });

    await logAudit(session.user.id, farmId, "CREATE", "InventoryItem", item.id);
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.flatten().fieldErrors }, { status: 400 });
    return NextResponse.json({ error: "Failed to create inventory item" }, { status: 500 });
  }
}
