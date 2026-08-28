/**
 * Page banner registry — code-owned slugs (never trust client-supplied paths).
 * Home is excluded: it uses HomePageContent hero instead.
 */

export const BANNER_PAGE_SLUGS = [
  "about",
  "services",
  "packages",
  "portfolio",
  "testimonials",
  "calculator",
  "contact",
] as const;

export type BannerPageSlug = (typeof BANNER_PAGE_SLUGS)[number];

export const BANNER_MODES = ["OFF", "FIXED", "SLIDES"] as const;
export type BannerMode = (typeof BANNER_MODES)[number];

export const BANNER_SLIDE_MIN = 2;
export const BANNER_SLIDE_MAX = 5;

export function isBannerPageSlug(value: string): value is BannerPageSlug {
  return (BANNER_PAGE_SLUGS as readonly string[]).includes(value);
}

/**
 * Free-typed banner link (#116) — admin types the path/URL directly instead
 * of picking from a fixed preset list. Still schema-gated server-side to
 * block dangerous URL schemes (`javascript:`, `data:`, ...): empty, an
 * internal relative path starting with "/", or an absolute http(s)/mailto/tel
 * URL. Next's <Link> auto-prefixes the current locale onto a relative path.
 */
export function isBannerLinkPath(value: string): boolean {
  if (value === "") return true;
  if (value.startsWith("/")) return true;
  return /^(https?:|mailto:|tel:)/i.test(value);
}

export function isExternalBannerLink(value: string): boolean {
  return /^(https?:|mailto:|tel:)/i.test(value);
}

export function bannerPageLabel(slug: BannerPageSlug): string {
  const labels: Record<BannerPageSlug, string> = {
    about: "เกี่ยวกับเรา",
    services: "บริการ",
    packages: "แพ็กเกจ",
    portfolio: "ผลงาน",
    testimonials: "รีวิวลูกค้า",
    calculator: "เครื่องคำนวณ",
    contact: "ติดต่อเรา",
  };
  return labels[slug];
}

/** Public + admin revalidation targets for a banner save. */
export function bannerRevalidatePaths(slug: BannerPageSlug): readonly string[] {
  const publicPath = slug === "about" ? "/about" : `/${slug}`;
  return [`/th${publicPath}`, `/en${publicPath}`, "/admin/settings"];
}

export const BANNER_IMAGE_PREFIX = "pages/banners";
