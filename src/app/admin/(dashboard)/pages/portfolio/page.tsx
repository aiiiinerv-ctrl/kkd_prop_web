import {
  canDeleteContent,
  canManageContent,
  canManageSiteSettings,
  canPublishContent,
  requireRole,
} from "@/lib/auth";
import { getPageBannerAdmin } from "@/lib/admin/page-banner-admin";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";
import { PortfolioAdminShell } from "./portfolio-admin-shell";

export default async function PagesPortfolioPage() {
  const session = await requireRole("ADMIN", "SALES", "MARKETING", "EDITOR");
  if (!canManageContent(session.user.role)) return null;

  const canMutateProperties = canManageSiteSettings(session.user.role);

  const [pageRow, pageSeo, projects, bannerData] = await Promise.all([
    prisma.portfolioPageContent.findUnique({ where: { key: "portfolio" } }),
    canMutateProperties
      ? prisma.pageSeo.findUnique({ where: { key: "portfolio" } })
      : Promise.resolve(null),
    prisma.portfolioProject.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    }),
    getPageBannerAdmin("portfolio"),
  ]);

  return (
    <PortfolioAdminShell
      key={`${pageRow?.version ?? 0}-${pageSeo?.version ?? 0}`}
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
      pageContent={
        pageRow
          ? {
              version: pageRow.version,
              titleTh: pageRow.titleTh ?? "",
              titleEn: pageRow.titleEn ?? "",
              subtitleTh: pageRow.subtitleTh ?? "",
              subtitleEn: pageRow.subtitleEn ?? "",
              imageDisclaimerTh: pageRow.imageDisclaimerTh ?? "",
              imageDisclaimerEn: pageRow.imageDisclaimerEn ?? "",
              emptyTh: pageRow.emptyTh ?? "",
              emptyEn: pageRow.emptyEn ?? "",
              showGlobalCta: pageRow.showGlobalCta,
            }
          : null
      }
      projects={projects.map((p) => ({
        id: p.id,
        titleTh: p.titleTh,
        titleEn: p.titleEn,
        descriptionTh: p.descriptionTh,
        descriptionEn: p.descriptionEn,
        category: p.category,
        province: p.province,
        systemSizeKw: p.systemSizeKw,
        imageKeys: (p.imageKeys as string[] | null) ?? [],
        completedAt: p.completedAt?.toISOString().split("T")[0] ?? "",
        sortOrder: p.sortOrder,
        isPublished: p.isPublished,
      }))}
      canPublish={canPublishContent(session.user.role)}
      canDelete={canDeleteContent(session.user.role)}
      bannerData={bannerData}
    />
  );
}
