import { db } from "./src/lib/db";

async function verify() {
  const slaughterRecordCount = await db.slaughterRecord.count();
  const slaughterYieldCount = await db.slaughterYield.count();
  const wasteRecordCount = await db.wasteRecord.count();
  const inventoryItemCount = await db.inventoryItem.count();
  const animalBatchCount = await db.animalBatch.count();
  
  const notNullCount = await db.slaughterRecord.count({
    where: { client_request_id: { not: null } }
  });

  console.log("--- Row Counts ---");
  console.log("SlaughterRecord:", slaughterRecordCount);
  console.log("SlaughterYield:", slaughterYieldCount);
  console.log("WasteRecord:", wasteRecordCount);
  console.log("InventoryItem:", inventoryItemCount);
  console.log("AnimalBatch:", animalBatchCount);
  console.log("------------------");
  console.log("SlaughterRecords with client_request_id IS NOT NULL:", notNullCount);
  
  process.exit(0);
}

verify().catch(e => {
  console.error(e);
  process.exit(1);
});
