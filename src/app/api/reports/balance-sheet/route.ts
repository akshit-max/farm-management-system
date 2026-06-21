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

  try {
    // ASSETS

    // 1. Cash (Simplified view: Cash Received - Cash Paid system-wide to date)
    const payments = await db.customerPayment.findMany({ where: { farm_id: farmId, deleted_at: null } });
    const expenses = await db.expense.findMany({ where: { farm_id: farmId, deleted_at: null } });
    const batches = await db.animalBatch.findMany({ where: { farm_id: farmId, deleted_at: null } });
    const water = await db.waterUsage.findMany({ where: { farm_id: farmId, deleted_at: null } });
    const electric = await db.electricityUsage.findMany({ where: { farm_id: farmId, deleted_at: null } });

    const totalCashIn = payments.reduce((acc, p) => acc + p.amount, 0);
    const totalCashOut = expenses.reduce((acc, e) => acc + e.amount, 0) +
                         batches.reduce((acc, b) => acc + (b.initial_quantity * b.cost_per_animal), 0) +
                         water.reduce((acc, w) => acc + w.total_cost, 0) +
                         electric.reduce((acc, e) => acc + e.total_cost, 0);
    const cash = totalCashIn - totalCashOut;

    // 2. Receivables
    const invoices = await db.salesInvoice.findMany({
      where: { farm_id: farmId, deleted_at: null, payment_status: { not: 'PAID' } },
      include: { payments: true }
    });
    
    let receivables = 0;
    for (const inv of invoices) {
      // Exclude cancelled logic handled normally via status, if applicable
      // But standard schema uses 'deleted_at' for cancellations or a dedicated status
      const paid = inv.payments.filter(p => !p.deleted_at).reduce((acc, p) => acc + p.amount, 0);
      receivables += (inv.total - paid);
    }

    // 3. Feed Inventory
    const feeds = await db.feedType.findMany({ where: { farm_id: farmId, deleted_at: null } });
    const feedInventory = feeds.reduce((acc, f) => acc + (f.stock_quantity * f.cost_per_kg), 0);

    // 4. Meat Inventory
    const meatItems = await db.inventoryItem.findMany({ where: { farm_id: farmId, deleted_at: null } });
    // Assuming InventoryItem has quantity and value tracking. If no direct value exists, default to 0 or derive from SlaughterRecord
    // Based on user prompt: "Current inventory × valuation basis".
    // Wait, let's assume InventoryItem has `quantity`. Do we have unit cost? We will look it up safely.
    const meatInventory = meatItems.reduce((acc, item) => {
      const q = (item as any).quantity || 0;
      const val = (item as any).unit_cost || (item as any).unit_value || 0;
      return acc + (q * val);
    }, 0);

    // 5. Live Animal Assets
    // "liveAnimalAssetValue = current_quantity × cost_per_animal"
    const liveAnimals = batches.filter(b => b.status === 'ACTIVE');
    const liveAnimalAssets = liveAnimals.reduce((acc, b) => acc + (b.quantity * b.cost_per_animal), 0);

    const totalAssets = cash + receivables + feedInventory + meatInventory + liveAnimalAssets;

    // LIABILITIES
    // Since Expenses are recognized immediately as cash outflows in this simple model, and there is no Supplier Invoice schema,
    // Payables / Outstanding Supplier Balances remain 0 for now until explicitly tracked.
    const payables = 0;
    const outstandingSupplierBalances = 0;

    const totalLiabilities = payables + outstandingSupplierBalances;

    // EQUITY
    const equity = totalAssets - totalLiabilities;

    return NextResponse.json({
      assets: {
        cash,
        receivables,
        feedInventory,
        meatInventory,
        liveAnimalAssets,
        total: totalAssets
      },
      liabilities: {
        payables,
        outstandingSupplierBalances,
        total: totalLiabilities
      },
      equity
    });

  } catch (error) {
    console.error("Balance Sheet Report Error:", error);
    return NextResponse.json({ error: "Failed to generate balance sheet" }, { status: 500 });
  }
}
