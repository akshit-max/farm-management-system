import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting backfill for initial_quantity...');
  
  const batches = await prisma.animalBatch.findMany({
    include: {
      mortalities: { where: { deleted_at: null } },
      slaughterRecords: { where: { deleted_at: null } },
      salesInvoiceItems: {
        where: {
          deleted_at: null,
          invoice: { deleted_at: null }
        }
      }
    }
  });

  console.log(`Found ${batches.length} batches to backfill.`);

  for (const batch of batches) {
    const soldQty = batch.salesInvoiceItems.reduce((sum, item) => sum + item.quantity, 0);
    const deadQty = batch.mortalities.reduce((sum, item) => sum + item.quantity, 0);
    const slaughteredQty = batch.slaughterRecords.reduce((sum, item) => sum + item.quantity_slaughtered, 0);
    
    const initialQty = batch.quantity + soldQty + deadQty + slaughteredQty;

    await prisma.animalBatch.update({
      where: { id: batch.id },
      data: { initial_quantity: initialQty }
    });

    console.log(`Batch ${batch.batch_number}: Current=${batch.quantity}, Sold=${soldQty}, Dead=${deadQty}, Slaughtered=${slaughteredQty} => Initial=${initialQty}`);
  }

  console.log('Backfill completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
