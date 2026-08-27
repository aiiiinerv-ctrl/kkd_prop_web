"use server";

import { resolvePageKey, requirePagePropertiesAccess } from "@/lib/pages/access";
import { pagePropertiesFieldsSchema } from "@/lib/validations/page-properties";

/**
 * Pages Properties mutation seam (#67).
 * Sprint 4: validates key + RBAC + schema, then fails closed — no writes
 * until a page cutover sprint enables Properties for that key.
 */
export async function updatePageProperties(
  input: unknown,
): Promise<
  | { ok: true }
  | { ok: false; error: string }
  | { ok: false; error: "validation"; details: unknown }
> {
  const parsed = pagePropertiesFieldsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", details: parsed.error.flatten() };
  }

  const key = resolvePageKey(parsed.data.pageKey);
  if (!key) {
    return { ok: false, error: "invalid_key" };
  }

  const access = await requirePagePropertiesAccess(key);
  if (!access.ok) {
    return { ok: false, error: access.error };
  }

  // Disjoint writer partition: no Properties writer until cutover enables it.
  return { ok: false, error: "not_enabled" };
}
