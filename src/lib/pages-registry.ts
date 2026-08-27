/**
 * Code-owned Pages CMS registry
 * (docs/plans/pages-cms-data-model-migration-decision.md "Code-owned page
 * registry"). Trusted page identifiers, admin/public paths, and rollout
 * state live here and are never accepted from a client request — actions
 * derive their revalidation targets from this registry instead of trusting
 * a submitted path.
 *
 * Home CMS slice Sprint H2 (#62) adds the `home` entry only, per the owner
 * decision in docs/plans/home-cms-slice-implementation-sprints.md ("Pages
 * parent + Home child only" — About stays at /admin/content/about outside
 * this registry until its own sprint). The full six-key registry
 * (`home | about | services | packages | portfolio | calculator`) lands
 * page-by-page in later sprints.
 */
export type PageKey = "home";

export type PageRegistryEntry = {
  key: PageKey;
  labelTh: string;
  adminContentPath: string;
  /** Locale-prefixed public paths this page's Content feeds. */
  publicPaths: readonly string[];
  /**
   * "legacy": the public route still reads `src/messages/*.json` — admin
   * saves land in the database for staging/verify only.
   * "pages": the public route reads the database Page Content row (falling
   * back to the whole `messages` bundle only when the row itself is
   * missing — see docs/plans/home-cms-slice-edge-cases-research.md C1/L2).
   *
   * Home flipped to "pages" in Sprint H3 (#63) after local verification —
   * see docs/plans/home-cms-slice-implementation-sprints.md Sprint H3.
   * Rollback: set this back to "legacy" and redeploy the prior build; the
   * public reader in src/app/[locale]/home-content.tsx branches on this
   * flag, so no other code needs to change to revert.
   */
  contentRollout: "legacy" | "pages";
};

export const PAGE_REGISTRY: Record<PageKey, PageRegistryEntry> = {
  home: {
    key: "home",
    labelTh: "หน้าแรก",
    adminContentPath: "/admin/pages/home",
    publicPaths: ["/th", "/en"],
    contentRollout: "pages",
  },
};
