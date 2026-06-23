import { db } from "./src/lib/db";
async function check() {
  const customers = await db.customer.findMany({
    where: { company_name: { in: ['pwa-5', 'pwa-6'] } },
    select: { id: true, company_name: true, phone: true }
  });
  console.log("Postgres Database Results:");
  console.dir(customers);
}
check().finally(() => process.exit(0));
