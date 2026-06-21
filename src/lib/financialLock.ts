import { db } from "@/lib/db";

export async function checkFinancialLock(farmId: string, transactionDate: Date) {
  const month = transactionDate.getMonth() + 1; // 1-12
  const year = transactionDate.getFullYear();

  const period = await db.financialPeriod.findUnique({
    where: {
      farm_id_year_month: {
        farm_id: farmId,
        year: year,
        month: month
      }
    }
  });

  if (period && period.status === "LOCKED") {
    // Structured payload for standard HTTP 423 response
    throw new Error(JSON.stringify({
      code: "LOCKED",
      error: "Financial period is locked",
      period: `${year}-${month.toString().padStart(2, '0')}`,
      startDate: period.start_date.toISOString(),
      endDate: period.end_date.toISOString(),
      unlockRequired: true
    }));
  }
}
