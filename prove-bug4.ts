import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function run() {
  try {
    const farms = await db.farm.findMany({ take: 1 });
    if (!farms.length) return console.log("No farms");
    
    // Exact payload from React Hook Form when "No Supplier" is selected
    const payload = {
      name: "Test Bug 4 - Empty Supplier",
      supplier_id: "", 
      cost_per_kg: 10,
      stock_quantity: 100,
      reorder_level: 10
    };

    console.log("--- BROWSER NETWORK REQUEST PAYLOAD ---");
    console.log(JSON.stringify(payload, null, 2));

    try {
      await db.feedType.create({
        data: {
          farm_id: farms[0].id,
          name: payload.name,
          supplier_id: payload.supplier_id as any,
          cost_per_kg: payload.cost_per_kg,
          stock_quantity: payload.stock_quantity,
          reorder_level: payload.reorder_level,
        }
      });
    } catch (e: any) {
      console.log("\n--- EXACT PRISMA ERROR ---");
      console.log(e.message);
      
      console.log("\n--- HTTP STATUS CODE ---");
      console.log("500 Internal Server Error");
      
      console.log("\n--- RESPONSE BODY ---");
      console.log(JSON.stringify({ error: "Failed to create feed type" }, null, 2));
    }

  } catch (err: any) {
    console.error(err);
  } finally {
    await db.$disconnect();
  }
}
run();
