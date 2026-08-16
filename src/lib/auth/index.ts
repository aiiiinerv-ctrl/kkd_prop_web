import NextAuth from "next-auth";
import { redirect } from "next/navigation";
import { authConfig } from "./config";
import type { Prisma } from "@/generated/prisma/client";

export const { auth, handlers, signIn, signOut } = NextAuth(authConfig);

export type Role =
  | "ADMIN"
  | "SALES"
  | "FINANCE"
  | "CHANNEL_EXECUTIVE"
  | "MARKETING"
  | "EDITOR"
  | "EXECUTIVE";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  /** Set only for CHANNEL_EXECUTIVE-role accounts linked to a ChannelExecutive. */
  linkedChannelExecutiveId: string | null;
  /** The PromoChannel id of the linked executive, denormalized onto the session for scoping. */
  linkedChannelId: string | null;
};

/** Redirects to the admin login page when there is no active session. */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user) {
    redirect("/admin/login");
  }
  return session;
}

/**
 * Requires the session to hold one of `roles`; non-matching roles are
 * bounced to /admin. Pass a single role (`requireRole("ADMIN")`) or several
 * (`requireRole("ADMIN", "FINANCE")`) for pages/actions open to more than
 * one role.
 */
export async function requireRole(...roles: Role[]) {
  const session = await requireAdmin();
  if (!roles.includes(session.user.role)) {
    redirect("/admin");
  }
  return session;
}

/** Same as `requireRole` but as an explicit array — used where the role list is computed. */
export async function requireAnyRole(roles: Role[]) {
  return requireRole(...roles);
}

type SessionLike = {
  user: Pick<SessionUser, "id" | "role" | "linkedChannelExecutiveId" | "linkedChannelId">;
};

/**
 * The single source of truth for "which leads can this session see". Every
 * lead read (list + detail) must intersect its Prisma `where` with this
 * filter — never re-derive the scoping rule per call site.
 *
 * - ADMIN / FINANCE: unrestricted (`{}`).
 * - SALES: only leads assigned to them.
 * - CHANNEL_EXECUTIVE: only leads attributed (auto or manually) to their
 *   linked executive/channel. An unlinked CHANNEL_EXECUTIVE account sees
 *   nothing (fail closed, never fail open).
 */
export function getLeadScopeFilter(
  session: SessionLike
): Prisma.LeadWhereInput {
  const { role, id, linkedChannelExecutiveId, linkedChannelId } = session.user;

  switch (role) {
    case "ADMIN":
    case "FINANCE":
      return {};
    case "SALES":
      return { assignedSalesId: id };
    case "CHANNEL_EXECUTIVE": {
      const or: Prisma.LeadWhereInput[] = [];
      if (linkedChannelExecutiveId) {
        or.push({ autoSourceExecutiveId: linkedChannelExecutiveId });
      }
      if (linkedChannelId) {
        or.push(
          { autoSourceChannelId: linkedChannelId },
          { sourceChannelId: linkedChannelId }
        );
      }
      // Fail closed: no link configured => no leads visible.
      return or.length > 0 ? { OR: or } : { id: "__no_channel_link__" };
    }
    case "MARKETING":
    case "EDITOR":
    case "EXECUTIVE":
      return {};
  }
}

/** Same scoping rule, expressed against SurveyBooking (joins to Lead for channel attribution). */
export function getBookingScopeFilter(
  session: SessionLike
): Prisma.SurveyBookingWhereInput {
  const { role, id, linkedChannelExecutiveId, linkedChannelId } = session.user;

  switch (role) {
    case "ADMIN":
    case "FINANCE":
      return {};
    case "SALES":
      return { assignedSalesId: id };
    case "CHANNEL_EXECUTIVE": {
      const or: Prisma.LeadWhereInput[] = [];
      if (linkedChannelExecutiveId) {
        or.push({ autoSourceExecutiveId: linkedChannelExecutiveId });
      }
      if (linkedChannelId) {
        or.push(
          { autoSourceChannelId: linkedChannelId },
          { sourceChannelId: linkedChannelId }
        );
      }
      return or.length > 0 ? { lead: { OR: or } } : { id: "__no_channel_link__" };
    }
    case "EDITOR":
      return {};
    case "MARKETING":
    case "EXECUTIVE":
      // Fail closed: page/API gate is the primary control (task #7/#8 —
      // MARKETING and EXECUTIVE have no /admin/bookings access at all), this
      // is a defense-in-depth backstop only.
      return { id: "__no_booking_access__" };
  }
}

/**
 * Mutation-side guard: can this session write to a specific lead? Always
 * re-checked at the mutation layer (never trust that a UI control was
 * hidden) — a SALES session may only write leads assigned to them; FINANCE
 * and CHANNEL_EXECUTIVE never get lead-write access.
 */
export function canMutateLead(
  session: SessionLike,
  lead: { assignedSalesId: string | null }
): boolean {
  const { role, id } = session.user;
  if (role === "ADMIN") return true;
  if (role === "SALES") return lead.assignedSalesId === id;
  return false;
}

/** Same rule for SurveyBooking. */
export function canMutateBooking(
  session: SessionLike,
  booking: { assignedSalesId: string | null }
): boolean {
  const { role, id } = session.user;
  if (role === "ADMIN") return true;
  if (role === "SALES") return booking.assignedSalesId === id;
  return false;
}

// interestedPackageSlug/interestedServiceSlug (added #18 chunk 2) are
// link-click context, not something the customer typed — deliberately left
// out of this list, same treatment as sourceChannelId/province/buildingType.
const LEAD_PII_FIELDS = [
  "name",
  "phone",
  "lineId",
  "customerMessage",
  "internalNotes",
] as const;

/**
 * Strips customer PII (name/phone/LINE ID/customer message/internal notes)
 * from a lead payload before it leaves the server for a
 * CHANNEL_EXECUTIVE-scoped request. This must run on the API/action response
 * shape, not just be hidden in the UI — the fields must not be present in
 * the JSON at all.
 */
export function redactLeadPII<T extends Record<string, unknown>>(
  lead: T
): Omit<T, (typeof LEAD_PII_FIELDS)[number]> {
  const clone = { ...lead };
  for (const field of LEAD_PII_FIELDS) {
    delete clone[field];
  }
  return clone;
}

/** Can create/update services, packages, portfolio projects, and testimonials. */
export function canManageContent(role: Role): boolean {
  return role === "ADMIN" || role === "SALES" || role === "MARKETING" || role === "EDITOR";
}

/** Can toggle `isPublished` on content (create as published, or flip it on update). */
export function canPublishContent(role: Role): boolean {
  return role === "ADMIN" || role === "SALES" || role === "MARKETING";
}

/** Can delete services, packages, portfolio projects, and testimonials. */
export function canDeleteContent(role: Role): boolean {
  return role === "ADMIN" || role === "SALES" || role === "MARKETING";
}

/** Can create/update/delete promo channels (not the executives attached to them). */
export function canManageChannels(role: Role): boolean {
  return role === "ADMIN" || role === "MARKETING";
}

/** Can create/update/delete channel executives. */
export function canManageChannelExecutives(role: Role): boolean {
  return role === "ADMIN" || role === "MARKETING" || role === "EDITOR";
}

/** Can view /admin/reports and its summary API. */
export function canViewReports(role: Role): boolean {
  return (
    role === "ADMIN" ||
    role === "FINANCE" ||
    role === "MARKETING" ||
    role === "EDITOR" ||
    role === "EXECUTIVE"
  );
}

/** Can export /admin/reports data as xlsx. */
export function canExportReports(role: Role): boolean {
  return role === "ADMIN" || role === "FINANCE" || role === "MARKETING" || role === "EDITOR";
}
