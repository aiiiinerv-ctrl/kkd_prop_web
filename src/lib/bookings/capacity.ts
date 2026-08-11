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
 * The capacity rule itself, kept pure so it can be exercised without a DB:
 * a date+slot is full when either the whole day or the specific slot has
 * reached its cap.
 */
export function exceedsCapacity(counts: {
  dayCount: number;
  slotCount: number;
  maxPerDay: number;
  maxPerSlot: number;
}): boolean {
  return counts.dayCount >= counts.maxPerDay || counts.slotCount >= counts.maxPerSlot;
}

/**
 * Whether `date`+`timeSlot` has reached capacity, per the single
 * `BookingCapacitySetting` row (falls back to the schema defaults if the
 * settings row is somehow missing). Cancelled bookings don't count against
 * capacity.
 *
 * Called from the public availability endpoint *and* from
 * `submitSurveyBooking` right before creating the booking — the check is
 * check-then-create (no lock), so two submits in the same instant can still
 * both pass; that residual race is accepted because every booking is
 * human-reviewed via its payment slip before confirmation.
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

  return exceedsCapacity({ dayCount, slotCount, maxPerDay, maxPerSlot });
}
