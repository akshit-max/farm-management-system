import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";
import { isManager, isAccountant } from "@/lib/rbac";
import { z } from "zod";

const createCustomerSchema = z.object({
  company_name: z.string().min(1, "Customer name is required"),
  contact_person: z.string().optional(),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email("Invalid email").or(z.literal("")).optional(),
  address: z.string().optional(),
  customer_type: z.string().min(1, "Customer type is required"),
  notes: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const customers = await db.customer.findMany({
      where: { farm_id: farmId, deleted_at: null },
      orderBy: { company_name: "asc" },
    });
    return NextResponse.json({ data: customers });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  // Owner, Manager, and Accountant can create
  if (!(isManager(session) || isAccountant(session))) {
    return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsedData = createCustomerSchema.parse(body);

    const existing = await db.customer.findFirst({
      where: { farm_id: farmId, company_name: parsedData.company_name, deleted_at: null },
    });
    if (existing) {
      return NextResponse.json({ error: "Customer with this name already exists" }, { status: 400 });
    }

    const customer = await db.customer.create({
      data: { farm_id: farmId, ...parsedData },
    });

    await logAudit(session.user.id, farmId, "CREATE", "Customer", customer.id);
    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.flatten().fieldErrors }, { status: 400 });
    return NextResponse.json({ error: "Failed to create customer" }, { status: 500 });
  }
}
