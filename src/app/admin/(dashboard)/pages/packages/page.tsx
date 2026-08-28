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
import { PackagesAdminShell } from "./packages-admin-shell";

export default async function PagesPackagesPage() {
  const session = await requireRole("ADMIN", "SALES", "MARKETING", "EDITOR");
  if (!canManageContent(session.user.role)) return null;

  const canMutateProperties = canManageSiteSettings(session.user.role);

  const [pageRow, pageSeo, packages, bannerData] = await Promise.all([
    prisma.packagesPageContent.findUnique({ where: { key: "packages" } }),
    canMutateProperties
      ? prisma.pageSeo.findUnique({ where: { key: "packages" } })
      : Promise.resolve(null),
    prisma.package.findMany({ orderBy: { sortOrder: "asc" } }),
    getPageBannerAdmin("packages"),
  ]);

  return (
    <PackagesAdminShell
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
              emptyTh: pageRow.emptyTh ?? "",
              emptyEn: pageRow.emptyEn ?? "",
              seasonalTitleTh: pageRow.seasonalTitleTh ?? "",
              seasonalTitleEn: pageRow.seasonalTitleEn ?? "",
              seasonalSubtitleTh: pageRow.seasonalSubtitleTh ?? "",
              seasonalSubtitleEn: pageRow.seasonalSubtitleEn ?? "",
              paybackTitleTh: pageRow.paybackTitleTh ?? "",
              paybackTitleEn: pageRow.paybackTitleEn ?? "",
              paybackOnGridTh: pageRow.paybackOnGridTh ?? "",
              paybackOnGridEn: pageRow.paybackOnGridEn ?? "",
              paybackHybridTh: pageRow.paybackHybridTh ?? "",
              paybackHybridEn: pageRow.paybackHybridEn ?? "",
              paybackOffGridTh: pageRow.paybackOffGridTh ?? "",
              paybackOffGridEn: pageRow.paybackOffGridEn ?? "",
              showSeasonal: pageRow.showSeasonal,
              showPayback: pageRow.showPayback,
              showGlobalCta: pageRow.showGlobalCta,
            }
          : null
      }
      packages={packages.map((p) => ({
        id: p.id,
        nameTh: p.nameTh,
        nameEn: p.nameEn,
        sizeKw: p.sizeKw,
        priceThb: p.priceThb,
        isPopular: p.isPopular,
        suitableTh: p.suitableTh,
        suitableEn: p.suitableEn,
        featuresTh: (p.featuresTh as string[] | null) ?? [],
        featuresEn: (p.featuresEn as string[] | null) ?? [],
        sortOrder: p.sortOrder,
        isPublished: p.isPublished,
      }))}
      canPublish={canPublishContent(session.user.role)}
      canDelete={canDeleteContent(session.user.role)}
      bannerData={bannerData}
    />
  );
}
