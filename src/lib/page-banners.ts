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

/** Internal link presets for banner slides — locale prefix added at render time. */
export const BANNER_LINK_PRESETS: readonly { value: string; labelTh: string }[] = [
  { value: "", labelTh: "ไม่มีลิงก์" },
  { value: "/booking", labelTh: "สอบถาม/นัดสำรวจ" },
  { value: "/packages", labelTh: "แพ็กเกจ" },
  { value: "/services", labelTh: "บริการ" },
  { value: "/about", labelTh: "เกี่ยวกับเรา" },
  { value: "/portfolio", labelTh: "ผลงาน" },
  { value: "/testimonials", labelTh: "รีวิวลูกค้า" },
  { value: "/calculator", labelTh: "เครื่องคำนวณ" },
  { value: "/contact", labelTh: "ติดต่อเรา" },
];

const BANNER_LINK_SET = new Set(BANNER_LINK_PRESETS.map((p) => p.value));

export function isBannerPageSlug(value: string): value is BannerPageSlug {
  return (BANNER_PAGE_SLUGS as readonly string[]).includes(value);
}

export function isBannerLinkPath(value: string): boolean {
  return BANNER_LINK_SET.has(value);
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
