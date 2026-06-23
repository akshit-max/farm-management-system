import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function run() {
  try {
    const farms = await db.farm.findMany({ take: 1 });
    if (!farms.length) return console.log("No farms");
    
    // 1. Try to create feed type with supplier_id = ""
    try {
      await db.feedType.create({
        data: {
          farm_id: farms[0].id,
          name: "Test Feed Type Empty Supplier",
          supplier_id: "" as any,
          cost_per_kg: 10,
          stock_quantity: 100,
          reorder_level: 10
        }
      });
      console.log("SUCCESS creating with empty supplier string");
    } catch (e: any) {
      console.log("FAILED empty string:", e.message.substring(0, 100));
    }

  } catch (err: any) {
    console.error(err);
  } finally {
    await db.$disconnect();
  }
}
run();
