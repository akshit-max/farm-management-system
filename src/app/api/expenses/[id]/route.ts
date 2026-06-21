import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { logAuditEvent } from "@/lib/auditLogger";
import { checkFinancialLock } from "@/lib/financialLock";
import { isManager, isAccountant } from "@/lib/rbac";
import { z } from "zod";

const updateExpenseSchema = z.object({
  expense_date: z.string().or(z.date()).transform(d => new Date(d)),
  category: z.string().min(1, "Category is required"),
  description: z.string().min(1, "Description is required"),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  notes: z.string().optional()
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(isManager(session) || isAccountant(session))) return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });

  try {
    const existing = await db.expense.findFirst({
      where: { id, farm_id: farmId, deleted_at: null },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await checkFinancialLock(farmId, existing.expense_date);

    const body = await req.json();
    const parsedData = updateExpenseSchema.parse(body);

    const expense = await db.expense.update({
      where: { id },
      data: parsedData,
    });

    await logAuditEvent({
      userId: session.user.id,
      farmId,
      module: "EXPENSES",
      action: "UPDATE_EXPENSE",
      entityType: "Expense",
      entityId: id,
      severity: "WARNING",
      beforeSnapshot: existing,
      afterSnapshot: expense,
    });
    return NextResponse.json(expense);
  } catch (error: any) {
    if (error.message?.includes("LOCKED")) {
      return NextResponse.json(JSON.parse(error.message), { status: 423 });
    }
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.flatten().fieldErrors }, { status: 400 });
    return NextResponse.json({ error: "Failed to update expense" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(isManager(session) || isAccountant(session))) return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });

  try {
    const existing = await db.expense.findFirst({
      where: { id, farm_id: farmId, deleted_at: null },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await checkFinancialLock(farmId, existing.expense_date);

    await db.expense.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    await logAuditEvent({
      userId: session.user.id,
      farmId,
      module: "EXPENSES",
      action: "DELETE_EXPENSE",
      entityType: "Expense",
      entityId: id,
      severity: "WARNING",
      beforeSnapshot: existing,
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message?.includes("LOCKED")) {
      return NextResponse.json(JSON.parse(error.message), { status: 423 });
    }
    return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 });
  }
}
