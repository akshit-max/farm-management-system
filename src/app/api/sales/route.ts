import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { logAuditEvent } from "@/lib/auditLogger";
import { checkFinancialLock } from "@/lib/financialLock";
import { isManager, isAccountant } from "@/lib/rbac";
import { Prisma } from "@prisma/client";
import { z } from "zod";

const itemSchema = z.object({
  batch_id: z.string().min(1, "Batch is required"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  unit_price: z.coerce.number().min(0, "Price must be >= 0"),
});

const createSalesSchema = z.object({
  customer_id: z.string().min(1, "Customer is required"),
  invoice_date: z.string().min(1, "Date is required"),
  invoice_number: z.string().min(1, "Invoice number is required"),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1, "At least one item is required"),
  payment_received: z.boolean().default(false),
  amount_paid: z.coerce.number().min(0).optional(),
  payment_method: z.string().optional(),
  reference_number: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const showCancelled = searchParams.get("showCancelled") === "true";

  try {
    const invoices = await db.salesInvoice.findMany({
      where: {
        farm_id: farmId,
        // If showCancelled=true → return ALL (active + cancelled/soft-deleted)
        // If showCancelled=false (default) → return only active (deleted_at: null)
        ...(showCancelled ? {} : { deleted_at: null }),
      },
      include: { 
        customer: true,
        items: { include: { batch: { include: { animal_category: true } } } }
      },
      orderBy: { invoice_date: "desc" },
    });

    // Annotate each invoice with a status field for the UI
    const annotated = invoices.map(inv => ({
      ...inv,
      status: inv.deleted_at ? "CANCELLED" : "ACTIVE",
    }));

    return NextResponse.json({ data: annotated });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch sales invoices" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  if (!(isManager(session) || isAccountant(session))) {
    return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsedData = createSalesSchema.parse(body);

    // PHASE 12: Financial Lock Check
    await checkFinancialLock(farmId, new Date(parsedData.invoice_date));

    // Verify Customer
    const customer = await db.customer.findFirst({
      where: { id: parsedData.customer_id, farm_id: farmId, deleted_at: null }
    });
    if (!customer) return NextResponse.json({ error: "Customer not found or unauthorized" }, { status: 400 });

    // Verify Unique Invoice Number
    const existingInvoice = await db.salesInvoice.findFirst({
      where: { farm_id: farmId, invoice_number: parsedData.invoice_number, deleted_at: null }
    });
    if (existingInvoice) return NextResponse.json({ error: "Invoice number already exists" }, { status: 400 });

    let totalAmount = 0;
    
    // Execute inside ONE Prisma transaction
    const result = await db.$transaction(async (tx) => {
      // 1. Verify all batches and calculate total
      for (const item of parsedData.items) {
        const batch = await tx.animalBatch.findFirst({
          where: { id: item.batch_id, farm_id: farmId, deleted_at: null }
        });
        if (!batch) throw new Error(`Batch not found for ID: ${item.batch_id}`);
        
        if (batch.quantity < item.quantity) {
          throw new Error(`Insufficient quantity in batch ${batch.batch_number}. Available: ${batch.quantity}`);
        }
        totalAmount += item.quantity * item.unit_price;
      }

      let paymentStatus = "PENDING";
      const immediatePayment = (parsedData.payment_received && parsedData.amount_paid) ? parsedData.amount_paid : 0;
      
      if (immediatePayment > 0) {
        if (immediatePayment > totalAmount + 0.01) {
          throw new Error(`Amount paid (${immediatePayment}) cannot exceed invoice total (${totalAmount})`);
        }
        if (Math.abs(totalAmount - immediatePayment) < 0.01) {
          paymentStatus = "PAID";
        } else {
          paymentStatus = "PARTIAL";
        }
      }

      // 1.5 Credit Limit Validation
      const txCustomer = await tx.customer.findUnique({
        where: { id: parsedData.customer_id },
        include: { sales_invoices: { where: { deleted_at: null }, include: { payments: { where: { deleted_at: null } } } } }
      });
      
      if (txCustomer && txCustomer.credit_limit !== null) {
        let currentOutstanding = 0;
        for (const inv of txCustomer.sales_invoices) {
          const paid = inv.payments.reduce((sum: number, p: any) => sum + p.amount, 0);
          currentOutstanding += (inv.total - paid);
        }
        const projectedOutstanding = currentOutstanding + totalAmount - immediatePayment;
        
        if (txCustomer.credit_limit === 0 && projectedOutstanding > 0) {
          throw new Error("NO_CREDIT_ALLOWED");
        } else if (projectedOutstanding > txCustomer.credit_limit) {
          throw new Error("CREDIT_LIMIT_EXCEEDED|" + JSON.stringify({
            creditLimit: txCustomer.credit_limit,
            currentOutstanding,
            invoiceAmount: totalAmount,
            projectedOutstanding
          }));
        }
      }

      // 2. Create Invoice
      const invoice = await tx.salesInvoice.create({
        data: {
          farm_id: farmId,
          customer_id: parsedData.customer_id,
          invoice_number: parsedData.invoice_number,
          invoice_date: new Date(parsedData.invoice_date),
          total: totalAmount,
          payment_status: paymentStatus,
          notes: parsedData.notes,
          items: {
            create: parsedData.items.map(item => ({
              batch_id: item.batch_id,
              quantity: item.quantity,
              rate: item.unit_price,
              amount: item.quantity * item.unit_price
            }))
          }
        }
      });

      // 3. Create initial payment if applicable
      if (parsedData.payment_received && parsedData.amount_paid && parsedData.amount_paid > 0) {
        await tx.customerPayment.create({
          data: {
            farm_id: farmId,
            customer_id: parsedData.customer_id,
            invoice_id: invoice.id,
            payment_date: new Date(parsedData.invoice_date),
            amount: parsedData.amount_paid,
            payment_method: parsedData.payment_method || "Cash",
            reference_number: parsedData.reference_number || "",
            notes: "Initial payment recorded during invoice creation."
          }
        });
      }

      // 3. Deduct quantities
      for (const item of parsedData.items) {
        await tx.animalBatch.update({
          where: { id: item.batch_id },
          data: { quantity: { decrement: item.quantity } }
        });
      }

      return invoice;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    await logAuditEvent({
      userId: session.user.id,
      farmId,
      module: "SALES",
      action: "CREATE_SALE",
      entityType: "SalesInvoice",
      entityId: result.id,
      severity: "INFO",
      afterSnapshot: result,
    });
    
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    if (error.message?.startsWith("CREDIT_LIMIT_EXCEEDED|")) {
      const payload = JSON.parse(error.message.split("|")[1]);
      return NextResponse.json({ code: "CREDIT_LIMIT_EXCEEDED", message: "This sale exceeds the customer's credit limit.", ...payload }, { status: 400 });
    }
    if (error.message === "NO_CREDIT_ALLOWED") {
      return NextResponse.json({ code: "NO_CREDIT_ALLOWED", message: "Cash Sale Required" }, { status: 400 });
    }
    if (error.message?.includes("LOCKED")) {
      return NextResponse.json(JSON.parse(error.message), { status: 423 });
    }
    if (error.code === 'P2034' || error.message?.includes("write conflict") || error.message?.includes("deadlock")) {
      return NextResponse.json({ code: "CONCURRENT_TRANSACTION", message: "Another sale is currently being processed for this customer." }, { status: 409 });
    }
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.flatten().fieldErrors }, { status: 400 });
    return NextResponse.json({ error: error.message || "Failed to create invoice" }, { status: 500 });
  }
}
