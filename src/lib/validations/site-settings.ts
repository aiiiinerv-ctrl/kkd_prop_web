import { z } from "zod";

const optionalUrl = z
  .string()
  .trim()
  .refine((v) => v === "" || z.string().url().safeParse(v).success, {
    message: "ต้องเป็น URL ที่ถูกต้อง หรือเว้นว่างไว้",
  })
  .transform((v) => v || null);

const optionalText = z
  .string()
  .trim()
  .transform((v) => v || null);

/** Tab 3 — contact info + social URLs */
export const contactSettingsSchema = z.object({
  phone: optionalText,
  email: z
    .string()
    .trim()
    .refine((v) => v === "" || z.string().email().safeParse(v).success, {
      message: "ต้องเป็นอีเมลที่ถูกต้อง หรือเว้นว่างไว้",
    })
    .transform((v) => v || null),
  addressTh: optionalText,
  addressEn: optionalText,
  hoursTh: optionalText,
  hoursEn: optionalText,
  mapQuery: optionalText,
  lineUrl: optionalUrl,
  facebookUrl: optionalUrl,
  instagramUrl: optionalUrl,
  tiktokUrl: optionalUrl,
  youtubeUrl: optionalUrl,
  contactTitleTh: optionalText,
  contactTitleEn: optionalText,
  contactSubtitleTh: optionalText,
  contactSubtitleEn: optionalText,
});

/** Tab 4 — header CTA + footer description text */
export const headerFooterSettingsSchema = z.object({
  headerCtaLabelTh: optionalText,
  headerCtaLabelEn: optionalText,
  footerDescriptionTh: optionalText,
  footerDescriptionEn: optionalText,
});

const optionalScript = z
  .string()
  .trim()
  .max(10000, "ต้องมีความยาวไม่เกิน 10,000 ตัวอักษร")
  .transform((v) => v || null);

/**
 * Google Analytics / tracking scripts tab (#116) — raw HTML/script paste,
 * ADMIN only. No content sanitization or shape validation (locked decision
 * #3 in docs/plans/ga-tracking-scripts-implementation-sprints.md): only a
 * length guard.
 */
export const analyticsSettingsSchema = z.object({
  headerScript: optionalScript,
  bodyScript: optionalScript,
});
