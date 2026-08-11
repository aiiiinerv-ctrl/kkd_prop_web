import type {
  BookingStatus,
  ChannelType,
  BuildingType,
  LeadStatus,
  LeadType,
  PaymentStatus,
  TimeSlot,
} from "@/generated/prisma/enums";
import type { AuditEntityType } from "@/lib/audit";

/**
 * The Thai words the admin UI shows for each schema enum value. One map per
 * enum, in one file, so the same status can't read differently depending on
 * which page you're on — which is what happened when these lived per-page.
 *
 * Each map is typed `Record<Enum, string>`, so adding a value to
 * schema.prisma breaks the build here until it has a label. That is the point
 * of this file; don't loosen these to `Record<string, string>`.
 *
 * The enum imports are type-only, so nothing generated is pulled into a client
 * bundle even though admin client components import these maps. Admin is
 * Thai-only — public-facing strings live in `src/messages/{th,en}.json` and
 * follow the TH/EN parity rule instead.
 */

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: "ใหม่ รอมอบหมาย",
  ASSIGNED: "มอบหมายแล้ว",
  CONTACTED: "กำลังติดตาม",
  QUOTED: "เสนอราคาแล้ว",
  SIGNED: "เซ็นสัญญาแล้ว",
  INSTALLING: "กำลังติดตั้ง",
  COMPLETED: "เสร็จสิ้น",
  DISQUALIFIED: "ไม่มีคุณภาพ",
};

export const LEAD_TYPE_LABELS: Record<LeadType, string> = {
  QUOTE: "ขอใบเสนอราคา",
  SURVEY: "จองสำรวจ",
};

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  PENDING_CONFIRMATION: "รอยืนยัน",
  CONFIRMED: "ยืนยันแล้ว",
  PREPARED: "เตรียมอุปกรณ์แล้ว",
  SURVEYED: "สำรวจแล้ว",
  DESIGNED: "ออกแบบแล้ว",
  SIGNED: "เซ็นสัญญาแล้ว",
  CANCELLED: "ยกเลิก",
};

export const TIME_SLOT_LABELS: Record<TimeSlot, string> = {
  MORNING: "เช้า",
  AFTERNOON: "บ่าย",
};

/** With the hours spelled out — for detail views and notification text, where the slot alone isn't enough to act on. */
export const TIME_SLOT_RANGE_LABELS: Record<TimeSlot, string> = {
  MORNING: "เช้า 9:00 - 12:00",
  AFTERNOON: "บ่าย 13:00 - 17:00",
};

export const BUILDING_TYPE_LABELS: Record<BuildingType, string> = {
  RESIDENTIAL: "บ้านพักอาศัย",
  COMMERCIAL: "เชิงพาณิชย์ / ออฟฟิศ",
  INDUSTRIAL: "อุตสาหกรรม / โกดัง",
  OTHER: "อื่นๆ",
};

export const CHANNEL_TYPE_LABELS: Record<ChannelType, string> = {
  INDIVIDUAL: "บุคคล",
  COMPANY: "บริษัท",
  PLATFORM: "แพลตฟอร์มออนไลน์",
};

export type PaymentStatusVariant = "outline" | "default" | "destructive";

/**
 * Payment status carries a badge variant as well as a word, so the same slip
 * state looks the same on every admin page, not just reads the same.
 */
export const PAYMENT_STATUS_META: Record<
  PaymentStatus,
  { label: string; variant: PaymentStatusVariant }
> = {
  PENDING_REVIEW: { label: "รอตรวจสลิป", variant: "outline" },
  VERIFIED: { label: "ตรวจสลิปแล้ว", variant: "default" },
  REJECTED: { label: "สลิปไม่ผ่าน", variant: "destructive" },
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> =
  Object.fromEntries(
    Object.entries(PAYMENT_STATUS_META).map(([status, meta]) => [status, meta.label])
  ) as Record<PaymentStatus, string>;

/**
 * Entity names as shown in the audit trail. Typed against AuditEntityType, so
 * an entity added to the audited-mutation module can't quietly render as its
 * raw class name here — which is what three of these were doing.
 */
export const AUDIT_ENTITY_LABELS: Record<AuditEntityType, string> = {
  AdminUser: "ผู้ใช้ระบบ",
  BookingCapacitySetting: "การตั้งค่าคิวสำรวจ",
  ChannelExecutive: "ผู้ดำเนินการช่องทาง",
  Lead: "Lead",
  Package: "แพ็กเกจ",
  PaymentSettings: "การตั้งค่าการชำระเงิน",
  PortfolioProject: "ผลงาน",
  PromoChannel: "ช่องทางโปรโมท",
  Service: "บริการ",
  SurveyBooking: "การนัดสำรวจ",
  Testimonial: "รีวิวลูกค้า",
};

/**
 * Not a schema enum: `Lead.interestedSystems` is a Json array of these codes,
 * written by the public quote form. Kept here so every enum-ish code the admin
 * renders has one home.
 */
export const INTERESTED_SYSTEM_LABELS: Record<string, string> = {
  ON_GRID: "ออนกริด (On-Grid)",
  HYBRID: "ไฮบริด (Hybrid)",
  OFF_GRID: "ออฟกริด (Off-Grid)",
};
