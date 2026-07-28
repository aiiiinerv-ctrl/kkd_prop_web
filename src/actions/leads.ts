"use server";

import { revalidatePath } from "next/cache";
import { withAudit } from "@/lib/audit";
import { canMutateLead, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { LeadStatus, PaymentStatus } from "@/generated/prisma/enums";
import type { ActionResult } from "./users";

const LEAD_STATUSES: LeadStatus[] = [
  "NEW",
  "ASSIGNED",
  "CONTACTED",
  "QUOTED",
  "SIGNED",
  "INSTALLING",
  "COMPLETED",
  "DISQUALIFIED",
];
const PAYMENT_STATUSES: PaymentStatus[] = ["PENDING_REVIEW", "VERIFIED", "REJECTED"];

const NO_PERMISSION_ERROR = "ไม่มีสิทธิ์แก้ไข lead นี้";

export async function updateLeadStatus(
  id: string,
  status: string
): Promise<ActionResult> {
  // FINANCE (read-only) and CHANNEL_EXECUTIVE (aggregate view only) never
  // reach the mutation layer; only ADMIN and SALES-on-their-own-lead do.
  const session = await requireRole("ADMIN", "SALES");
  if (!LEAD_STATUSES.includes(status as LeadStatus)) {
    return { ok: false, error: "สถานะไม่ถูกต้อง" };
  }

  const before = await prisma.lead.findUnique({ where: { id } });
  if (!before) return { ok: false, error: "ไม่พบ lead" };
  if (!canMutateLead(session, before)) {
    return { ok: false, error: NO_PERMISSION_ERROR };
  }

  await withAudit({
    actorId: session.user.id,
    action: "UPDATE",
    entityType: "Lead",
    before,
    run: () =>
      prisma.lead.update({
        where: { id },
        data: {
          status: status as LeadStatus,
          lastFollowUpAt: new Date(),
        },
      }),
  });

  revalidatePath(`/admin/leads/${id}`);
  revalidatePath("/admin");
  return { ok: true };
}

export async function updateLeadNotes(
  id: string,
  notes: string
): Promise<ActionResult> {
  const session = await requireRole("ADMIN", "SALES");

  const before = await prisma.lead.findUnique({ where: { id } });
  if (!before) return { ok: false, error: "ไม่พบ lead" };
  if (!canMutateLead(session, before)) {
    return { ok: false, error: NO_PERMISSION_ERROR };
  }

  await withAudit({
    actorId: session.user.id,
    action: "UPDATE",
    entityType: "Lead",
    before,
    run: () =>
      prisma.lead.update({
        where: { id },
        data: {
          notes: notes.trim().slice(0, 5000) || null,
          lastFollowUpAt: new Date(),
        },
      }),
  });

  revalidatePath(`/admin/leads/${id}`);
  return { ok: true };
}

// Reassigning which promo channel a lead is credited to is an ADMIN-only
// operation (it affects channel/sales attribution reporting), not part of
// the "update status / add follow-up notes" scope SALES gets.
export async function updateLeadSourceChannel(
  id: string,
  channelId: string
): Promise<ActionResult> {
  const session = await requireRole("ADMIN");

  const before = await prisma.lead.findUnique({ where: { id } });
  if (!before) return { ok: false, error: "ไม่พบ lead" };

  if (channelId) {
    const channel = await prisma.promoChannel.findUnique({ where: { id: channelId } });
    if (!channel) return { ok: false, error: "ไม่พบช่องทาง" };
  }

  await withAudit({
    actorId: session.user.id,
    action: "UPDATE",
    entityType: "Lead",
    before,
    run: () =>
      prisma.lead.update({
        where: { id },
        data: { sourceChannelId: channelId || null },
      }),
  });

  revalidatePath(`/admin/leads/${id}`);
  return { ok: true };
}

export async function updatePaymentStatus(
  bookingId: string,
  status: string
): Promise<ActionResult> {
  const session = await requireRole("ADMIN", "SALES");
  if (!PAYMENT_STATUSES.includes(status as PaymentStatus)) {
    return { ok: false, error: "สถานะไม่ถูกต้อง" };
  }

  const before = await prisma.surveyBooking.findUnique({ where: { id: bookingId } });
  if (!before) return { ok: false, error: "ไม่พบการจอง" };

  if (session.user.role === "SALES") {
    const lead = await prisma.lead.findUnique({
      where: { id: before.leadId },
      select: { assignedSalesId: true },
    });
    if (!lead || lead.assignedSalesId !== session.user.id) {
      return { ok: false, error: NO_PERMISSION_ERROR };
    }
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
  return { ok: true };
}
