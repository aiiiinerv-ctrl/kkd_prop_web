import type { LeadNotification } from "./types";

const BUILDING_LABELS: Record<string, string> = {
  RESIDENTIAL: "บ้านพักอาศัย",
  COMMERCIAL: "เชิงพาณิชย์",
  INDUSTRIAL: "อุตสาหกรรม",
};

const SLOT_LABELS: Record<string, string> = {
  MORNING: "เช้า 9:00-12:00",
  AFTERNOON: "บ่าย 13:00-17:00",
};

export function leadAdminUrl(leadId: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return `${base}/admin/leads/${leadId}`;
}

export function formatLeadSummary(event: LeadNotification): {
  title: string;
  lines: string[];
} {
  const { lead, booking } = event;
  const title =
    event.kind === "QUOTE"
      ? "🔔 ลูกค้าใหม่ขอใบเสนอราคา"
      : "📅 นัดสำรวจหน้างานใหม่ (ชำระ 199฿)";

  const lines = [
    `ชื่อ: ${lead.name}`,
    `โทร: ${lead.phone}`,
    ...(lead.lineId ? [`LINE: ${lead.lineId}`] : []),
    `จังหวัด: ${lead.province}`,
    `ประเภทอาคาร: ${BUILDING_LABELS[lead.buildingType] ?? lead.buildingType}`,
    ...(lead.avgMonthlyBill != null
      ? [`ค่าไฟเฉลี่ย: ${lead.avgMonthlyBill.toLocaleString()} บาท/เดือน`]
      : []),
    ...(booking
      ? [
          `ที่อยู่: ${booking.address}`,
          `วันนัด: ${booking.preferredDate.toLocaleDateString("th-TH", { dateStyle: "long" })}`,
          `ช่วงเวลา: ${SLOT_LABELS[booking.timeSlot] ?? booking.timeSlot}`,
          `สลิปโอนเงิน: รอตรวจสอบ`,
        ]
      : []),
    ``,
    `ดูรายละเอียด: ${leadAdminUrl(lead.id)}`,
  ];

  return { title, lines };
}
