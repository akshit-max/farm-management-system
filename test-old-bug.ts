import { db } from "./src/lib/db";
import { z } from "zod";

async function test() {
  const farmId = "d9b82079-3261-4c83-b30f-321903ceb57d";
  
  try {
    const feedType = await db.feedType.create({
      data: {
        farm_id: farmId,
        name: "Fail Feed",
        cost_per_kg: 10,
        stock_quantity: 10,
        reorder_level: 5,
        supplier_id: "" as any // simulating the old JS bug
      }
    });
    console.log("Success?", feedType.id);
  } catch (err: any) {
    console.error("Prisma Error:", err.message);
  }
}

test();
