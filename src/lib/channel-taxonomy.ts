import type { ChannelType } from "@/generated/prisma/enums";

/**
 * "ประเภทช่องทางย่อย" — the middle layer of the SA's 3-tier taxonomy (ประเภท ->
 * ประเภทย่อย -> ช่องทาง). Stored on `PromoChannel.subType` as a plain
 * `VarChar(4)` code (not a Prisma enum — see the schema comment on that
 * column for why), so this table is the single source of truth for which
 * codes exist, their labels, which `ChannelType` they belong to, and their
 * default UTM `source`/`medium` pair.
 *
 * Type-only import of `ChannelType` — this file is imported by the (client)
 * channels admin form, so nothing generated should ship in that bundle.
 */

export type ChannelSubTypeCode =
  | "TE"
  | "LN"
  | "LO"
  | "TT"
  | "FB"
  | "WS"
  | "CP"
  | "RF"
  | "EF"
  | "AG";

export type ChannelSubType = {
  code: ChannelSubTypeCode;
  nameTh: string;
  nameEn: string;
  channelType: ChannelType;
  /** Null for the four person/company groups (CP/RF/EF/AG) — the SA's sheet
   * leaves utm_source/utm_medium blank for those rows on purpose. */
  utmSource: string | null;
  utmMedium: string | null;
};

export const CHANNEL_SUB_TYPES: readonly ChannelSubType[] = [
  { code: "TE", nameTh: "Tele Sale", nameEn: "Tele Sale", channelType: "PLATFORM", utmSource: "telesale", utmMedium: "direct" },
  { code: "LN", nameTh: "Line", nameEn: "Line", channelType: "PLATFORM", utmSource: "line", utmMedium: "chat" },
  { code: "LO", nameTh: "Line OA", nameEn: "Line OA", channelType: "PLATFORM", utmSource: "line_oa", utmMedium: "chat" },
  { code: "TT", nameTh: "TikTok", nameEn: "TikTok", channelType: "PLATFORM", utmSource: "tiktok", utmMedium: "social" },
  { code: "FB", nameTh: "Facebook", nameEn: "Facebook", channelType: "PLATFORM", utmSource: "facebook", utmMedium: "social" },
  { code: "WS", nameTh: "Website", nameEn: "Website", channelType: "PLATFORM", utmSource: "website", utmMedium: "direct" },
  { code: "CP", nameTh: "บริษัท (Corporate/B2B)", nameEn: "Corporate/B2B", channelType: "COMPANY", utmSource: null, utmMedium: null },
  { code: "RF", nameTh: "ลูกค้าเก่า", nameEn: "Referral (Past Customer)", channelType: "INDIVIDUAL", utmSource: null, utmMedium: null },
  { code: "EF", nameTh: "พนักงาน", nameEn: "Employee", channelType: "INDIVIDUAL", utmSource: null, utmMedium: null },
  { code: "AG", nameTh: "นายหน้า", nameEn: "Agent", channelType: "INDIVIDUAL", utmSource: null, utmMedium: null },
];

export const CHANNEL_SUB_TYPE_CODES = CHANNEL_SUB_TYPES.map(
  (s) => s.code
) as [ChannelSubTypeCode, ...ChannelSubTypeCode[]];

export function subTypeOf(code: string | null | undefined): ChannelSubType | undefined {
  if (!code) return undefined;
  return CHANNEL_SUB_TYPES.find((s) => s.code === code);
}

// The admin dropdown is populated from PROMO_LANDING_PATH_OPTIONS (below).
// This constant is the fallback value for old/missing form values.
export const CHANNEL_DEFAULT_LANDING_PATH = "/th/packages";

/**
 * All real public pages in the order they appear in both locale groups.
 * Labels reuse the public site's `nav` wording (admin UI is Thai-only) so a
 * promo link's destination reads the same here as in the site header.
 */
const PUBLIC_PAGES = [
  { segment: "", labelTh: "หน้าแรก" },
  { segment: "packages", labelTh: "แพ็กเกจ" },
  { segment: "services", labelTh: "บริการ" },
  { segment: "portfolio", labelTh: "ผลงาน" },
  { segment: "testimonials", labelTh: "รีวิวลูกค้า" },
  { segment: "calculator", labelTh: "เครื่องคำนวณ" },
  { segment: "booking", labelTh: "สอบถาม/นัดสำรวจ" },
  { segment: "about", labelTh: "เกี่ยวกับเรา" },
  { segment: "contact", labelTh: "ติดต่อเรา" },
  { segment: "cookie-policy", labelTh: "นโยบายคุกกี้" },
] as const;

/** 10 pages × 2 locales — TH group first, same page order in both groups. */
export const PROMO_LANDING_PATH_OPTIONS: readonly {
  path: string;
  locale: "th" | "en";
  label: string;
}[] = (["th", "en"] as const).flatMap((locale) =>
  PUBLIC_PAGES.map(({ segment, labelTh }) => ({
    path: segment ? `/${locale}/${segment}` : `/${locale}`,
    locale,
    label: labelTh,
  }))
);

export const PROMO_LANDING_PATHS: readonly string[] =
  PROMO_LANDING_PATH_OPTIONS.map((o) => o.path);

export function isPromoLandingPath(path: string): boolean {
  return PROMO_LANDING_PATHS.includes(path);
}

/** utm_campaign is a closed choice per the SA sheet, not free text. */
export const CHANNEL_UTM_CAMPAIGNS = ["package_info", "always_on"] as const;

export type ChannelUtmCampaign = (typeof CHANNEL_UTM_CAMPAIGNS)[number];
