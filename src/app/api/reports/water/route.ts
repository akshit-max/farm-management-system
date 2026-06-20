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

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "month";
  const { dateFilter } = resolveDateRange(period, searchParams.get("startDate"), searchParams.get("endDate"));


  try {
    const [water, batches] = await Promise.all([
      db.waterUsage.findMany({
        where: { farm_id: farmId, deleted_at: null, ...(dateFilter ? { date: dateFilter } : {}) },
        include: { room: true },
        orderBy: { date: 'desc' }
      }),
      db.animalBatch.findMany({ where: { farm_id: farmId, deleted_at: null, status: 'ACTIVE' } })
    ]);
    
    const rows = water.map(w => ({
      date: new Date(w.date).toISOString().split('T')[0],
      consumption: w.actual_consumption_liters,
      cost: w.total_cost,
      room: w.room?.name || 'Unknown'
    }));

    const totalConsumption = rows.reduce((sum, r) => sum + r.consumption, 0);
    const totalCost = rows.reduce((sum, r) => sum + r.cost, 0);

    const trendMap: Record<string, { date: string, consumption: number, cost: number }> = {};
    rows.forEach(r => {
      if (!trendMap[r.date]) trendMap[r.date] = { date: r.date, consumption: 0, cost: 0 };
      trendMap[r.date].consumption += r.consumption;
      trendMap[r.date].cost += r.cost;
    });
    const trend = Object.values(trendMap).sort((a, b) => a.date.localeCompare(b.date));

    const liveAnimals = batches.reduce((sum, b) => sum + b.quantity, 0);
    const waterPerAnimal = liveAnimals > 0 ? totalConsumption / liveAnimals : 0;

    return NextResponse.json({ data: { rows, kpis: { totalConsumption, totalCost, waterPerAnimal }, charts: { trend } } });
  } catch (error) {
    console.error("water report error:", error);
    return NextResponse.json({ error: "Failed to fetch report data" }, { status: 500 });
  }
}