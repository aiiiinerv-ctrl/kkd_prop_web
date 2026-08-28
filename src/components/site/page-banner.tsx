import { getLocale } from "next-intl/server";
import { getPageBanner } from "@/lib/content/page-banner";
import type { BannerPageSlug } from "@/lib/page-banners";
import { PageBannerCarousel, PageBannerFixed } from "./page-banner-carousel";

export async function PageBanner({ pageSlug }: { pageSlug: BannerPageSlug }) {
  const locale = await getLocale();
  const banner = await getPageBanner(pageSlug, locale);
  if (!banner) return null;

  if (banner.mode === "SLIDES") {
    return <PageBannerCarousel slides={banner.slides} />;
  }

  const slide = banner.slides[0];
  if (!slide) return null;
  return <PageBannerFixed slide={slide} />;
}
