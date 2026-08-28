import { canManageContent, requireRole } from "@/lib/auth";
import { getPageBannerAdmin } from "@/lib/admin/page-banner-admin";
import { prisma } from "@/lib/db";
import { ContactAdminShell } from "./contact-admin-shell";

export default async function PagesContactPage() {
  const session = await requireRole("ADMIN", "SALES", "MARKETING", "EDITOR");
  if (!canManageContent(session.user.role)) return null;

  const [siteSettings, bannerData] = await Promise.all([
    prisma.siteSettings.findFirst(),
    getPageBannerAdmin("contact"),
  ]);

  return (
    <ContactAdminShell
      key={bannerData.version}
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
