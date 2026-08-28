import { canDeleteContent, canManageContent, canManageSiteSettings, canPublishContent, requireRole } from "@/lib/auth";
import { getPageBannerAdmin } from "@/lib/admin/page-banner-admin";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";
import { ServicesAdminShell } from "./services-admin-shell";

export default async function PagesServicesPage() {
  const session = await requireRole("ADMIN", "SALES", "MARKETING", "EDITOR");
  if (!canManageContent(session.user.role)) return null;

  const canMutateProperties = canManageSiteSettings(session.user.role);

  const [pageRow, pageSeo, services, bannerData] = await Promise.all([
    prisma.servicesPageContent.findUnique({ where: { key: "services" } }),
    canMutateProperties
      ? prisma.pageSeo.findUnique({ where: { key: "services" } })
      : Promise.resolve(null),
    prisma.service.findMany({ orderBy: { sortOrder: "asc" } }),
    getPageBannerAdmin("services"),
  ]);

  return (
    <ServicesAdminShell
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
              systemsTitleTh: pageRow.systemsTitleTh ?? "",
              systemsTitleEn: pageRow.systemsTitleEn ?? "",
              maintenanceTitleTh: pageRow.maintenanceTitleTh ?? "",
              maintenanceTitleEn: pageRow.maintenanceTitleEn ?? "",
              showSystems: pageRow.showSystems,
              showMaintenance: pageRow.showMaintenance,
              showGlobalCta: pageRow.showGlobalCta,
            }
          : null
      }
      services={services.map((s) => ({
        id: s.id,
        kind: s.kind,
        titleTh: s.titleTh,
        titleEn: s.titleEn,
        descriptionTh: s.descriptionTh,
        descriptionEn: s.descriptionEn,
        featuresTh: (s.featuresTh as string[] | null) ?? [],
        featuresEn: (s.featuresEn as string[] | null) ?? [],
        imageKey: s.imageKey,
        sortOrder: s.sortOrder,
        isPublished: s.isPublished,
      }))}
      canPublish={canPublishContent(session.user.role)}
      canDelete={canDeleteContent(session.user.role)}
      bannerData={bannerData}
    />
  );
}
