import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { isOwner } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.farm_id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const settings = await db.settings.findUnique({
      where: { farm_id: session.user.farm_id },
    });

    return NextResponse.json({ data: settings || {} });
  } catch (error) {
    console.error("Settings GET error:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.farm_id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    // RBAC: Only OWNER can update farm settings
    if (!isOwner(session)) {
      return NextResponse.json({ error: "Only Farm Owners can modify settings" }, { status: 403 });
    }

    const body = await req.json();
    const { theme, currency, date_format } = body;

    const settings = await db.settings.upsert({
      where: { farm_id: session.user.farm_id },
      update: { theme, currency, date_format },
      create: {
        farm_id: session.user.farm_id,
        theme: theme || "light",
        currency: currency || "USD",
        date_format: date_format || "YYYY-MM-DD",
      },
    });

    await logAudit(session.user.id, session.user.farm_id, "UPDATE", "Settings", settings.id);

    return NextResponse.json({ message: "Settings updated successfully", data: settings });
  } catch (error) {
    console.error("Settings PUT error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
