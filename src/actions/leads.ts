"use server";

import { auditedEntity } from "@/lib/audit";
import { canMutateLead, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LEAD_STATUSES } from "@/lib/enums";
import type { LeadStatus } from "@/generated/prisma/enums";
import type { ActionResult } from "./users";

const NO_PERMISSION_ERROR = "ไม่มีสิทธิ์แก้ไข lead นี้";

// The revalidate list is the union of what the individual mutations below used
// to refresh — refreshing a page whose data didn't change is harmless, and one
// declaration per entity is what keeps "which pages does a Lead feed" in a
// single readable place.
const leads = auditedEntity({
  entityType: "Lead",
  model: (client) => client.lead,
  snapshot: "full",
  revalidate: (lead) => [`/admin/leads/${lead.id}`, "/admin/leads", "/admin"],
});

/**
 * Loads a Lead for a permission decision that has to happen before the
 * mutation. The module re-reads the row inside its transaction, so the audit
 * snapshot is still the row as of the write — this read only feeds
 * canMutateLead().
 *
 * That split leaves a narrow window: assignedSalesId could change between this
 * read and the write, so a SALES user's permission is decided on a row that
 * may be a round-trip stale. Accepted — reassignment is ADMIN-only, so nothing
 * a SALES user can trigger widens their own access — but don't move the guard
 * further from the write without revisiting it.
 */
async function loadLeadForGuard(id: string) {
  return prisma.lead.findUnique({ where: { id } });
}

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

  const guard = await loadLeadForGuard(id);
  if (!guard) return { ok: false, error: "ไม่พบ lead" };
  if (!canMutateLead(session, guard)) {
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
  const updated = await leads.update(id, (before) => ({
    status: status as LeadStatus,
    ...((status as LeadStatus) === "SIGNED" && before.status !== "SIGNED"
      ? { closedAt: new Date() }
      : {}),
  }));
  if (!updated) return { ok: false, error: "ไม่พบ lead" };

  return { ok: true };
}

export async function updateLeadNotes(
  id: string,
  notes: string
): Promise<ActionResult> {
  const session = await requireRole("ADMIN", "SALES");

  const guard = await loadLeadForGuard(id);
  if (!guard) return { ok: false, error: "ไม่พบ lead" };
  if (!canMutateLead(session, guard)) {
    return { ok: false, error: NO_PERMISSION_ERROR };
  }

  const updated = await leads.update(id, {
    internalNotes: notes.trim().slice(0, 5000) || null,
    lastFollowUpAt: new Date(),
  });
  if (!updated) return { ok: false, error: "ไม่พบ lead" };

  return { ok: true };
}

// Reassigning which promo channel a lead is credited to is an ADMIN-only
// operation (it affects channel/sales attribution reporting), not part of
// the "update status / add follow-up notes" scope SALES gets.
export async function updateLeadSourceChannel(
  id: string,
  channelId: string
): Promise<ActionResult> {
  await requireRole("ADMIN");

  if (channelId) {
    const channel = await prisma.promoChannel.findUnique({ where: { id: channelId } });
    if (!channel) return { ok: false, error: "ไม่พบช่องทาง" };
  }

  const updated = await leads.update(id, { sourceChannelId: channelId || null });
  if (!updated) return { ok: false, error: "ไม่พบ lead" };

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
  await requireRole("ADMIN");

  const resolved = await resolveSalesAssignee(salesId);
  if ("error" in resolved) return { ok: false, error: resolved.error };

  const updated = await leads.update(id, { assignedSalesId: resolved.value });
  if (!updated) return { ok: false, error: "ไม่พบ lead" };

  return { ok: true };
}
