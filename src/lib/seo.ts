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
  | "calculator";

/** Localized title/description + hreflang alternates for a public page. */
export async function pageMetadata(
  locale: string,
  key: MetaKey,
  path: string
): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: t(`${key}Title`),
    description: t(`${key}Desc`),
    alternates: {
      canonical: `${SITE_URL}/${locale}${path}`,
      languages: {
        th: `${SITE_URL}/th${path}`,
        en: `${SITE_URL}/en${path}`,
        "x-default": `${SITE_URL}/th${path}`,
      },
    },
    openGraph: {
      title: t(`${key}Title`),
      description: t(`${key}Desc`),
      locale: locale === "en" ? "en_US" : "th_TH",
      siteName: "KKD PROPERTY CO., LTD.",
      type: "website",
    },
  };
}
