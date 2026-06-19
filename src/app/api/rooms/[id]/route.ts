import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";
import { isManager } from "@/lib/rbac";
import { z } from "zod";

const updateRoomSchema = z.object({
  name: z.string().min(1).optional(),
  capacity: z.number().min(1).optional(),
  allowed_stages: z.string().optional(),
  active_status: z.boolean().optional(),
});

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isManager(session)) return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });

  try {
    const body = await req.json();
    const parsedData = updateRoomSchema.parse(body);

    const room = await db.room.findUnique({ where: { id } });
    if (!room || room.deleted_at || room.farm_id !== farmId) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = await db.room.update({
      where: { id },
      data: parsedData,
    });

    await logAudit(session.user.id, farmId, "UPDATE", "Room", id);
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.flatten().fieldErrors }, { status: 400 });
    return NextResponse.json({ error: "Failed to update room" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isManager(session)) return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });

  try {
    const room = await db.room.findUnique({ where: { id } });
    if (!room || room.farm_id !== farmId) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await db.room.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    await logAudit(session.user.id, farmId, "DELETE", "Room", id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete room" }, { status: 500 });
  }
}
