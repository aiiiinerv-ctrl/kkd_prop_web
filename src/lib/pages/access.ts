import { requireRole, type Role } from "@/lib/auth";
import { contentRevalidatePaths, getPage, isPageKey } from "./registry";
import type { PageKey } from "./types";

export type PagesAccessError =
  | { ok: false; error: "forbidden" }
  | { ok: false; error: "not_found" };

/**
 * Resolve a trusted page key from untrusted input. Never returns a
 * registry entry for unknown keys — callers must not guess paths.
 */
export function resolvePageKey(raw: unknown): PageKey | null {
  return isPageKey(raw) ? raw : null;
}

/**
 * Content mutation gate: session role must be in the page's contentRoles
 * and the admin Content surface must be enabled (Sprint 4: home only).
 */
export async function requirePageContentAccess(
  pageKey: PageKey,
): Promise<{ ok: true; role: Role } | PagesAccessError> {
  const entry = getPage(pageKey);
  if (!entry.adminContentEnabled || !entry.supportsContent) {
    return { ok: false, error: "not_found" };
  }
  const session = await requireRole(...entry.contentRoles);
  const role = session.user.role;
  if (!(entry.contentRoles as readonly string[]).includes(role)) {
    return { ok: false, error: "forbidden" };
  }
  return { ok: true, role };
}

/**
 * Properties mutation gate — ADMIN/MARKETING only.
 * Fresh requireRole; per-page Properties UI lands in cutover sprints.
 */
export async function requirePagePropertiesAccess(
  pageKey: PageKey,
): Promise<{ ok: true; role: Role } | PagesAccessError> {
  const entry = getPage(pageKey);
  if (!entry.supportsProperties) {
    return { ok: false, error: "not_found" };
  }
  const session = await requireRole(...entry.propertiesRoles);
  const role = session.user.role;
  if (!(entry.propertiesRoles as readonly string[]).includes(role)) {
    return { ok: false, error: "forbidden" };
  }
  return { ok: true, role };
}

/** Trusted revalidation list for Content saves — never from FormData. */
export function pageContentRevalidateTargets(pageKey: PageKey): readonly string[] {
  return contentRevalidatePaths(pageKey);
}
