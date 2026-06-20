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
    const feedTypes = await db.feedType.findMany({
      where: { farm_id: farmId, deleted_at: null },
      include: { supplier: true }
    });

    const sMap: Record<string, any> = {};
    feedTypes.forEach(f => {
      const sName = f.supplier?.company_name || 'Unknown';
      if (!sMap[sName]) sMap[sName] = { supplier: sName, linkedFeedTypes: 0, usageFreq: 0 };
      sMap[sName].linkedFeedTypes++;
      sMap[sName].usageFreq++; 
    });

    const rows = Object.values(sMap).sort((a: any, b: any) => b.usageFreq - a.usageFreq);
    const distribution = rows.map((r: any) => ({ name: r.supplier, value: r.usageFreq })).slice(0, 10);

    return NextResponse.json({ data: { rows, charts: { distribution } } });
  } catch (error) {
    console.error("suppliers report error:", error);
    return NextResponse.json({ error: "Failed to fetch report data" }, { status: 500 });
  }
}