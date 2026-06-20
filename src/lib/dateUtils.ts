/**
 * Shared date range utilities for all report and analytics API routes.
 *
 * BUSINESS CONVENTION: Weeks start on MONDAY (ISO 8601), which is standard
 * for Indian business reporting. The previous implementation was Sunday-anchored;
 * this utility corrects it consistently across all routes.
 */

export interface DateRange {
  startDate: Date | undefined;
  endDate: Date | undefined;
  dateFilter: { gte: Date; lte: Date } | undefined;
}

/**
 * Returns startDate, endDate, and a ready-to-use Prisma dateFilter object
 * based on the `period` query param (today / week / month / year) or explicit
 * startDate/endDate params. All calculations are server-side; no client values
 * are trusted.
 */
export function resolveDateRange(
  period: string,
  startParam: string | null,
  endParam: string | null
): DateRange {
  let startDate: Date | undefined;
  let endDate: Date | undefined;
  const now = new Date();

  if (startParam && endParam) {
    startDate = new Date(startParam);
    endDate = new Date(endParam);
    endDate.setHours(23, 59, 59, 999);
  } else if (period === "today") {
    startDate = new Date(now);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);
  } else if (period === "week") {
    // Monday-anchored ISO week (Indian business convention)
    const day = now.getDay(); // 0 = Sun, 1 = Mon, …, 6 = Sat
    const diffToMonday = day === 0 ? -6 : 1 - day; // if Sunday, go back 6 days
    startDate = new Date(now);
    startDate.setDate(now.getDate() + diffToMonday);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);
  } else if (period === "month") {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  } else if (period === "year") {
    startDate = new Date(now.getFullYear(), 0, 1);
    endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
  }

  const dateFilter =
    startDate && endDate ? { gte: startDate, lte: endDate } : undefined;

  return { startDate, endDate, dateFilter };
}
