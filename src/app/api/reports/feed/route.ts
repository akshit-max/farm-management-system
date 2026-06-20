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
    const [feed, batches] = await Promise.all([
      db.feedConsumption.findMany({
        where: { farm_id: farmId, deleted_at: null, ...(dateFilter ? { date: dateFilter } : {}) },
        include: { feed_type: true },
        orderBy: { date: 'desc' }
      }),
      db.animalBatch.findMany({ where: { farm_id: farmId, deleted_at: null, status: 'ACTIVE' } })
    ]);
    
    const feedMap: Record<string, { feedType: string, quantity: number, cost: number }> = {};
    let totalConsumed = 0;
    let totalCost = 0;
    
    feed.forEach(f => {
      const name = f.feed_type?.name || 'Unknown';
      if (!feedMap[name]) feedMap[name] = { feedType: name, quantity: 0, cost: 0 };
      feedMap[name].quantity += f.quantity_kg;
      feedMap[name].cost += f.cost;
      totalConsumed += f.quantity_kg;
      totalCost += f.cost;
    });
    
    const rows = Object.values(feedMap);
    
    const trendMap: Record<string, { date: string, quantity: number, cost: number }> = {};
    feed.forEach(f => {
      const d = new Date(f.date).toISOString().split('T')[0];
      if (!trendMap[d]) trendMap[d] = { date: d, quantity: 0, cost: 0 };
      trendMap[d].quantity += f.quantity_kg;
      trendMap[d].cost += f.cost;
    });
    const trend = Object.values(trendMap).sort((a, b) => a.date.localeCompare(b.date));

    const liveAnimals = batches.reduce((sum, b) => sum + b.quantity, 0);
    const feedEfficiency = liveAnimals > 0 ? totalConsumed / liveAnimals : 0;

    return NextResponse.json({ data: { rows, kpis: { totalConsumed, totalCost, feedEfficiency }, charts: { trend } } });
  } catch (error) {
    console.error("feed report error:", error);
    return NextResponse.json({ error: "Failed to fetch report data" }, { status: 500 });
  }
}