import { canManageContent, canManageSiteSettings, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";
import { AboutAdminShell } from "./about-admin-shell";

export default async function PagesAboutPage() {
  const session = await requireRole("ADMIN", "SALES", "MARKETING", "EDITOR");
  if (!canManageContent(session.user.role)) return null;

  const canMutateProperties = canManageSiteSettings(session.user.role);

  const [row, pageSeo, testimonials] = await Promise.all([
    prisma.aboutContent.findUnique({
      where: { key: "about" },
      include: {
        featuredTestimonials: { orderBy: { sortOrder: "asc" }, select: { testimonialId: true } },
      },
    }),
    canMutateProperties
      ? prisma.pageSeo.findUnique({ where: { key: "about" } })
      : Promise.resolve(null),
    prisma.testimonial.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, customerName: true, isPublished: true },
    }),
  ]);

  return (
    <AboutAdminShell
      key={`${row?.version ?? 0}-${pageSeo?.version ?? 0}`}
      canMutateProperties={canMutateProperties}
      pageSeo={
        pageSeo
          ? {
              version: pageSeo.version,
              titleTh: pageSeo.titleTh ?? "",
              titleEn: pageSeo.titleEn ?? "",
              descriptionTh: pageSeo.descriptionTh ?? "",
              descriptionEn: pageSeo.descriptionEn ?? "",
              ogTitleTh: pageSeo.ogTitleTh ?? "",
              ogTitleEn: pageSeo.ogTitleEn ?? "",
              ogDescriptionTh: pageSeo.ogDescriptionTh ?? "",
              ogDescriptionEn: pageSeo.ogDescriptionEn ?? "",
              canonicalPathTh: pageSeo.canonicalPathTh ?? "",
              canonicalPathEn: pageSeo.canonicalPathEn ?? "",
              robotsIndex: pageSeo.robotsIndex,
              robotsFollow: pageSeo.robotsFollow,
              ogImageUrl: pageSeo.ogImageKey ? storage.publicUrl(pageSeo.ogImageKey) : null,
            }
          : null
      }
      testimonials={testimonials.map((t) => ({
        id: t.id,
        label: t.customerName,
        published: t.isPublished,
      }))}
      data={
        row
          ? {
              version: row.version,
              titleTh: row.titleTh ?? "",
              titleEn: row.titleEn ?? "",
              introTh: row.introTh ?? "",
              introEn: row.introEn ?? "",
              credRegisteredTitleTh: row.credRegisteredTitleTh ?? "",
              credRegisteredTitleEn: row.credRegisteredTitleEn ?? "",
              credRegisteredDescTh: row.credRegisteredDescTh ?? "",
              credRegisteredDescEn: row.credRegisteredDescEn ?? "",
              credEngineerTitleTh: row.credEngineerTitleTh ?? "",
              credEngineerTitleEn: row.credEngineerTitleEn ?? "",
              credEngineerDescTh: row.credEngineerDescTh ?? "",
              credEngineerDescEn: row.credEngineerDescEn ?? "",
              credExperienceTitleTh: row.credExperienceTitleTh ?? "",
              credExperienceTitleEn: row.credExperienceTitleEn ?? "",
              credExperienceDescTh: row.credExperienceDescTh ?? "",
              credExperienceDescEn: row.credExperienceDescEn ?? "",
              credSectionTitleTh: row.credSectionTitleTh ?? "",
              credSectionTitleEn: row.credSectionTitleEn ?? "",
              credSectionDescTh: row.credSectionDescTh ?? "",
              credSectionDescEn: row.credSectionDescEn ?? "",
              credRegisteredIcon: row.credRegisteredIcon ?? "",
              credEngineerIcon: row.credEngineerIcon ?? "",
              credExperienceIcon: row.credExperienceIcon ?? "",
              teamDesignIcon: row.teamDesignIcon ?? "",
              teamInstallIcon: row.teamInstallIcon ?? "",
              teamSupportIcon: row.teamSupportIcon ?? "",
              teamTitleTh: row.teamTitleTh ?? "",
              teamTitleEn: row.teamTitleEn ?? "",
              teamDescTh: row.teamDescTh ?? "",
              teamDescEn: row.teamDescEn ?? "",
              teamDesignTitleTh: row.teamDesignTitleTh ?? "",
              teamDesignTitleEn: row.teamDesignTitleEn ?? "",
              teamDesignDescTh: row.teamDesignDescTh ?? "",
              teamDesignDescEn: row.teamDesignDescEn ?? "",
              teamInstallTitleTh: row.teamInstallTitleTh ?? "",
              teamInstallTitleEn: row.teamInstallTitleEn ?? "",
              teamInstallDescTh: row.teamInstallDescTh ?? "",
              teamInstallDescEn: row.teamInstallDescEn ?? "",
              teamSupportTitleTh: row.teamSupportTitleTh ?? "",
              teamSupportTitleEn: row.teamSupportTitleEn ?? "",
              teamSupportDescTh: row.teamSupportDescTh ?? "",
              teamSupportDescEn: row.teamSupportDescEn ?? "",
              statsProjectsLabelTh: row.statsProjectsLabelTh ?? "",
              statsProjectsLabelEn: row.statsProjectsLabelEn ?? "",
              statsYearsLabelTh: row.statsYearsLabelTh ?? "",
              statsYearsLabelEn: row.statsYearsLabelEn ?? "",
              statsEngineersLabelTh: row.statsEngineersLabelTh ?? "",
              statsEngineersLabelEn: row.statsEngineersLabelEn ?? "",
              statsCustomersLabelTh: row.statsCustomersLabelTh ?? "",
              statsCustomersLabelEn: row.statsCustomersLabelEn ?? "",
              testimonialsTitleTh: row.testimonialsTitleTh ?? "",
              testimonialsTitleEn: row.testimonialsTitleEn ?? "",
              testimonialsSubtitleTh: row.testimonialsSubtitleTh ?? "",
              testimonialsSubtitleEn: row.testimonialsSubtitleEn ?? "",
              showCredentials: row.showCredentials,
              showTeam: row.showTeam,
              showStats: row.showStats,
              showTestimonials: row.showTestimonials,
              showGlobalCta: row.showGlobalCta,
              featuredTestimonialIds: row.featuredTestimonials.map((f) => f.testimonialId),
            }
          : null
      }
    />
  );
}
