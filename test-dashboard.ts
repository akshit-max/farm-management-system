import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function main() {
  const farmId = "some-farm-id-to-test"; // Or we can just find any farmId
  const farm = await db.farm.findFirst();
  if (!farm) {
    console.log("No farm found");
    return;
  }
  console.log("Using farm:", farm.id);

  try {
    const results = await Promise.all([
      db.animalBatch.count({ where: { farm_id: farm.id, deleted_at: null, status: "ACTIVE" } }),
      db.animalBatch.aggregate({ _sum: { quantity: true }, where: { farm_id: farm.id, deleted_at: null, status: "ACTIVE" } }),
      db.mortality.aggregate({ _sum: { quantity: true }, where: { batch: { farm_id: farm.id }, deleted_at: null } }),
      db.vaccination.findMany({ where: { batch: { farm_id: farm.id }, status: "PENDING", deleted_at: null } }),
      db.vaccination.findMany({ where: { batch: { farm_id: farm.id }, deleted_at: null }, orderBy: { due_date: "asc" } }),
      db.mortality.findMany({ where: { batch: { farm_id: farm.id }, deleted_at: null }, orderBy: { date: "asc" } }),
      db.animalCategory.findMany({ 
        where: { farm_id: farm.id, deleted_at: null },
        include: { animal_batches: { where: { deleted_at: null, status: "ACTIVE" } } }
      }),
      db.auditLog.findMany({
        where: { farm_id: farm.id },
        orderBy: { timestamp: "desc" },
        take: 5,
        include: { user: { select: { name: true } } }
      }),
      db.feedType.findMany({
        where: { farm_id: farm.id, deleted_at: null }
      }),
      db.feedConsumption.aggregate({
        _sum: { quantity_kg: true },
        where: { 
          farm_id: farm.id, 
          deleted_at: null, 
          date: { gte: new Date(new Date().setHours(0,0,0,0)) } 
        }
      }),
      db.salesInvoice.findMany({
        where: { farm_id: farm.id, deleted_at: null }
      }),
      db.waterUsage.aggregate({
        _sum: { actual_consumption_liters: true },
        where: { farm_id: farm.id, deleted_at: null, date: { gte: new Date(new Date().setHours(0,0,0,0)) } }
      }),
      db.electricityUsage.aggregate({
        _sum: { units_consumed: true },
        where: { farm_id: farm.id, deleted_at: null, date: { gte: new Date(new Date().setHours(0,0,0,0)) } }
      }),
      db.inventoryItem.count({ where: { farm_id: farm.id, deleted_at: null } }),
      db.inventoryItem.aggregate({ _sum: { quantity: true }, where: { farm_id: farm.id, deleted_at: null } }),
      db.slaughterRecord.aggregate({ _sum: { quantity_slaughtered: true }, where: { farm_id: farm.id, deleted_at: null, slaughter_date: { gte: new Date(new Date().setHours(0,0,0,0)) } } }),
      db.slaughterYield.aggregate({ _avg: { yield_percentage: true }, where: { slaughter_record: { farm_id: farm.id, deleted_at: null } } }),
      
      // Phase 5: Accounting Engine
      db.expense.aggregate({ _sum: { amount: true }, where: { farm_id: farm.id, deleted_at: null } }),
      db.feedConsumption.aggregate({ _sum: { cost: true }, where: { farm_id: farm.id, deleted_at: null } }),
      db.waterUsage.aggregate({ _sum: { total_cost: true }, where: { farm_id: farm.id, deleted_at: null } }),
      db.electricityUsage.aggregate({ _sum: { total_cost: true }, where: { farm_id: farm.id, deleted_at: null } }),
      db.customerPayment.aggregate({ _sum: { amount: true }, where: { farm_id: farm.id, deleted_at: null } })
    ]);
    console.log("SUCCESS");
  } catch (err: any) {
    console.error("Dashboard Promise.all Error:", err);
  }
}
main();
