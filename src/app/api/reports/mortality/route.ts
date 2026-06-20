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
    const [mortalities, batches] = await Promise.all([
      db.mortality.findMany({
        where: { batch: { farm_id: farmId }, deleted_at: null, ...(dateFilter ? { date: dateFilter } : {}) },
        include: { batch: { include: { animal_category: true } } },
        orderBy: { date: 'desc' }
      }),
      db.animalBatch.findMany({ where: { farm_id: farmId, deleted_at: null, status: 'ACTIVE' } })
    ]);
    
    const rows = mortalities.map(m => ({
      date: new Date(m.date).toISOString().split('T')[0],
      batch: m.batch?.batch_number || 'Unknown',
      category: m.batch?.animal_category?.name || 'Unknown',
      quantity: m.quantity,
      reason: m.cause || 'Not Specified'
    }));

    const totalDeaths = rows.reduce((sum, r) => sum + r.quantity, 0);
    
    const liveAnimals = batches.reduce((sum, b) => sum + b.quantity, 0);
    const mortalityRate = (liveAnimals + totalDeaths) > 0 ? (totalDeaths / (liveAnimals + totalDeaths)) * 100 : 0;
    
    const batchMap: Record<string, number> = {};
    rows.forEach(r => { batchMap[r.batch] = (batchMap[r.batch] || 0) + r.quantity; });
    const mostAffectedBatch = Object.entries(batchMap).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    const trendMap: Record<string, number> = {};
    const categoryMap: Record<string, number> = {};
    rows.forEach(r => {
      trendMap[r.date] = (trendMap[r.date] || 0) + r.quantity;
      categoryMap[r.category] = (categoryMap[r.category] || 0) + r.quantity;
    });
    const trend = Object.entries(trendMap).map(([date, count]) => ({ date, count })).sort((a,b) => a.date.localeCompare(b.date));
    const byCategory = Object.entries(categoryMap).map(([category, count]) => ({ category, count }));

    return NextResponse.json({ data: { rows, kpis: { totalDeaths, mortalityRate, mostAffectedBatch }, charts: { trend, byCategory } } });
  } catch (error) {
    console.error("mortality report error:", error);
    return NextResponse.json({ error: "Failed to fetch report data" }, { status: 500 });
  }
}