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

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "month";
  const startParam = searchParams.get("startDate");
  const endParam = searchParams.get("endDate");

  let startDate: Date | undefined;
  let endDate: Date | undefined;
  const now = new Date();

  if (startParam && endParam) {
    startDate = new Date(startParam);
    endDate = new Date(endParam);
    endDate.setHours(23, 59, 59, 999);
  } else if (period === "today") {
    startDate = new Date(now.setHours(0,0,0,0));
    endDate = new Date(now.setHours(23,59,59,999));
  } else if (period === "week") {
    startDate = new Date(now);
    startDate.setDate(now.getDate() - now.getDay());
    startDate.setHours(0,0,0,0);
    endDate = new Date(now);
    endDate.setHours(23,59,59,999);
  } else if (period === "month") {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  } else if (period === "year") {
    startDate = new Date(now.getFullYear(), 0, 1);
    endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
  }

  const dateFilter = startDate && endDate ? { gte: startDate, lte: endDate } : undefined;

  try {
    const [batches, waterUsages, elecUsages] = await Promise.all([
      db.animalBatch.findMany({
        where: { farm_id: farmId, deleted_at: null },
        include: {
          feedConsumptions: true,
          slaughterRecords: true,
          animal_category: true
        }
      }),
      db.waterUsage.findMany({ where: { farm_id: farmId, deleted_at: null } }),
      db.electricityUsage.findMany({ where: { farm_id: farmId, deleted_at: null } })
    ]);
    
    const data = batches.map(b => {
      const feedCost = b.feedConsumptions.reduce((sum, f) => sum + f.cost, 0);
      const waterCost = waterUsages.filter(w => w.room_id === b.room_id).reduce((sum, w) => sum + w.total_cost, 0);
      const elecCost = elecUsages.filter(e => e.room_id === b.room_id).reduce((sum, e) => sum + e.total_cost, 0);
      const utilityCost = waterCost + elecCost;
      
      const revenue = 0; 
      const netProfit = revenue - feedCost - utilityCost;
      const roi = (feedCost + utilityCost) > 0 ? (netProfit / (feedCost + utilityCost)) * 100 : 0;
      
      return {
        batch: b.batch_number,
        category: b.animal_category?.name || 'Unknown',
        animalCount: b.quantity,
        feedCost,
        utilityCost,
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