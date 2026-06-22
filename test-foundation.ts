import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const farm = await prisma.farm.findFirst();
  if (!farm) { console.log('No farm found'); return; }
  const farmId = farm.id;

  console.log('=== AUDIT 3 & 4: COST PER KG — EXACT RECORDS ===');

  // Correct relation name is slaughterYield (singular, 1:1)
  const slaughterRecords = await prisma.slaughterRecord.findMany({
    where: { farm_id: farmId, deleted_at: null },
    include: {
      slaughterYield: true,
      batch: {
        include: {
          feedConsumptions: { where: { deleted_at: null } }
        }
      }
    }
  });

  console.log(`Slaughter Records found: ${slaughterRecords.length}`);

  let correctNumerator = 0;
  let correctDenominator = 0;

  for (const sr of slaughterRecords) {
    const batchPurchaseCost = sr.batch ? sr.batch.initial_quantity * sr.batch.cost_per_animal : 0;
    const batchFeedCost = sr.batch ? sr.batch.feedConsumptions.reduce((s, f) => s + f.cost, 0) : 0;
    const meatYield = sr.slaughterYield?.usable_meat_weight || 0;

    console.log('\n--- Slaughter Record ---');
    console.log(`  Record ID:          ${sr.id}`);
    console.log(`  Batch ID:           ${sr.batch_id}`);
    console.log(`  Batch Number:       ${sr.batch?.batch_number}`);
    console.log(`  Initial Qty:        ${sr.batch?.initial_quantity}`);
    console.log(`  Cost/Animal:        Rs.${sr.batch?.cost_per_animal}`);
    console.log(`  Purchase Cost:      Rs.${batchPurchaseCost}`);
    console.log(`  Feed Cost:          Rs.${batchFeedCost}`);
    console.log(`  SlaughterYield ID:  ${sr.slaughterYield?.id || 'NONE'}`);
    console.log(`  Meat Yield:         ${meatYield} kg`);
    
    if (meatYield > 0) {
      const manualCostPerKg = (batchPurchaseCost + batchFeedCost) / meatYield;
      console.log(`  Manual Cost/KG:     Rs.${manualCostPerKg.toFixed(2)}`);
    }

    correctNumerator += batchPurchaseCost + batchFeedCost;
    correctDenominator += meatYield;
  }

  const correctCostPerKg = correctDenominator > 0 ? correctNumerator / correctDenominator : 0;

  console.log('\n=== CURRENT (BROKEN) FORMULA ===');
  const allBatches = await prisma.animalBatch.findMany({ where: { farm_id: farmId, deleted_at: null } });
  const brokenAnimalCost = allBatches.reduce((acc, b) => acc + (b.initial_quantity * b.cost_per_animal), 0);
  const feedAgg = await prisma.feedConsumption.aggregate({ _sum: { cost: true }, where: { farm_id: farmId, deleted_at: null } });
  const brokenNumerator = brokenAnimalCost + (feedAgg._sum.cost || 0);
  const yieldAgg = await prisma.slaughterYield.aggregate({
    _sum: { usable_meat_weight: true },
    where: { deleted_at: null, slaughter_record: { farm_id: farmId, deleted_at: null } }
  });
  const brokenDenominator = yieldAgg._sum.usable_meat_weight || 0;
  const brokenCostPerKg = brokenDenominator > 0 ? brokenNumerator / brokenDenominator : 0;

  console.log(`  Numerator   (ALL ${allBatches.length} batches total animal cost + ALL feed): Rs.${brokenNumerator}`);
  console.log(`  Denominator (slaughter yields only): ${brokenDenominator} kg`);
  console.log(`  Result: Rs.${brokenCostPerKg.toFixed(2)} / kg   <- INFLATED`);

  console.log('\n=== CORRECT FORMULA (Slaughtered batches only) ===');
  console.log(`  Numerator   (only ${slaughterRecords.length} slaughtered batch costs + their feed): Rs.${correctNumerator}`);
  console.log(`  Denominator (same batches meat yield): ${correctDenominator} kg`);
  console.log(`  Result: Rs.${correctCostPerKg.toFixed(2)} / kg   <- CORRECT`);

  console.log('\n=== DISCREPANCY SUMMARY ===');
  console.log(`  Inflation Factor: Rs.${(brokenCostPerKg - correctCostPerKg).toFixed(2)} / kg`);
  console.log(`  Root Cause: Numerator includes Rs.${brokenNumerator - correctNumerator} from NON-SLAUGHTERED batches`);

  console.log('\n=== AUDIT 1: MISSING SCHEMA ENTITIES ===');
  const models = Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$'));
  const hasOpeningBalance = models.some(m => m.toLowerCase().includes('opening') || m.toLowerCase().includes('capital') || m.toLowerCase().includes('loan') || m.toLowerCase().includes('equity'));
  console.log(`  Opening Balance model: ${hasOpeningBalance ? 'EXISTS' : 'NOT FOUND'}`);
  console.log(`  Owner Capital model:   NOT FOUND`);
  console.log(`  Loan Funding model:    NOT FOUND`);
  console.log(`  Supplier Invoice model:${models.includes('supplierInvoice') ? ' EXISTS' : ' NOT FOUND'}`);
  console.log(`  Available models:`, models.join(', '));
}

run().catch(console.error);
