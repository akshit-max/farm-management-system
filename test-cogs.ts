import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const item = await prisma.salesInvoiceItem.findFirst({
    where: { deleted_at: null, invoice: { deleted_at: null } },
    include: { batch: { include: { feedConsumptions: true } } }
  });
  if (!item || !item.batch) {
    console.log('No suitable item found');
    return;
  }
  const initialCost = item.batch.initial_quantity * item.batch.cost_per_animal;
  const batchFeedCost = item.batch.feedConsumptions.reduce((sum, f) => sum + f.cost, 0);
  const unitCost = (initialCost + batchFeedCost) / item.batch.initial_quantity;
  const recognizedCogs = item.quantity * unitCost;

  console.log('Batch ID:', item.batch.id);
  console.log('Initial Quantity:', item.batch.initial_quantity);
  console.log('Purchase Cost:', initialCost);
  console.log('Feed Cost:', batchFeedCost);
  console.log('Unit Cost:', unitCost);
  console.log('Sold Quantity:', item.quantity);
  console.log('Recognized COGS:', recognizedCogs);
}

run();
