import type { MetaKey } from "@/lib/seo";

/** Code-owned top-level sitemap sections (v1 — no custom URLs). */
export const SITEMAP_SECTION_IDS = [
  "home",
  "about",
  "services",
  "packages",
  "portfolio",
  "testimonials",
  "calculator",
  "contact",
  "booking",
] as const;

export type SitemapSectionId = (typeof SITEMAP_SECTION_IDS)[number];

export type SitemapConfigSection = {
  id: SitemapSectionId;
  enabled: boolean;
  sortOrder: number;
  labelTh?: string;
  labelEn?: string;
};

export type SitemapConfig = {
  version: number;
  sections: SitemapConfigSection[];
};

export type SitemapLink = {
  label: string;
  href: string;
};

export type SitemapGroup = {
  id: SitemapSectionId;
  label: string;
  href: string;
  children: SitemapLink[];
};

export const SECTION_META: Record<
  SitemapSectionId,
  { path: string; metaKey: MetaKey; navKey: SitemapSectionId }
> = {
  home: { path: "/", metaKey: "home", navKey: "home" },
  about: { path: "/about", metaKey: "about", navKey: "about" },
  services: { path: "/services", metaKey: "services", navKey: "services" },
  packages: { path: "/packages", metaKey: "packages", navKey: "packages" },
  portfolio: { path: "/portfolio", metaKey: "portfolio", navKey: "portfolio" },
  testimonials: { path: "/testimonials", metaKey: "testimonials", navKey: "testimonials" },
  calculator: { path: "/calculator", metaKey: "calculator", navKey: "calculator" },
  contact: { path: "/contact", metaKey: "contact", navKey: "contact" },
  booking: { path: "/booking", metaKey: "booking", navKey: "booking" },
};

export type SitemapPathEntry = {
  path: string;
  lastModified?: Date;
  changeFrequency: "weekly" | "monthly";
  priority: number;
};
