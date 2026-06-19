import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

    // 2. Cost per KG meat
    const inventory = await db.inventoryItem.aggregate({
      _sum: { quantity: true },
      where: { farm_id: farmId, deleted_at: null, category: { in: ["Meat", "Chicken", "Beef", "Pork"] } } // rough heuristic
    });
    const totalMeatQuantity = inventory._sum.quantity || 0;
    const costPerKg = totalMeatQuantity > 0 ? totalExpenses / totalMeatQuantity : 0;

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
      const batchInitialCost = batch.quantity * batch.cost_per_animal; // roughly
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

    return NextResponse.json({
      data: {
        cost_per_animal: costPerAnimal,
        cost_per_kg: costPerKg,
        top_batches: batchROI.slice(0, 5),
        bottom_batches: batchROI.slice(-5).reverse()
      }
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch cost analytics" }, { status: 500 });
  }
}
