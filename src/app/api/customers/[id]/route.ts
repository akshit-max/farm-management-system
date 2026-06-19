import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";
import { isManager, isAccountant } from "@/lib/rbac";
import { z } from "zod";

const updateCustomerSchema = z.object({
  company_name: z.string().min(1, "Customer name is required"),
  contact_person: z.string().optional(),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email("Invalid email").or(z.literal("")).optional(),
  address: z.string().optional(),
  customer_type: z.string().min(1, "Customer type is required"),
  notes: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  if (!(isManager(session) || isAccountant(session))) {
    return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsedData = updateCustomerSchema.parse(body);

    const existing = await db.customer.findFirst({
      where: { farm_id: farmId, company_name: parsedData.company_name, id: { not: params.id }, deleted_at: null },
    });
    if (existing) {
      return NextResponse.json({ error: "Customer with this name already exists" }, { status: 400 });
    }

    if (parsedData.phone) {
      const phoneExists = await db.customer.findFirst({
        where: { farm_id: farmId, phone: parsedData.phone, id: { not: params.id }, deleted_at: null },
      });
      if (phoneExists) {
        return NextResponse.json({ error: "Customer phone already exists" }, { status: 400 });
      }
    }

    if (parsedData.email) {
      const emailExists = await db.customer.findFirst({
        where: { farm_id: farmId, email: parsedData.email, id: { not: params.id }, deleted_at: null },
      });
      if (emailExists) {
        return NextResponse.json({ error: "Customer email already exists" }, { status: 400 });
      }
    }

    const customer = await db.customer.updateMany({
      where: { id: params.id, farm_id: farmId },
      data: parsedData,
    });

    if (customer.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await logAudit(session.user.id, farmId, "UPDATE", "Customer", params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.flatten().fieldErrors }, { status: 400 });
    return NextResponse.json({ error: "Failed to update customer" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  if (!(isManager(session) || isAccountant(session))) {
    return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });
  }

  try {
    // M3: Block deletion if active sales invoices reference this customer
    const invoiceCount = await db.salesInvoice.count({
      where: { customer_id: params.id, deleted_at: null },
    });
    if (invoiceCount > 0) {
      return NextResponse.json(
        { error: "Customer cannot be deleted because sales history exists." },
        { status: 400 }
      );
    }

    const result = await db.customer.updateMany({
      where: { id: params.id, farm_id: farmId },
      data: { deleted_at: new Date() },
    });

    if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await logAudit(session.user.id, farmId, "DELETE", "Customer", params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete customer" }, { status: 500 });
  }
}
