"use server";

import { auditedEntity } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { aboutContentSchema } from "@/lib/validations/about-content";
import type { ActionResult } from "./users";

const ABOUT_REVALIDATE = [
  "/th/about",
  "/en/about",
  "/admin/content/about",
] as const;

const aboutContent = auditedEntity({
  entityType: "AboutContent",
  model: (client) => client.aboutContent,
  snapshot: "full",
  revalidate: () => ABOUT_REVALIDATE,
});

const ABOUT_FIELDS = [
  "titleTh", "titleEn",
  "introTh", "introEn",
  "credRegisteredTitleTh", "credRegisteredTitleEn",
  "credRegisteredDescTh", "credRegisteredDescEn",
  "credEngineerTitleTh", "credEngineerTitleEn",
  "credEngineerDescTh", "credEngineerDescEn",
  "credExperienceTitleTh", "credExperienceTitleEn",
  "credExperienceDescTh", "credExperienceDescEn",
  "teamTitleTh", "teamTitleEn",
  "teamDescTh", "teamDescEn",
  "teamDesignTitleTh", "teamDesignTitleEn",
  "teamDesignDescTh", "teamDesignDescEn",
  "teamInstallTitleTh", "teamInstallTitleEn",
  "teamInstallDescTh", "teamInstallDescEn",
  "teamSupportTitleTh", "teamSupportTitleEn",
  "teamSupportDescTh", "teamSupportDescEn",
] as const;

export async function updateAboutContent(formData: FormData): Promise<ActionResult> {
  await requireRole("ADMIN", "SALES", "MARKETING", "EDITOR");

  const raw = Object.fromEntries(
    ABOUT_FIELDS.map((k) => [k, formData.get(k) ?? ""])
  );

  const parsed = aboutContentSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };

  const existing = await prisma.aboutContent.findFirst({ select: { id: true } });
  if (!existing) return { ok: false, error: "ไม่พบเนื้อหา" };

  const updated = await aboutContent.update(existing.id, parsed.data);
  if (!updated) return { ok: false, error: "ไม่พบเนื้อหา" };

  return { ok: true };
}
