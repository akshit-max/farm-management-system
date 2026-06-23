import { db } from "./src/lib/db";
async function check() {
  const all = await db.customer.findMany({
    where: { company_name: { contains: "pwa" } },
    select: { company_name: true, phone: true }
  });
  console.log(all);
}
check().finally(() => process.exit(0));
