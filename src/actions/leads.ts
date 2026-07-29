"use server";

import { revalidatePath } from "next/cache";
import { withAudit } from "@/lib/audit";
import { canMutateLead, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { LeadStatus } from "@/generated/prisma/enums";
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

const NO_PERMISSION_ERROR = "ไม่มีสิทธิ์แก้ไข lead นี้";

/**
 * Validates an optional AdminUser id used for sales assignment: must exist,
 * be active, and hold role SALES — stricter than bookings.ts's
 * resolveAssignee() (which allows any active AdminUser, since booking
 * engineer/sales assignment isn't role-constrained the same way). Kept local
 * to this file rather than shared, per the different role constraint.
 */
async function resolveSalesAssignee(
  salesId: string
): Promise<{ error: string } | { value: string | null }> {
  if (!salesId) return { value: null };
  const user = await prisma.adminUser.findUnique({ where: { id: salesId } });
  if (!user || !user.isActive || user.role !== "SALES") {
    return { error: "ไม่พบผู้ใช้ที่เลือก หรือไม่ใช่เซลส์ที่ใช้งานอยู่" };
  }
  return { value: salesId };
}

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

  // lastFollowUpAt intentionally not touched here — a status change is not
  // necessarily a follow-up contact; it's only recorded when notes are
  // logged via updateLeadNotes() below.

  // closedAt ("วันที่ปิดการขาย", PDF §4.5): set only the first time a lead
  // enters SIGNED (= "เซ็นสัญญาแล้ว", the pipeline step that means "closed"
  // per §4.3 — not COMPLETED, which is project handover, a later step).
  // Left untouched on further transitions (INSTALLING/COMPLETED) so the date
  // stays pinned to when the deal actually closed. If a lead somehow re-enters
  // SIGNED after being moved out of it (no state-machine guard exists on this
  // action), closedAt is overwritten with the new close date.
  const closedAt =
    (status as LeadStatus) === "SIGNED" && before.status !== "SIGNED" ? new Date() : undefined;

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
          ...(closedAt ? { closedAt } : {}),
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

// Assigning "which salesperson owns this lead" is ownership/attribution
// (it drives getLeadScopeFilter()/canMutateLead() visibility), not day-to-day
// follow-up work — kept ADMIN-only, mirroring updateLeadSourceChannel above
// rather than the SALES-can-reassign pattern used for booking assignment.
export async function assignLeadSales(
  id: string,
  salesId: string
): Promise<ActionResult> {
  const session = await requireRole("ADMIN");

  const before = await prisma.lead.findUnique({ where: { id } });
  if (!before) return { ok: false, error: "ไม่พบ lead" };

  const resolved = await resolveSalesAssignee(salesId);
  if ("error" in resolved) return { ok: false, error: resolved.error };

  await withAudit({
    actorId: session.user.id,
    action: "UPDATE",
    entityType: "Lead",
    before,
    run: () =>
      prisma.lead.update({
        where: { id },
        data: { assignedSalesId: resolved.value },
      }),
  });

  revalidatePath(`/admin/leads/${id}`);
  revalidatePath("/admin/leads");
  return { ok: true };
}
