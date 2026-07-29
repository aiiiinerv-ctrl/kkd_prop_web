// Thai display labels for report breakdown/export — mirrors the label maps
// already defined per-page in leads-client.tsx / bookings-client.tsx, but
// centralized here because both a server module (export-rows.ts) and a
// client component (reports-client.tsx) need the same strings.

export const LEAD_STATUS_LABELS_TH: Record<string, string> = {
  NEW: "ใหม่ รอมอบหมาย",
  ASSIGNED: "มอบหมายแล้ว",
  CONTACTED: "กำลังติดตาม",
  QUOTED: "เสนอราคาแล้ว",
  SIGNED: "เซ็นสัญญาแล้ว",
  INSTALLING: "กำลังติดตั้ง",
  COMPLETED: "เสร็จสิ้น",
  DISQUALIFIED: "ไม่มีคุณภาพ",
};

export const BOOKING_STATUS_LABELS_TH: Record<string, string> = {
  PENDING_CONFIRMATION: "รอยืนยัน",
  CONFIRMED: "ยืนยันแล้ว",
  PREPARED: "เตรียมอุปกรณ์แล้ว",
  SURVEYED: "สำรวจแล้ว",
  DESIGNED: "ออกแบบแล้ว",
  SIGNED: "เซ็นสัญญาแล้ว",
  CANCELLED: "ยกเลิก",
};

export const LEAD_TYPE_LABELS_TH: Record<string, string> = {
  QUOTE: "ขอใบเสนอราคา",
  SURVEY: "จองสำรวจ",
};
