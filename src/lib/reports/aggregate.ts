import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { BookingStatus, LeadStatus } from "@/generated/prisma/enums";
import { BOOKING_STATUS_LABELS, LEAD_STATUS_LABELS } from "@/lib/enum-labels";
import { BOOKING_STATUSES, LEAD_STATUSES } from "@/lib/enums";

/**
 * BookingStatus values that count as "นัดยืนยันแล้ว" for revenue purposes —
 * everything past the initial pending-confirmation step (i.e. every status
 * except PENDING_CONFIRMATION and the CANCELLED dead-end). This is the
 * single source of truth for "which bookings count toward revenue" — both
 * the dashboard aggregate (this file) and the row-level Excel export
 * (export-rows.ts) import it rather than re-deriving the rule, so the two
 * totals can never drift apart.
 */
export const CONFIRMED_BOOKING_STATUSES: BookingStatus[] = [
  "CONFIRMED",
  "PREPARED",
  "SURVEYED",
  "DESIGNED",
  "SIGNED",
];

export function isConfirmedBookingStatus(status: BookingStatus): boolean {
  return (CONFIRMED_BOOKING_STATUSES as readonly string[]).includes(status);
}

/**
 * LeadStatus values that count as "ปิดการขายแล้ว" for close-rate purposes —
 * the pipeline step "เซ็นสัญญาแล้ว" (SIGNED, per §4.3) and everything past
 * it. Deliberately keyed off the lead's *current* status rather than
 * `closedAt IS NOT NULL`: updateLeadStatus() has no state-machine guard, so
 * a lead could theoretically be moved back out of SIGNED (e.g. correcting a
 * mistake) while `closedAt` still holds the old close date as history — such
 * a lead must NOT count toward close-rate anymore. Single source of truth
 * for both the dashboard aggregate (this file) and the row-level export
 * (export-rows.ts), mirroring CONFIRMED_BOOKING_STATUSES above.
 */
export const CLOSED_LEAD_STATUSES: LeadStatus[] = ["SIGNED", "INSTALLING", "COMPLETED"];

export function isClosedLeadStatus(status: LeadStatus): boolean {
  return (CLOSED_LEAD_STATUSES as readonly string[]).includes(status);
}

/** Revenue = SUM(amountThb) of bookings whose status counts as confirmed. */
export function sumConfirmedRevenue(
  bookings: { status: BookingStatus; amountThb: number }[]
): number {
  return bookings
    .filter((b) => isConfirmedBookingStatus(b.status))
    .reduce((sum, b) => sum + b.amountThb, 0);
}

export type ReportFilters = {
  from?: Date;
  to?: Date;
  channelId?: string;
  executiveId?: string;
  salesId?: string;
};

/** Parses the shared query-param shape used by both /summary and /export. */
export function parseReportFilters(params: URLSearchParams): ReportFilters {
  const from = params.get("from");
  const to = params.get("to");
  const channelId = params.get("channelId");
  const executiveId = params.get("executiveId");
  const salesId = params.get("salesId");
  return {
    from: from ? new Date(from) : undefined,
    // Inclusive end-of-day so a "to" date picked in the UI covers that whole day.
    to: to ? new Date(`${to}T23:59:59.999`) : undefined,
    channelId: channelId || undefined,
    executiveId: executiveId || undefined,
    salesId: salesId || undefined,
  };
}

/**
 * Lead-side where clause: date range on createdAt, channel matches either
 * the manual dropdown pick or the auto ?ref= attribution, executive/sales
 * match their respective FK.
 */
export function buildLeadWhere(filters: ReportFilters): Prisma.LeadWhereInput {
  const and: Prisma.LeadWhereInput[] = [];
  if (filters.from || filters.to) {
    and.push({
      createdAt: {
        ...(filters.from ? { gte: filters.from } : {}),
        ...(filters.to ? { lte: filters.to } : {}),
      },
    });
  }
  if (filters.channelId) {
    and.push({
      OR: [{ sourceChannelId: filters.channelId }, { autoSourceChannelId: filters.channelId }],
    });
  }
  if (filters.executiveId) {
    and.push({ autoSourceExecutiveId: filters.executiveId });
  }
  if (filters.salesId) {
    and.push({ assignedSalesId: filters.salesId });
  }
  return and.length > 0 ? { AND: and } : {};
}

/** Same filters expressed against SurveyBooking (date range on preferredDate). */
export function buildBookingWhere(filters: ReportFilters): Prisma.SurveyBookingWhereInput {
  const and: Prisma.SurveyBookingWhereInput[] = [];
  if (filters.from || filters.to) {
    and.push({
      preferredDate: {
        ...(filters.from ? { gte: filters.from } : {}),
        ...(filters.to ? { lte: filters.to } : {}),
      },
    });
  }
  if (filters.channelId) {
    and.push({
      lead: {
        OR: [{ sourceChannelId: filters.channelId }, { autoSourceChannelId: filters.channelId }],
      },
    });
  }
  if (filters.executiveId) {
    and.push({ lead: { autoSourceExecutiveId: filters.executiveId } });
  }
  if (filters.salesId) {
    and.push({ assignedSalesId: filters.salesId });
  }
  return and.length > 0 ? { AND: and } : {};
}

type ChannelInfo = { nameTh: string };

/**
 * A lead can be attributed via the manual dropdown (sourceChannel) and/or
 * the automatic ?ref= tracking (autoSourceChannel) — both are kept
 * side-by-side per Sprint 1 decision. For reporting we prefer the auto
 * attribution (more reliable) and fall back to the manual pick, then to
 * "direct" (no channel at all).
 */
export function effectiveChannel(lead: {
  sourceChannelId: string | null;
  sourceChannel: ChannelInfo | null;
  autoSourceChannelId: string | null;
  autoSourceChannel: ChannelInfo | null;
}): { id: string | null; name: string } {
  if (lead.autoSourceChannelId) {
    return { id: lead.autoSourceChannelId, name: lead.autoSourceChannel?.nameTh ?? "-" };
  }
  if (lead.sourceChannelId) {
    return { id: lead.sourceChannelId, name: lead.sourceChannel?.nameTh ?? "-" };
  }
  return { id: null, name: "เข้าโดยตรง (ไม่มีช่องทาง)" };
}

export type ReportAggregate = {
  totalLeads: number;
  totalBookings: number;
  totalConfirmedBookings: number;
  totalRevenueThb: number;
  leadStatusBreakdown: { status: LeadStatus; label: string; count: number }[];
  bookingStatusBreakdown: { status: BookingStatus; label: string; count: number }[];
  channelBreakdown: {
    channelId: string | null;
    channelName: string;
    leadCount: number;
    bookingCount: number;
    confirmedBookingCount: number;
    revenueThb: number;
    closedLeadCount: number;
    closeRatePercent: number;
  }[];
  executiveBreakdown: {
    executiveId: string;
    executiveName: string;
    channelName: string;
    leadCount: number;
    bookingCount: number;
    revenueThb: number;
    closedLeadCount: number;
    closeRatePercent: number;
  }[];
  salesBreakdown: {
    salesId: string;
    salesName: string;
    leadCount: number;
    bookingCount: number;
    revenueThb: number;
    closedLeadCount: number;
    closeRatePercent: number;
  }[];
};


/**
 * The single query+aggregation path for the reports dashboard. `scope`
 * comes from getLeadScopeFilter()/getBookingScopeFilter() — always `{}` for
 * ADMIN/FINANCE (the only two roles allowed on this page) but called
 * unconditionally for consistency with the rest of the codebase's scoping
 * pattern.
 */
export async function getReportAggregate(
  filters: ReportFilters,
  scope: { lead: Prisma.LeadWhereInput; booking: Prisma.SurveyBookingWhereInput }
): Promise<ReportAggregate> {
  const leadWhere: Prisma.LeadWhereInput = { AND: [scope.lead, buildLeadWhere(filters)] };
  const bookingWhere: Prisma.SurveyBookingWhereInput = {
    AND: [scope.booking, buildBookingWhere(filters)],
  };

  const [leads, bookings] = await Promise.all([
    prisma.lead.findMany({
      where: leadWhere,
      select: {
        id: true,
        status: true,
        sourceChannelId: true,
        sourceChannel: { select: { nameTh: true } },
        autoSourceChannelId: true,
        autoSourceChannel: { select: { nameTh: true } },
        autoSourceExecutiveId: true,
        autoSourceExecutive: {
          select: { name: true, channel: { select: { nameTh: true } } },
        },
        assignedSalesId: true,
        assignedSales: { select: { name: true } },
      },
    }),
    prisma.surveyBooking.findMany({
      where: bookingWhere,
      select: {
        id: true,
        status: true,
        amountThb: true,
        assignedSalesId: true,
        assignedSales: { select: { name: true } },
        lead: {
          select: {
            sourceChannelId: true,
            sourceChannel: { select: { nameTh: true } },
            autoSourceChannelId: true,
            autoSourceChannel: { select: { nameTh: true } },
            autoSourceExecutiveId: true,
            autoSourceExecutive: {
              select: { name: true, channel: { select: { nameTh: true } } },
            },
          },
        },
      },
    }),
  ]);

  // --- status breakdowns (fixed order, zero-filled) ----------------------
  const leadStatusCounts = new Map<LeadStatus, number>();
  for (const l of leads) leadStatusCounts.set(l.status, (leadStatusCounts.get(l.status) ?? 0) + 1);
  const leadStatusBreakdown = LEAD_STATUSES.map((status) => ({
    status,
    label: LEAD_STATUS_LABELS[status],
    count: leadStatusCounts.get(status) ?? 0,
  }));

  const bookingStatusCounts = new Map<BookingStatus, number>();
  for (const b of bookings)
    bookingStatusCounts.set(b.status, (bookingStatusCounts.get(b.status) ?? 0) + 1);
  const bookingStatusBreakdown = BOOKING_STATUSES.map((status) => ({
    status,
    label: BOOKING_STATUS_LABELS[status],
    count: bookingStatusCounts.get(status) ?? 0,
  }));

  // --- channel breakdown ---------------------------------------------------
  type ChannelAgg = {
    channelId: string | null;
    channelName: string;
    leadCount: number;
    bookingCount: number;
    confirmedBookingCount: number;
    revenueThb: number;
    closedLeadCount: number;
    closeRatePercent: number;
  };
  const channelMap = new Map<string, ChannelAgg>();
  const channelKey = (c: { id: string | null; name: string }) => c.id ?? "__direct__";

  for (const l of leads) {
    const ch = effectiveChannel(l);
    const key = channelKey(ch);
    const agg = channelMap.get(key) ?? {
      channelId: ch.id,
      channelName: ch.name,
      leadCount: 0,
      bookingCount: 0,
      confirmedBookingCount: 0,
      revenueThb: 0,
      closedLeadCount: 0,
      closeRatePercent: 0,
    };
    agg.leadCount += 1;
    if (isClosedLeadStatus(l.status)) agg.closedLeadCount += 1;
    channelMap.set(key, agg);
  }
  for (const b of bookings) {
    const ch = effectiveChannel(b.lead);
    const key = channelKey(ch);
    const agg = channelMap.get(key) ?? {
      channelId: ch.id,
      channelName: ch.name,
      leadCount: 0,
      bookingCount: 0,
      confirmedBookingCount: 0,
      revenueThb: 0,
      closedLeadCount: 0,
      closeRatePercent: 0,
    };
    agg.bookingCount += 1;
    if (isConfirmedBookingStatus(b.status)) {
      agg.confirmedBookingCount += 1;
      agg.revenueThb += b.amountThb;
    }
    channelMap.set(key, agg);
  }
  for (const agg of channelMap.values()) {
    agg.closeRatePercent = agg.leadCount > 0 ? (agg.closedLeadCount / agg.leadCount) * 100 : 0;
  }

  // --- executive breakdown --------------------------------------------------
  type ExecutiveAgg = {
    executiveId: string;
    executiveName: string;
    channelName: string;
    leadCount: number;
    bookingCount: number;
    revenueThb: number;
    closedLeadCount: number;
    closeRatePercent: number;
  };
  const executiveMap = new Map<string, ExecutiveAgg>();
  for (const l of leads) {
    if (!l.autoSourceExecutiveId) continue;
    const agg = executiveMap.get(l.autoSourceExecutiveId) ?? {
      executiveId: l.autoSourceExecutiveId,
      executiveName: l.autoSourceExecutive?.name ?? "-",
      channelName: l.autoSourceExecutive?.channel.nameTh ?? "-",
      leadCount: 0,
      bookingCount: 0,
      revenueThb: 0,
      closedLeadCount: 0,
      closeRatePercent: 0,
    };
    agg.leadCount += 1;
    if (isClosedLeadStatus(l.status)) agg.closedLeadCount += 1;
    executiveMap.set(l.autoSourceExecutiveId, agg);
  }
  for (const b of bookings) {
    const executiveId = b.lead.autoSourceExecutiveId;
    if (!executiveId) continue;
    const agg = executiveMap.get(executiveId) ?? {
      executiveId,
      executiveName: b.lead.autoSourceExecutive?.name ?? "-",
      channelName: b.lead.autoSourceExecutive?.channel.nameTh ?? "-",
      leadCount: 0,
      bookingCount: 0,
      revenueThb: 0,
      closedLeadCount: 0,
      closeRatePercent: 0,
    };
    agg.bookingCount += 1;
    if (isConfirmedBookingStatus(b.status)) agg.revenueThb += b.amountThb;
    executiveMap.set(executiveId, agg);
  }
  for (const agg of executiveMap.values()) {
    agg.closeRatePercent = agg.leadCount > 0 ? (agg.closedLeadCount / agg.leadCount) * 100 : 0;
  }

  // --- sales breakdown -------------------------------------------------------
  type SalesAgg = {
    salesId: string;
    salesName: string;
    leadCount: number;
    bookingCount: number;
    revenueThb: number;
    closedLeadCount: number;
    closeRatePercent: number;
  };
  const salesMap = new Map<string, SalesAgg>();
  for (const l of leads) {
    if (!l.assignedSalesId) continue;
    const agg = salesMap.get(l.assignedSalesId) ?? {
      salesId: l.assignedSalesId,
      salesName: l.assignedSales?.name ?? "-",
      leadCount: 0,
      bookingCount: 0,
      revenueThb: 0,
      closedLeadCount: 0,
      closeRatePercent: 0,
    };
    agg.leadCount += 1;
    if (isClosedLeadStatus(l.status)) agg.closedLeadCount += 1;
    salesMap.set(l.assignedSalesId, agg);
  }
  for (const b of bookings) {
    if (!b.assignedSalesId) continue;
    const agg = salesMap.get(b.assignedSalesId) ?? {
      salesId: b.assignedSalesId,
      salesName: b.assignedSales?.name ?? "-",
      leadCount: 0,
      bookingCount: 0,
      revenueThb: 0,
      closedLeadCount: 0,
      closeRatePercent: 0,
    };
    agg.bookingCount += 1;
    if (isConfirmedBookingStatus(b.status)) agg.revenueThb += b.amountThb;
    salesMap.set(b.assignedSalesId, agg);
  }
  for (const agg of salesMap.values()) {
    agg.closeRatePercent = agg.leadCount > 0 ? (agg.closedLeadCount / agg.leadCount) * 100 : 0;
  }

  const totalRevenueThb = sumConfirmedRevenue(bookings);
  const totalConfirmedBookings = bookings.filter((b) => isConfirmedBookingStatus(b.status)).length;

  return {
    totalLeads: leads.length,
    totalBookings: bookings.length,
    totalConfirmedBookings,
    totalRevenueThb,
    leadStatusBreakdown,
    bookingStatusBreakdown,
    channelBreakdown: Array.from(channelMap.values()).sort((a, b) => b.leadCount - a.leadCount),
    executiveBreakdown: Array.from(executiveMap.values()).sort(
      (a, b) => b.leadCount - a.leadCount
    ),
    salesBreakdown: Array.from(salesMap.values()).sort((a, b) => b.leadCount - a.leadCount),
  };
}
