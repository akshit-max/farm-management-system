import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  const models = [
    { name: 'Customer', table: 'customers', route: 'src/app/api/customers/route.ts' },
    { name: 'Supplier', table: 'suppliers', route: 'src/app/api/suppliers/route.ts' },
    { name: 'AnimalBatch', table: 'animal_batches', route: 'src/app/api/animal-batches/route.ts' },
    { name: 'SalesInvoice', table: 'sales_invoices', route: 'src/app/api/sales/route.ts' },
    { name: 'Room', table: 'rooms', route: 'src/app/api/rooms/route.ts' },
    { name: 'UtilityMeter', table: 'utility_meters', route: 'src/app/api/utility-meters/route.ts' },
    { name: 'AnimalCategory', table: 'animal_categories', route: 'src/app/api/animal-categories/route.ts' },
    { name: 'StageDefinition', table: 'stage_definitions', route: 'src/app/api/stages/route.ts' },
    { name: 'FeedType', table: 'feed_types', route: 'src/app/api/feed-types/route.ts' },
    { name: 'Expense', table: 'expenses', route: 'src/app/api/expenses/route.ts' },
    { name: 'CustomerPayment', table: 'customer_payments', route: 'src/app/api/customer-payments/route.ts' },
    { name: 'FeedConsumption', table: 'feed_consumptions', route: 'src/app/api/feed-consumption/route.ts' },
    { name: 'ElectricityUsage', table: 'electricity_usages', route: 'src/app/api/electricity-usage/route.ts' },
    { name: 'WaterUsage', table: 'water_usages', route: 'src/app/api/water-usage/route.ts' },
    { name: 'Mortality', table: 'mortalities', route: 'src/app/api/mortalities/route.ts' },
    { name: 'SlaughterRecord', table: 'slaughter_records', route: 'src/app/api/slaughter-records/route.ts' },
    { name: 'InventoryItem', table: 'inventory_items', route: 'src/app/api/inventory-items/route.ts' },
    { name: 'Vaccination', table: 'vaccinations', route: 'src/app/api/vaccinations/route.ts' }
  ];

  const schemaContent = fs.readFileSync('prisma/schema.prisma', 'utf-8');

  for (const m of models) {
    const modelMatch = schemaContent.match(new RegExp(`model\\s+${m.name}\\s+{[^}]*client_request_id\\s+String\\?[^}]*}`, 's'));
    const inSchema = !!modelMatch;
    
    let inDb = false;
    let hasUnique = false;
    try {
      const colCheck: any[] = await prisma.$queryRawUnsafe(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name='${m.table}' AND column_name='client_request_id';
      `);
      inDb = colCheck.length > 0;

      const idxCheck: any[] = await prisma.$queryRawUnsafe(`
        SELECT tc.constraint_name FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name='${m.table}' AND kcu.column_name='client_request_id' AND tc.constraint_type='UNIQUE';
      `);
      hasUnique = idxCheck.length > 0;
    } catch (e) {}

    let apiPatched = false;
    let uuidPreserved = false;
    try {
      if (fs.existsSync(m.route)) {
        const routeContent = fs.readFileSync(m.route, 'utf-8');
        apiPatched = routeContent.includes('client_request_id');
        uuidPreserved = routeContent.includes('id:') && routeContent.includes('.optional()');
      }
    } catch (e) {}

    console.log(`${m.name}|${inSchema}|${inDb}|${hasUnique}|${apiPatched}|${uuidPreserved}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
