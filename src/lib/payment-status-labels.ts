// Shared payment (slip verification) status labels + badge variants for
// PaymentStatus (see prisma/schema.prisma). Used by bookings-client.tsx,
// booking-detail-client.tsx and lead-detail-client.tsx so the same booking
// never shows a different word for the same status depending on which
// admin page you're on.

export type PaymentStatusVariant = "outline" | "default" | "destructive";

export const PAYMENT_STATUS_META: Record<
  string,
  { label: string; variant: PaymentStatusVariant }
> = {
  PENDING_REVIEW: { label: "รอตรวจสลิป", variant: "outline" },
  VERIFIED: { label: "ตรวจสลิปแล้ว", variant: "default" },
  REJECTED: { label: "สลิปไม่ผ่าน", variant: "destructive" },
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(PAYMENT_STATUS_META).map(([status, meta]) => [status, meta.label])
);
