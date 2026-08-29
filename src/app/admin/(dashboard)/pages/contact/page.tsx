import { canManageContent, canManageSiteSettings, requireRole } from "@/lib/auth";
import { getPageBannerAdmin } from "@/lib/admin/page-banner-admin";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";
import { ContactAdminShell } from "./contact-admin-shell";

export default async function PagesContactPage() {
  const session = await requireRole("ADMIN", "SALES", "MARKETING", "EDITOR");
  if (!canManageContent(session.user.role)) return null;

  const canMutateProperties = canManageSiteSettings(session.user.role);

  const [siteSettings, bannerData, pageSeo] = await Promise.all([
    prisma.siteSettings.findFirst(),
    getPageBannerAdmin("contact"),
    canMutateProperties
      ? prisma.pageSeo.findUnique({ where: { key: "contact" } })
      : Promise.resolve(null),
  ]);

  return (
    <ContactAdminShell
      key={`${bannerData.version}-${pageSeo?.version ?? 0}`}
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
      siteSettings={
        siteSettings
          ? {
              phone: siteSettings.phone ?? "",
              email: siteSettings.email ?? "",
              addressTh: siteSettings.addressTh ?? "",
              addressEn: siteSettings.addressEn ?? "",
              hoursTh: siteSettings.hoursTh ?? "",
              hoursEn: siteSettings.hoursEn ?? "",
              mapQuery: siteSettings.mapQuery ?? "",
              lineUrl: siteSettings.lineUrl ?? "",
              facebookUrl: siteSettings.facebookUrl ?? "",
              instagramUrl: siteSettings.instagramUrl ?? "",
              tiktokUrl: siteSettings.tiktokUrl ?? "",
              youtubeUrl: siteSettings.youtubeUrl ?? "",
              contactTitleTh: siteSettings.contactTitleTh ?? "",
              contactTitleEn: siteSettings.contactTitleEn ?? "",
              contactSubtitleTh: siteSettings.contactSubtitleTh ?? "",
              contactSubtitleEn: siteSettings.contactSubtitleEn ?? "",
            }
          : null
      }
      bannerData={bannerData}
    />
  );
}
