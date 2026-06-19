import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";
import { isManager } from "@/lib/rbac";
import { z } from "zod";

const createSupplierSchema = z.object({
  company_name: z.string().min(1, "Company name is required"),
  contact_person: z.string().optional(),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email("Invalid email").or(z.literal("")).optional(),
  address: z.string().optional(),
  gst: z.string().optional(),
  supplier_type: z.string().min(1, "Supplier type is required"),
  notes: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const suppliers = await db.supplier.findMany({
      where: { farm_id: farmId, deleted_at: null },
      orderBy: { company_name: "asc" },
    });
    return NextResponse.json({ data: suppliers });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch suppliers" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isManager(session)) return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });

  try {
    const body = await req.json();
    const parsedData = createSupplierSchema.parse(body);

    const existing = await db.supplier.findFirst({
      where: { farm_id: farmId, company_name: parsedData.company_name, deleted_at: null },
    });
    if (existing) {
      return NextResponse.json({ error: "Supplier with this company name already exists" }, { status: 400 });
    }

    if (parsedData.phone) {
      const phoneExists = await db.supplier.findFirst({
        where: { farm_id: farmId, phone: parsedData.phone, deleted_at: null },
      });
      if (phoneExists) {
        return NextResponse.json({ error: "Supplier phone already exists" }, { status: 400 });
      }
    }

    if (parsedData.email) {
      const emailExists = await db.supplier.findFirst({
        where: { farm_id: farmId, email: parsedData.email, deleted_at: null },
      });
      if (emailExists) {
        return NextResponse.json({ error: "Supplier email already exists" }, { status: 400 });
      }
    }

    const supplier = await db.supplier.create({
      data: { farm_id: farmId, ...parsedData },
    });

    await logAudit(session.user.id, farmId, "CREATE", "Supplier", supplier.id);
    return NextResponse.json(supplier, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.flatten().fieldErrors }, { status: 400 });
    return NextResponse.json({ error: "Failed to create supplier" }, { status: 500 });
  }
}
