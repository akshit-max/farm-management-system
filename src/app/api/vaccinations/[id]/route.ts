import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";
import { isManager } from "@/lib/rbac";
import { z } from "zod";

const updateVaccinationSchema = z.object({
  status: z.enum(["PENDING", "COMPLETED", "OVERDUE"]).optional(),
  notes: z.string().optional().nullable(),
});

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isManager(session)) return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });

  try {
    const body = await req.json();
    const parsedData = updateVaccinationSchema.parse(body);

    const vaccination = await db.vaccination.findUnique({ 
      where: { id },
      include: { batch: true }
    });
    
    if (!vaccination || vaccination.deleted_at || vaccination.batch.farm_id !== farmId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await db.vaccination.update({
      where: { id },
      data: {
        ...parsedData,
        completed_date: parsedData.status === "COMPLETED" && vaccination.status !== "COMPLETED" ? new Date() : vaccination.completed_date,
      },
    });

    await logAudit(session.user.id, farmId, "UPDATE", "Vaccination", id);
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.flatten().fieldErrors }, { status: 400 });
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
