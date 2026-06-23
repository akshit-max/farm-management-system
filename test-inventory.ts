import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function run() {
  try {
    const items = await db.inventoryItem.findMany({
      orderBy: { name: "asc" },
      include: { source_slaughter: true }
    });
    console.log("SUCCESS! ITEMS:", items.length);
  } catch (err: any) {
    console.log("API FAILURE:");
    console.error(err.message);
  } finally {
    await db.$disconnect();
  }
}
run();
