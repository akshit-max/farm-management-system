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

  const password_hash = await bcrypt.hash('Admin@123', 10);
  
  // 4. Create Owner Account
  const ownerRole = createdRoles.find(r => r.name === 'Owner');
  if (ownerRole) {
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

  // 5. Create Worker Account
  const workerRole = createdRoles.find(r => r.name === 'Worker');
  if (workerRole) {
    const workerUser = await prisma.user.upsert({
      where: { email: 'worker@farmerp.com' },
      update: {
        password_hash,
      },
      create: {
        name: 'Farm Worker',
        email: 'worker@farmerp.com',
        password_hash,
        role_id: workerRole.id,
        farm_id: farm.id,
      },
    });
    console.log(`Created/Verified worker user: ${workerUser.email}`);
  }

  // 6. Create Manager Account
  const managerRole = createdRoles.find(r => r.name === 'Manager');
  if (managerRole) {
    const managerUser = await prisma.user.upsert({
      where: { email: 'manager@farmerp.com' },
      update: {
        password_hash,
      },
      create: {
        name: 'Farm Manager',
        email: 'manager@farmerp.com',
        password_hash,
        role_id: managerRole.id,
        farm_id: farm.id,
      },
    });
    console.log(`Created/Verified manager user: ${managerUser.email}`);
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
