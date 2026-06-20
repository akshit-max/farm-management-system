import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const farmId = "00000000-0000-0000-0000-000000000001"; // Need to get actual farmId

  const farm = await db.farm.findFirst();
  if (!farm) return;

  const [batches, waterUsages, elecUsages] = await Promise.all([
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
    db.electricityUsage.findMany({ where: { farm_id: farm.id, deleted_at: null } })
  ]);

  const data = batches.map(b => {
    const feedCost = b.feedConsumptions.reduce((sum, f) => sum + f.cost, 0);
    const waterCost = waterUsages
      .filter(w => w.room_id === b.room_id)
      .reduce((sum, w) => sum + w.total_cost, 0);
    const elecCost = elecUsages
      .filter(e => e.room_id === b.room_id)
      .reduce((sum, e) => sum + e.total_cost, 0);

    const utilityCost = waterCost + elecCost;
    const purchaseCost = b.initial_quantity * b.cost_per_animal;
    const totalCost = feedCost + utilityCost + purchaseCost;

    const revenue = b.salesInvoiceItems.reduce((sum, item) => sum + item.amount, 0);

    const netProfit = revenue - totalCost;
    const roi = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;

    return {
      batch: b.batch_number,
      category: b.animal_category?.name || 'Unknown',
      initialQuantity: b.initial_quantity,
      currentQuantity: b.quantity,
      costPerAnimal: b.cost_per_animal,
      feedCost,
      utilityCost,
      purchaseCost,
      totalCost,
      revenue,
      netProfit,
      roi
    };
  });

  console.log(JSON.stringify({ data: { rows: data } }, null, 2));
}

main().finally(() => db.$disconnect());
