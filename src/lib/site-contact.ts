import type { SiteSettingsView } from "@/lib/content";

/** Pre-seed defaults — single source for observation-window fallbacks (site-content-cms #5). */
export const SITE_CONTACT_FALLBACKS = {
  phone: "0824731567",
  lineUrl: "https://line.me/R/ti/p/@kkdsolar",
  facebookUrl: "https://facebook.com/kkdsolar",
  email: "contact@kkdproperty.com",
} as const;

/**
 * G5 contact policy: when a SiteSettings row exists, null means "admin cleared
 * it" → omit on public surfaces. When no row, use fallback (messages/seed path).
 */
export function pickSiteContactValue(
  dbValue: string | null | undefined,
  hasRow: boolean,
  fallback: string
): string | null {
  if (dbValue) return dbValue;
  return hasRow ? null : fallback;
}

export type ResolvedQuickContact = {
  hasRow: boolean;
  phone: string | null;
  email: string | null;
  lineUrl: string | null;
  facebookUrl: string | null;
  address: string | null;
  hours: string | null;
};

export function resolveQuickContact(
  settings: SiteSettingsView | null,
  fallbacks: typeof SITE_CONTACT_FALLBACKS = SITE_CONTACT_FALLBACKS
): ResolvedQuickContact {
  const hasRow = settings !== null;
  return {
    hasRow,
    phone: pickSiteContactValue(settings?.phone, hasRow, fallbacks.phone),
    email: pickSiteContactValue(settings?.email, hasRow, fallbacks.email),
    lineUrl: pickSiteContactValue(
      settings?.socialLinks.find((s) => s.key === "line")?.url,
      hasRow,
      fallbacks.lineUrl
    ),
    facebookUrl: pickSiteContactValue(settings?.facebookUrl, hasRow, fallbacks.facebookUrl),
    address: hasRow ? settings?.address ?? null : null,
    hours: hasRow ? settings?.hours ?? null : null,
  };
}

export function formatThTelephoneE164(phone: string): string {
  return `+66${phone.replace(/^0/, "").replace(/[-\s]/g, "")}`;
}
