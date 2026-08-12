import { cache } from "react";
import { prisma } from "@/lib/db";
import { CLOSED_LEAD_STATUSES } from "@/lib/reports/aggregate";
import {
  toChannelView,
  toPackageView,
  toProjectView,
  toServiceView,
  toTestimonialView,
  type ChannelView,
  type PackageView,
  type ProjectView,
  type ServiceView,
  type TestimonialView,
} from "./views";

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

export type {
  ChannelView,
  PackageView,
  ProjectView,
  ServiceView,
  TestimonialView,
};
