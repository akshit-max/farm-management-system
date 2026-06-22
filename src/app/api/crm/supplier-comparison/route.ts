import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { isOwner, isManager, isAccountant } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  if (!(isOwner(session) || isManager(session) || isAccountant(session))) {
    return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });
  }

  try {
    const suppliers = await db.supplier.findMany({
      where: { farm_id: farmId, status: "ACTIVE" },
      include: {
        feed_types: {
          include: {
            consumptions: {
              where: { deleted_at: null },
              include: {
                batch: {
                  include: {
                    mortalities: { where: { deleted_at: null } }
                  }
                }
              }
            }
          }
        }
      }
    });

    const report = suppliers.map(supplier => {
      let purchaseVolume = 0;
      let purchaseValue = 0;
      let totalAnimalsFed = 0;
      let totalMortalities = 0;

      const fedBatchIds = new Set<string>();

      for (const feed of supplier.feed_types) {
        for (const cons of feed.consumptions) {
          purchaseVolume += cons.quantity_kg;
          purchaseValue += cons.cost;
          
          if (cons.batch && !fedBatchIds.has(cons.batch.id)) {
            fedBatchIds.add(cons.batch.id);
            totalAnimalsFed += cons.batch.initial_quantity;
            totalMortalities += cons.batch.mortalities.reduce((acc: number, m: any) => acc + m.quantity, 0);
          }
        }
      }

      const avgCostPerAnimal = totalAnimalsFed > 0 ? purchaseValue / totalAnimalsFed : 0;
      const mortalityImpact = totalAnimalsFed > 0 ? (totalMortalities / totalAnimalsFed) * 100 : 0;

      return {
        id: supplier.id,
        name: supplier.company_name,
        type: supplier.supplier_type,
        purchaseVolume,
        purchaseValue,
        avgCostPerAnimal,
        mortalityImpact
      };
    });

    // Rank logic: Lower mortality and lower cost is better, but this is simple ranking
    // Let's rank by Purchase Value as primary
    report.sort((a, b) => b.purchaseValue - a.purchaseValue);

    return NextResponse.json({ data: report });
  } catch (error) {
    console.error("Supplier Comparison Error:", error);
    return NextResponse.json({ error: "Failed to generate supplier comparison" }, { status: 500 });
  }
}
