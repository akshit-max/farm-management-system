import { db } from "./src/lib/db";

async function test() {
  try {
    const payload = {
      farm_id: "d9b82079-3261-4c83-b30f-321903ceb57d",
      name: "Test Feed Type " + Date.now(),
      supplier_id: null,
      cost_per_kg: 10,
      stock_quantity: 100,
      reorder_level: 10,
      notes: "Testing"
    };
    
    console.log("Creating feed type...");
    const res = await db.feedType.create({
      data: payload
    });
    console.log("Success:", res);
  } catch (err: any) {
    console.error("Prisma Error:", err.message);
  }
}

test();
