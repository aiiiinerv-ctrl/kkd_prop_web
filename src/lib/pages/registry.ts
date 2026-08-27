import type { PageKey, PageRegistryEntry } from "./types";
import { PAGE_KEYS } from "./types";

const CONTENT_ROLES = ["ADMIN", "SALES", "MARKETING", "EDITOR"] as const;
const PROPERTIES_ROLES = ["ADMIN", "MARKETING"] as const;

/**
 * Code-owned six-page registry. Home pilot cutover left
 * `contentRollout: "pages"`; other keys stay `legacy` until their sprint.
 * Only `home` has `adminContentEnabled` today (#67 / Sprint 4).
 */
export const PAGE_REGISTRY: Record<PageKey, PageRegistryEntry> = {
  home: {
    key: "home",
    labelTh: "หน้าแรก",
    adminContentPath: "/admin/pages/home",
    publicPaths: ["/th", "/en"],
    contentRollout: "pages",
    adminContentEnabled: true,
    propertiesAdminEnabled: true,
    supportsContent: true,
    supportsProperties: true,
    contentRoles: CONTENT_ROLES,
    propertiesRoles: PROPERTIES_ROLES,
  },
  about: {
    key: "about",
    labelTh: "เกี่ยวกับเรา",
    adminContentPath: "/admin/pages/about",
    publicPaths: ["/th/about", "/en/about"],
    contentRollout: "pages",
    adminContentEnabled: true,
    propertiesAdminEnabled: true,
    supportsContent: true,
    supportsProperties: true,
    contentRoles: CONTENT_ROLES,
    propertiesRoles: PROPERTIES_ROLES,
  },
  services: {
    key: "services",
    labelTh: "บริการ",
    adminContentPath: "/admin/pages/services",
    publicPaths: ["/th/services", "/en/services"],
    contentRollout: "legacy",
    adminContentEnabled: false,
    propertiesAdminEnabled: false,
    supportsContent: true,
    supportsProperties: true,
    contentRoles: CONTENT_ROLES,
    propertiesRoles: PROPERTIES_ROLES,
  },
  packages: {
    key: "packages",
    labelTh: "แพ็กเกจ",
    adminContentPath: "/admin/pages/packages",
    publicPaths: ["/th/packages", "/en/packages"],
    contentRollout: "legacy",
    adminContentEnabled: false,
    propertiesAdminEnabled: false,
    supportsContent: true,
    supportsProperties: true,
    contentRoles: CONTENT_ROLES,
    propertiesRoles: PROPERTIES_ROLES,
  },
  portfolio: {
    key: "portfolio",
    labelTh: "ผลงาน",
    adminContentPath: "/admin/pages/portfolio",
    publicPaths: ["/th/portfolio", "/en/portfolio"],
    contentRollout: "legacy",
    adminContentEnabled: false,
    propertiesAdminEnabled: false,
    supportsContent: true,
    supportsProperties: true,
    contentRoles: CONTENT_ROLES,
    propertiesRoles: PROPERTIES_ROLES,
  },
  calculator: {
    key: "calculator",
    labelTh: "คำนวณโซลาร์",
    adminContentPath: "/admin/pages/calculator",
    publicPaths: ["/th/calculator", "/en/calculator"],
    contentRollout: "legacy",
    adminContentEnabled: false,
    propertiesAdminEnabled: false,
    supportsContent: true,
    supportsProperties: true,
    contentRoles: CONTENT_ROLES,
    propertiesRoles: PROPERTIES_ROLES,
  },
};

export function isPageKey(value: unknown): value is PageKey {
  return typeof value === "string" && (PAGE_KEYS as readonly string[]).includes(value);
}

export function getPage(key: PageKey): PageRegistryEntry {
  return PAGE_REGISTRY[key];
}

/** Revalidation targets for a Page Content save (public locales + admin). */
export function contentRevalidatePaths(key: PageKey): readonly string[] {
  const entry = PAGE_REGISTRY[key];
  return [...entry.publicPaths, entry.adminContentPath];
}

/** Revalidation targets for a Page Properties save. */
export function propertiesRevalidatePaths(key: PageKey): readonly string[] {
  const entry = PAGE_REGISTRY[key];
  return [...entry.publicPaths, entry.adminContentPath, "/admin/settings", "/sitemap.xml"];
}

/** Pages with a live admin Content surface (sidebar / deep-link safe). */
export function adminEnabledPages(): PageRegistryEntry[] {
  return PAGE_KEYS.map((k) => PAGE_REGISTRY[k]).filter((e) => e.adminContentEnabled);
}

/** Writer partition: exactly one of legacy | pages per key (by construction). */
export function rolloutPartition(): {
  legacy: PageKey[];
  pages: PageKey[];
} {
  const legacy: PageKey[] = [];
  const pages: PageKey[] = [];
  for (const key of PAGE_KEYS) {
    if (PAGE_REGISTRY[key].contentRollout === "pages") pages.push(key);
    else legacy.push(key);
  }
  return { legacy, pages };
}
