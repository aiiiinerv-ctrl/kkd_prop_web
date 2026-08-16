import { z } from "zod";
import { META_KEYS } from "@/lib/seo";

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

export const pageSeoSchema = z.object({
  key: z.enum(META_KEYS),
  titleTh: optionalText,
  titleEn: optionalText,
  descriptionTh: optionalText,
  descriptionEn: optionalText,
});
