import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "Worker") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const alert = await (db as any).notification.update({
      where: { id: id, farm_id: farmId },
      data: { is_read: true }
    });
    return NextResponse.json({ data: alert });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
