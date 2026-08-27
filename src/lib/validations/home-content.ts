import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .transform((v) => v || null);

/**
 * Hero alt text is required in both locales (live-verify matrix C5) — unlike
 * every other Content field, it has no Thai-fallback safety net for
 * accessibility purposes: a screen reader on `/en` must not read Thai alt
 * text just because the English column happened to be left blank.
 */
const requiredAlt = z.string().trim().min(1, "ต้องกรอกข้อความ alt ของรูปภาพหลัก").max(200);

/**
 * Explicit allow-list of `HomePageContent` scalar text columns editable from
 * `/admin/pages/home` (hero copy, proof panel, feature labels, Latest Works
 * heading/metrics, Services CTA copy, FAQ chrome). Kept as its own array
 * (not derived from the zod schema) so `src/actions/home-content.ts` can
 * reject any FormData key that isn't in this exact list — see
 * docs/plans/home-cms-slice-security-research.md S3 (mass-assign / unknown
 * keys). Every field here has a paired `xxxTh`/`xxxEn` column; leaving the
 * English half blank falls back to Thai on the public page (Sprint H3),
 * mirroring `about-content.ts`.
 *
 * Intentionally excluded: `heroImageKey` (set via the separate `heroImage`
 * file field — see `src/actions/home-content.ts` — never as a plain string,
 * so a client can never point the row at an arbitrary storage key), `key`,
 * `id`, `version`, `updatedAt`.
 */
export const HOME_CONTENT_FIELDS = [
  "heroKickerTh", "heroKickerEn",
  "heroTitleWhiteTh", "heroTitleWhiteEn",
  "heroTitleGoldTh", "heroTitleGoldEn",
  "heroSubtitleTh", "heroSubtitleEn",
  "heroAltTh", "heroAltEn",
  "ctaPrimaryLabelTh", "ctaPrimaryLabelEn",
  "ctaSecondaryLabelTh", "ctaSecondaryLabelEn",
  "quickContactLabelTh", "quickContactLabelEn",
  "proofLabelTh", "proofLabelEn",
  "proofTitleTh", "proofTitleEn",
  "proofItem1Th", "proofItem1En",
  "proofItem2Th", "proofItem2En",
  "proofItem3Th", "proofItem3En",
  "feature1LabelTh", "feature1LabelEn",
  "feature2LabelTh", "feature2LabelEn",
  "feature3LabelTh", "feature3LabelEn",
  "feature4LabelTh", "feature4LabelEn",
  "latestWorksHeadingTh", "latestWorksHeadingEn",
  "metric1LabelTh", "metric1LabelEn",
  "metric1ValueTh", "metric1ValueEn",
  "metric2LabelTh", "metric2LabelEn",
  "metric2ValueTh", "metric2ValueEn",
  "metric3LabelTh", "metric3LabelEn",
  "metric3ValueTh", "metric3ValueEn",
  "viewAllLabelTh", "viewAllLabelEn",
  "servicesCtaBadgeTh", "servicesCtaBadgeEn",
  "servicesCtaTitleTh", "servicesCtaTitleEn",
  "servicesCtaTextTh", "servicesCtaTextEn",
  "servicesCtaLinkLabelTh", "servicesCtaLinkLabelEn",
  "faqBadgeTh", "faqBadgeEn",
  "faqTitleTh", "faqTitleEn",
  "faqIntroTh", "faqIntroEn",
  "faqLineButtonLabelTh", "faqLineButtonLabelEn",
] as const;

/** The three section-visibility booleans, submitted as HTML checkboxes (not part of the zod text schema). */
export const HOME_BOOLEAN_FIELDS = ["showLatestWorks", "showServicesCta", "showFaq"] as const;

export const homeContentFieldsSchema = z.object({
  heroKickerTh: optionalText, heroKickerEn: optionalText,
  heroTitleWhiteTh: optionalText, heroTitleWhiteEn: optionalText,
  heroTitleGoldTh: optionalText, heroTitleGoldEn: optionalText,
  heroSubtitleTh: optionalText, heroSubtitleEn: optionalText,
  heroAltTh: requiredAlt, heroAltEn: requiredAlt,
  ctaPrimaryLabelTh: optionalText, ctaPrimaryLabelEn: optionalText,
  ctaSecondaryLabelTh: optionalText, ctaSecondaryLabelEn: optionalText,
  quickContactLabelTh: optionalText, quickContactLabelEn: optionalText,
  proofLabelTh: optionalText, proofLabelEn: optionalText,
  proofTitleTh: optionalText, proofTitleEn: optionalText,
  proofItem1Th: optionalText, proofItem1En: optionalText,
  proofItem2Th: optionalText, proofItem2En: optionalText,
  proofItem3Th: optionalText, proofItem3En: optionalText,
  feature1LabelTh: optionalText, feature1LabelEn: optionalText,
  feature2LabelTh: optionalText, feature2LabelEn: optionalText,
  feature3LabelTh: optionalText, feature3LabelEn: optionalText,
  feature4LabelTh: optionalText, feature4LabelEn: optionalText,
  latestWorksHeadingTh: optionalText, latestWorksHeadingEn: optionalText,
  metric1LabelTh: optionalText, metric1LabelEn: optionalText,
  metric1ValueTh: optionalText, metric1ValueEn: optionalText,
  metric2LabelTh: optionalText, metric2LabelEn: optionalText,
  metric2ValueTh: optionalText, metric2ValueEn: optionalText,
  metric3LabelTh: optionalText, metric3LabelEn: optionalText,
  metric3ValueTh: optionalText, metric3ValueEn: optionalText,
  viewAllLabelTh: optionalText, viewAllLabelEn: optionalText,
  servicesCtaBadgeTh: optionalText, servicesCtaBadgeEn: optionalText,
  servicesCtaTitleTh: optionalText, servicesCtaTitleEn: optionalText,
  servicesCtaTextTh: optionalText, servicesCtaTextEn: optionalText,
  servicesCtaLinkLabelTh: optionalText, servicesCtaLinkLabelEn: optionalText,
  faqBadgeTh: optionalText, faqBadgeEn: optionalText,
  faqTitleTh: optionalText, faqTitleEn: optionalText,
  faqIntroTh: optionalText, faqIntroEn: optionalText,
  faqLineButtonLabelTh: optionalText, faqLineButtonLabelEn: optionalText,
});

// Security research S11/S12: FAQ text renders as plain text nodes on the
// public page (never dangerouslySetInnerHTML) — reject "<" and control
// characters defensively at the input boundary too, rather than relying on
// React's escaping alone.
const NO_ANGLE_BRACKET = /^[^<]*$/;
const NO_CONTROL_CHARS = /^[^\u0000-\u0008\u000B\u000C\u000E-\u001F]*$/;

function plainText(max: number) {
  return z
    .string()
    .trim()
    .min(1, "ต้องกรอกข้อความ")
    .max(max, `ยาวเกิน ${max} ตัวอักษร`)
    .refine((v) => NO_ANGLE_BRACKET.test(v), "ห้ามใช้เครื่องหมาย < ในข้อความ")
    .refine((v) => NO_CONTROL_CHARS.test(v), "มีอักขระที่ไม่รองรับในข้อความ");
}

/**
 * One FAQ row. `.strict()` rejects any extra JSON key (defense-in-depth
 * alongside the FormData allow-list check in the action). Both TH and EN are
 * required for every field — unlike the parent Content fields, FAQ rows have
 * no message fallback (`HomeFaqItem` columns are non-null in the schema).
 */
export const homeFaqItemSchema = z
  .object({
    id: z.string().trim().min(1).optional(),
    questionTh: plainText(300),
    questionEn: plainText(300),
    answerTh: plainText(2000),
    answerEn: plainText(2000),
  })
  .strict();

export const HOME_FAQ_MAX = 12;

export const homeFaqListSchema = z.array(homeFaqItemSchema).max(HOME_FAQ_MAX);
