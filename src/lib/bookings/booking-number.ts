import { prisma } from "@/lib/db";

/**
 * Generates the next `bookingNumber` (format `KKD-YYYYMMDD-NNN`, sequential
 * per calendar day). Shared by the public survey-booking submit action and
 * any future admin-side booking creation flow — never duplicate this logic
 * at the call site.
 */
export async function nextBookingNumber(): Promise<string> {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate()
  ).padStart(2, "0")}`;
  const prefix = `KKD-${datePart}-`;
  const todaysCount = await prisma.surveyBooking.count({
    where: { bookingNumber: { startsWith: prefix } },
  });
  return `${prefix}${String(todaysCount + 1).padStart(3, "0")}`;
}
