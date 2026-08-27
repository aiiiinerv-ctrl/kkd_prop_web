import { z } from "zod";
import { PAGE_KEYS } from "@/lib/pages";
import { optionalPlainMetaText, pageVersionSchema, plainMetaText } from "./page-content/primitives";

/**
 * Page Properties mutation schema (six registry keys only).
 * docs/plans/pages-cms-properties-security-guardrails.md
 *
 * Sprint 4 ships the schema + key gate; per-page Properties UI/actions
 * that write live data land in later cutover sprints.
 */
export const pagePropertiesKeySchema = z.enum(PAGE_KEYS);

const canonicalTh = z
  .string()
  .trim()
  .transform((v) => v || null)
  .refine(
    (v) => v === null || (v.startsWith("/th") && !/[?#\\]/.test(v) && !v.includes("..")),
    { message: "canonical TH ต้องขึ้นต้นด้วย /th และเป็น path ในไซต์เท่านั้น" },
  );

const canonicalEn = z
  .string()
  .trim()
  .transform((v) => v || null)
  .refine(
    (v) => v === null || (v.startsWith("/en") && !/[?#\\]/.test(v) && !v.includes("..")),
    { message: "canonical EN ต้องขึ้นต้นด้วย /en และเป็น path ในไซต์เท่านั้น" },
  );

export const pagePropertiesFieldsSchema = z.object({
  pageKey: pagePropertiesKeySchema,
  expectedVersion: pageVersionSchema,
  titleTh: plainMetaText(120),
  titleEn: plainMetaText(120),
  descriptionTh: plainMetaText(500),
  descriptionEn: plainMetaText(500),
  ogTitleTh: optionalPlainMetaText(120),
  ogTitleEn: optionalPlainMetaText(120),
  ogDescriptionTh: optionalPlainMetaText(500),
  ogDescriptionEn: optionalPlainMetaText(500),
  canonicalPathTh: canonicalTh,
  canonicalPathEn: canonicalEn,
  robotsIndex: z.boolean(),
  robotsFollow: z.boolean(),
  /**
   * Client acknowledgement when server classifies the transition as high-risk
   * (e.g. turning index off). Cannot downgrade server classification.
   */
  highRiskAcknowledged: z.boolean().optional(),
  /** keep | replace | remove — absence must not mean remove. */
  ogImageOperation: z.enum(["keep", "replace", "remove"]).default("keep"),
});

export type PagePropertiesFields = z.infer<typeof pagePropertiesFieldsSchema>;

/** High-risk if robots index/follow flips to false relative to previous. */
export function isHighRiskPropertiesTransition(params: {
  prevIndex: boolean;
  prevFollow: boolean;
  nextIndex: boolean;
  nextFollow: boolean;
}): boolean {
  return (params.prevIndex && !params.nextIndex) || (params.prevFollow && !params.nextFollow);
}
