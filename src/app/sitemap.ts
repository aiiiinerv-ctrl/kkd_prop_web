import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { collectSitemapPaths } from "@/lib/sitemap/public-tree";
import { SITE_URL } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const paths = await collectSitemapPaths();

  return paths.flatMap(({ path, lastModified, changeFrequency, priority }) =>
    routing.locales.map((locale) => ({
      url: `${SITE_URL}/${locale}${path === "/" ? "" : path}`,
      lastModified: lastModified ?? new Date(),
      changeFrequency,
      priority,
      alternates: {
        languages: Object.fromEntries(
          routing.locales.map((l) => [l, `${SITE_URL}/${l}${path === "/" ? "" : path}`])
        ),
      },
    }))
  );
}
