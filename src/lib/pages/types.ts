/**
 * Pages CMS registry types
 * (docs/plans/pages-cms-data-model-migration-decision.md,
 *  docs/plans/pages-cms-routing-cache-impact-analysis.md).
 *
 * Trusted page identity lives in code only — never accept arbitrary
 * routes, row IDs, or revalidation targets from the client.
 */

export const PAGE_KEYS = [
  "home",
  "about",
  "services",
  "packages",
  "portfolio",
  "calculator",
] as const;

export type PageKey = (typeof PAGE_KEYS)[number];

export type ContentRollout = "legacy" | "pages";

/** Roles that may see/mutate Page Content (ownership decisions). */
export type PageContentRole = "ADMIN" | "SALES" | "MARKETING" | "EDITOR";

/** Roles that may see/mutate Page Properties (security guardrails). */
export type PagePropertiesRole = "ADMIN" | "MARKETING";

export type PageRegistryEntry = {
  key: PageKey;
  labelTh: string;
  /** Canonical admin Content path for this page. */
  adminContentPath: string;
  /** Locale-prefixed public paths this page's Content feeds. */
  publicPaths: readonly string[];
  /**
   * "legacy": public route still reads messages (or non-Pages ownership).
   * "pages": public route reads the DB Page Content aggregate.
   */
  contentRollout: ContentRollout;
  /**
   * Whether `/admin/pages/<key>` (or dedicated home route) serves a live
   * Content UI. Dormant keys fail closed via the dynamic `[page]` route.
   */
  adminContentEnabled: boolean;
  /**
   * Whether Pages Properties mutations may write for this key.
   * Sprint 5 (#68): home only.
   */
  propertiesAdminEnabled: boolean;
  supportsContent: boolean;
  supportsProperties: boolean;
  contentRoles: readonly PageContentRole[];
  propertiesRoles: readonly PagePropertiesRole[];
};
