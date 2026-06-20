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
    const [elec, batches] = await Promise.all([
      db.electricityUsage.findMany({
        where: { farm_id: farmId, deleted_at: null, ...(dateFilter ? { date: dateFilter } : {}) },
        include: { meter: true },
        orderBy: { date: 'desc' }
      }),
      db.animalBatch.findMany({ where: { farm_id: farmId, deleted_at: null, status: 'ACTIVE' } })
    ]);
    
    const rows = elec.map(e => ({
      date: new Date(e.date).toISOString().split('T')[0],
      consumption: e.units_consumed,
      cost: e.total_cost,
      meter: e.meter?.meter_number || 'Unknown'
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
    const elecPerAnimal = liveAnimals > 0 ? totalConsumption / liveAnimals : 0;

    return NextResponse.json({ data: { rows, kpis: { totalConsumption, totalCost, elecPerAnimal }, charts: { trend } } });
  } catch (error) {
    console.error("electricity report error:", error);
    return NextResponse.json({ error: "Failed to fetch report data" }, { status: 500 });
  }
}