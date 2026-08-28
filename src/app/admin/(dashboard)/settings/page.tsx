import { requireRole } from "@/lib/auth";
import { getPageBannerAdmin } from "@/lib/admin/page-banner-admin";
import { resolveSiteLogoUrls } from "@/lib/content/page-banner";
import { prisma } from "@/lib/db";
import { META_KEYS } from "@/lib/seo";
import type { Role } from "@/lib/auth";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const session = await requireRole("ADMIN", "MARKETING");
  const role = session.user.role as Role;
  const isAdmin = role === "ADMIN";

  const [
    bookingCapacity,
    paymentSettings,
    siteSettings,
    pageSeoRows,
    contactBannerData,
  ] = await Promise.all([
    isAdmin ? prisma.bookingCapacitySetting.findFirst() : null,
    isAdmin ? prisma.paymentSettings.findFirst() : null,
    prisma.siteSettings.findFirst(),
    prisma.pageSeo.findMany({ where: { key: { in: META_KEYS as unknown as string[] } } }),
    getPageBannerAdmin("contact"),
  ]);

  const logoUrls = await resolveSiteLogoUrls(
    siteSettings?.headerLogoKey,
    siteSettings?.footerLogoKey
  );

  // Build a keyed map so the client doesn't have to search
  const pageSeoMap = Object.fromEntries(pageSeoRows.map((r) => [r.key, r]));

  return (
    <SettingsClient
      role={role}
      setting={
        isAdmin
          ? {
              maxPerDay: bookingCapacity?.maxPerDay ?? 4,
              maxPerSlot: bookingCapacity?.maxPerSlot ?? 2,
            }
          : null
      }
      paymentSettings={
        isAdmin
          ? {
              promptpayId: paymentSettings?.promptpayId ?? "",
              bankName: paymentSettings?.bankName ?? "",
              bankAccountNumber: paymentSettings?.bankAccountNumber ?? "",
              bankAccountName: paymentSettings?.bankAccountName ?? "",
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
              headerCtaLabelTh: siteSettings.headerCtaLabelTh ?? "",
              headerCtaLabelEn: siteSettings.headerCtaLabelEn ?? "",
              footerDescriptionTh: siteSettings.footerDescriptionTh ?? "",
              footerDescriptionEn: siteSettings.footerDescriptionEn ?? "",
            }
          : null
      }
      pageSeoMap={Object.fromEntries(
        META_KEYS.map((key) => {
          const row = pageSeoMap[key];
          return [
            key,
            {
              titleTh: row?.titleTh ?? "",
              titleEn: row?.titleEn ?? "",
              descriptionTh: row?.descriptionTh ?? "",
              descriptionEn: row?.descriptionEn ?? "",
            },
          ];
        })
      )}
      headerLogoUrl={logoUrls.header}
      footerLogoUrl={logoUrls.footer}
      contactBannerData={contactBannerData}
    />
  );
}
