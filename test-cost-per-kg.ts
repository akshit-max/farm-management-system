import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const GREEN_FARM = 'd9b82079-3261-4c83-b30f-321903ceb57d';

async function run() {
  console.log("=== COST PER KG CALCULATION (GREEN FARMS) ===");

  const allBatches = await prisma.animalBatch.findMany({ where: { farm_id: GREEN_FARM, deleted_at: null } });
  const totalAnimalCost = allBatches.reduce((acc, b) => acc + (b.initial_quantity * b.cost_per_animal), 0);

  const feed = await prisma.feedConsumption.aggregate({
    _sum: { cost: true },
    where: { farm_id: GREEN_FARM, deleted_at: null }
  });

  const slaughterExpenses = await prisma.expense.aggregate({
    _sum: { amount: true },
    where: { farm_id: GREEN_FARM, deleted_at: null, category: { in: ['Slaughter', 'Processing', 'Butchery'] } }
  });

  const totalProductionCost = totalAnimalCost + (feed._sum.cost || 0) + (slaughterExpenses._sum.amount || 0);

  const slaughterYields = await prisma.slaughterYield.aggregate({
    _sum: { usable_meat_weight: true },
    where: { slaughter_record: { farm_id: GREEN_FARM, deleted_at: null }, deleted_at: null }
  });

  const totalMeatYield = slaughterYields._sum.usable_meat_weight || 0;
  const costPerKg = totalMeatYield > 0 ? totalProductionCost / totalMeatYield : 0;

  console.log(`Purchase Cost Included: ₹${totalAnimalCost}`);
  console.log(`Feed Cost Included:     ₹${feed._sum.cost || 0}`);
  console.log(`Water Cost Included:    ₹0 (NOT INCLUDED IN FORMULA)`);
  console.log(`Electricity Included:   ₹0 (NOT INCLUDED IN FORMULA)`);
  console.log(`Slaughter Expenses:     ₹${slaughterExpenses._sum.amount || 0}`);
  console.log(`Total Cost:             ₹${totalProductionCost}`);
  console.log(`Meat Yield:             ${totalMeatYield} kg`);
  console.log(`Cost Per KG:            ₹${costPerKg}`);
}

run().catch(console.error);
