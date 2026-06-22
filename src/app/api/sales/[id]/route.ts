import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";
import { isManager, isAccountant } from "@/lib/rbac";
import { Prisma } from "@prisma/client";
import { z } from "zod";

// ---------------------------------------------------------------------------
// GET /api/sales/[id]
// Returns full invoice detail including items, customer, and payment history.
// Used to hydrate the Edit form with fresh DB data.
// ---------------------------------------------------------------------------
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const invoice = await db.salesInvoice.findFirst({
      where: { id: params.id, farm_id: farmId },
      include: {
        customer: true,
        items: {
          where: { deleted_at: null },
          include: {
            batch: { include: { animal_category: true } },
          },
        },
        payments: {
          where: { deleted_at: null },
          orderBy: { payment_date: "desc" },
        },
      },
    });

    if (!invoice)
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    const totalPaid = invoice.payments.reduce((s, p) => s + p.amount, 0);
    const outstanding = Math.max(0, invoice.total - totalPaid);

    return NextResponse.json({
      data: {
        ...invoice,
        status: invoice.deleted_at ? "CANCELLED" : "ACTIVE",
        totalPaid,
        outstanding,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch invoice" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PUT /api/sales/[id]
// Status-gated edit:
//   PENDING  → full edit (customer, date, items, notes) inside one transaction
//   PARTIAL  → notes only
//   PAID     → notes only
//   CANCELLED → rejected
//
// CRITICAL: payment_status is NEVER accepted as an input — it is always
// re-derived from the CustomerPayment records inside the transaction.
// ---------------------------------------------------------------------------

const notesOnlySchema = z.object({
  notes: z.string().optional(),
});

const itemSchema = z.object({
  batch_id: z.string().min(1, "Batch is required"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  unit_price: z.coerce.number().min(0, "Price must be >= 0"),
});

const fullEditSchema = z.object({
  customer_id: z.string().min(1, "Customer is required"),
  invoice_date: z.string().min(1, "Invoice date is required"),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1, "At least one item is required"),
});

export async function PUT(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(isManager(session) || isAccountant(session)))
    return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });

  try {
    const body = await req.json();

    // Step 1: Fetch the invoice to determine its current payment status
    const existing = await db.salesInvoice.findFirst({
      where: { id: params.id, farm_id: farmId },
      include: {
        items: { where: { deleted_at: null } },
        payments: { where: { deleted_at: null } },
      },
    });

    if (!existing)
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );

    // Reject edits on cancelled invoices
    if (existing.deleted_at)
      return NextResponse.json(
        { error: "Cancelled invoices cannot be edited" },
        { status: 400 }
      );

    const totalPaid = existing.payments.reduce((s, p) => s + p.amount, 0);
    const paymentStatus = existing.payment_status;

    // -----------------------------------------------------------------------
    // PARTIAL or PAID: notes-only edit
    // -----------------------------------------------------------------------
    if (paymentStatus === "PARTIAL" || paymentStatus === "PAID") {
      const parsed = notesOnlySchema.parse(body);

      await db.salesInvoice.update({
        where: { id: params.id },
        data: { notes: parsed.notes },
      });

      await logAudit(session.user.id, farmId, "UPDATE", "SalesInvoice", params.id);
      return NextResponse.json({ success: true, mode: "notes_only" });
    }

    // -----------------------------------------------------------------------
    // PENDING: full edit with atomic inventory reconciliation
    // -----------------------------------------------------------------------
    const parsed = fullEditSchema.parse(body);

    // Verify customer belongs to this farm
    const customer = await db.customer.findFirst({
      where: { id: parsed.customer_id, farm_id: farmId, deleted_at: null },
    });
    if (!customer)
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 400 }
      );

    let newTotal = 0;

    await db.$transaction(async (tx) => {
      // Step 2: Restore old inventory for every existing item
      for (const oldItem of existing.items) {
        await tx.animalBatch.update({
          where: { id: oldItem.batch_id },
          data: { quantity: { increment: oldItem.quantity } },
        });
      }

      // Step 3: Soft-delete old SalesInvoiceItem rows
      await tx.salesInvoiceItem.updateMany({
        where: { invoice_id: params.id },
        data: { deleted_at: new Date() },
      });

      // Step 4 & 5: Validate and deduct new inventory
      for (const newItem of parsed.items) {
        const batch = await tx.animalBatch.findFirst({
          where: { id: newItem.batch_id, farm_id: farmId, deleted_at: null },
        });
        if (!batch)
          throw new Error(`Batch not found: ${newItem.batch_id}`);
        if (batch.quantity < newItem.quantity)
          throw new Error(
            `Insufficient stock in batch ${batch.batch_number}. Available: ${batch.quantity}, Requested: ${newItem.quantity}`
          );

        await tx.animalBatch.update({
          where: { id: newItem.batch_id },
          data: { quantity: { decrement: newItem.quantity } },
        });

        newTotal += newItem.quantity * newItem.unit_price;
      }

      // Step 5.5: Credit Limit Validation
      const txCustomer = await tx.customer.findUnique({
        where: { id: parsed.customer_id },
        include: { sales_invoices: { where: { deleted_at: null, id: { not: params.id } }, include: { payments: { where: { deleted_at: null } } } } }
      });

      if (txCustomer && txCustomer.credit_limit !== null) {
        let currentOutstanding = 0;
        for (const inv of txCustomer.sales_invoices) {
          const paid = inv.payments.reduce((sum: number, p: any) => sum + p.amount, 0);
          currentOutstanding += (inv.total - paid);
        }
        const projectedOutstanding = currentOutstanding + newTotal - totalPaid;
        
        if (txCustomer.credit_limit === 0 && projectedOutstanding > 0) {
          throw new Error("NO_CREDIT_ALLOWED");
        } else if (projectedOutstanding > txCustomer.credit_limit) {
          throw new Error("CREDIT_LIMIT_EXCEEDED|" + JSON.stringify({
            creditLimit: txCustomer.credit_limit,
            currentOutstanding,
            invoiceAmount: newTotal,
            projectedOutstanding
          }));
        }
      }

      // Step 6: Create new SalesInvoiceItem rows
      await tx.salesInvoiceItem.createMany({
        data: parsed.items.map((item) => ({
          invoice_id: params.id,
          batch_id: item.batch_id,
          quantity: item.quantity,
          rate: item.unit_price,
          amount: item.quantity * item.unit_price,
        })),
      });

      // Step 7 & 8: Recalculate payment_status from existing payments,
      // then update the invoice. payment_status is ALWAYS derived — never
      // accepted from the request body.
      const isPaid = totalPaid > 0 && Math.abs(newTotal - totalPaid) < 0.01;
      const isPartial = totalPaid > 0 && totalPaid < newTotal - 0.01;
      const newPaymentStatus = isPaid ? "PAID" : isPartial ? "PARTIAL" : "PENDING";

      await tx.salesInvoice.update({
        where: { id: params.id },
        data: {
          customer_id: parsed.customer_id,
          invoice_date: new Date(parsed.invoice_date),
          notes: parsed.notes,
          total: newTotal,
          subtotal: newTotal,
          payment_status: newPaymentStatus,
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    // Step 9: Audit log written after successful transaction commit
    await logAudit(session.user.id, farmId, "UPDATE", "SalesInvoice", params.id);
    return NextResponse.json({ success: true, mode: "full_edit", newTotal });
  } catch (error: any) {
    if (error.message?.startsWith("CREDIT_LIMIT_EXCEEDED|")) {
      const payload = JSON.parse(error.message.split("|")[1]);
      return NextResponse.json({ code: "CREDIT_LIMIT_EXCEEDED", message: "This sale exceeds the customer's credit limit.", ...payload }, { status: 400 });
    }
    if (error.message === "NO_CREDIT_ALLOWED") {
      return NextResponse.json({ code: "NO_CREDIT_ALLOWED", message: "Cash Sale Required" }, { status: 400 });
    }
    if (error.code === 'P2034' || error.message?.includes("write conflict") || error.message?.includes("deadlock")) {
      return NextResponse.json({ code: "CONCURRENT_TRANSACTION", message: "Another sale is currently being processed for this customer." }, { status: 409 });
    }
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: error.flatten().fieldErrors },
        { status: 400 }
      );
    return NextResponse.json(
      { error: error.message || "Failed to update invoice" },
      { status: 500 }
    );
  }
}
