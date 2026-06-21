import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { logAuditEvent } from "@/lib/auditLogger";
import { checkFinancialLock } from "@/lib/financialLock";
import { isManager } from "@/lib/rbac";
import { z } from "zod";

const createSlaughterSchema = z.object({
  batch_id: z.string().min(1, "Batch is required"),
  slaughter_date: z.string().or(z.date()).transform(d => new Date(d)),
  quantity_slaughtered: z.coerce.number().min(1, "Must slaughter at least 1 animal"),
  average_live_weight: z.coerce.number().min(0.01, "Average weight must be > 0"),
  notes: z.string().optional(),
  
  yield: z.object({
    carcass_weight: z.coerce.number().min(0.01, "Carcass weight must be > 0"),
    usable_meat_weight: z.coerce.number().min(0.01, "Usable meat weight must be > 0"),
  }),
  
  waste: z.object({
    bones_weight: z.coerce.number().min(0).default(0),
    fat_weight: z.coerce.number().min(0).default(0),
    organ_weight: z.coerce.number().min(0).default(0),
    waste_weight: z.coerce.number().min(0).default(0),
    notes: z.string().optional(),
  }),
  
  inventory_items: z.array(z.object({
    name: z.string().min(1, "Name required"),
    category: z.string().min(1, "Category required"),
    quantity: z.coerce.number().min(0, "Quantity must be >= 0"),
    unit: z.string().min(1, "Unit required"),
    cost_basis: z.coerce.number().min(0, "Cost must be >= 0"),
  })).min(1, "At least one inventory item must be generated")
});

export async function GET(req: NextRequest) {
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const records = await db.slaughterRecord.findMany({
      where: { farm_id: farmId, deleted_at: null },
      include: { 
        batch: { include: { animal_category: true } },
        slaughterYield: true,
        wasteRecord: true,
        inventoryItems: { where: { deleted_at: null } }
      },
      orderBy: { slaughter_date: "desc" },
    });
    return NextResponse.json({ data: records });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch slaughter records" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isManager(session)) return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });

  try {
    const body = await req.json();
    const parsedData = createSlaughterSchema.parse(body);

    await checkFinancialLock(farmId, parsedData.slaughter_date);

    if (parsedData.yield.usable_meat_weight > parsedData.yield.carcass_weight) {
      return NextResponse.json({ error: "Usable meat weight cannot exceed carcass weight" }, { status: 400 });
    }

    // 1. Validate Batch
    const batch = await db.animalBatch.findFirst({
      where: { id: parsedData.batch_id, farm_id: farmId, deleted_at: null }
    });
    if (!batch) return NextResponse.json({ error: "Invalid batch" }, { status: 400 });

    if (parsedData.quantity_slaughtered > batch.quantity) {
      return NextResponse.json({ error: "Cannot slaughter more animals than batch holds" }, { status: 400 });
    }

    const total_live_weight = parsedData.quantity_slaughtered * parsedData.average_live_weight;
    const yield_percentage = (parsedData.yield.usable_meat_weight / total_live_weight) * 100;
    const total_waste = parsedData.waste.bones_weight + parsedData.waste.fat_weight + parsedData.waste.organ_weight + parsedData.waste.waste_weight;

    // 2. Transaction
    const result = await db.$transaction(async (tx) => {
      // Deduct batch quantity
      await tx.animalBatch.update({
        where: { id: batch.id },
        data: { quantity: { decrement: parsedData.quantity_slaughtered } }
      });

      // Create Slaughter Record
      const slaughter = await tx.slaughterRecord.create({
        data: {
          farm_id: farmId,
          batch_id: batch.id,
          slaughter_date: parsedData.slaughter_date,
          quantity_slaughtered: parsedData.quantity_slaughtered,
          average_live_weight: parsedData.average_live_weight,
          total_live_weight: total_live_weight,
          notes: parsedData.notes,
        }
      });

      // Create Yield Record
      await tx.slaughterYield.create({
        data: {
          slaughter_record_id: slaughter.id,
          carcass_weight: parsedData.yield.carcass_weight,
          usable_meat_weight: parsedData.yield.usable_meat_weight,
          yield_percentage: yield_percentage
        }
      });

      // Create Waste Record
      await tx.wasteRecord.create({
        data: {
          slaughter_record_id: slaughter.id,
          bones_weight: parsedData.waste.bones_weight,
          fat_weight: parsedData.waste.fat_weight,
          organ_weight: parsedData.waste.organ_weight,
          waste_weight: parsedData.waste.waste_weight,
          notes: parsedData.waste.notes,
          total_waste: total_waste
        }
      });

      // Create Inventory Items (handle duplicate names by updating existing stock)
      for (const item of parsedData.inventory_items) {
        // Find existing inventory item for this farm
        const existingInventory = await tx.inventoryItem.findFirst({
          where: { farm_id: farmId, name: item.name, deleted_at: null }
        });

        if (existingInventory) {
          // Increment quantity and update cost_basis
          await tx.inventoryItem.update({
            where: { id: existingInventory.id },
            data: { 
              quantity: { increment: item.quantity },
              cost_basis: item.cost_basis, // Update to latest cost basis
              source_slaughter_id: slaughter.id
            }
          });
        } else {
          // Check if it exists but was soft-deleted, then we'd need to restore, but simpler to just create if no unique constraint conflict, 
          // wait, schema has @@unique([farm_id, name]). So we must upsert or check deleted.
          const deletedInventory = await tx.inventoryItem.findFirst({
            where: { farm_id: farmId, name: item.name, deleted_at: { not: null } }
          });
          
          if (deletedInventory) {
            await tx.inventoryItem.update({
              where: { id: deletedInventory.id },
              data: {
                quantity: item.quantity,
                category: item.category,
                unit: item.unit,
                cost_basis: item.cost_basis,
                source_slaughter_id: slaughter.id,
                deleted_at: null
              }
            });
          } else {
            await tx.inventoryItem.create({
              data: {
                farm_id: farmId,
                name: item.name,
                category: item.category,
                quantity: item.quantity,
                unit: item.unit,
                cost_basis: item.cost_basis,
                source_slaughter_id: slaughter.id
              }
            });
          }
        }
      }

      return slaughter;
    });

    await logAuditEvent({
      userId: session.user.id,
      farmId,
      module: "SLAUGHTER",
      action: "CREATE_SLAUGHTER",
      entityType: "SlaughterRecord",
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
    return NextResponse.json({ error: error.message || "Failed to create slaughter record" }, { status: 500 });
  }
}
