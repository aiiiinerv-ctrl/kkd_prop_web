import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getPageSeo } from "@/lib/content";
import { storage } from "@/lib/storage";

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
  "sitemap",
] as const;

export type MetaKey = (typeof META_KEYS)[number];

/**
 * Localized title/description + hreflang alternates for a public page.
 *
 * Resolution order (first non-empty value wins):
 *   1. `overrides` — caller-supplied (e.g. a package detail page)
 *   2. DB row in `PageSeo` — editable from Pages Properties (six keys) or Settings (legacy four)
 *   3. messages `meta.*` — static fallback so the site is never blank
 */
export async function pageMetadata(
  locale: string,
  key: MetaKey,
  path: string,
  overrides?: { title?: string; description?: string }
): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "meta" });

  const dbSeo = overrides ? null : await getPageSeo(key, locale);

  const title =
    overrides?.title ||
    (dbSeo?.title || null) ||
    t(`${key}Title`);

  const description =
    overrides?.description ||
    (dbSeo?.description || null) ||
    t(`${key}Desc`);

  const ogTitle = dbSeo?.ogTitle || title;
  const ogDescription = dbSeo?.ogDescription || description;

  const defaultCanonicalPath = `/${locale}${path}`;
  const canonicalPath = dbSeo?.canonicalPath || defaultCanonicalPath;
  const canonicalUrl = canonicalPath.startsWith("http")
    ? canonicalPath
    : `${SITE_URL}${canonicalPath.startsWith("/") ? "" : "/"}${canonicalPath}`;

  const robotsIndex = dbSeo?.robotsIndex ?? true;
  const robotsFollow = dbSeo?.robotsFollow ?? true;

  const ogImages = dbSeo?.ogImageKey
    ? [{ url: storage.publicUrl(dbSeo.ogImageKey) }]
    : undefined;

  return {
    title,
    description,
    robots: {
      index: robotsIndex,
      follow: robotsFollow,
    },
    alternates: {
      canonical: canonicalUrl,
      languages: {
        th: `${SITE_URL}/th${path}`,
        en: `${SITE_URL}/en${path}`,
        "x-default": `${SITE_URL}/th${path}`,
      },
    },
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      locale: locale === "en" ? "en_US" : "th_TH",
      siteName: "KKD PROPERTY CO., LTD.",
      type: "website",
      ...(ogImages ? { images: ogImages } : {}),
    },
  };
}
