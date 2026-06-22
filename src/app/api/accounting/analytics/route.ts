import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { isManager, isAccountant } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isManager(session) && !isAccountant(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // 1. Cost per animal
    const activeBatches = await db.animalBatch.aggregate({
      _sum: { quantity: true },
      where: { farm_id: farmId, deleted_at: null, status: "ACTIVE" }
    });
    
    const [expenses, feed, water, electricity] = await Promise.all([
      db.expense.aggregate({ _sum: { amount: true }, where: { farm_id: farmId, deleted_at: null } }),
      db.feedConsumption.aggregate({ _sum: { cost: true }, where: { farm_id: farmId, deleted_at: null } }),
      db.waterUsage.aggregate({ _sum: { total_cost: true }, where: { farm_id: farmId, deleted_at: null } }),
      db.electricityUsage.aggregate({ _sum: { total_cost: true }, where: { farm_id: farmId, deleted_at: null } })
    ]);

    const totalExpenses = (expenses._sum.amount || 0) + (feed._sum.cost || 0) + (water._sum.total_cost || 0) + (electricity._sum.total_cost || 0);
    const activeAnimals = activeBatches._sum.quantity || 0;
    const costPerAnimal = activeAnimals > 0 ? totalExpenses / activeAnimals : 0;

    // 2. Cost per KG meat (Yield-based implementation)
    // ONLY include costs directly attributable to slaughtered animals to prevent alive-animal cost inflation.
    const slaughteredRecords = await db.slaughterRecord.findMany({
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
          // Attribute purchase cost only for the specific animals slaughtered
          totalAllocatedAnimalCost += (record.quantity_slaughtered * record.batch.cost_per_animal);

          // Attribute feed cost proportionally
          const initialQty = record.batch.initial_quantity > 0 ? record.batch.initial_quantity : 1;
          const portion = record.quantity_slaughtered / initialQty;
          
          const batchFeedCost = record.batch.feedConsumptions.reduce((sum, f) => sum + f.cost, 0);
          totalAllocatedFeedCost += (batchFeedCost * portion);
        }
      }
    }

    const slaughterExpenses = await db.expense.aggregate({
      _sum: { amount: true },
      where: { farm_id: farmId, deleted_at: null, category: { in: ['Slaughter', 'Processing', 'Butchery'] } }
    });

    const totalProductionCost = totalAllocatedAnimalCost + totalAllocatedFeedCost + (slaughterExpenses._sum.amount || 0);
    const costPerKg = totalMeatYield > 0 ? totalProductionCost / totalMeatYield : 0;

    // 3. Batch ROI (Sample top 5)
    // To do this fully server-side without a complex CTE, we can fetch all batches and map them, but for performance, we'll fetch completed/sold batches.
    const completedBatches = await db.animalBatch.findMany({
      where: { farm_id: farmId, deleted_at: null },
      include: {
        feedConsumptions: { where: { deleted_at: null } },
        waterUsages: { where: { deleted_at: null } },
        salesInvoiceItems: { 
          where: { deleted_at: null, invoice: { deleted_at: null } },
          include: { invoice: true }
        }
      }
    });

    const batchROI = completedBatches.map(batch => {
      const batchFeedCost = batch.feedConsumptions.reduce((sum, f) => sum + f.cost, 0);
      const batchWaterCost = batch.waterUsages.reduce((sum, w) => sum + w.total_cost, 0);
      const batchInitialCost = batch.initial_quantity * batch.cost_per_animal; // roughly
      const totalBatchCost = batchFeedCost + batchWaterCost + batchInitialCost;
      
      const batchRevenue = batch.salesInvoiceItems.reduce((sum, s) => sum + s.amount, 0);
      const roi = totalBatchCost > 0 ? ((batchRevenue - totalBatchCost) / totalBatchCost) * 100 : 0;

      return {
        batch_number: batch.batch_number,
        revenue: batchRevenue,
        expenses: totalBatchCost,
        profit: batchRevenue - totalBatchCost,
        roi_percentage: roi
      };
    }).sort((a, b) => b.roi_percentage - a.roi_percentage);

    const positiveROI = batchROI.filter(b => b.roi_percentage >= 0);
    const negativeROI = batchROI.filter(b => b.roi_percentage < 0);

    return NextResponse.json({
      data: {
        cost_per_animal: costPerAnimal,
        cost_per_kg: costPerKg,
        top_batches: positiveROI.slice(0, 5),
        bottom_batches: negativeROI.reverse().slice(0, 5)
      }
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch cost analytics" }, { status: 500 });
  }
}
