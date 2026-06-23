import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const tables = [
    'customers',
    'suppliers',
    'animal_batches',
    'sales_invoices',
    'rooms',
    'utility_meters',
    'animal_categories',
    'stage_definitions',
    'feed_types',
    'expenses',
    'customer_payments',
    'feed_consumptions',
    'electricity_usages',
    'water_usages',
    'mortalities',
    'slaughter_records',
    'inventory_items',
    'vaccinations'
  ];

  for (const table of tables) {
    try {
      const res: any[] = await prisma.$queryRawUnsafe(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='${table}' AND column_name='client_request_id';
      `);
      console.log(`DB_CHECK: ${table} HAS_COLUMN: ${res.length > 0}`);
    } catch (e: any) {
      console.log(`DB_CHECK: ${table} ERROR: ${e.message}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
