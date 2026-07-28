import { NextResponse, type NextRequest } from "next/server";
import { auth, getBookingScopeFilter } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { BookingStatus } from "@/generated/prisma/enums";

const PAGE_SIZE = 20;

const BOOKING_STATUSES: BookingStatus[] = [
  "PENDING_CONFIRMATION",
  "CONFIRMED",
  "PREPARED",
  "SURVEYED",
  "DESIGNED",
  "SIGNED",
  "CANCELLED",
];

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  // Bookings carry address/phone PII beyond what the leads list exposes to
  // CHANNEL_EXECUTIVE (which is already redacted) — this module isn't part
  // of that role's scope at all.
  if (session.user.role === "CHANNEL_EXECUTIVE") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const params = req.nextUrl.searchParams;
  const page = Math.max(1, Number(params.get("page")) || 1);
  const status = params.get("status");
  const search = params.get("search")?.trim();

  // Scope filter is the single source of truth for role-based visibility —
  // combined with the client-requested filters via AND, never OR.
  const scopeFilter = getBookingScopeFilter(session);
  const where: Prisma.SurveyBookingWhereInput = {
    AND: [
      scopeFilter,
      {
        ...(BOOKING_STATUSES.includes(status as BookingStatus)
          ? { status: status as BookingStatus }
          : {}),
        ...(search
          ? {
              OR: [
                { bookingNumber: { contains: search } },
                { lead: { name: { contains: search } } },
                { lead: { phone: { contains: search } } },
              ],
            }
          : {}),
      },
    ],
  };

  const [total, bookings] = await Promise.all([
    prisma.surveyBooking.count({ where }),
    prisma.surveyBooking.findMany({
      where,
      orderBy: { preferredDate: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        lead: { select: { name: true, phone: true, province: true } },
        assignedEngineer: { select: { id: true, name: true } },
        assignedSales: { select: { id: true, name: true } },
      },
    }),
  ]);

  return NextResponse.json({
    bookings,
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  });
}
