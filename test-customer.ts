import { db } from "./src/lib/db";
import { v4 as uuidv4 } from "uuid";

async function test() {
  const farmId = (await db.farm.findFirst())?.id;
  if (!farmId) return;
  const id = uuidv4();
  console.log("UUID:", id);
  const c = await db.customer.create({
    data: { id, farm_id: farmId, company_name: "Test Offline", phone: "12345", customer_type: "Retail", sync_status: "SYNCED" }
  });
  console.log("Created:", c);
}

test().catch(console.error).finally(() => process.exit(0));
