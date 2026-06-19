import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const roles = await db.role.findMany({
      where: { deleted_at: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, description: true },
    });
    return NextResponse.json({ data: roles });
  } catch {
    return NextResponse.json({ error: "Failed to fetch roles" }, { status: 500 });
  }
}
