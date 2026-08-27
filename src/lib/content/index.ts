import { cache } from "react";
import { prisma } from "@/lib/db";
import { CLOSED_LEAD_STATUSES } from "@/lib/reports/aggregate";
import { storage } from "@/lib/storage";
import {
  toAboutContentView,
  toChannelView,
  toHomeFaqItemView,
  toHomePageContentView,
  toPackageView,
  toPageSeoView,
  toProjectView,
  toServiceView,
  toServicesPageContentView,
  toSiteSettingsView,
  toSharedCtaView,
  toTestimonialView,
  type AboutContentView,
  type ChannelView,
  type HomeFaqItemView,
  type HomePageContentView,
  type PackageView,
  type PageSeoView,
  type ProjectView,
  type ServiceView,
  type ServicesPageContentView,
  type SharedCtaView,
  type SiteSettingsView,
  type SocialLink,
  type TestimonialView,
} from "./views";
import type { MetaKey } from "@/lib/seo";

/**
 * The only way public pages read content. Each reader answers one question a
 * page actually asks and returns display-ready view-models, so what counts as
 * published, how rows are ordered, how bilingual columns are resolved and how
 * storage keys become URLs all live here rather than being restated per page.
 *
 * Readers are wrapped in React's `cache()`, which memoizes per request — two
 * callers in the same render (a page body and its generateMetadata, say) cost
 * one query. That is request-scoped only and independent of the `revalidate`
 * on each page, which is a separate mechanism.
 */

export const getPublishedPackages = cache(
  async (locale: string): Promise<PackageView[]> => {
    const rows = await prisma.package.findMany({
      where: { isPublished: true },
      orderBy: { sortOrder: "asc" },
    });
    return rows.map((row) => toPackageView(row, locale));
  }
);

/** Null when the slug is unknown *or* unpublished — an unpublished package is not a 404-able draft to the public, it simply doesn't exist. */
export const getPackageBySlug = cache(
  async (slug: string, locale: string): Promise<PackageView | null> => {
    const row = await prisma.package.findUnique({ where: { slug } });
    if (!row || !row.isPublished) return null;
    return toPackageView(row, locale);
  }
);

/** Null when the slug is unknown *or* unpublished — an unpublished service is not a 404-able draft to the public, it simply doesn't exist. */
export const getServiceBySlug = cache(
  async (slug: string, locale: string): Promise<ServiceView | null> => {
    const row = await prisma.service.findUnique({ where: { slug } });
    if (!row || !row.isPublished) return null;
    return toServiceView(row, locale);
  }
);

export const getPublishedServices = cache(
  async (locale: string): Promise<ServiceView[]> => {
    const rows = await prisma.service.findMany({
      where: { isPublished: true },
      orderBy: { sortOrder: "asc" },
    });
    return rows.map((row) => toServiceView(row, locale));
  }
);

/** Portfolio page order: curated first (sortOrder), newest within that. */
export const getPublishedProjects = cache(
  async (locale: string): Promise<ProjectView[]> => {
    const rows = await prisma.portfolioProject.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    return rows.map((row) => toProjectView(row, locale));
  }
);

/** Home page order: most recently completed work first — deliberately not the curated order used on the portfolio page. */
export const getLatestProjects = cache(
  async (locale: string, take: number): Promise<ProjectView[]> => {
    const rows = await prisma.portfolioProject.findMany({
      where: { isPublished: true },
      orderBy: [{ completedAt: "desc" }, { createdAt: "desc" }],
      take,
    });
    return rows.map((row) => toProjectView(row, locale));
  }
);

export const getPublishedTestimonials = cache(
  async (locale: string): Promise<TestimonialView[]> => {
    const rows = await prisma.testimonial.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    return rows.map((row) => toTestimonialView(row, locale));
  }
);

export const getActiveChannels = cache(
  async (locale: string): Promise<ChannelView[]> => {
    const rows = await prisma.promoChannel.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    return rows.map((row) => toChannelView(row, locale));
  }
);

/**
 * Bank/PromptPay details shown on the booking page. Read-only and public by
 * nature — but it lived in a `"use server"` module next to the mutation that
 * edits it, which made it a POST-able endpoint anyone could call. Reads belong
 * here; the guarded mutation stays in src/actions/payment-settings.ts.
 */
export const getPaymentSettings = cache(async () => {
  return prisma.paymentSettings.findFirst();
});

export type SiteStats = { projectCount: number; closedLeadCount: number };

/** Headline numbers on the about page. Not localized — counts, not content. */
export const getSiteStats = cache(async (): Promise<SiteStats> => {
  const [projectCount, closedLeadCount] = await Promise.all([
    prisma.portfolioProject.count({ where: { isPublished: true } }),
    prisma.lead.count({ where: { status: { in: CLOSED_LEAD_STATUSES } } }),
  ]);
  return { projectCount, closedLeadCount };
});

/**
 * Site-wide contact info, social links, header/footer text.
 * Returns null when no row exists (fallback to messages is the caller's job).
 */
export const getSiteSettings = cache(
  async (locale: string): Promise<SiteSettingsView | null> => {
    const row = await prisma.siteSettings.findFirst();
    if (!row) return null;
    return toSiteSettingsView(row, locale);
  }
);

/** Shared CTA banner copy from SiteSettings (#68). Null → messages fallback. */
export const getSharedCta = cache(
  async (locale: string): Promise<SharedCtaView | null> => {
    const row = await prisma.siteSettings.findFirst();
    if (!row) return null;
    return toSharedCtaView(row, locale);
  }
);

/**
 * Per-page SEO data for one MetaKey.
 * Returns null when no row exists for that key.
 */
export const getPageSeo = cache(
  async (key: MetaKey, locale: string): Promise<PageSeoView | null> => {
    const row = await prisma.pageSeo.findUnique({ where: { key } });
    if (!row) return null;
    return toPageSeoView(row, locale);
  }
);

/**
 * Editable about page content.
 * Returns null when no row exists (fallback to messages is the caller's job).
 */
export const getAboutContent = cache(
  async (locale: string): Promise<AboutContentView | null> => {
    const row = await prisma.aboutContent.findUnique({
      where: { key: "about" },
      include: {
        featuredTestimonials: {
          orderBy: { sortOrder: "asc" },
          select: { testimonialId: true, sortOrder: true },
        },
      },
    });
    if (!row) return null;
    return toAboutContentView(row, locale);
  }
);

/** Services page chrome (titles / visibility). Null → caller falls back to messages. */
export const getServicesPageContent = cache(
  async (locale: string): Promise<ServicesPageContentView | null> => {
    const row = await prisma.servicesPageContent.findUnique({ where: { key: "services" } });
    if (!row) return null;
    return toServicesPageContentView(row, locale);
  }
);

/**
 * Home Page Content + its FAQ children, for the public reader
 * (`src/app/[locale]/home-content.tsx`). Returns null when no row exists —
 * the caller falls back to the whole `messages` bundle (Home CMS slice
 * edge case C1: whole-record fallback, never a per-field mix with the DB
 * row). Gated by `PAGE_REGISTRY.home.contentRollout` at the call site, not
 * here, so this reader stays usable for admin-only staging reads too.
 */
export const getHomePageContent = cache(
  async (
    locale: string
  ): Promise<{ content: HomePageContentView; faqItems: HomeFaqItemView[] } | null> => {
    const row = await prisma.homePageContent.findUnique({
      where: { key: "home" },
      include: { faqItems: { orderBy: { sortOrder: "asc" } } },
    });
    if (!row) return null;
    return {
      content: toHomePageContentView(row, locale),
      faqItems: row.faqItems.map((item) => toHomeFaqItemView(item, locale)),
    };
  }
);

const STATIC_HERO_URL = "/marketing/hero-solar.jpg";

/**
 * Resolves the Home hero `<img>` source. A managed key set on the row is
 * preferred, but only if its blob is actually still retrievable — a key
 * pointing at a deleted/never-written blob falls back to the bundled static
 * asset rather than a broken image (edge case H1, matrix C4). Not cached
 * with `react.cache()`: the existence check is a cheap `stat`, and caching
 * it per-request would risk showing a stale "missing" state right after an
 * admin replaces the hero within the same request lifecycle.
 */
export async function resolveHomeHeroImage(
  heroImageKey: string | null
): Promise<{ url: string; isFallback: boolean }> {
  if (heroImageKey && (await storage.exists(heroImageKey))) {
    return { url: storage.publicUrl(heroImageKey), isFallback: false };
  }
  return { url: STATIC_HERO_URL, isFallback: true };
}

export type { HomeFaqItemView, HomePageContentView };

export type {
  AboutContentView,
  ChannelView,
  PackageView,
  PageSeoView,
  ProjectView,
  ServiceView,
  SharedCtaView,
  SiteSettingsView,
  SocialLink,
  TestimonialView,
};
