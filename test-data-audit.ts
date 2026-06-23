import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getStats(modelName: string, prismaDelegate: any) {
  try {
    const count = await prismaDelegate.count();
    
    if (count === 0) {
      return { modelName, count, earliest: 'N/A', latest: 'N/A' };
    }

    const earliestRecord = await prismaDelegate.findFirst({
      orderBy: { created_at: 'asc' },
      select: { created_at: true }
    });

    const latestRecord = await prismaDelegate.findFirst({
      orderBy: { created_at: 'desc' },
      select: { created_at: true }
    });

    return {
      modelName,
      count,
      earliest: earliestRecord?.created_at?.toISOString() || 'N/A',
      latest: latestRecord?.created_at?.toISOString() || 'N/A'
    };
  } catch (err: any) {
    return { modelName, error: err.message };
  }
}

async function main() {
  const stats = await Promise.all([
    getStats('animal_batches', prisma.animalBatch),
    getStats('customers', prisma.customer),
    getStats('sales_invoices', prisma.salesInvoice),
    getStats('customer_payments', prisma.customerPayment),
    getStats('rooms', prisma.room),
    getStats('utility_meters', prisma.utilityMeter)
  ]);

  console.table(stats);
}

main().catch(console.error).finally(() => prisma.$disconnect());
