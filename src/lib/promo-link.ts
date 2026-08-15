import { subTypeOf } from "@/lib/channel-taxonomy";

/**
 * Builds the full promo link handed out for a channel or an executive under
 * it. Lives outside the admin client component because Sprint 4 (lead
 * detail / export) needs the exact same URL shape server-side, and because a
 * server file can't accidentally end up importing a "use client" module.
 *
 * `subType`/`utmCampaign` come from the *channel* even when the link is for
 * one of its executives — an executive has no subType of their own, they
 * inherit the channel's classification and just swap in their own refCode.
 */
export function buildPromoLink({
  siteUrl,
  refCode,
  landingPath,
  subType,
  utmCampaign,
}: {
  siteUrl: string;
  refCode: string;
  landingPath: string;
  subType: string | null;
  utmCampaign: string | null;
}): string {
  const params = new URLSearchParams({ ref: refCode });

  // Channels not yet classified (subType null — e.g. legacy CH0xx rows) or
  // classified into one of the four person/company groups (CP/RF/EF/AG, which
  // the SA sheet leaves utm_source/utm_medium blank for on purpose) get a
  // plain ?ref= link. Attaching empty utm_source/utm_medium values would be
  // worse than omitting them — it would look like real, empty-string
  // campaign data to anything reading the link later.
  const taxonomy = subTypeOf(subType);
  if (taxonomy?.utmSource && taxonomy?.utmMedium) {
    params.set("utm_source", taxonomy.utmSource);
    params.set("utm_medium", taxonomy.utmMedium);
    if (utmCampaign) params.set("utm_campaign", utmCampaign);
    params.set("utm_content", refCode);
  }

  return `${siteUrl}${landingPath}?${params.toString()}`;
}
