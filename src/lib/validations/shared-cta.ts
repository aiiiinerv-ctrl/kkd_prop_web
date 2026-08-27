import { z } from "zod";
import { optionalPageText, pageVersionSchema } from "@/lib/validations/page-content";

/** Shared Site Content — global CTA banner on SiteSettings (#68). */
export const sharedCtaFieldsSchema = z.object({
  expectedVersion: pageVersionSchema,
  ctaTitleTh: optionalPageText,
  ctaTitleEn: optionalPageText,
  ctaSubtitleTh: optionalPageText,
  ctaSubtitleEn: optionalPageText,
  ctaPrimaryLabelTh: optionalPageText,
  ctaPrimaryLabelEn: optionalPageText,
  ctaSecondaryLabelTh: optionalPageText,
  ctaSecondaryLabelEn: optionalPageText,
});
