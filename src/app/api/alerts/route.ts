import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get("unreadOnly") === "true";
  const limit = parseInt(searchParams.get("limit") || "50", 10);

  try {
    const alerts = await (db as any).notification.findMany({
      where: {
        farm_id: farmId,
        deleted_at: null,
        ...(unreadOnly ? { is_read: false } : {})
      },
      orderBy: { created_at: "desc" },
      take: limit
    });
    
    const unreadCount = await (db as any).notification.count({
      where: { farm_id: farmId, deleted_at: null, is_read: false }
    });

    return NextResponse.json({ data: alerts, unreadCount });
  } catch (error) {
    console.error("Fetch alerts error:", error);
    return NextResponse.json({ error: "Failed to fetch alerts" }, { status: 500 });
  }
}
