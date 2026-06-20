import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";
import { isManager } from "@/lib/rbac";
import { Prisma } from "@prisma/client";
import { z } from "zod";

const mortalityUpdateSchema = z.object({
  quantity: z.coerce.number().min(1, "Must be at least 1"),
  cause: z.string().min(1, "Cause is required"),
  date: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
});

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isManager(session)) return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });

  try {
    const body = await req.json();
    const parsedData = mortalityUpdateSchema.parse(body);

    const result = await db.$transaction(async (tx) => {
      const existing = await tx.mortality.findFirst({
        where: { id: params.id, batch: { farm_id: farmId }, deleted_at: null },
        include: { batch: true }
      });
      if (!existing) throw new Error("Mortality record not found");

      // Calculate quantity difference
      const diff = parsedData.quantity - existing.quantity;

      // If increasing mortality, ensure batch has enough live animals
      if (diff > 0 && existing.batch.quantity < diff) {
        throw new Error(`Insufficient live animals in batch. Available: ${existing.batch.quantity}, Requested increase: ${diff}`);
      }

      // Update batch quantity
      if (diff !== 0) {
        await tx.animalBatch.update({
          where: { id: existing.batch_id },
          data: { quantity: { decrement: diff } } // positive diff decreases batch, negative diff increases batch
        });
      }

      // Update mortality record
      const updated = await tx.mortality.update({
        where: { id: existing.id },
        data: {
          quantity: parsedData.quantity,
          cause: parsedData.cause,
          date: new Date(parsedData.date),
          notes: parsedData.notes
        }
      });

      return updated;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    await logAudit(session.user.id, farmId, "UPDATE", "Mortality", result.id);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.flatten().fieldErrors }, { status: 400 });
    return NextResponse.json({ error: error.message || "Failed to update mortality record" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isManager(session)) return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });

  try {
    const result = await db.$transaction(async (tx) => {
      const existing = await tx.mortality.findFirst({
        where: { id: params.id, batch: { farm_id: farmId }, deleted_at: null },
      });
      if (!existing) throw new Error("Mortality record not found");

      // Restore batch quantity
      await tx.animalBatch.update({
        where: { id: existing.batch_id },
        data: { quantity: { increment: existing.quantity } }
      });

      // Soft delete mortality record
      const deleted = await tx.mortality.update({
        where: { id: existing.id },
        data: { deleted_at: new Date() }
      });

      return deleted;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    await logAudit(session.user.id, farmId, "DELETE", "Mortality", result.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete mortality record" }, { status: 500 });
  }
}
