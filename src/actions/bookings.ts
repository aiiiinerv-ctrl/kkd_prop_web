"use server";

import { z } from "zod";
import { auditedEntity } from "@/lib/audit";
import { canMutateBooking, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { BookingStatus, PaymentStatus } from "@/generated/prisma/enums";
import type { ActionResult } from "./users";

const BOOKING_STATUSES: BookingStatus[] = [
  "PENDING_CONFIRMATION",
  "CONFIRMED",
  "PREPARED",
  "SURVEYED",
  "DESIGNED",
  "SIGNED",
  "CANCELLED",
];
const PAYMENT_STATUSES: PaymentStatus[] = ["PENDING_REVIEW", "VERIFIED", "REJECTED"];

const NO_PERMISSION_ERROR = "ไม่มีสิทธิ์แก้ไขการจองนี้";

// The revalidate list is the union of what the individual mutations below used
// to refresh, including the parent lead's page (payment status shows there).
const bookings = auditedEntity({
  entityType: "SurveyBooking",
  model: (client) => client.surveyBooking,
  snapshot: "full",
  revalidate: (booking) => [
    `/admin/bookings/${booking.id}`,
    "/admin/bookings",
    `/admin/leads/${booking.leadId}`,
  ],
});

/**
 * Loads a booking for the permission decision that has to happen before the
 * mutation. The module re-reads the row inside its transaction, so the audit
 * snapshot is still the row as of the write — this read only feeds
 * canMutateBooking().
 *
 * Same narrow staleness window as loadLeadForGuard() in leads.ts, and accepted
 * for the same reason: assignedSalesId is ADMIN-only to change.
 */
async function loadBookingForMutation(id: string) {
  return prisma.surveyBooking.findUnique({ where: { id } });
}

/** Validates an optional AdminUser id used for assignment: must exist and be active. */
async function resolveAssignee(
  userId: string
): Promise<{ error: string } | { value: string | null }> {
  if (!userId) return { value: null };
  const user = await prisma.adminUser.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) {
    return { error: "ไม่พบผู้ใช้ที่เลือก หรือถูกปิดการใช้งาน" };
  }
  return { value: userId };
}

export async function updateBookingStatus(
  id: string,
  status: string
): Promise<ActionResult> {
  // FINANCE (read-only) and CHANNEL_EXECUTIVE never reach the mutation
  // layer; only ADMIN and SALES-on-their-own-booking do.
  const session = await requireRole("ADMIN", "SALES");
  if (!BOOKING_STATUSES.includes(status as BookingStatus)) {
    return { ok: false, error: "สถานะไม่ถูกต้อง" };
  }

  const guard = await loadBookingForMutation(id);
  if (!guard) return { ok: false, error: "ไม่พบการจอง" };
  if (!canMutateBooking(session, guard)) {
    return { ok: false, error: NO_PERMISSION_ERROR };
  }

  const updated = await bookings.update(id, { status: status as BookingStatus });
  if (!updated) return { ok: false, error: "ไม่พบการจอง" };

  return { ok: true };
}

export async function updateGiftSent(
  id: string,
  giftSent: boolean
): Promise<ActionResult> {
  const session = await requireRole("ADMIN", "SALES");

  const guard = await loadBookingForMutation(id);
  if (!guard) return { ok: false, error: "ไม่พบการจอง" };
  if (!canMutateBooking(session, guard)) {
    return { ok: false, error: NO_PERMISSION_ERROR };
  }

  const updated = await bookings.update(id, { giftSent });
  if (!updated) return { ok: false, error: "ไม่พบการจอง" };

  return { ok: true };
}

export async function assignBookingEngineer(
  id: string,
  engineerId: string
): Promise<ActionResult> {
  const session = await requireRole("ADMIN", "SALES");

  const guard = await loadBookingForMutation(id);
  if (!guard) return { ok: false, error: "ไม่พบการจอง" };
  if (!canMutateBooking(session, guard)) {
    return { ok: false, error: NO_PERMISSION_ERROR };
  }

  const resolved = await resolveAssignee(engineerId);
  if ("error" in resolved) return { ok: false, error: resolved.error };

  const updated = await bookings.update(id, { assignedEngineerId: resolved.value });
  if (!updated) return { ok: false, error: "ไม่พบการจอง" };

  return { ok: true };
}

export async function assignBookingSales(
  id: string,
  salesId: string
): Promise<ActionResult> {
  const session = await requireRole("ADMIN", "SALES");

  const guard = await loadBookingForMutation(id);
  if (!guard) return { ok: false, error: "ไม่พบการจอง" };
  if (!canMutateBooking(session, guard)) {
    return { ok: false, error: NO_PERMISSION_ERROR };
  }

  const resolved = await resolveAssignee(salesId);
  if ("error" in resolved) return { ok: false, error: resolved.error };

  const updated = await bookings.update(id, { assignedSalesId: resolved.value });
  if (!updated) return { ok: false, error: "ไม่พบการจอง" };

  return { ok: true };
}

// Moved from src/actions/leads.ts (sprint 3): payment status belongs to the
// booking, not the lead, so it lives alongside the other booking mutations
// now. Behavior change from the original: permission is now checked via
// canMutateBooking() (booking.assignedSalesId) rather than re-deriving the
// same rule from the parent lead's assignedSalesId — the two fields are
// independent, and every other booking mutation here already uses this rule.
export async function updatePaymentStatus(
  bookingId: string,
  status: string
): Promise<ActionResult> {
  const session = await requireRole("ADMIN", "SALES");
  if (!PAYMENT_STATUSES.includes(status as PaymentStatus)) {
    return { ok: false, error: "สถานะไม่ถูกต้อง" };
  }

  const guard = await loadBookingForMutation(bookingId);
  if (!guard) return { ok: false, error: "ไม่พบการจอง" };
  if (!canMutateBooking(session, guard)) {
    return { ok: false, error: NO_PERMISSION_ERROR };
  }

  const updated = await bookings.update(bookingId, {
    paymentStatus: status as PaymentStatus,
  });
  if (!updated) return { ok: false, error: "ไม่พบการจอง" };

  return { ok: true };
}

const capacitySchema = z.object({
  maxPerDay: z.coerce.number().int().min(1).max(100),
  maxPerSlot: z.coerce.number().int().min(1).max(100),
});

const capacitySettings = auditedEntity({
  entityType: "BookingCapacitySetting",
  model: (client) => client.bookingCapacitySetting,
  snapshot: "full",
  revalidate: () => ["/admin/settings"],
});

export async function updateBookingCapacitySetting(
  formData: FormData
): Promise<ActionResult> {
  await requireRole("ADMIN");

  const parsed = capacitySchema.safeParse({
    maxPerDay: formData.get("maxPerDay"),
    maxPerSlot: formData.get("maxPerSlot"),
  });
  if (!parsed.success) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };

  // Single-row settings table: find the row's id, then mutate it by id like
  // any other entity.
  const existing = await prisma.bookingCapacitySetting.findFirst({
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "ไม่พบการตั้งค่า" };

  const updated = await capacitySettings.update(existing.id, parsed.data);
  if (!updated) return { ok: false, error: "ไม่พบการตั้งค่า" };

  return { ok: true };
}
