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
  const startDateStr = searchParams.get("startDate");
  const endDateStr = searchParams.get("endDate");
  const roomId = searchParams.get("roomId");

  let dateFilter = {};
  if (startDateStr && endDateStr) {
    dateFilter = { gte: new Date(startDateStr), lte: new Date(endDateStr) };
  }

  try {
    const rooms = await db.room.findMany({
      where: {
        farm_id: farmId,
        deleted_at: null,
        ...(roomId ? { id: roomId } : {})
      },
      include: {
        animal_batches: {
          where: { deleted_at: null },
          include: {
            mortalities: dateFilter ? { where: { date: dateFilter, deleted_at: null } } : { where: { deleted_at: null } },
            feedConsumptions: dateFilter ? { where: { date: dateFilter, deleted_at: null } } : { where: { deleted_at: null } },
            salesInvoiceItems: {
              where: { deleted_at: null, invoice: { deleted_at: null } },
              include: { invoice: true }
            }
          }
        },
        waterUsages: dateFilter ? { where: { date: dateFilter, deleted_at: null } } : { where: { deleted_at: null } },
        electricityUsages: dateFilter ? { where: { date: dateFilter, deleted_at: null } } : { where: { deleted_at: null } }
      }
    });

    const report = rooms.map(room => {
      const capacity = room.capacity || 0;
      
      // Current active occupancy
      const activeBatches = room.animal_batches.filter(b => b.status === 'ACTIVE');
      const currentOccupancy = activeBatches.reduce((acc: number, b: any) => acc + b.quantity, 0);
      const occupancyPercent = capacity > 0 ? (currentOccupancy / capacity) * 100 : 0;

      let mortalityCount = 0;
      let feedCost = 0;
      let revenue = 0;

      for (const batch of room.animal_batches) {
        mortalityCount += batch.mortalities.reduce((acc: number, m: any) => acc + m.quantity, 0);
        feedCost += batch.feedConsumptions.reduce((acc: number, fc: any) => acc + (fc.cost || 0), 0);
        
        // Revenue (respecting valid invoices)
        const validSales = batch.salesInvoiceItems.filter((si: any) => si.invoice !== null);
        revenue += validSales.reduce((acc: number, si: any) => acc + (si.amount || 0), 0);
      }

      // Direct Room Utilities
      const utilityCost = room.waterUsages.reduce((acc: number, w: any) => acc + w.total_cost, 0) +
                          room.electricityUsages.reduce((acc: number, e: any) => acc + e.total_cost, 0);

      // We only consider operational profit for the room (Revenue - Feed - Utility)
      // Excludes live animal asset value logic to strictly separate balance sheet from efficiency P&L.
      const profitability = revenue - feedCost - utilityCost;

      return {
        id: room.id,
        name: room.name,
        capacity,
        currentOccupancy,
        occupancyPercent: parseFloat(occupancyPercent.toFixed(2)),
        mortality: mortalityCount,
        revenue,
        feedCost,
        utilityCost,
        profitability
      };
    });

    return NextResponse.json({ data: report });
  } catch (error) {
    console.error("Room Efficiency Report Error:", error);
    return NextResponse.json({ error: "Failed to generate room efficiency report" }, { status: 500 });
  }
}
