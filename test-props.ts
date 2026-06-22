import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const batch = await prisma.animalBatch.findUnique({
    where: { id: '690ba3f3-1702-4242-9b46-7b2f0be3dc44' },
    include: { feedConsumptions: true }
  });
  console.log(JSON.stringify(batch, null, 2));
}
run().finally(() => prisma.$disconnect());
