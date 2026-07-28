import { prisma } from "@/lib/db";
import type { TimeSlot } from "@/generated/prisma/enums";

function dayRange(date: Date): { gte: Date; lt: Date } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { gte: start, lt: end };
}

/**
 * Whether `date`+`timeSlot` has reached capacity, per the single
 * `BookingCapacitySetting` row (falls back to the schema defaults if the
 * settings row is somehow missing). Cancelled bookings don't count against
 * capacity.
 *
 * This backs a public, unauthenticated endpoint — it must only ever return a
 * boolean, never counts or booking details (privacy).
 */
export async function isDateFull(date: Date, timeSlot: TimeSlot): Promise<boolean> {
  const setting = await prisma.bookingCapacitySetting.findFirst();
  const maxPerDay = setting?.maxPerDay ?? 4;
  const maxPerSlot = setting?.maxPerSlot ?? 2;

  const range = dayRange(date);
  const [dayCount, slotCount] = await Promise.all([
    prisma.surveyBooking.count({
      where: {
        preferredDate: range,
        status: { not: "CANCELLED" },
      },
    }),
    prisma.surveyBooking.count({
      where: {
        preferredDate: range,
        timeSlot,
        status: { not: "CANCELLED" },
      },
    }),
  ]);

  return dayCount >= maxPerDay || slotCount >= maxPerSlot;
}
