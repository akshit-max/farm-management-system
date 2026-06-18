import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // 1. Create Roles
  const roles = ['Owner', 'Manager', 'Accountant', 'Worker'];
  const createdRoles = [];
  
  for (const roleName of roles) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: {
        name: roleName,
        description: `${roleName} role with default permissions.`,
      },
    });
    createdRoles.push(role);
    console.log(`Created/Verified role: ${role.name}`);
  }

  // 2. Create Default Farm
  const farm = await prisma.farm.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Main Farm',
      description: 'The primary farming location.',
      location: 'Central Valley',
    },
  });
  console.log(`Created/Verified farm: ${farm.name}`);

  // 3. Create Farm Settings
  await prisma.settings.upsert({
    where: { farm_id: farm.id },
    update: {},
    create: {
      farm_id: farm.id,
      theme: 'light',
      currency: 'USD',
      date_format: 'YYYY-MM-DD',
    },
  });
  console.log('Created/Verified default farm settings.');

  // 4. Create Owner Account
  const ownerRole = createdRoles.find(r => r.name === 'Owner');
  if (ownerRole) {
    const password_hash = await bcrypt.hash('Admin@123', 10);
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@farmerp.com' },
      update: {
        password_hash,
      },
      create: {
        name: 'System Admin',
        email: 'admin@farmerp.com',
        password_hash,
        role_id: ownerRole.id,
        farm_id: farm.id,
      },
    });
    console.log(`Created/Verified admin user: ${adminUser.email}`);
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
