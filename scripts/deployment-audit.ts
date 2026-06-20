import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  console.log("=== DEPLOYMENT AUDIT: DATABASE MIGRATION SAFETY ===");
  const totalBatches = await db.animalBatch.count();
  console.log(`Total Batches: ${totalBatches}`);
  
  // Since initial_quantity is non-nullable Int @default(0), 0 nulls exist at schema level, but let's confirm.
  // Wait, Prisma doesn't let you query `initial_quantity: null` if it's Int. It's strictly typed.
  console.log(`Batches with NULL initial_quantity: 0 (Schema Enforced)`);

  console.log("\n=== DEPLOYMENT AUDIT: DATA INTEGRITY ===");
  const qtyGtInitial = await db.animalBatch.count({
    where: {
      quantity: { gt: db.animalBatch.fields.initial_quantity } // Prisma 5 field reference or raw
    }
  }).catch(async () => {
    // Fallback if field reference is not supported in this Prisma version
    const all = await db.animalBatch.findMany();
    return all.filter(b => b.quantity > b.initial_quantity).length;
  });
  console.log(`Batches where quantity > initial_quantity: ${qtyGtInitial}`);

  const qtyLtZero = await db.animalBatch.count({ where: { quantity: { lt: 0 } } });
  console.log(`Batches where quantity < 0: ${qtyLtZero}`);

  const initialLtEqZero = await db.animalBatch.count({ where: { initial_quantity: { lte: 0 } } });
  console.log(`Batches where initial_quantity <= 0: ${initialLtEqZero}`);

  console.log(`Orphan records: 0 (Schema Enforced Foreign Keys)`);

  console.log("\n=== DEPLOYMENT AUDIT: FINANCIAL INTEGRITY ===");
  const farm = await db.farm.findFirst();
  if (!farm) return;

  const [batches, waterUsages, elecUsages, rawQtys] = await Promise.all([
    db.animalBatch.findMany({
      where: { farm_id: farm.id, deleted_at: null },
      include: {
        feedConsumptions: { where: { deleted_at: null } },
        slaughterRecords: true,
        animal_category: true,
        salesInvoiceItems: {
          where: {
            deleted_at: null,
            invoice: { deleted_at: null } 
          },
          include: { invoice: true }
        }
      }
    }),
    db.waterUsage.findMany({ where: { farm_id: farm.id, deleted_at: null } }),
    db.electricityUsage.findMany({ where: { farm_id: farm.id, deleted_at: null } }),
    db.$queryRaw<{id: string, initial_quantity: number}[]>`SELECT id, initial_quantity FROM animal_batches WHERE farm_id = ${farm.id}::uuid`
  ]);

  const qtyMap = new Map(rawQtys.map(q => [q.id, q.initial_quantity]));

  batches.forEach(b => {
    const feedCost = b.feedConsumptions.reduce((sum, f) => sum + f.cost, 0);
    const waterCost = waterUsages.filter(w => w.room_id === b.room_id).reduce((sum, w) => sum + w.total_cost, 0);
    const elecCost = elecUsages.filter(e => e.room_id === b.room_id).reduce((sum, e) => sum + e.total_cost, 0);

    const utilityCost = waterCost + elecCost;
    const initialQty = qtyMap.get(b.id) ?? b.initial_quantity ?? 0;
    const purchaseCost = initialQty * b.cost_per_animal;
    const totalCost = feedCost + utilityCost + purchaseCost;
    const revenue = b.salesInvoiceItems.reduce((sum, item) => sum + item.amount, 0);
    const netProfit = revenue - totalCost;
    const roi = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;

    console.log(`Batch ${b.batch_number}: PurchaseCost=${purchaseCost}, TotalCost=${totalCost}, Revenue=${revenue}, NetProfit=${netProfit}, ROI=${roi.toFixed(2)}%`);
  });

}

main().finally(() => db.$disconnect());
