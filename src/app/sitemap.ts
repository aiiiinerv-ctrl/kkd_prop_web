import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { getPublishedPackages } from "@/lib/content";
import { SITE_URL } from "@/lib/seo";

const PATHS = [
  "",
  "/about",
  "/services",
  "/packages",
  "/portfolio",
  "/booking",
  "/contact",
  "/calculator",
  "/testimonials",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries = PATHS.flatMap((path) =>
    routing.locales.map((locale) => ({
      url: `${SITE_URL}/${locale}${path}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.8,
      alternates: {
        languages: Object.fromEntries(
          routing.locales.map((l) => [l, `${SITE_URL}/${l}${path}`])
        ),
      },
    }))
  );

  // Package detail pages were missing entirely — they existed and were linked
  // from /packages, but nothing declared them. lastModified is the package's
  // own updatedAt rather than "now", so the timestamp means something.
  const packages = await getPublishedPackages(routing.defaultLocale);
  const packageEntries = packages.flatMap((pkg) =>
    routing.locales.map((locale) => ({
      url: `${SITE_URL}/${locale}/packages/${pkg.slug}`,
      lastModified: pkg.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
      alternates: {
        languages: Object.fromEntries(
          routing.locales.map((l) => [l, `${SITE_URL}/${l}/packages/${pkg.slug}`])
        ),
      },
    }))
  );

  return [...staticEntries, ...packageEntries];
}
