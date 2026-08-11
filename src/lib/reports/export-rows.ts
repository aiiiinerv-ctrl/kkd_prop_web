import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { buildLeadWhere, effectiveChannel, isConfirmedBookingStatus, type ReportFilters } from "./aggregate";
import { LEAD_STATUS_LABELS, LEAD_TYPE_LABELS } from "@/lib/enum-labels";

/**
 * Row-level export data. Scope = all Lead types (QUOTE + SURVEY, decision
 * #3) via a LEFT JOIN-equivalent `include` on `booking` — fields tied to a
 * booking (address / surveyed / gift-sent) fall back to "-" for QUOTE leads
 * that never booked a survey.
 *
 * "ประเภทระบบ" (interestedSystems) closes the gap Sprint 5 intentionally
 * skipped — Lead.interestedSystems was added in Sprint 6 (quote-form-only
 * "ระบบที่สนใจ" multi-select). SURVEY-type leads never set it, shown as "-".
 */
export type ExportRow = {
  name: string;
  phone: string;
  address: string;
  leadType: string;
  interestedSystems: string;
  channel: string;
  executive: string;
  sales: string;
  status: string;
  createdAt: string;
  closedAt: string;
  surveyed: string;
  giftSent: string;
};

const INTERESTED_SYSTEM_LABELS_TH: Record<string, string> = {
  ON_GRID: "On-Grid",
  HYBRID: "Hybrid",
  OFF_GRID: "Off-Grid",
};

export const EXPORT_COLUMNS: { key: keyof ExportRow; header: string; width: number }[] = [
  { key: "name", header: "ชื่อ", width: 24 },
  { key: "phone", header: "เบอร์โทร", width: 16 },
  { key: "address", header: "ที่อยู่", width: 32 },
  { key: "leadType", header: "ประเภท Lead", width: 16 },
  // Position per PDF §4.5: directly after "ประเภท Lead".
  { key: "interestedSystems", header: "ประเภทระบบ", width: 20 },
  { key: "channel", header: "ช่องทาง", width: 20 },
  { key: "executive", header: "ผู้ดำเนินการ", width: 20 },
  { key: "sales", header: "เซลส์", width: 18 },
  { key: "status", header: "สถานะ", width: 18 },
  { key: "createdAt", header: "วันที่", width: 16 },
  // "วันที่ปิดการขาย" (PDF §4.5) — position verified against the PDF field
  // list: between "วันที่ส่งฟอร์ม" (createdAt) and "เข้าสำรวจแล้วหรือไม่"
  // (surveyed). Sourced from Lead.closedAt, "-" when null (Sprint 5b Task 6).
  { key: "closedAt", header: "วันที่ปิดการขาย", width: 16 },
  { key: "surveyed", header: "เข้าสำรวจแล้วหรือไม่", width: 18 },
  { key: "giftSent", header: "ส่งของขวัญแล้วหรือไม่", width: 20 },
];

const SURVEYED_BOOKING_STATUSES = ["SURVEYED", "DESIGNED", "SIGNED"] as const;

export async function getExportRows(
  filters: ReportFilters,
  scope: { lead: Prisma.LeadWhereInput }
): Promise<ExportRow[]> {
  const where: Prisma.LeadWhereInput = { AND: [scope.lead, buildLeadWhere(filters)] };

  const leads = await prisma.lead.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      name: true,
      phone: true,
      type: true,
      status: true,
      interestedSystems: true,
      createdAt: true,
      closedAt: true,
      sourceChannelId: true,
      sourceChannel: { select: { nameTh: true } },
      autoSourceChannelId: true,
      autoSourceChannel: { select: { nameTh: true } },
      autoSourceExecutive: { select: { name: true } },
      assignedSales: { select: { name: true } },
      booking: { select: { address: true, status: true, giftSent: true } },
    },
  });

  return leads.map((lead) => {
    const channel = effectiveChannel(lead);
    const booking = lead.booking;
    return {
      name: lead.name,
      phone: lead.phone,
      address: booking?.address ?? "-",
      leadType: LEAD_TYPE_LABELS[lead.type] ?? lead.type,
      interestedSystems:
        Array.isArray(lead.interestedSystems) && lead.interestedSystems.length > 0
          ? (lead.interestedSystems as string[])
              .map((s) => INTERESTED_SYSTEM_LABELS_TH[s] ?? s)
              .join(", ")
          : "-",
      channel: channel.name,
      executive: lead.autoSourceExecutive?.name ?? "-",
      sales: lead.assignedSales?.name ?? "-",
      status: LEAD_STATUS_LABELS[lead.status] ?? lead.status,
      createdAt: lead.createdAt.toLocaleDateString("th-TH"),
      closedAt: lead.closedAt ? lead.closedAt.toLocaleDateString("th-TH") : "-",
      surveyed: !booking
        ? "-"
        : (SURVEYED_BOOKING_STATUSES as readonly string[]).includes(booking.status)
          ? "เข้าสำรวจแล้ว"
          : "ยังไม่เข้าสำรวจ",
      giftSent: !booking ? "-" : booking.giftSent ? "ส่งแล้ว" : "ยังไม่ส่ง",
    };
  });
}

// Re-exported so route handlers only need one import for both "is this
// booking confirmed" (revenue) and row-level export logic.
export { isConfirmedBookingStatus };
