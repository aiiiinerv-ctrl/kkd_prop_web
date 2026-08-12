import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { buildLeadWhere, effectiveChannel, isConfirmedBookingStatus, type ReportFilters } from "./aggregate";
import {
  BOOKING_STATUS_LABELS,
  BUILDING_TYPE_LABELS,
  LEAD_STATUS_LABELS,
  LEAD_TYPE_LABELS,
  PAYMENT_STATUS_LABELS,
  TIME_SLOT_LABELS,
} from "@/lib/enum-labels";

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

const LOCALE_LABELS_TH: Record<string, string> = { th: "ไทย", en: "อังกฤษ" };

/**
 * "ข้อมูลเต็ม" sheet (issue #19, gap G5) — every Lead/SurveyBooking field the
 * customer or the system captured, except `paymentSlipKey` (a path into
 * `private/slips/`, no analytical value, and a live access path into a
 * payment slip — see issue #12 decision #2). Deliberately separate from
 * `ExportRow`/`EXPORT_COLUMNS`/`getExportRows()` above, which stay untouched:
 * the "รายงาน" sheet's 13 columns are a contract with the client per
 * requirements PDF §4.5.
 */
export type FullExportRow = {
  name: string;
  phone: string;
  lineId: string;
  referrerName: string;
  province: string;
  buildingType: string;
  avgMonthlyBill: string;
  interestedSystems: string;
  customerMessage: string;
  internalNotes: string;
  locale: string;
  leadType: string;
  leadStatus: string;
  interestedPackageSlug: string;
  interestedServiceSlug: string;
  channel: string;
  executive: string;
  sales: string;
  createdAt: string;
  closedAt: string;
  lastFollowUpAt: string;
  bookingNumber: string;
  address: string;
  preferredDate: string;
  timeSlot: string;
  amountThb: string;
  paymentStatus: string;
  bookingStatus: string;
  giftSent: string;
};

export const FULL_EXPORT_COLUMNS: { key: keyof FullExportRow; header: string; width: number }[] = [
  { key: "name", header: "ชื่อ", width: 24 },
  { key: "phone", header: "เบอร์โทร", width: 16 },
  { key: "lineId", header: "LINE ID", width: 18 },
  { key: "referrerName", header: "ชื่อผู้แนะนำ", width: 20 },
  { key: "province", header: "จังหวัด", width: 16 },
  { key: "buildingType", header: "ประเภทอาคาร", width: 24 },
  { key: "avgMonthlyBill", header: "ค่าไฟเฉลี่ยต่อเดือน (บาท)", width: 20 },
  { key: "interestedSystems", header: "ประเภทระบบ", width: 20 },
  { key: "customerMessage", header: "ข้อความจากลูกค้า", width: 32 },
  { key: "internalNotes", header: "บันทึกภายใน", width: 32 },
  { key: "locale", header: "ภาษา", width: 10 },
  { key: "leadType", header: "ประเภท Lead", width: 16 },
  { key: "leadStatus", header: "สถานะ Lead", width: 18 },
  { key: "interestedPackageSlug", header: "แพ็กเกจที่สนใจ", width: 20 },
  { key: "interestedServiceSlug", header: "บริการที่สนใจ", width: 20 },
  { key: "channel", header: "ช่องทาง", width: 20 },
  { key: "executive", header: "ผู้ดำเนินการ", width: 20 },
  { key: "sales", header: "เซลส์", width: 18 },
  { key: "createdAt", header: "วันที่ส่งฟอร์ม", width: 16 },
  { key: "closedAt", header: "วันที่ปิดการขาย", width: 16 },
  { key: "lastFollowUpAt", header: "วันที่ติดตามล่าสุด", width: 18 },
  { key: "bookingNumber", header: "เลขที่การจอง", width: 16 },
  { key: "address", header: "ที่อยู่", width: 32 },
  { key: "preferredDate", header: "วันที่นัดสำรวจ", width: 16 },
  { key: "timeSlot", header: "ช่วงเวลานัด", width: 14 },
  { key: "amountThb", header: "ยอดชำระ (บาท)", width: 16 },
  { key: "paymentStatus", header: "สถานะการชำระเงิน", width: 18 },
  { key: "bookingStatus", header: "สถานะการนัดสำรวจ", width: 18 },
  { key: "giftSent", header: "ส่งของขวัญแล้วหรือไม่", width: 20 },
];

export async function getFullExportRows(
  filters: ReportFilters,
  scope: { lead: Prisma.LeadWhereInput }
): Promise<FullExportRow[]> {
  const where: Prisma.LeadWhereInput = { AND: [scope.lead, buildLeadWhere(filters)] };

  const leads = await prisma.lead.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      name: true,
      phone: true,
      lineId: true,
      referrerName: true,
      province: true,
      buildingType: true,
      buildingTypeOtherText: true,
      avgMonthlyBill: true,
      interestedSystems: true,
      customerMessage: true,
      internalNotes: true,
      locale: true,
      type: true,
      status: true,
      interestedPackageSlug: true,
      interestedServiceSlug: true,
      createdAt: true,
      closedAt: true,
      lastFollowUpAt: true,
      sourceChannelId: true,
      sourceChannel: { select: { nameTh: true } },
      autoSourceChannelId: true,
      autoSourceChannel: { select: { nameTh: true } },
      autoSourceExecutive: { select: { name: true } },
      assignedSales: { select: { name: true } },
      booking: {
        select: {
          bookingNumber: true,
          address: true,
          preferredDate: true,
          timeSlot: true,
          amountThb: true,
          paymentStatus: true,
          status: true,
          giftSent: true,
        },
      },
    },
  });

  return leads.map((lead) => {
    const channel = effectiveChannel(lead);
    const booking = lead.booking;
    return {
      name: lead.name,
      phone: lead.phone,
      lineId: lead.lineId ?? "-",
      referrerName: lead.referrerName ?? "-",
      province: lead.province,
      buildingType:
        lead.buildingType === "OTHER" && lead.buildingTypeOtherText
          ? `${BUILDING_TYPE_LABELS[lead.buildingType]} (${lead.buildingTypeOtherText})`
          : (BUILDING_TYPE_LABELS[lead.buildingType] ?? lead.buildingType),
      avgMonthlyBill: lead.avgMonthlyBill != null ? lead.avgMonthlyBill.toLocaleString() : "-",
      interestedSystems:
        Array.isArray(lead.interestedSystems) && lead.interestedSystems.length > 0
          ? (lead.interestedSystems as string[])
              .map((s) => INTERESTED_SYSTEM_LABELS_TH[s] ?? s)
              .join(", ")
          : "-",
      customerMessage: lead.customerMessage ?? "-",
      internalNotes: lead.internalNotes ?? "-",
      locale: LOCALE_LABELS_TH[lead.locale] ?? lead.locale,
      leadType: LEAD_TYPE_LABELS[lead.type] ?? lead.type,
      leadStatus: LEAD_STATUS_LABELS[lead.status] ?? lead.status,
      interestedPackageSlug: lead.interestedPackageSlug ?? "-",
      interestedServiceSlug: lead.interestedServiceSlug ?? "-",
      channel: channel.name,
      executive: lead.autoSourceExecutive?.name ?? "-",
      sales: lead.assignedSales?.name ?? "-",
      createdAt: lead.createdAt.toLocaleDateString("th-TH"),
      closedAt: lead.closedAt ? lead.closedAt.toLocaleDateString("th-TH") : "-",
      lastFollowUpAt: lead.lastFollowUpAt ? lead.lastFollowUpAt.toLocaleDateString("th-TH") : "-",
      bookingNumber: booking?.bookingNumber ?? "-",
      address: booking?.address ?? "-",
      preferredDate: booking?.preferredDate ? booking.preferredDate.toLocaleDateString("th-TH") : "-",
      timeSlot: booking?.timeSlot ? (TIME_SLOT_LABELS[booking.timeSlot] ?? booking.timeSlot) : "-",
      amountThb: booking?.amountThb != null ? booking.amountThb.toLocaleString() : "-",
      paymentStatus: booking?.paymentStatus
        ? (PAYMENT_STATUS_LABELS[booking.paymentStatus] ?? booking.paymentStatus)
        : "-",
      bookingStatus: booking?.status ? (BOOKING_STATUS_LABELS[booking.status] ?? booking.status) : "-",
      giftSent: !booking ? "-" : booking.giftSent ? "ส่งแล้ว" : "ยังไม่ส่ง",
    };
  });
}
