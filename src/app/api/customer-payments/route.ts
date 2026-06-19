import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";
import { isManager } from "@/lib/rbac";
import { z } from "zod";

const createPaymentSchema = z.object({
  customer_id: z.string().min(1, "Customer is required"),
  invoice_id: z.string().min(1, "Invoice is required"),
  payment_date: z.string().or(z.date()).transform(d => new Date(d)),
  amount: z.coerce.number().min(0.01, "Amount must be > 0"),
  payment_method: z.string().min(1, "Payment method is required"),
  reference_number: z.string().optional(),
  notes: z.string().optional()
});

export async function POST(req: NextRequest) {
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isManager(session)) return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });

  try {
    const body = await req.json();
    const parsedData = createPaymentSchema.parse(body);

    // 1. Validate Customer
    const customer = await db.customer.findFirst({
      where: { id: parsedData.customer_id, farm_id: farmId, deleted_at: null }
    });
    if (!customer) return NextResponse.json({ error: "Invalid customer" }, { status: 400 });

    // 2. Validate Invoice
    const invoice = await db.salesInvoice.findFirst({
      where: { id: parsedData.invoice_id, customer_id: customer.id, farm_id: farmId, deleted_at: null },
      include: { payments: { where: { deleted_at: null } } }
    });
    if (!invoice) return NextResponse.json({ error: "Invalid invoice" }, { status: 400 });

    // 3. Calculate Outstanding
    const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
    const outstanding = invoice.total - totalPaid;

    if (parsedData.amount > outstanding + 0.01) { // 0.01 for float imprecision
      return NextResponse.json({ error: `Payment amount (${parsedData.amount}) exceeds outstanding balance (${outstanding})` }, { status: 400 });
    }

    // 4. Determine new status
    const newTotalPaid = totalPaid + parsedData.amount;
    const isPaid = Math.abs(invoice.total - newTotalPaid) < 0.01;
    const newStatus = isPaid ? "PAID" : "PARTIAL";

    // 5. Transaction
    const result = await db.$transaction(async (tx) => {
      const payment = await tx.customerPayment.create({
        data: {
          farm_id: farmId,
          customer_id: customer.id,
          invoice_id: invoice.id,
          payment_date: parsedData.payment_date,
          amount: parsedData.amount,
          payment_method: parsedData.payment_method,
          reference_number: parsedData.reference_number,
          notes: parsedData.notes
        }
      });

      await tx.salesInvoice.update({
        where: { id: invoice.id },
        data: { payment_status: newStatus }
      });

      return payment;
    });

    await logAudit(session.user.id, farmId, "CREATE", "CustomerPayment", result.id);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.flatten().fieldErrors }, { status: 400 });
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
  }
}
