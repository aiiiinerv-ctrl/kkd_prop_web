import { sitemapConfigSchema } from "@/lib/validations/sitemap-settings";
import {
  SITEMAP_SECTION_IDS,
  type SitemapConfig,
  type SitemapConfigSection,
  type SitemapSectionId,
} from "./types";

/** Static fallbacks when caller does not pass nav labels (admin preview). */
export const DEFAULT_NAV_LABELS: Record<"th" | "en", Record<SitemapSectionId, string>> = {
  th: {
    home: "หน้าแรก",
    about: "เกี่ยวกับเรา",
    services: "บริการ",
    packages: "แพ็กเกจ",
    portfolio: "ผลงาน",
    testimonials: "รีวิวลูกค้า",
    calculator: "เครื่องคำนวณ",
    contact: "ติดต่อเรา",
    booking: "สอบถาม/นัดสำรวจ",
  },
  en: {
    home: "Home",
    about: "About Us",
    services: "Services",
    packages: "Packages",
    portfolio: "Portfolio",
    testimonials: "Testimonials",
    calculator: "Calculator",
    contact: "Contact",
    booking: "Quote / Book Survey",
  },
};

export function defaultSitemapConfig(): SitemapConfig {
  return {
    version: 1,
    sections: SITEMAP_SECTION_IDS.map((id, index) => ({
      id,
      enabled: true,
      sortOrder: index,
    })),
  };
}

/** Merge stored JSON with code defaults — unknown section ids are dropped. */
export function parseSitemapConfig(raw: unknown): SitemapConfig {
  const parsed = sitemapConfigSchema.safeParse(raw);
  const stored: SitemapConfigSection[] = parsed.success ? parsed.data.sections : [];
  const byId = new Map(stored.map((s) => [s.id, s]));

  const sections = SITEMAP_SECTION_IDS.map((id, defaultOrder) => {
    const existing = byId.get(id);
    return {
      id,
      enabled: existing?.enabled ?? true,
      sortOrder: existing?.sortOrder ?? defaultOrder,
      labelTh: existing?.labelTh?.trim() || undefined,
      labelEn: existing?.labelEn?.trim() || undefined,
    };
  }).sort((a, b) => a.sortOrder - b.sortOrder);

  return {
    version: parsed.success ? parsed.data.version : 1,
    sections,
  };
}

export function sectionLabel(
  section: SitemapConfigSection,
  locale: string,
  fallback: Record<SitemapSectionId, string>
): string {
  const override = locale === "en" ? section.labelEn : section.labelTh;
  if (override?.trim()) return override.trim();
  return fallback[section.id];
}
