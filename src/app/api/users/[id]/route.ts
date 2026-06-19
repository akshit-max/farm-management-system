import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  role_id: z.string().uuid().optional(),
  active_status: z.boolean().optional(),
});

// PATCH update user (Owner only)
export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "Owner") return NextResponse.json({ error: "Owner access required" }, { status: 403 });

  try {
    const body = await req.json();
    const data = updateUserSchema.parse(body);

    const user = await db.user.findUnique({ where: { id } });
    if (!user || user.farm_id !== farmId || user.deleted_at) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    // Prevent owner from demoting themselves
    if (id === session.user.id && data.role_id) {
      return NextResponse.json({ error: "You cannot change your own role" }, { status: 400 });
    }

    const updated = await db.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        active_status: true,
        created_at: true,
        role: { select: { id: true, name: true } },
      },
    });

    await logAudit(session.user.id, farmId, "UPDATE", "User", id);
    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.flatten().fieldErrors }, { status: 400 });
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

// DELETE soft-delete user (Owner only)
export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "Owner") return NextResponse.json({ error: "Owner access required" }, { status: 403 });

  if (id === session.user.id) return NextResponse.json({ error: "You cannot delete yourself" }, { status: 400 });

  try {
    const user = await db.user.findUnique({ where: { id } });
    if (!user || user.farm_id !== farmId) return NextResponse.json({ error: "User not found" }, { status: 404 });

    await db.user.update({ where: { id }, data: { deleted_at: new Date(), active_status: false } });
    await logAudit(session.user.id, farmId, "DELETE", "User", id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
