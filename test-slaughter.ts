import { db } from "./src/lib/db";
import { z } from "zod";

async function test() {
  try {
    const farmId = "d9b82079-3261-4c83-b30f-321903ceb57d";
    
    // get a batch
    const batch = await db.animalBatch.findFirst({ where: { farm_id: farmId, deleted_at: null } });
    if (!batch) { console.log("No batch"); return; }
    
    const parsedData = {
      batch_id: batch.id,
      slaughter_date: new Date(),
      quantity_slaughtered: 1,
      average_live_weight: 10,
      yield: {
        carcass_weight: 8,
        usable_meat_weight: 7
      },
      waste: {
        bones_weight: 0, fat_weight: 0, organ_weight: 0, waste_weight: 0
      },
      inventory_items: [
        { name: "Test Meat " + Date.now(), category: "Meat", quantity: 7, unit: "kg", cost_basis: 5 }
      ]
    };
    
    const yield_percentage = (parsedData.yield.carcass_weight / (parsedData.average_live_weight * parsedData.quantity_slaughtered)) * 100;
    const total_live_weight = parsedData.average_live_weight * parsedData.quantity_slaughtered;
    const total_waste = Object.values(parsedData.waste).reduce((a: any, b: any) => a + (Number(b) || 0), 0);

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
          sync_status: 'SYNCED'
        }
      });

      // Create Yield Record
      await tx.slaughterYield.create({
        data: {
          slaughter_record_id: slaughter.id,
          carcass_weight: parsedData.yield.carcass_weight,
          usable_meat_weight: parsedData.yield.usable_meat_weight,
          yield_percentage: yield_percentage,
          sync_status: 'SYNCED'
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
          total_waste: total_waste,
          sync_status: 'SYNCED'
        }
      });

      for (const item of parsedData.inventory_items) {
        await tx.inventoryItem.create({
          data: {
            farm_id: farmId,
            name: item.name,
            category: item.category,
            quantity: item.quantity,
            unit: item.unit,
            cost_basis: item.cost_basis,
            source_slaughter_id: slaughter.id,
            sync_status: 'SYNCED'
          }
        });
      }
      return slaughter;
    });

    console.log("Success:", result.id);
  } catch (err: any) {
    console.error("Prisma Error:", err.message);
  }
}

test();
