import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getPageSeo } from "@/lib/content";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * All valid PageSeo keys — same 10 values as the meta.* message namespace.
 * Derive the union, zod enum, and seed loop from this single source of truth
 * (same pattern as ROLES in src/lib/enums.ts).
 */
export const META_KEYS = [
  "home",
  "about",
  "services",
  "packages",
  "portfolio",
  "booking",
  "contact",
  "calculator",
  "testimonials",
  "cookiePolicy",
] as const;

export type MetaKey = (typeof META_KEYS)[number];

/**
 * Localized title/description + hreflang alternates for a public page.
 *
 * Resolution order (first non-empty value wins):
 *   1. `overrides` — caller-supplied (e.g. a package detail page)
 *   2. DB row in `PageSeo` — editable from /admin/settings
 *   3. messages `meta.*` — static fallback so the site is never blank
 *
 * `overrides` lets a page whose content is per-entity (a package detail page,
 * say) supply its own title/description while keeping one place that decides
 * how canonical, hreflang and OpenGraph are assembled. Pages without an entity
 * omit it and get the strings from DB or messages, as appropriate.
 */
export async function pageMetadata(
  locale: string,
  key: MetaKey,
  path: string,
  overrides?: { title?: string; description?: string }
): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "meta" });

  // DB row is the preferred source; messages is the guaranteed fallback.
  const dbSeo = overrides ? null : await getPageSeo(key, locale);

  const title =
    overrides?.title ||
    (dbSeo?.title || null) ||
    t(`${key}Title`);

  const description =
    overrides?.description ||
    (dbSeo?.description || null) ||
    t(`${key}Desc`);

  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/${locale}${path}`,
      languages: {
        th: `${SITE_URL}/th${path}`,
        en: `${SITE_URL}/en${path}`,
        "x-default": `${SITE_URL}/th${path}`,
      },
    },
    openGraph: {
      title,
      description,
      locale: locale === "en" ? "en_US" : "th_TH",
      siteName: "KKD PROPERTY CO., LTD.",
      type: "website",
    },
  };
}
