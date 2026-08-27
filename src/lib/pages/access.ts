import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Role } from "@/lib/auth";
import { contentRevalidatePaths, getPage, isPageKey, propertiesRevalidatePaths } from "./registry";
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
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "forbidden" };

  const user = await prisma.adminUser.findUnique({
    where: { id: session.user.id },
    select: { role: true, isActive: true },
  });
  if (!user?.isActive) return { ok: false, error: "forbidden" };
  if (!(entry.contentRoles as readonly string[]).includes(user.role)) {
    return { ok: false, error: "forbidden" };
  }
  return { ok: true, role: user.role as Role };
}

/**
 * Properties mutation gate — fresh DB role (not JWT alone) per
 * pages-cms-properties-security-guardrails.md. Writes only when
 * `propertiesAdminEnabled` (#68: home).
 */
export async function requirePagePropertiesAccess(
  pageKey: PageKey,
): Promise<{ ok: true; role: Role } | PagesAccessError> {
  const entry = getPage(pageKey);
  if (!entry.supportsProperties || !entry.propertiesAdminEnabled) {
    return { ok: false, error: "not_found" };
  }
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "forbidden" };

  const user = await prisma.adminUser.findUnique({
    where: { id: session.user.id },
    select: { role: true, isActive: true },
  });
  if (!user?.isActive) return { ok: false, error: "forbidden" };
  if (!(entry.propertiesRoles as readonly string[]).includes(user.role)) {
    return { ok: false, error: "forbidden" };
  }
  return { ok: true, role: user.role as Role };
}

/** Trusted revalidation list for Content saves — never from FormData. */
export function pageContentRevalidateTargets(pageKey: PageKey): readonly string[] {
  return contentRevalidatePaths(pageKey);
}

export function pagePropertiesRevalidateTargets(pageKey: PageKey): readonly string[] {
  return propertiesRevalidatePaths(pageKey);
}
