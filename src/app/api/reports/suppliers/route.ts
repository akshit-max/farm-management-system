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

  // NOTE: FeedType records do not carry transaction timestamps, so supplier ranking
  // cannot be meaningfully filtered by a date range. This report is intentionally
  // ALL-TIME and shows the total number of feed types linked to each supplier.
  // The UI period selector is not applicable to this report.

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

    return NextResponse.json({ data: { rows, charts: { distribution }, meta: { isAllTime: true } } });
  } catch (error) {
    console.error("suppliers report error:", error);
    return NextResponse.json({ error: "Failed to fetch report data" }, { status: 500 });
  }
}