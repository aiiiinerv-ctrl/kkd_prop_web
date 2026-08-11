"use server";

import { z } from "zod";
import { linesToList, slugify, storePublicImage } from "@/lib/admin-content";
import { auditedEntity } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
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

const services = auditedEntity({
  entityType: "Service",
  model: (client) => client.service,
  snapshot: "full",
  revalidate: () => [
    "/admin/services",
    ["/[locale]/services", "page"],
    ["/[locale]", "page"],
  ],
});

export async function createService(formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const parsed = parseService(formData);
  if (!parsed.success) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };

  const image = await storePublicImage(formData.get("image"), "services");
  if (!image.ok) return { ok: false, error: image.error };

  await services.create({
    ...parsed.data,
    slug: slugify(parsed.data.titleEn),
    featuresTh: linesToList(formData.get("featuresTh")),
    featuresEn: linesToList(formData.get("featuresEn")),
    imageKey: image.key,
  });

  return { ok: true };
}

export async function updateService(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = parseService(formData);
  if (!parsed.success) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };

  const image = await storePublicImage(formData.get("image"), "services");
  if (!image.ok) return { ok: false, error: image.error };

  const result = await services.update(id, {
    ...parsed.data,
    featuresTh: linesToList(formData.get("featuresTh")),
    featuresEn: linesToList(formData.get("featuresEn")),
    ...(image.key ? { imageKey: image.key } : {}),
  });
  if (!result) return { ok: false, error: "ไม่พบบริการ" };

  // Outside the transaction on purpose: deleting the old blob can't be rolled
  // back, so it only runs once the row is committed.
  if (image.key && result.before.imageKey) {
    await storage.delete(result.before.imageKey);
  }
  return { ok: true };
}

export async function deleteService(id: string): Promise<ActionResult> {
  await requireAdmin();

  const before = await services.remove(id);
  if (!before) return { ok: false, error: "ไม่พบบริการ" };

  if (before.imageKey) {
    await storage.delete(before.imageKey);
  }
  return { ok: true };
}
