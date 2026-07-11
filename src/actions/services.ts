"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { linesToList, slugify, storePublicImage } from "@/lib/admin-content";
import { withAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";
import type { ActionResult } from "./users";

const serviceSchema = z.object({
  kind: z.enum(["SYSTEM", "MAINTENANCE"]),
  titleTh: z.string().trim().min(2).max(200),
  titleEn: z.string().trim().min(2).max(200),
  descriptionTh: z.string().trim().min(2).max(2000),
  descriptionEn: z.string().trim().min(2).max(2000),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  isPublished: z.coerce.boolean(),
});

function parseService(formData: FormData) {
  return serviceSchema.safeParse({
    kind: formData.get("kind"),
    titleTh: formData.get("titleTh"),
    titleEn: formData.get("titleEn"),
    descriptionTh: formData.get("descriptionTh"),
    descriptionEn: formData.get("descriptionEn"),
    sortOrder: formData.get("sortOrder") || 0,
    isPublished: formData.get("isPublished") === "on",
  });
}

function revalidate() {
  revalidatePath("/admin/services");
  revalidatePath("/[locale]/services", "page");
  revalidatePath("/[locale]", "page");
}

export async function createService(formData: FormData): Promise<ActionResult> {
  const session = await requireAdmin();

  const parsed = parseService(formData);
  if (!parsed.success) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };

  const image = await storePublicImage(formData.get("image"), "services");
  if (!image.ok) return { ok: false, error: image.error };

  await withAudit({
    actorId: session.user.id,
    action: "CREATE",
    entityType: "Service",
    run: () =>
      prisma.service.create({
        data: {
          ...parsed.data,
          slug: slugify(parsed.data.titleEn),
          featuresTh: linesToList(formData.get("featuresTh")),
          featuresEn: linesToList(formData.get("featuresEn")),
          imageKey: image.key,
        },
      }),
  });

  revalidate();
  return { ok: true };
}

export async function updateService(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const session = await requireAdmin();

  const before = await prisma.service.findUnique({ where: { id } });
  if (!before) return { ok: false, error: "ไม่พบบริการ" };

  const parsed = parseService(formData);
  if (!parsed.success) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };

  const image = await storePublicImage(formData.get("image"), "services");
  if (!image.ok) return { ok: false, error: image.error };

  await withAudit({
    actorId: session.user.id,
    action: "UPDATE",
    entityType: "Service",
    before,
    run: () =>
      prisma.service.update({
        where: { id },
        data: {
          ...parsed.data,
          featuresTh: linesToList(formData.get("featuresTh")),
          featuresEn: linesToList(formData.get("featuresEn")),
          ...(image.key ? { imageKey: image.key } : {}),
        },
      }),
  });

  if (image.key && before.imageKey) {
    await storage.delete(before.imageKey);
  }
  revalidate();
  return { ok: true };
}

export async function deleteService(id: string): Promise<ActionResult> {
  const session = await requireAdmin();

  const before = await prisma.service.findUnique({ where: { id } });
  if (!before) return { ok: false, error: "ไม่พบบริการ" };

  await withAudit({
    actorId: session.user.id,
    action: "DELETE",
    entityType: "Service",
    before,
    run: async () => {
      await prisma.service.delete({ where: { id } });
      return null;
    },
  });

  if (before.imageKey) {
    await storage.delete(before.imageKey);
  }
  revalidate();
  return { ok: true };
}
