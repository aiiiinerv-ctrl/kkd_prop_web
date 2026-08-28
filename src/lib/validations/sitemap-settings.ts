import { z } from "zod";
import { SITEMAP_SECTION_IDS } from "@/lib/sitemap/types";

const sectionSchema = z.object({
  id: z.enum(SITEMAP_SECTION_IDS),
  enabled: z.boolean(),
  sortOrder: z.number().int().min(0).max(99),
  labelTh: z.string().max(120).optional(),
  labelEn: z.string().max(120).optional(),
});

export const sitemapConfigSchema = z.object({
  version: z.number().int().min(1).max(99).default(1),
  sections: z.array(sectionSchema).min(1).max(SITEMAP_SECTION_IDS.length),
});

export type SitemapConfigInput = z.infer<typeof sitemapConfigSchema>;

export function sitemapConfigFromFormData(formData: FormData): SitemapConfigInput | null {
  const raw = formData.get("configJson");
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const json = JSON.parse(raw) as unknown;
    const parsed = sitemapConfigSchema.safeParse(json);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
