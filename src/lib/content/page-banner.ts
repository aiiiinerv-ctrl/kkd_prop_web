import { cache } from "react";
import { pickLocale } from "@/lib/i18n-content";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";
import type { BannerPageSlug } from "@/lib/page-banners";

export type PageBannerSlideView = {
  imageUrl: string;
  alt: string;
  linkPath: string | null;
};

export type PageBannerView = {
  mode: "FIXED" | "SLIDES";
  slides: PageBannerSlideView[];
};

/**
 * Resolves optional page banner for public rendering. Returns null when mode
 * is OFF, no row exists, or no slides have retrievable blobs.
 */
export async function getPageBanner(
  pageSlug: BannerPageSlug,
  locale: string
): Promise<PageBannerView | null> {
  const row = await prisma.pageBanner.findUnique({
    where: { pageSlug },
    include: { slides: { orderBy: { sortOrder: "asc" } } },
  });
  if (!row || row.mode === "OFF" || row.slides.length === 0) return null;

  const slides: PageBannerSlideView[] = [];
  for (const slide of row.slides) {
    if (!slide.isActive) continue;
    if (!(await storage.exists(slide.imageKey))) continue;
    slides.push({
      imageUrl: storage.publicUrl(slide.imageKey),
      alt: pickLocale(slide, "alt", locale) || slide.altTh,
      linkPath: slide.linkPath,
    });
  }

  if (slides.length === 0) return null;

  const mode = row.mode === "SLIDES" && slides.length > 1 ? "SLIDES" : "FIXED";
  return { mode, slides };
}

export type SiteLogoUrls = {
  header: string | null;
  footer: string | null;
};

/** Resolves managed logo URLs; null means use static BrandLogo fallback. */
export async function resolveSiteLogoUrls(
  headerLogoKey: string | null | undefined,
  footerLogoKey: string | null | undefined
): Promise<SiteLogoUrls> {
  const header =
    headerLogoKey && (await storage.exists(headerLogoKey))
      ? storage.publicUrl(headerLogoKey)
      : null;
  const footer =
    footerLogoKey && (await storage.exists(footerLogoKey))
      ? storage.publicUrl(footerLogoKey)
      : null;
  return { header, footer };
}

export const getSiteLogoUrls = cache(async (): Promise<SiteLogoUrls> => {
  const row = await prisma.siteSettings.findFirst({
    select: { headerLogoKey: true, footerLogoKey: true },
  });
  return resolveSiteLogoUrls(row?.headerLogoKey, row?.footerLogoKey);
});
