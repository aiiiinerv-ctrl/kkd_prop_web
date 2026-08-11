import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

type MetaKey =
  | "home"
  | "about"
  | "services"
  | "packages"
  | "portfolio"
  | "booking"
  | "contact"
  | "calculator"
  | "testimonials";

/**
 * Localized title/description + hreflang alternates for a public page.
 *
 * `overrides` lets a page whose content is per-entity (a package detail page,
 * say) supply its own title/description while keeping one place that decides
 * how canonical, hreflang and OpenGraph are assembled. Pages without an entity
 * omit it and get the strings from `messages`, as before.
 */
export async function pageMetadata(
  locale: string,
  key: MetaKey,
  path: string,
  overrides?: { title?: string; description?: string }
): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "meta" });
  const title = overrides?.title || t(`${key}Title`);
  const description = overrides?.description || t(`${key}Desc`);
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
