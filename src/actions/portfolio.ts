"use server";

import { z } from "zod";
import { slugify, storePublicImages } from "@/lib/admin-content";
import { auditedEntity } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import { storage } from "@/lib/storage";
import type { ActionResult } from "./users";

const projectSchema = z.object({
  titleTh: z.string().trim().min(2).max(200),
  titleEn: z.string().trim().min(2).max(200),
  descriptionTh: z.string().trim().min(2).max(2000),
  descriptionEn: z.string().trim().min(2).max(2000),
  category: z.enum(["RESIDENTIAL", "COMMERCIAL", "INDUSTRIAL"]),
  province: z.string().trim().min(2).max(80),
  systemSizeKw: z.coerce.number().positive().max(10000),
  completedAt: z.coerce.date().optional(),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  isPublished: z.coerce.boolean(),
});

function parseProject(formData: FormData) {
  return projectSchema.safeParse({
    titleTh: formData.get("titleTh"),
    titleEn: formData.get("titleEn"),
    descriptionTh: formData.get("descriptionTh"),
    descriptionEn: formData.get("descriptionEn"),
    category: formData.get("category"),
    province: formData.get("province"),
    systemSizeKw: formData.get("systemSizeKw"),
    completedAt: formData.get("completedAt") || undefined,
    sortOrder: formData.get("sortOrder") || 0,
    isPublished: formData.get("isPublished") === "on",
  });
}

const projects = auditedEntity({
  entityType: "PortfolioProject",
  model: (client) => client.portfolioProject,
  snapshot: "full",
  revalidate: () => [
    "/admin/portfolio",
    ["/[locale]/portfolio", "page"],
    ["/[locale]", "page"],
  ],
});

export async function createProject(formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const parsed = parseProject(formData);
  if (!parsed.success) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };

  const images = await storePublicImages(formData.getAll("images"), "portfolio");
  if (!images.ok) return { ok: false, error: images.error };
  if (images.keys.length === 0) return { ok: false, error: "กรุณาแนบรูปผลงาน" };

  await projects.create({
    ...parsed.data,
    slug: slugify(parsed.data.titleEn),
    imageKeys: images.keys,
  });

  return { ok: true };
}

export async function updateProject(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = parseProject(formData);
  if (!parsed.success) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };

  const images = await storePublicImages(formData.getAll("images"), "portfolio");
  if (!images.ok) return { ok: false, error: images.error };

  const result = await projects.update(id, {
    ...parsed.data,
    ...(images.keys.length > 0 ? { imageKeys: images.keys } : {}),
  });
  if (!result) return { ok: false, error: "ไม่พบผลงาน" };

  if (images.keys.length > 0) {
    for (const key of result.before.imageKeys as string[]) {
      await storage.delete(key);
    }
  }
  return { ok: true };
}

export async function deleteProject(id: string): Promise<ActionResult> {
  await requireAdmin();

  const before = await projects.remove(id);
  if (!before) return { ok: false, error: "ไม่พบผลงาน" };

  for (const key of before.imageKeys as string[]) {
    await storage.delete(key);
  }
  return { ok: true };
}
