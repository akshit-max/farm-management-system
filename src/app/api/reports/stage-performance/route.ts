import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { isOwner, isManager, isAccountant } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  const session = await auth();
  const farmId = session?.user?.farm_id;
  if (!session?.user?.id || !farmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  if (!(isOwner(session) || isManager(session) || isAccountant(session))) {
    return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get("categoryId");

  try {
    const stages = await db.stageDefinition.findMany({
      where: {
        farm_id: farmId,
        deleted_at: null,
        ...(categoryId ? { category_id: categoryId } : {})
      },
      include: {
        animal_batches: {
          where: { deleted_at: null },
          include: {
            mortalities: { where: { deleted_at: null } },
            feedConsumptions: { where: { deleted_at: null } },
            salesInvoiceItems: {
              where: { deleted_at: null, invoice: { deleted_at: null } },
              include: { invoice: true }
            }
          }
        }
      }
    });

    const report = stages.map(stage => {
      let animalsEntered = 0;
      let animalsExited = 0; // Limitation: We do not have StageTransition history
      let mortalityCount = 0;
      let feedCost = 0;
      let revenue = 0;
      // Utility cost at stage level is difficult since Utilities are tied to Rooms, not Batches.
      // We will leave Utility Cost 0 and document the limitation.
      const utilityCost = 0; 

      for (const batch of stage.animal_batches) {
        animalsEntered += batch.initial_quantity;
        mortalityCount += batch.mortalities.reduce((acc: number, m: any) => acc + m.quantity, 0);
        feedCost += batch.feedConsumptions.reduce((acc: number, fc: any) => acc + (fc.cost || 0), 0);
        
        const validSales = batch.salesInvoiceItems.filter((si: any) => si.invoice !== null);
        revenue += validSales.reduce((acc: number, si: any) => acc + (si.amount || 0), 0);
      }

      const mortalityPercent = animalsEntered > 0 ? (mortalityCount / animalsEntered) * 100 : 0;
      const profitability = revenue - feedCost - utilityCost; // Note: Utility cost missing

      return {
        id: stage.id,
        name: stage.stage_name,
        duration: stage.expected_duration_days,
        animalsEntered,
        animalsExited,
        mortalityPercent: parseFloat(mortalityPercent.toFixed(2)),
        revenue,
        feedCost,
        utilityCost,
        profitability,
        limitation: "Stage transition history does not exist in schema. Metrics reflect all-time totals for batches currently assigned to this stage. Utility costs cannot be allocated reliably at the stage level without allocation rules."
      };
    });

    return NextResponse.json({
      data: report,
      warning: "Phase 13 Limitation: Actual stage transition dates are not natively tracked in Phase 8 schema. Fabricated dates have been strictly prohibited. Displaying aggregate performance of batches currently residing in each stage."
    });

  } catch (error) {
    console.error("Stage Performance Report Error:", error);
    return NextResponse.json({ error: "Failed to generate stage performance report" }, { status: 500 });
  }
}
