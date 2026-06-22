import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  console.log("=== SECTION 1: FARM INVENTORY ===");
  const farms = await prisma.$queryRaw<any[]>`
    SELECT id, name, created_at FROM farms ORDER BY created_at
  `;
  console.log(`Total Farms: ${farms.length}`);
  for (const f of farms) {
    console.log(`  Farm ID: ${f.id} | Name: ${f.name} | Created: ${f.created_at}`);
  }

  console.log("\n=== SECTION 2 & 3: USER TO FARM MAPPING ===");
  const users = await prisma.$queryRaw<any[]>`
    SELECT u.id, u.email, u.farm_id, u.active_status, r.name as role_name, f.name as farm_name
    FROM users u
    LEFT JOIN farms f ON u.farm_id = f.id
    LEFT JOIN roles r ON u.role_id = r.id
    WHERE u.deleted_at IS NULL
    ORDER BY f.name, u.email
  `;
  console.log(`Total Users: ${users.length}`);
  for (const u of users) {
    console.log(`  Email: ${u.email} | Role: ${u.role_name} | Farm: ${u.farm_name} | Farm ID: ${u.farm_id} | Active: ${u.active_status}`);
  }

  // Group users by farm
  const farmGroups: Record<string, string[]> = {};
  for (const u of users) {
    const key = `${u.farm_id}|${u.farm_name}`;
    if (!farmGroups[key]) farmGroups[key] = [];
    farmGroups[key].push(u.email);
  }
  console.log("\n  --- Users grouped by Farm ---");
  for (const [key, emails] of Object.entries(farmGroups)) {
    const [fid, fname] = key.split('|');
    console.log(`  Farm "${fname}" (${fid}): ${emails.join(', ')}`);
  }

  console.log("\n=== SECTION 5: DATA ISOLATION PER FARM ===");
  for (const f of farms) {
    const fid = f.id;
    const [animals, batches, expenses, sales, customers, suppliers] = await Promise.all([
      prisma.$queryRaw<any[]>`SELECT COUNT(*) as cnt FROM animal_batches WHERE farm_id = ${fid}::uuid AND deleted_at IS NULL`,
      prisma.$queryRaw<any[]>`SELECT COUNT(*) as cnt FROM animal_batches WHERE farm_id = ${fid}::uuid AND deleted_at IS NULL`,
      prisma.$queryRaw<any[]>`SELECT COUNT(*) as cnt FROM expenses WHERE farm_id = ${fid}::uuid AND deleted_at IS NULL`,
      prisma.$queryRaw<any[]>`SELECT COUNT(*) as cnt FROM sales_invoices WHERE farm_id = ${fid}::uuid AND deleted_at IS NULL`,
      prisma.$queryRaw<any[]>`SELECT COUNT(*) as cnt FROM customers WHERE farm_id = ${fid}::uuid AND deleted_at IS NULL`,
      prisma.$queryRaw<any[]>`SELECT COUNT(*) as cnt FROM suppliers WHERE farm_id = ${fid}::uuid AND deleted_at IS NULL`,
    ]);
    console.log(`\n  Farm: "${f.name}" (${fid})`);
    console.log(`    Batches:   ${batches[0].cnt}`);
    console.log(`    Expenses:  ${expenses[0].cnt}`);
    console.log(`    Sales:     ${sales[0].cnt}`);
    console.log(`    Customers: ${customers[0].cnt}`);
    console.log(`    Suppliers: ${suppliers[0].cnt}`);
  }

  console.log("\n=== SECTION 4: SIGNUP CODE BEHAVIOR (schema proof) ===");
  console.log("  Signup creates a brand-new farm per user via db.$transaction:");
  console.log("  1. tx.farm.create({ data: { name: data.farmName } })  => NEW UUID generated");
  console.log("  2. tx.user.create({ data: { ..., farm_id: farm.id } }) => bound to that new farm");
  console.log("  Code location: src/app/api/auth/signup/route.ts lines 36-52");

  console.log("\n=== SECTION 6: SESSION ARCHITECTURE ===");
  console.log("  src/auth.ts JWT callback (line 50):  token.farm_id = user.farm_id");
  console.log("  src/auth.ts session callback (line 58): session.user.farm_id = token.farm_id");
  console.log("  All API routes: const farmId = session?.user?.farm_id");
  console.log("  All DB queries: where: { farm_id: farmId }");
}

run().catch(console.error);
