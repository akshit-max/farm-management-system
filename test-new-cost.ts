import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const farmId = 'd9b82079-3261-4c83-b30f-321903ceb57d';

async function run() {
    const slaughteredRecords = await prisma.slaughterRecord.findMany({
      where: { farm_id: farmId, deleted_at: null },
      include: {
        slaughterYield: { where: { deleted_at: null } },
        batch: {
          include: { feedConsumptions: { where: { deleted_at: null } } }
        }
      }
    });

    let totalAllocatedAnimalCost = 0;
    let totalAllocatedFeedCost = 0;
    let totalMeatYield = 0;

    for (const record of slaughteredRecords) {
      if (record.slaughterYield && record.slaughterYield.usable_meat_weight > 0) {
        totalMeatYield += record.slaughterYield.usable_meat_weight;

        if (record.batch) {
          totalAllocatedAnimalCost += (record.quantity_slaughtered * record.batch.cost_per_animal);
          const initialQty = record.batch.initial_quantity > 0 ? record.batch.initial_quantity : 1;
          const portion = record.quantity_slaughtered / initialQty;
          const batchFeedCost = record.batch.feedConsumptions.reduce((sum, f) => sum + f.cost, 0);
          totalAllocatedFeedCost += (batchFeedCost * portion);
        }
      }
    }

    const slaughterExpenses = await prisma.expense.aggregate({
      _sum: { amount: true },
      where: { farm_id: farmId, deleted_at: null, category: { in: ['Slaughter', 'Processing', 'Butchery'] } }
    });

    const totalProductionCost = totalAllocatedAnimalCost + totalAllocatedFeedCost + (slaughterExpenses._sum.amount || 0);
    const costPerKg = totalMeatYield > 0 ? totalProductionCost / totalMeatYield : 0;

    console.log(`Purchase Cost Included: ₹${totalAllocatedAnimalCost}`);
    console.log(`Feed Cost Included:     ₹${totalAllocatedFeedCost}`);
    console.log(`Slaughter Expenses:     ₹${slaughterExpenses._sum.amount || 0}`);
    console.log(`Total Cost:             ₹${totalProductionCost}`);
    console.log(`Meat Yield:             ${totalMeatYield} kg`);
    console.log(`Cost Per KG:            ₹${costPerKg}`);
}
run().catch(console.error);
