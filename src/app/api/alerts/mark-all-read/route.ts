import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  if (session.user.role === "Worker") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    await (db as any).notification.updateMany({
      where: { farm_id: farmId, is_read: false, deleted_at: null },
      data: { is_read: true }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
