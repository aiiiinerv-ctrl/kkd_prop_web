import { INTERESTED_SYSTEM_LABELS, TIME_SLOT_RANGE_LABELS } from "@/lib/enum-labels";
import type { LeadNotification } from "./types";

const BUILDING_LABELS: Record<string, string> = {
  RESIDENTIAL: "บ้านพักอาศัย",
  COMMERCIAL: "เชิงพาณิชย์",
  INDUSTRIAL: "อุตสาหกรรม",
  OTHER: "อื่นๆ",
};

// customerMessage can run long (it's a free-text <textarea>) — a notification
// is meant to be skimmed on a phone, not to reproduce the full form. Cut at
// ~300 chars; the full text is always one tap away via leadAdminUrl().
const CUSTOMER_MESSAGE_MAX_LENGTH = 300;

function truncate(text: string, maxLength: number): string {
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
}

export function leadAdminUrl(leadId: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return `${base}/admin/leads/${leadId}`;
}

export function formatLeadSummary(event: LeadNotification): {
  title: string;
  lines: string[];
} {
  const { lead, booking, channelName } = event;
  const title =
    event.kind === "QUOTE"
      ? "🔔 ลูกค้าใหม่ขอใบเสนอราคา"
      : "📅 นัดสำรวจหน้างานใหม่ (ชำระ 199฿)";

  const interestedSystems = Array.isArray(lead.interestedSystems)
    ? (lead.interestedSystems as string[])
    : [];

  const lines = [
    `ชื่อ: ${lead.name}`,
    `โทร: ${lead.phone}`,
    ...(lead.lineId ? [`LINE: ${lead.lineId}`] : []),
    ...(lead.referrerName ? [`ผู้แนะนำ: ${lead.referrerName}`] : []),
    `จังหวัด: ${lead.province}`,
    `ประเภทอาคาร: ${BUILDING_LABELS[lead.buildingType] ?? lead.buildingType}`,
    ...(lead.buildingType === "OTHER" && lead.buildingTypeOtherText
      ? [`ประเภทอาคาร (ระบุเอง): ${lead.buildingTypeOtherText}`]
      : []),
    ...(lead.avgMonthlyBill != null
      ? [`ค่าไฟเฉลี่ย: ${lead.avgMonthlyBill.toLocaleString()} บาท/เดือน`]
      : []),
    ...(interestedSystems.length > 0
      ? [
          `ระบบที่สนใจ: ${interestedSystems
            .map((s) => INTERESTED_SYSTEM_LABELS[s] ?? s)
            .join(", ")}`,
        ]
      : []),
    ...(channelName ? [`ช่องทางที่รู้จักเรา: ${channelName}`] : []),
    ...(lead.customerMessage
      ? [`ข้อความจากลูกค้า: ${truncate(lead.customerMessage, CUSTOMER_MESSAGE_MAX_LENGTH)}`]
      : []),
    ...(booking
      ? [
          `เลขที่การจอง: ${booking.bookingNumber}`,
          `ที่อยู่: ${booking.address}`,
          `วันนัด: ${booking.preferredDate.toLocaleDateString("th-TH", { dateStyle: "long" })}`,
          `ช่วงเวลา: ${TIME_SLOT_RANGE_LABELS[booking.timeSlot] ?? booking.timeSlot}`,
          `สลิปโอนเงิน: รอตรวจสอบ`,
        ]
      : []),
    ``,
    `ดูรายละเอียด: ${leadAdminUrl(lead.id)}`,
  ];

  return { title, lines };
}
