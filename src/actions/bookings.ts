"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withAudit } from "@/lib/audit";
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

  const before = await loadBookingForMutation(id);
  if (!before) return { ok: false, error: "ไม่พบการจอง" };
  if (!canMutateBooking(session, before)) {
    return { ok: false, error: NO_PERMISSION_ERROR };
  }

  await withAudit({
    actorId: session.user.id,
    action: "UPDATE",
    entityType: "SurveyBooking",
    before,
    run: () =>
      prisma.surveyBooking.update({
        where: { id },
        data: { status: status as BookingStatus },
      }),
  });

  revalidatePath(`/admin/bookings/${id}`);
  revalidatePath("/admin/bookings");
  return { ok: true };
}

export async function updateGiftSent(
  id: string,
  giftSent: boolean
): Promise<ActionResult> {
  const session = await requireRole("ADMIN", "SALES");

  const before = await loadBookingForMutation(id);
  if (!before) return { ok: false, error: "ไม่พบการจอง" };
  if (!canMutateBooking(session, before)) {
    return { ok: false, error: NO_PERMISSION_ERROR };
  }

  await withAudit({
    actorId: session.user.id,
    action: "UPDATE",
    entityType: "SurveyBooking",
    before,
    run: () => prisma.surveyBooking.update({ where: { id }, data: { giftSent } }),
  });

  revalidatePath(`/admin/bookings/${id}`);
  revalidatePath("/admin/bookings");
  return { ok: true };
}

export async function assignBookingEngineer(
  id: string,
  engineerId: string
): Promise<ActionResult> {
  const session = await requireRole("ADMIN", "SALES");

  const before = await loadBookingForMutation(id);
  if (!before) return { ok: false, error: "ไม่พบการจอง" };
  if (!canMutateBooking(session, before)) {
    return { ok: false, error: NO_PERMISSION_ERROR };
  }

  const resolved = await resolveAssignee(engineerId);
  if ("error" in resolved) return { ok: false, error: resolved.error };

  await withAudit({
    actorId: session.user.id,
    action: "UPDATE",
    entityType: "SurveyBooking",
    before,
    run: () =>
      prisma.surveyBooking.update({
        where: { id },
        data: { assignedEngineerId: resolved.value },
      }),
  });

  revalidatePath(`/admin/bookings/${id}`);
  revalidatePath("/admin/bookings");
  return { ok: true };
}

export async function assignBookingSales(
  id: string,
  salesId: string
): Promise<ActionResult> {
  const session = await requireRole("ADMIN", "SALES");

  const before = await loadBookingForMutation(id);
  if (!before) return { ok: false, error: "ไม่พบการจอง" };
  if (!canMutateBooking(session, before)) {
    return { ok: false, error: NO_PERMISSION_ERROR };
  }

  const resolved = await resolveAssignee(salesId);
  if ("error" in resolved) return { ok: false, error: resolved.error };

  await withAudit({
    actorId: session.user.id,
    action: "UPDATE",
    entityType: "SurveyBooking",
    before,
    run: () =>
      prisma.surveyBooking.update({
        where: { id },
        data: { assignedSalesId: resolved.value },
      }),
  });

  revalidatePath(`/admin/bookings/${id}`);
  revalidatePath("/admin/bookings");
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

  const before = await loadBookingForMutation(bookingId);
  if (!before) return { ok: false, error: "ไม่พบการจอง" };
  if (!canMutateBooking(session, before)) {
    return { ok: false, error: NO_PERMISSION_ERROR };
  }

  await withAudit({
    actorId: session.user.id,
    action: "UPDATE",
    entityType: "SurveyBooking",
    before,
    run: () =>
      prisma.surveyBooking.update({
        where: { id: bookingId },
        data: { paymentStatus: status as PaymentStatus },
      }),
  });

  revalidatePath(`/admin/leads/${before.leadId}`);
  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/admin/bookings");
  return { ok: true };
}

const capacitySchema = z.object({
  maxPerDay: z.coerce.number().int().min(1).max(100),
  maxPerSlot: z.coerce.number().int().min(1).max(100),
});

export async function updateBookingCapacitySetting(
  formData: FormData
): Promise<ActionResult> {
  const session = await requireRole("ADMIN");

  const parsed = capacitySchema.safeParse({
    maxPerDay: formData.get("maxPerDay"),
    maxPerSlot: formData.get("maxPerSlot"),
  });
  if (!parsed.success) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };

  const before = await prisma.bookingCapacitySetting.findFirst();
  if (!before) return { ok: false, error: "ไม่พบการตั้งค่า" };

  await withAudit({
    actorId: session.user.id,
    action: "UPDATE",
    entityType: "BookingCapacitySetting",
    before,
    run: () =>
      prisma.bookingCapacitySetting.update({
        where: { id: before.id },
        data: parsed.data,
      }),
  });

  revalidatePath("/admin/settings");
  return { ok: true };
}
