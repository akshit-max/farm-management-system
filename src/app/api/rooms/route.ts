import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";
import { isManager } from "@/lib/rbac";
import { z } from "zod";

const createRoomSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Name is required"),
  capacity: z.number().min(1, "Capacity must be > 0"),
  allowed_stages: z.string(),
  client_request_id: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const rooms = await db.room.findMany({
      where: { farm_id: farmId, deleted_at: null },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ data: rooms });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch rooms" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isManager(session)) return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });

  try {
    const body = await req.json();
    const parsedData = createRoomSchema.parse(body);

    if (parsedData.client_request_id) {
      const existingReq = await db.room.findFirst({
        where: { farm_id: farmId, client_request_id: parsedData.client_request_id }
      });
      if (existingReq) {
        return NextResponse.json(existingReq, { status: 200 });
      }
    }

    const room = await db.room.create({
      data: { farm_id: farmId, ...parsedData, sync_status: 'SYNCED' },
    });

    await logAudit(session.user.id, farmId, "CREATE", "Room", room.id);
    return NextResponse.json(room, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.flatten().fieldErrors }, { status: 400 });
    return NextResponse.json({ error: "Failed to create room" }, { status: 500 });
  }
}
