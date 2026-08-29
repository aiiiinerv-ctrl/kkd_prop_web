import { requireRole } from "@/lib/auth";
import { resolveSiteLogoUrls } from "@/lib/content/page-banner";
import { prisma } from "@/lib/db";
import type { Role } from "@/lib/auth";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const session = await requireRole("ADMIN", "MARKETING");
  const role = session.user.role as Role;
  const isAdmin = role === "ADMIN";

  const [bookingCapacity, paymentSettings, siteSettings] = await Promise.all([
    isAdmin ? prisma.bookingCapacitySetting.findFirst() : null,
    isAdmin ? prisma.paymentSettings.findFirst() : null,
    prisma.siteSettings.findFirst(),
  ]);

  const logoUrls = await resolveSiteLogoUrls(
    siteSettings?.headerLogoKey,
    siteSettings?.footerLogoKey
  );

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
              headerCtaLabelTh: siteSettings.headerCtaLabelTh ?? "",
              headerCtaLabelEn: siteSettings.headerCtaLabelEn ?? "",
              footerDescriptionTh: siteSettings.footerDescriptionTh ?? "",
              footerDescriptionEn: siteSettings.footerDescriptionEn ?? "",
              // ADMIN only (raw script injection surface) — withheld from
              // MARKETING sessions' RSC payload, not just hidden client-side,
              // matching the isAdmin-gated fetch pattern above for
              // bookingCapacity/paymentSettings.
              headerScript: isAdmin ? (siteSettings.headerScript ?? "") : "",
              bodyScript: isAdmin ? (siteSettings.bodyScript ?? "") : "",
            }
          : null
      }
      headerLogoUrl={logoUrls.header}
      footerLogoUrl={logoUrls.footer}
    />
  );
}
