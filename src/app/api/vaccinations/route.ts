import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";
import { isManager } from "@/lib/rbac";
import { z } from "zod";

const createVaccinationSchema = z.object({
  batch_id: z.string().uuid(),
  vaccine_name: z.string().min(1),
  due_date: z.string().datetime(),
  status: z.enum(["PENDING", "COMPLETED", "OVERDUE"]).default("PENDING"),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isManager(session)) return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });

  try {
    const body = await req.json();
    const parsedData = createVaccinationSchema.parse(body);

    const batch = await db.animalBatch.findUnique({
      where: { id: parsedData.batch_id },
    });

    if (!batch || batch.deleted_at || batch.farm_id !== farmId) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    const vaccination = await db.vaccination.create({
      data: {
        batch_id: parsedData.batch_id,
        vaccine_name: parsedData.vaccine_name,
        due_date: new Date(parsedData.due_date),
        status: parsedData.status,
        notes: parsedData.notes,
        completed_date: parsedData.status === "COMPLETED" ? new Date() : null,
      },
    });

    await logAudit(session.user.id, farmId, "CREATE", "Vaccination", vaccination.id);
    return NextResponse.json(vaccination, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.flatten().fieldErrors }, { status: 400 });
    return NextResponse.json({ error: "Failed to create vaccination record" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const batchId = searchParams.get("batchId");

  try {
    const rawVaccinations = await db.vaccination.findMany({
      where: {
        deleted_at: null,
        batch: { farm_id: farmId },
        ...(batchId ? { batch_id: batchId } : {}),
      },
      include: { batch: { select: { batch_number: true } } },
      orderBy: { due_date: "asc" },
    });

    // CRITICAL ISSUE 3 - Vaccination Overdue Logic (Dynamic Calculation)
    const now = new Date();
    const mapped = rawVaccinations.map(v => {
      let status = v.status;
      if (status === "PENDING" && new Date(v.due_date) < now) {
        status = "OVERDUE";
      }
      return { ...v, status };
    });

    return NextResponse.json({ data: mapped });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch vaccinations" }, { status: 500 });
  }
}
