import { db } from "./src/lib/db";
async function check() {
  const all = await db.customer.findMany({
    select: { company_name: true, phone: true, created_at: true },
    orderBy: { created_at: 'desc' },
    take: 10
  });
  console.log(all);
}
check().finally(() => process.exit(0));
