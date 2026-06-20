import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { isManager, isAccountant } from "@/lib/rbac";
import { resolveDateRange } from "@/lib/dateUtils";

export async function GET(req: NextRequest) {
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isManager(session) && !isAccountant(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }


  try {
    const [batches, waterUsages, elecUsages] = await Promise.all([
      db.animalBatch.findMany({
        where: { farm_id: farmId, deleted_at: null },
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
      db.waterUsage.findMany({ where: { farm_id: farmId, deleted_at: null } }),
      db.electricityUsage.findMany({ where: { farm_id: farmId, deleted_at: null } })
    ]);

    const data = batches.map(b => {
      // Cost side
      const feedCost = b.feedConsumptions.reduce((sum, f) => sum + f.cost, 0);
      // KNOWN LIMITATION — Room-Level Utility Cost Attribution
      // Water and electricity costs are tracked at the room level, not the individual
      // batch level. When a single room hosts multiple concurrent batches, the full
      // room-level utility cost is attributed to EACH batch independently.
      //
      // Example: Room A utility cost = ₹1,000. Batch A in Room A → attributed ₹1,000.
      //          Batch B also in Room A → also attributed ₹1,000.
      //          Total attributed = ₹2,000 vs actual cost of ₹1,000.
      //
      // Impact: Per-batch totalCost and ROI may be overstated in shared-room scenarios.
      // This is the only available data granularity — per-batch utility metering is not
      // tracked in the current schema. A proportional allocation engine can be implemented
      // in a future schema extension when per-batch utility tracking is added.
      const waterCost = waterUsages
        .filter(w => w.room_id === b.room_id)
        .reduce((sum, w) => sum + w.total_cost, 0);
      const elecCost = elecUsages
        .filter(e => e.room_id === b.room_id)
        .reduce((sum, e) => sum + e.total_cost, 0);

      const utilityCost = waterCost + elecCost;
      const purchaseCost = b.initial_quantity * b.cost_per_animal;
      const totalCost = feedCost + utilityCost + purchaseCost;

      // Revenue side — sum of SalesInvoiceItem.amount for this batch (non-cancelled invoices only)
      const revenue = b.salesInvoiceItems.reduce((sum, item) => sum + item.amount, 0);

      // Derived metrics — guard against division by zero
      const netProfit = revenue - totalCost;
      const roi = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;

      return {
        batch: b.batch_number,
        category: b.animal_category?.name || 'Unknown',
        animalCount: b.quantity,
        feedCost,
        utilityCost,
        purchaseCost,
        totalCost,
        revenue,
        netProfit,
        roi
      };
    });

    return NextResponse.json({ data: { rows: data } });
  } catch (error) {
    console.error("batch-profitability report error:", error);
    return NextResponse.json({ error: "Failed to fetch report data" }, { status: 500 });
  }
}