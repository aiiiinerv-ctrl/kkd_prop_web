import { cache } from "react";
import {
  getPublishedPackages,
  getPublishedServices,
  getPublishedTestimonials,
} from "@/lib/content";
import { prisma } from "@/lib/db";
import { META_KEYS, type MetaKey } from "@/lib/seo";
import { defaultSitemapConfig, DEFAULT_NAV_LABELS, parseSitemapConfig, sectionLabel } from "./defaults";
import {
  SECTION_META,
  SITEMAP_SECTION_IDS,
  type SitemapConfig,
  type SitemapGroup,
  type SitemapPathEntry,
  type SitemapSectionId,
} from "./types";

type NavLabels = Record<SitemapSectionId, string>;

async function loadIndexableMetaKeys(): Promise<Set<MetaKey>> {
  const rows = await prisma.pageSeo.findMany({
    where: { key: { in: META_KEYS as unknown as string[] } },
    select: { key: true, robotsIndex: true },
  });
  const indexable = new Set<MetaKey>();
  for (const key of META_KEYS) {
    const row = rows.find((r) => r.key === key);
    if (!row || row.robotsIndex !== false) {
      indexable.add(key);
    }
  }
  // HTML sitemap page is always indexable when the section is enabled.
  indexable.add("sitemap");
  return indexable;
}

function isSectionIndexable(id: SitemapSectionId, indexable: Set<MetaKey>): boolean {
  return indexable.has(SECTION_META[id].metaKey);
}

async function buildDynamicChildren(
  id: SitemapSectionId,
  locale: string
): Promise<{ label: string; href: string }[]> {
  if (id === "services") {
    const services = await getPublishedServices(locale);
    const systems = services.filter((s) => s.kind === "SYSTEM");
    const maintenance = services.filter((s) => s.kind === "MAINTENANCE");
    return [...systems, ...maintenance].map((s) => ({
      label: s.title,
      href: "/services",
    }));
  }

  if (id === "packages") {
    const packages = await getPublishedPackages(locale);
    return packages.map((p) => ({
      label: p.name,
      href: `/packages/${p.slug}`,
    }));
  }

  return [];
}

export const getSitemapConfig = cache(async (): Promise<SitemapConfig> => {
  const row = await prisma.siteSettings.findFirst({
    select: { sitemapConfigJson: true },
  });
  if (!row?.sitemapConfigJson) return defaultSitemapConfig();
  return parseSitemapConfig(row.sitemapConfigJson);
});

/**
 * Builds the grouped HTML sitemap tree for one locale.
 * Shared source of truth for the public page and admin preview.
 */
export async function buildPublicSitemapTree(
  locale: string,
  config?: SitemapConfig | null,
  navLabels?: Partial<NavLabels>
): Promise<SitemapGroup[]> {
  const resolvedConfig = config ?? (await getSitemapConfig());
  const indexable = await loadIndexableMetaKeys();
  const testimonials = await getPublishedTestimonials(locale);
  const hasTestimonials = testimonials.length > 0;

  const fallbackLabels = Object.fromEntries(
    SITEMAP_SECTION_IDS.map((id) => [
      id,
      navLabels?.[id] ??
        DEFAULT_NAV_LABELS[locale === "en" ? "en" : "th"][id],
    ])
  ) as NavLabels;

  const groups: SitemapGroup[] = [];

  for (const section of resolvedConfig.sections) {
    if (!section.enabled) continue;
    if (section.id === "testimonials" && !hasTestimonials) continue;
    if (!isSectionIndexable(section.id, indexable)) continue;

    const { path } = SECTION_META[section.id];
    const label = sectionLabel(section, locale, fallbackLabels);
    const children = await buildDynamicChildren(section.id, locale);

    groups.push({
      id: section.id,
      label,
      href: path,
      children,
    });
  }

  return groups;
}

/**
 * Flat indexable public paths for XML sitemap generation (locale-agnostic paths).
 * Package detail paths include lastModified from the row.
 */
export async function collectSitemapPaths(): Promise<SitemapPathEntry[]> {
  const indexable = await loadIndexableMetaKeys();
  const config = await getSitemapConfig();
  const testimonials = await getPublishedTestimonials("th");
  const hasTestimonials = testimonials.length > 0;
  const packages = await getPublishedPackages("th");

  const entries: SitemapPathEntry[] = [];

  for (const section of config.sections) {
    if (!section.enabled) continue;
    if (section.id === "testimonials" && !hasTestimonials) continue;
    if (!isSectionIndexable(section.id, indexable)) continue;

    const { path, metaKey } = SECTION_META[section.id];
    entries.push({
      path,
      changeFrequency: "weekly",
      priority: path === "/" ? 1 : 0.8,
    });

    if (section.id === "packages") {
      for (const pkg of packages) {
        entries.push({
          path: `/packages/${pkg.slug}`,
          lastModified: pkg.updatedAt,
          changeFrequency: "monthly",
          priority: 0.7,
        });
      }
    }
  }

  // Human-readable sitemap page — always listed when indexable.
  if (indexable.has("sitemap")) {
    entries.push({
      path: "/sitemap",
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  return entries;
}
