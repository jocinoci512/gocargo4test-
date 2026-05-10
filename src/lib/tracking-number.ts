import prisma from '@/lib/prisma';

/**
 * Generate a sequential tracking number in the format GCL-YYYY-NNNN.
 * Queries the DB for existing numbers this year, filters to the new 4-digit
 * format (skipping legacy 6-digit random numbers), and increments.
 * Relies on the @unique constraint as the ultimate collision guard.
 */
export async function generateTrackingNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `GCL-${year}-`;

  // Fetch all tracking numbers for this year
  const existing = await prisma.shipment.findMany({
    where: { trackingNumber: { startsWith: prefix } },
    select: { trackingNumber: true },
  });

  // Find the highest sequential number among 4-digit suffixes only
  let maxNum = 0;
  for (const row of existing) {
    const suffix = row.trackingNumber.replace(prefix, '');
    // Only consider 4-digit suffixes (our new format), skip legacy 6-digit random ones
    if (suffix.length <= 4) {
      const parsed = parseInt(suffix, 10);
      if (!isNaN(parsed) && parsed > maxNum) {
        maxNum = parsed;
      }
    }
  }

  const nextNum = maxNum + 1;
  return `${prefix}${String(nextNum).padStart(4, '0')}`;
}
