"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { slugify, storePublicImage } from "@/lib/admin-content";
import { withAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
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

function revalidate() {
  revalidatePath("/admin/portfolio");
  revalidatePath("/[locale]/portfolio", "page");
  revalidatePath("/[locale]", "page");
}

export async function createProject(formData: FormData): Promise<ActionResult> {
  const session = await requireAdmin();

  const parsed = parseProject(formData);
  if (!parsed.success) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };

  const image = await storePublicImage(formData.get("image"), "portfolio");
  if (!image.ok) return { ok: false, error: image.error };
  if (!image.key) return { ok: false, error: "กรุณาแนบรูปผลงาน" };

  await withAudit({
    actorId: session.user.id,
    action: "CREATE",
    entityType: "PortfolioProject",
    run: () =>
      prisma.portfolioProject.create({
        data: {
          ...parsed.data,
          slug: slugify(parsed.data.titleEn),
          imageKeys: [image.key],
        },
      }),
  });

  revalidate();
  return { ok: true };
}

export async function updateProject(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const session = await requireAdmin();

  const before = await prisma.portfolioProject.findUnique({ where: { id } });
  if (!before) return { ok: false, error: "ไม่พบผลงาน" };

  const parsed = parseProject(formData);
  if (!parsed.success) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };

  const image = await storePublicImage(formData.get("image"), "portfolio");
  if (!image.ok) return { ok: false, error: image.error };

  const oldKeys = before.imageKeys as string[];
  await withAudit({
    actorId: session.user.id,
    action: "UPDATE",
    entityType: "PortfolioProject",
    before,
    run: () =>
      prisma.portfolioProject.update({
        where: { id },
        data: {
          ...parsed.data,
          ...(image.key ? { imageKeys: [image.key] } : {}),
        },
      }),
  });

  if (image.key) {
    for (const key of oldKeys) {
      await storage.delete(key);
    }
  }
  revalidate();
  return { ok: true };
}

export async function deleteProject(id: string): Promise<ActionResult> {
  const session = await requireAdmin();

  const before = await prisma.portfolioProject.findUnique({ where: { id } });
  if (!before) return { ok: false, error: "ไม่พบผลงาน" };

  await withAudit({
    actorId: session.user.id,
    action: "DELETE",
    entityType: "PortfolioProject",
    before,
    run: async () => {
      await prisma.portfolioProject.delete({ where: { id } });
      return null;
    },
  });

  for (const key of before.imageKeys as string[]) {
    await storage.delete(key);
  }
  revalidate();
  return { ok: true };
}
