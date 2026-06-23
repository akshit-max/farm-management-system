import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function run() {
  try {
    const records = await db.slaughterRecord.findMany({
      include: { 
        batch: { include: { animal_category: true } },
        slaughterYield: true,
        wasteRecord: true,
        inventoryItems: { where: { deleted_at: null } }
      },
      orderBy: { slaughter_date: "desc" },
    });
    console.log("SUCCESS! RECORDS:", records.length);
  } catch (err: any) {
    console.log("API FAILURE:");
    console.error(err.message);
  } finally {
    await db.$disconnect();
  }
}
run();
