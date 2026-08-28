import { z } from "zod";
import {
  BANNER_MODES,
  BANNER_SLIDE_MAX,
  BANNER_SLIDE_MIN,
  isBannerLinkPath,
  isBannerPageSlug,
} from "@/lib/page-banners";
/** 0 = no row yet (first save); existing rows use positive version from DB. */
const pageBannerVersionSchema = z.coerce.number().int().min(0);

const requiredAlt = z.string().trim().min(1, "กรุณากรอกข้อความ alt");

export const pageBannerSlideSchema = z.object({
  id: z.string().optional(),
  altTh: requiredAlt,
  altEn: requiredAlt,
  linkPath: z
    .string()
    .trim()
    .refine((v) => isBannerLinkPath(v), { message: "ลิงก์ไม่ถูกต้อง" }),
  /** Existing storage key — omitted when a new file is uploaded for this index. */
  imageKey: z.string().trim().optional(),
  /** Hide from the public site without deleting the row (#117). */
  isActive: z.coerce.boolean().default(true),
});

export const pageBannerFormSchema = z
  .object({
    pageSlug: z.string().refine(isBannerPageSlug, { message: "หน้าไม่ถูกต้อง" }),
    expectedVersion: pageBannerVersionSchema,
    mode: z.enum(BANNER_MODES),
    slides: z.array(pageBannerSlideSchema).max(BANNER_SLIDE_MAX),
  })
  .superRefine((data, ctx) => {
    if (data.mode === "OFF") return;
    if (data.mode === "FIXED") {
      if (data.slides.length !== 1) {
        ctx.addIssue({
          code: "custom",
          message: "แบนเนอร์แบบรูปเดียวต้องมี 1 รูป",
          path: ["slides"],
        });
      }
      return;
    }
    if (data.slides.length < BANNER_SLIDE_MIN || data.slides.length > BANNER_SLIDE_MAX) {
      ctx.addIssue({
        code: "custom",
        message: `สไลด์ต้องมี ${BANNER_SLIDE_MIN}–${BANNER_SLIDE_MAX} รูป`,
        path: ["slides"],
      });
    }
  });

export type PageBannerFormInput = z.infer<typeof pageBannerFormSchema>;
