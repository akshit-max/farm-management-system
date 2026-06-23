import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function run() {
  try {
    const farms = await db.farm.findMany({ take: 1 });
    if (!farms.length) return console.log("No farms");
    
    const batch = await db.animalBatch.findFirst({ where: { farm_id: farms[0].id } });
    if (!batch) return console.log("No batches");

    try {
      await db.$transaction(async (tx) => {
        const slaughter = await tx.slaughterRecord.create({
          data: {
            farm_id: farms[0].id,
            batch_id: batch.id,
            slaughter_date: new Date(),
            quantity_slaughtered: 1,
            average_live_weight: 10,
            total_live_weight: 10,
          }
        });

        await tx.inventoryItem.create({
          data: {
            farm_id: farms[0].id,
            name: "Slaughter Test Item " + Date.now(),
            category: "Meat",
            quantity: 5,
            unit: "kg",
            cost_basis: 0,
            source_slaughter_id: slaughter.id
          }
        });
      });
      console.log("SUCCESS");
    } catch (e: any) {
      console.log("FAILED transaction:", e.message);
    }
  } catch (err: any) {
    console.error(err);
  } finally {
    await db.$disconnect();
  }
}
run();
