"use server";

import { z } from "zod";
import { slugify, storePublicImages } from "@/lib/admin-content";
import { auditedEntity } from "@/lib/audit";
import { canPublishContent, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
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
    "/admin/pages/portfolio",
    "/admin/portfolio",
    ["/[locale]/portfolio", "page"],
    ["/[locale]", "page"],
  ],
});

function asStringKeys(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((k): k is string => typeof k === "string" && k.length > 0);
}

/** Same multiset, possibly different order — rejects foreign/missing/duplicate extras. */
function isPermutation(current: string[], next: string[]): boolean {
  if (current.length !== next.length) return false;
  if (new Set(next).size !== next.length) return false;
  const counts = new Map<string, number>();
  for (const k of current) counts.set(k, (counts.get(k) ?? 0) + 1);
  for (const k of next) {
    const n = counts.get(k);
    if (!n) return false;
    counts.set(k, n - 1);
  }
  return true;
}

/**
 * HomeFeaturedPortfolioProject is still deferred (#66 A2). When that table
 * lands, count references here and return a Thai error naming the Home page.
 */
async function homeReferenceBlockMessage(projectId: string): Promise<string | null> {
  void projectId;
  return null;
}

export async function createProject(formData: FormData): Promise<ActionResult> {
  const session = await requireRole("ADMIN", "SALES", "MARKETING", "EDITOR");

  const parsed = parseProject(formData);
  if (!parsed.success) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };

  const images = await storePublicImages(formData.getAll("images"), "portfolio");
  if (!images.ok) return { ok: false, error: images.error };
  if (images.keys.length === 0) return { ok: false, error: "กรุณาแนบรูปผลงาน" };

  const canPublish = canPublishContent(session.user.role);

  await projects.create({
    ...parsed.data,
    isPublished: canPublish ? parsed.data.isPublished : false,
    slug: slugify(parsed.data.titleEn),
    imageKeys: images.keys,
  });

  return { ok: true };
}

export async function updateProject(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const session = await requireRole("ADMIN", "SALES", "MARKETING", "EDITOR");

  const parsed = parseProject(formData);
  if (!parsed.success) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };

  const images = await storePublicImages(formData.getAll("images"), "portfolio");
  if (!images.ok) return { ok: false, error: images.error };

  const { isPublished, ...rest } = parsed.data;
  const canPublish = canPublishContent(session.user.role);

  let nextImageKeys: string[] | undefined;
  if (images.keys.length > 0) {
    nextImageKeys = images.keys;
  } else {
    const orderRaw = formData.get("imageKeysOrderJson");
    if (typeof orderRaw === "string" && orderRaw.trim()) {
      let ordered: unknown;
      try {
        ordered = JSON.parse(orderRaw);
      } catch {
        return { ok: false, error: "ลำดับรูปไม่ถูกต้อง" };
      }
      const next = asStringKeys(ordered);
      const existing = await prisma.portfolioProject.findUnique({
        where: { id },
        select: { imageKeys: true },
      });
      if (!existing) return { ok: false, error: "ไม่พบผลงาน" };
      const current = asStringKeys(existing.imageKeys);
      if (!isPermutation(current, next)) {
        return { ok: false, error: "ลำดับรูปต้องเป็นรูปของผลงานนี้เท่านั้น" };
      }
      nextImageKeys = next;
    }
  }

  const result = await projects.update(id, {
    ...rest,
    ...(canPublish ? { isPublished } : {}),
    ...(nextImageKeys ? { imageKeys: nextImageKeys } : {}),
  });
  if (!result) return { ok: false, error: "ไม่พบผลงาน" };

  if (images.keys.length > 0) {
    for (const key of asStringKeys(result.before.imageKeys)) {
      await storage.delete(key);
    }
  }
  return { ok: true };
}

export async function deleteProject(id: string): Promise<ActionResult> {
  await requireRole("ADMIN", "SALES", "MARKETING");

  const blocked = await homeReferenceBlockMessage(id);
  if (blocked) return { ok: false, error: blocked };

  const before = await projects.remove(id);
  if (!before) return { ok: false, error: "ไม่พบผลงาน" };

  for (const key of asStringKeys(before.imageKeys)) {
    await storage.delete(key);
  }
  return { ok: true };
}
