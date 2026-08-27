import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createId } from "@paralleldrive/cuid2";
import type { PrismaClient } from "../../generated/prisma/client";

/**
 * Idempotent Sprint 3 backfill (#66) for remaining Pages CMS additive data.
 * Does NOT recreate or rewrite HomePageContent / HomeFaqItem (Home pilot).
 * Does NOT create HomeFeaturedPortfolioProject (deferred).
 *
 * Shared with scripts/backfill-pages-cms-sprint3.mts and the gated production
 * route at src/app/api/operations/pages-cms-sprint3-backfill/route.ts.
 */

type Bundle = Record<string, string>;

export type Sprint3BackfillReport = {
  pageSeoUpdated: number;
  siteSettingsUpdated: boolean;
  aboutUpdated: boolean;
  aboutFeaturedCreated: number;
  aboutFeaturedRowCount: number;
  servicesUpserted: boolean;
  packagesUpserted: boolean;
  portfolioUpserted: boolean;
  calculatorUpserted: boolean;
  homePageContentCount: number;
  homeFaqItemCount: number;
  /** sha256 of normalized backfilled content (excludes Home pilot rows). */
  contentDigest: string;
};

async function loadLocale(locale: "th" | "en"): Promise<Record<string, Bundle>> {
  const filePath = path.join(process.cwd(), "src", "messages", `${locale}.json`);
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as Record<string, Bundle>;
}

function pick(bundle: Bundle | undefined, key: string): string | null {
  const value = bundle?.[key];
  return value == null || value === "" ? null : value;
}

function required(bundle: Bundle | undefined, key: string, fallback = ""): string {
  return pick(bundle, key) ?? fallback;
}

function digestPayload(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export async function backfillPagesCmsSprint3(
  prisma: PrismaClient
): Promise<Sprint3BackfillReport> {
  const th = await loadLocale("th");
  const en = await loadLocale("en");

  let pageSeoUpdated = 0;
  const metaKeys = [
    "home",
    "about",
    "services",
    "packages",
    "portfolio",
    "booking",
    "contact",
    "calculator",
    "testimonials",
    "cookiePolicy",
  ] as const;
  for (const key of metaKeys) {
    const titleKey = `${key}Title`;
    const descKey = `${key}Desc`;
    const existing = await prisma.pageSeo.findUnique({ where: { key } });
    if (existing) {
      await prisma.pageSeo.update({
        where: { id: existing.id },
        data: {
          robotsIndex: existing.robotsIndex ?? true,
          robotsFollow: existing.robotsFollow ?? true,
          version: existing.version > 0 ? existing.version : 1,
          titleTh: existing.titleTh ?? pick(th.meta, titleKey),
          titleEn: existing.titleEn ?? pick(en.meta, titleKey),
          descriptionTh: existing.descriptionTh ?? pick(th.meta, descKey),
          descriptionEn: existing.descriptionEn ?? pick(en.meta, descKey),
        },
      });
    } else {
      await prisma.pageSeo.create({
        data: {
          id: createId(),
          key,
          titleTh: pick(th.meta, titleKey),
          titleEn: pick(en.meta, titleKey),
          descriptionTh: pick(th.meta, descKey),
          descriptionEn: pick(en.meta, descKey),
          robotsIndex: true,
          robotsFollow: true,
          version: 1,
        },
      });
    }
    pageSeoUpdated += 1;
  }

  let site = await prisma.siteSettings.findFirst({ orderBy: { id: "asc" } });
  let siteSettingsUpdated = false;
  if (!site) {
    site = await prisma.siteSettings.create({
      data: {
        id: createId(),
        ctaTitleTh: pick(th.home, "ctaTitle"),
        ctaTitleEn: pick(en.home, "ctaTitle"),
        ctaSubtitleTh: pick(th.home, "ctaSubtitle"),
        ctaSubtitleEn: pick(en.home, "ctaSubtitle"),
        ctaPrimaryLabelTh: pick(th.common, "requestQuote"),
        ctaPrimaryLabelEn: pick(en.common, "requestQuote"),
        ctaSecondaryLabelTh: pick(th.common, "bookSurvey"),
        ctaSecondaryLabelEn: pick(en.common, "bookSurvey"),
        ctaVersion: 1,
      },
    });
    siteSettingsUpdated = true;
  } else {
    await prisma.siteSettings.update({
      where: { id: site.id },
      data: {
        ctaTitleTh: site.ctaTitleTh ?? pick(th.home, "ctaTitle"),
        ctaTitleEn: site.ctaTitleEn ?? pick(en.home, "ctaTitle"),
        ctaSubtitleTh: site.ctaSubtitleTh ?? pick(th.home, "ctaSubtitle"),
        ctaSubtitleEn: site.ctaSubtitleEn ?? pick(en.home, "ctaSubtitle"),
        ctaPrimaryLabelTh: site.ctaPrimaryLabelTh ?? pick(th.common, "requestQuote"),
        ctaPrimaryLabelEn: site.ctaPrimaryLabelEn ?? pick(en.common, "requestQuote"),
        ctaSecondaryLabelTh: site.ctaSecondaryLabelTh ?? pick(th.common, "bookSurvey"),
        ctaSecondaryLabelEn: site.ctaSecondaryLabelEn ?? pick(en.common, "bookSurvey"),
        ctaVersion: site.ctaVersion > 0 ? site.ctaVersion : 1,
      },
    });
    siteSettingsUpdated = true;
  }

  let about = await prisma.aboutContent.findFirst({ orderBy: { id: "asc" } });
  let aboutUpdated = false;
  let aboutFeaturedCreated = 0;
  let aboutId: string | null = about?.id ?? null;

  if (!about) {
    about = await prisma.aboutContent.create({
      data: {
        id: createId(),
        key: "about",
        titleTh: pick(th.about, "title"),
        titleEn: pick(en.about, "title"),
        introTh: pick(th.about, "intro"),
        introEn: pick(en.about, "intro"),
        credRegisteredTitleTh: pick(th.about, "credRegisteredTitle"),
        credRegisteredTitleEn: pick(en.about, "credRegisteredTitle"),
        credRegisteredDescTh: pick(th.about, "credRegisteredDesc"),
        credRegisteredDescEn: pick(en.about, "credRegisteredDesc"),
        credEngineerTitleTh: pick(th.about, "credEngineerTitle"),
        credEngineerTitleEn: pick(en.about, "credEngineerTitle"),
        credEngineerDescTh: pick(th.about, "credEngineerDesc"),
        credEngineerDescEn: pick(en.about, "credEngineerDesc"),
        credExperienceTitleTh: pick(th.about, "credExperienceTitle"),
        credExperienceTitleEn: pick(en.about, "credExperienceTitle"),
        credExperienceDescTh: pick(th.about, "credExperienceDesc"),
        credExperienceDescEn: pick(en.about, "credExperienceDesc"),
        teamTitleTh: pick(th.about, "teamTitle"),
        teamTitleEn: pick(en.about, "teamTitle"),
        teamDescTh: pick(th.about, "teamDesc"),
        teamDescEn: pick(en.about, "teamDesc"),
        teamDesignTitleTh: pick(th.about, "teamDesignTitle"),
        teamDesignTitleEn: pick(en.about, "teamDesignTitle"),
        teamDesignDescTh: pick(th.about, "teamDesignDesc"),
        teamDesignDescEn: pick(en.about, "teamDesignDesc"),
        teamInstallTitleTh: pick(th.about, "teamInstallTitle"),
        teamInstallTitleEn: pick(en.about, "teamInstallTitle"),
        teamInstallDescTh: pick(th.about, "teamInstallDesc"),
        teamInstallDescEn: pick(en.about, "teamInstallDesc"),
        teamSupportTitleTh: pick(th.about, "teamSupportTitle"),
        teamSupportTitleEn: pick(en.about, "teamSupportTitle"),
        teamSupportDescTh: pick(th.about, "teamSupportDesc"),
        teamSupportDescEn: pick(en.about, "teamSupportDesc"),
        showCredentials: true,
        showTeam: true,
        showStats: true,
        showTestimonials: true,
        showGlobalCta: true,
        statsProjectsLabelTh: pick(th.home, "statsProjects"),
        statsProjectsLabelEn: pick(en.home, "statsProjects"),
        statsYearsLabelTh: pick(th.home, "statsYears"),
        statsYearsLabelEn: pick(en.home, "statsYears"),
        statsEngineersLabelTh: pick(th.home, "statsEngineers"),
        statsEngineersLabelEn: pick(en.home, "statsEngineers"),
        statsCustomersLabelTh: pick(th.home, "statsCustomers"),
        statsCustomersLabelEn: pick(en.home, "statsCustomers"),
        testimonialsTitleTh: pick(th.testimonials, "title"),
        testimonialsTitleEn: pick(en.testimonials, "title"),
        testimonialsSubtitleTh: pick(th.testimonials, "subtitle"),
        testimonialsSubtitleEn: pick(en.testimonials, "subtitle"),
        version: 1,
      },
    });
    aboutUpdated = true;
    aboutId = about.id;
  } else {
    await prisma.aboutContent.update({
      where: { id: about.id },
      data: {
        key: "about",
        showCredentials: about.showCredentials ?? true,
        showTeam: about.showTeam ?? true,
        showStats: about.showStats ?? true,
        showTestimonials: about.showTestimonials ?? true,
        showGlobalCta: about.showGlobalCta ?? true,
        statsProjectsLabelTh: about.statsProjectsLabelTh ?? pick(th.home, "statsProjects"),
        statsProjectsLabelEn: about.statsProjectsLabelEn ?? pick(en.home, "statsProjects"),
        statsYearsLabelTh: about.statsYearsLabelTh ?? pick(th.home, "statsYears"),
        statsYearsLabelEn: about.statsYearsLabelEn ?? pick(en.home, "statsYears"),
        statsEngineersLabelTh: about.statsEngineersLabelTh ?? pick(th.home, "statsEngineers"),
        statsEngineersLabelEn: about.statsEngineersLabelEn ?? pick(en.home, "statsEngineers"),
        statsCustomersLabelTh: about.statsCustomersLabelTh ?? pick(th.home, "statsCustomers"),
        statsCustomersLabelEn: about.statsCustomersLabelEn ?? pick(en.home, "statsCustomers"),
        testimonialsTitleTh: about.testimonialsTitleTh ?? pick(th.testimonials, "title"),
        testimonialsTitleEn: about.testimonialsTitleEn ?? pick(en.testimonials, "title"),
        testimonialsSubtitleTh:
          about.testimonialsSubtitleTh ?? pick(th.testimonials, "subtitle"),
        testimonialsSubtitleEn:
          about.testimonialsSubtitleEn ?? pick(en.testimonials, "subtitle"),
        version: about.version > 0 ? about.version : 1,
      },
    });
    aboutUpdated = true;
    aboutId = about.id;
  }

  if (aboutId) {
    const existingFeatured = await prisma.aboutFeaturedTestimonial.count({
      where: { aboutContentId: aboutId },
    });
    if (existingFeatured === 0) {
      const published = await prisma.testimonial.findMany({
        where: { isPublished: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        take: 3,
        select: { id: true },
      });
      for (let i = 0; i < published.length; i += 1) {
        await prisma.aboutFeaturedTestimonial.create({
          data: {
            id: createId(),
            aboutContentId: aboutId,
            testimonialId: published[i].id,
            sortOrder: i,
          },
        });
        aboutFeaturedCreated += 1;
      }
    }
  }

  const aboutFeaturedRowCount = aboutId
    ? await prisma.aboutFeaturedTestimonial.count({ where: { aboutContentId: aboutId } })
    : 0;

  const servicesData = {
    titleTh: required(th.services, "title"),
    titleEn: required(en.services, "title"),
    subtitleTh: pick(th.services, "subtitle"),
    subtitleEn: pick(en.services, "subtitle"),
    systemsTitleTh: pick(th.services, "systemsTitle"),
    systemsTitleEn: pick(en.services, "systemsTitle"),
    maintenanceTitleTh: pick(th.services, "maintenanceTitle"),
    maintenanceTitleEn: pick(en.services, "maintenanceTitle"),
    showSystems: true,
    showMaintenance: true,
    showGlobalCta: true,
  };
  const existingServices = await prisma.servicesPageContent.findUnique({
    where: { key: "services" },
  });
  if (existingServices) {
    await prisma.servicesPageContent.update({
      where: { key: "services" },
      data: { ...servicesData, version: existingServices.version },
    });
  } else {
    await prisma.servicesPageContent.create({
      data: { id: createId(), key: "services", ...servicesData, version: 1 },
    });
  }

  const packagesData = {
    titleTh: required(th.packages, "title"),
    titleEn: required(en.packages, "title"),
    subtitleTh: pick(th.packages, "subtitle"),
    subtitleEn: pick(en.packages, "subtitle"),
    emptyTh: pick(th.packages, "empty"),
    emptyEn: pick(en.packages, "empty"),
    seasonalTitleTh: pick(th.packages, "seasonalTitle"),
    seasonalTitleEn: pick(en.packages, "seasonalTitle"),
    seasonalSubtitleTh: pick(th.packages, "seasonalSubtitle"),
    seasonalSubtitleEn: pick(en.packages, "seasonalSubtitle"),
    paybackTitleTh: pick(th.packages, "paybackTitle"),
    paybackTitleEn: pick(en.packages, "paybackTitle"),
    paybackOnGridTh: pick(th.packages, "paybackOnGrid"),
    paybackOnGridEn: pick(en.packages, "paybackOnGrid"),
    paybackHybridTh: pick(th.packages, "paybackHybrid"),
    paybackHybridEn: pick(en.packages, "paybackHybrid"),
    paybackOffGridTh: pick(th.packages, "paybackOffGrid"),
    paybackOffGridEn: pick(en.packages, "paybackOffGrid"),
    showSeasonal: true,
    showPayback: true,
    showGlobalCta: true,
  };
  const existingPackages = await prisma.packagesPageContent.findUnique({
    where: { key: "packages" },
  });
  if (existingPackages) {
    await prisma.packagesPageContent.update({
      where: { key: "packages" },
      data: { ...packagesData, version: existingPackages.version },
    });
  } else {
    await prisma.packagesPageContent.create({
      data: { id: createId(), key: "packages", ...packagesData, version: 1 },
    });
  }

  const portfolioData = {
    titleTh: required(th.portfolio, "title"),
    titleEn: required(en.portfolio, "title"),
    subtitleTh: pick(th.portfolio, "subtitle"),
    subtitleEn: pick(en.portfolio, "subtitle"),
    imageDisclaimerTh: pick(th.portfolio, "imageDisclaimer"),
    imageDisclaimerEn: pick(en.portfolio, "imageDisclaimer"),
    emptyTh: pick(th.portfolio, "empty"),
    emptyEn: pick(en.portfolio, "empty"),
    showGlobalCta: true,
  };
  const existingPortfolio = await prisma.portfolioPageContent.findUnique({
    where: { key: "portfolio" },
  });
  if (existingPortfolio) {
    await prisma.portfolioPageContent.update({
      where: { key: "portfolio" },
      data: { ...portfolioData, version: existingPortfolio.version },
    });
  } else {
    await prisma.portfolioPageContent.create({
      data: { id: createId(), key: "portfolio", ...portfolioData, version: 1 },
    });
  }

  const calculatorData = {
    eyebrowTh: pick(th.calculator, "eyebrow"),
    eyebrowEn: pick(en.calculator, "eyebrow"),
    titleTh: required(th.calculator, "title"),
    titleEn: required(en.calculator, "title"),
    subtitleTh: pick(th.calculator, "subtitle"),
    subtitleEn: pick(en.calculator, "subtitle"),
    panelTitleTh: pick(th.calculator, "panelTitle"),
    panelTitleEn: pick(en.calculator, "panelTitle"),
    panelIntroTh: pick(th.calculator, "panelIntro"),
    panelIntroEn: pick(en.calculator, "panelIntro"),
    packagesEyebrowTh: pick(th.calculator, "packagesEyebrow"),
    packagesEyebrowEn: pick(en.calculator, "packagesEyebrow"),
    packagesTitleTh: pick(th.calculator, "packagesTitle"),
    packagesTitleEn: pick(en.calculator, "packagesTitle"),
    packagesSubtitleTh: pick(th.calculator, "packagesSubtitle"),
    packagesSubtitleEn: pick(en.calculator, "packagesSubtitle"),
    showPackages: true,
  };
  const existingCalculator = await prisma.calculatorPageContent.findUnique({
    where: { key: "calculator" },
  });
  if (existingCalculator) {
    await prisma.calculatorPageContent.update({
      where: { key: "calculator" },
      data: { ...calculatorData, version: existingCalculator.version },
    });
  } else {
    await prisma.calculatorPageContent.create({
      data: { id: createId(), key: "calculator", ...calculatorData, version: 1 },
    });
  }

  const [
    siteAfter,
    aboutAfter,
    featured,
    services,
    packages,
    portfolio,
    calculator,
    pageSeoAfter,
    homePageContentCount,
    homeFaqItemCount,
  ] = await Promise.all([
    prisma.siteSettings.findFirst({ orderBy: { id: "asc" } }),
    prisma.aboutContent.findFirst({ orderBy: { id: "asc" } }),
    aboutId
      ? prisma.aboutFeaturedTestimonial.findMany({
          where: { aboutContentId: aboutId },
          orderBy: { sortOrder: "asc" },
          select: { testimonialId: true, sortOrder: true },
        })
      : Promise.resolve([]),
    prisma.servicesPageContent.findUnique({ where: { key: "services" } }),
    prisma.packagesPageContent.findUnique({ where: { key: "packages" } }),
    prisma.portfolioPageContent.findUnique({ where: { key: "portfolio" } }),
    prisma.calculatorPageContent.findUnique({ where: { key: "calculator" } }),
    prisma.pageSeo.findMany({
      orderBy: { key: "asc" },
      select: {
        key: true,
        robotsIndex: true,
        robotsFollow: true,
        version: true,
        titleTh: true,
        titleEn: true,
        descriptionTh: true,
        descriptionEn: true,
      },
    }),
    prisma.homePageContent.count(),
    prisma.homeFaqItem.count(),
  ]);

  const stripVolatile = <T extends Record<string, unknown> | null>(row: T) => {
    if (!row) return null;
    const { id: _id, updatedAt: _u, createdAt: _c, ...rest } = row as Record<string, unknown>;
    return rest;
  };

  const contentDigest = digestPayload({
    pageSeo: pageSeoAfter,
    siteCta: siteAfter
      ? {
          ctaTitleTh: siteAfter.ctaTitleTh,
          ctaTitleEn: siteAfter.ctaTitleEn,
          ctaSubtitleTh: siteAfter.ctaSubtitleTh,
          ctaSubtitleEn: siteAfter.ctaSubtitleEn,
          ctaPrimaryLabelTh: siteAfter.ctaPrimaryLabelTh,
          ctaPrimaryLabelEn: siteAfter.ctaPrimaryLabelEn,
          ctaSecondaryLabelTh: siteAfter.ctaSecondaryLabelTh,
          ctaSecondaryLabelEn: siteAfter.ctaSecondaryLabelEn,
          ctaVersion: siteAfter.ctaVersion,
        }
      : null,
    about: aboutAfter
      ? {
          key: aboutAfter.key,
          showCredentials: aboutAfter.showCredentials,
          showTeam: aboutAfter.showTeam,
          showStats: aboutAfter.showStats,
          showTestimonials: aboutAfter.showTestimonials,
          showGlobalCta: aboutAfter.showGlobalCta,
          statsProjectsLabelTh: aboutAfter.statsProjectsLabelTh,
          statsProjectsLabelEn: aboutAfter.statsProjectsLabelEn,
          statsYearsLabelTh: aboutAfter.statsYearsLabelTh,
          statsYearsLabelEn: aboutAfter.statsYearsLabelEn,
          statsEngineersLabelTh: aboutAfter.statsEngineersLabelTh,
          statsEngineersLabelEn: aboutAfter.statsEngineersLabelEn,
          statsCustomersLabelTh: aboutAfter.statsCustomersLabelTh,
          statsCustomersLabelEn: aboutAfter.statsCustomersLabelEn,
          testimonialsTitleTh: aboutAfter.testimonialsTitleTh,
          testimonialsTitleEn: aboutAfter.testimonialsTitleEn,
          testimonialsSubtitleTh: aboutAfter.testimonialsSubtitleTh,
          testimonialsSubtitleEn: aboutAfter.testimonialsSubtitleEn,
          version: aboutAfter.version,
        }
      : null,
    featured,
    services: stripVolatile(services as Record<string, unknown> | null),
    packages: stripVolatile(packages as Record<string, unknown> | null),
    portfolio: stripVolatile(portfolio as Record<string, unknown> | null),
    calculator: stripVolatile(calculator as Record<string, unknown> | null),
  });

  return {
    pageSeoUpdated,
    siteSettingsUpdated,
    aboutUpdated,
    aboutFeaturedCreated,
    aboutFeaturedRowCount,
    servicesUpserted: Boolean(services),
    packagesUpserted: Boolean(packages),
    portfolioUpserted: Boolean(portfolio),
    calculatorUpserted: Boolean(calculator),
    homePageContentCount,
    homeFaqItemCount,
    contentDigest,
  };
}
