import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
const db = new PrismaClient();

async function run() {
  try {
    const farms = await db.farm.findMany({ take: 1 });
    if (!farms.length) return console.log("No farms");
    
    try {
      await db.feedType.create({
        data: {
          farm_id: farms[0].id,
          name: "Test Feed Type Fake UUID",
          supplier_id: uuidv4(),
          cost_per_kg: 10,
          stock_quantity: 100,
          reorder_level: 10
        }
      });
      console.log("SUCCESS creating with fake UUID");
    } catch (e: any) {
      console.log("FAILED fake UUID:", e.message.substring(0, 300));
    }

  } catch (err: any) {
    console.error(err);
  } finally {
    await db.$disconnect();
  }
}
run();
