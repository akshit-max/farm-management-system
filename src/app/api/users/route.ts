import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import bcrypt from "bcryptjs";

const createUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role_id: z.string().uuid("Role is required"),
});

// GET all users for the farm (Owner only)
export async function GET(_req: NextRequest) {
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "Owner") return NextResponse.json({ error: "Owner access required" }, { status: 403 });

  try {
    const users = await db.user.findMany({
      where: { farm_id: farmId, deleted_at: null },
      select: {
        id: true,
        name: true,
        email: true,
        active_status: true,
        created_at: true,
        role: { select: { id: true, name: true } },
      },
      orderBy: { created_at: "asc" },
    });
    return NextResponse.json({ data: users });
  } catch {
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

// POST create new user (Owner only)
export async function POST(req: NextRequest) {
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "Owner") return NextResponse.json({ error: "Owner access required" }, { status: 403 });

  try {
    const body = await req.json();
    const data = createUserSchema.parse(body);

    const existingUser = await db.user.findUnique({ where: { email: data.email } });
    if (existingUser) return NextResponse.json({ error: "Email already exists" }, { status: 400 });

    const role = await db.role.findUnique({ where: { id: data.role_id } });
    if (!role) return NextResponse.json({ error: "Role not found" }, { status: 400 });

    const password_hash = await bcrypt.hash(data.password, 10);
    const user = await db.user.create({
      data: {
        name: data.name,
        email: data.email,
        password_hash,
        role_id: data.role_id,
        farm_id: farmId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        active_status: true,
        created_at: true,
        role: { select: { id: true, name: true } },
      },
    });

    await logAudit(session.user.id, farmId, "CREATE", "User", user.id);
    return NextResponse.json({ data: user }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.flatten().fieldErrors }, { status: 400 });
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
