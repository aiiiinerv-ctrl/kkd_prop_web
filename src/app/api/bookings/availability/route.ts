import { NextResponse, type NextRequest } from "next/server";
import { isDateFull } from "@/lib/bookings/capacity";
import { TIME_SLOTS } from "@/lib/enums";
import type { TimeSlot } from "@/generated/prisma/enums";

// Public, unauthenticated — the booking form calls this while the customer
// picks a date, before any session exists. Only ever returns a full/not-full
// boolean per time slot, never counts or booking details (privacy).

export async function GET(req: NextRequest) {
  const dateParam = req.nextUrl.searchParams.get("date");
  if (!dateParam) {
    return NextResponse.json({ error: "date is required" }, { status: 400 });
  }

  const date = new Date(dateParam);
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: "invalid date" }, { status: 400 });
  }

  const results = await Promise.all(
    TIME_SLOTS.map((slot) => isDateFull(date, slot))
  );
  const slots = Object.fromEntries(
    TIME_SLOTS.map((slot, i) => [slot, results[i]])
  ) as Record<TimeSlot, boolean>;

  return NextResponse.json({ date: dateParam, slots });
}
