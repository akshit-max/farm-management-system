import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const farmId = 'd9b82079-3261-4c83-b30f-321903ceb57d';

async function run() {
  console.log("=== BATCH AND SLAUGHTER MATH ===");
  const slaughteredRecords = await prisma.slaughterRecord.findMany({
    where: { farm_id: farmId, deleted_at: null },
    include: {
      slaughterYield: true,
      batch: true
    }
  });

  for (const record of slaughteredRecords) {
    if (record.batch) {
      console.log(`Batch Number: ${record.batch.batch_number}`);
      console.log(`Initial Quantity: ${record.batch.initial_quantity}`);
      console.log(`Current Quantity: ${record.batch.quantity}`);
      console.log(`Slaughtered Quantity: ${record.quantity_slaughtered}`);
      console.log(`Cost Per Animal: ₹${record.batch.cost_per_animal}`);
      
      const fullCost = record.batch.initial_quantity * record.batch.cost_per_animal;
      const allocated = (record.quantity_slaughtered / record.batch.initial_quantity) * fullCost;
      console.log(`Allocated Cost: ₹${allocated}`);
    }
  }

  console.log("\n=== LIVE INVENTORY (UNSLAUGHTERED) ===");
  const batches = await prisma.animalBatch.findMany({ where: { farm_id: farmId, deleted_at: null } });
  let liveAssetValue = 0;
  for (const b of batches) {
    liveAssetValue += b.quantity * b.cost_per_animal;
  }
  console.log(`Live Animal Asset Value: ₹${liveAssetValue}`);

  console.log("\n=== ROI / BATCH PROFITABILITY ===");
  // Calculate ROI exactly as it is in analytics/route.ts
  const activeBatches = batches.filter(b => b.status === 'ACTIVE');
  for (const b of activeBatches) {
    const feedCons = await prisma.feedConsumption.aggregate({
      _sum: { cost: true },
      where: { batch_id: b.id, deleted_at: null }
    });
    const batchCost = (b.initial_quantity * b.cost_per_animal) + (feedCons._sum.cost || 0);
    // Revenue logic in ROI: 
    const salesItems = await prisma.salesInvoiceItem.aggregate({
      _sum: { amount: true },
      where: { batch_id: b.id, deleted_at: null, invoice: { deleted_at: null } }
    });
    const batchRevenue = salesItems._sum.amount || 0;
    const roi = batchCost > 0 ? ((batchRevenue - batchCost) / batchCost) * 100 : 0;
    console.log(`Batch ${b.batch_number} | ROI: ${roi.toFixed(2)}% | Cost: ₹${batchCost} | Rev: ₹${batchRevenue}`);
  }
}
run().catch(console.error).finally(() => prisma.$disconnect());
