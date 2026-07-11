"use server";

import { revalidatePath } from "next/cache";
import { withAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { LeadStatus, PaymentStatus } from "@/generated/prisma/enums";
import type { ActionResult } from "./users";

const LEAD_STATUSES: LeadStatus[] = ["NEW", "CONTACTED", "QUOTED", "WON", "LOST"];
const PAYMENT_STATUSES: PaymentStatus[] = ["PENDING_REVIEW", "VERIFIED", "REJECTED"];

export async function updateLeadStatus(
  id: string,
  status: string
): Promise<ActionResult> {
  const session = await requireAdmin();
  if (!LEAD_STATUSES.includes(status as LeadStatus)) {
    return { ok: false, error: "สถานะไม่ถูกต้อง" };
  }

  const before = await prisma.lead.findUnique({ where: { id } });
  if (!before) return { ok: false, error: "ไม่พบ lead" };

  await withAudit({
    actorId: session.user.id,
    action: "UPDATE",
    entityType: "Lead",
    before,
    run: () =>
      prisma.lead.update({ where: { id }, data: { status: status as LeadStatus } }),
  });

  revalidatePath(`/admin/leads/${id}`);
  revalidatePath("/admin");
  return { ok: true };
}

export async function updateLeadNotes(
  id: string,
  notes: string
): Promise<ActionResult> {
  const session = await requireAdmin();

  const before = await prisma.lead.findUnique({ where: { id } });
  if (!before) return { ok: false, error: "ไม่พบ lead" };

  await withAudit({
    actorId: session.user.id,
    action: "UPDATE",
    entityType: "Lead",
    before,
    run: () =>
      prisma.lead.update({
        where: { id },
        data: { notes: notes.trim().slice(0, 5000) || null },
      }),
  });

  revalidatePath(`/admin/leads/${id}`);
  return { ok: true };
}

export async function updateLeadSourceChannel(
  id: string,
  channelId: string
): Promise<ActionResult> {
  const session = await requireAdmin();

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
  const session = await requireAdmin();
  if (!PAYMENT_STATUSES.includes(status as PaymentStatus)) {
    return { ok: false, error: "สถานะไม่ถูกต้อง" };
  }

  const before = await prisma.surveyBooking.findUnique({ where: { id: bookingId } });
  if (!before) return { ok: false, error: "ไม่พบการจอง" };

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
