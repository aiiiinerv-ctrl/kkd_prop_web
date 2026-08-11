"use server";

import { z } from "zod";
import { linesToList, slugify, storePublicImage } from "@/lib/admin-content";
import { auditedEntity } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import { storage } from "@/lib/storage";
import type { ActionResult } from "./users";

const packageSchema = z.object({
  nameTh: z.string().trim().min(2).max(200),
  nameEn: z.string().trim().min(2).max(200),
  sizeKw: z.coerce.number().positive().max(10000),
  priceThb: z.coerce.number().int().min(0).max(100_000_000),
  isPopular: z.coerce.boolean(),
  suitableTh: z.string().trim().min(2).max(500),
  suitableEn: z.string().trim().min(2).max(500),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  isPublished: z.coerce.boolean(),
});

// Average daily production by season, scaled from real 5KW measurements.
function seasonalProduction(sizeKw: number) {
  const scale = sizeKw / 5;
  return {
    summer: { monthsTh: "มี.ค. - พ.ค.", monthsEn: "Mar - May", unitsPerDay: Math.round(20 * scale) },
    earlyRainy: { monthsTh: "มิ.ย. - ก.ค.", monthsEn: "Jun - Jul", unitsPerDay: Math.round(16.5 * scale) },
    rainy: { monthsTh: "ส.ค. - ต.ค.", monthsEn: "Aug - Oct", unitsPerDay: Math.round(13 * scale) },
    winter: { monthsTh: "พ.ย. - ก.พ.", monthsEn: "Nov - Feb", unitsPerDay: Math.round(16 * scale) },
  };
}

function parsePackage(formData: FormData) {
  return packageSchema.safeParse({
    nameTh: formData.get("nameTh"),
    nameEn: formData.get("nameEn"),
    sizeKw: formData.get("sizeKw"),
    priceThb: formData.get("priceThb"),
    isPopular: formData.get("isPopular") === "on",
    suitableTh: formData.get("suitableTh"),
    suitableEn: formData.get("suitableEn"),
    sortOrder: formData.get("sortOrder") || 0,
    isPublished: formData.get("isPublished") === "on",
  });
}

const packages = auditedEntity({
  entityType: "Package",
  model: (client) => client.package,
  snapshot: "full",
  revalidate: () => [
    "/admin/packages",
    ["/[locale]/packages", "page"],
    ["/[locale]", "page"],
  ],
});

export async function createPackage(formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const parsed = parsePackage(formData);
  if (!parsed.success) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };

  const image = await storePublicImage(formData.get("image"), "packages");
  if (!image.ok) return { ok: false, error: image.error };

  await packages.create({
    ...parsed.data,
    slug: slugify(parsed.data.nameEn),
    featuresTh: linesToList(formData.get("featuresTh")),
    featuresEn: linesToList(formData.get("featuresEn")),
    seasonalProduction: seasonalProduction(parsed.data.sizeKw),
    imageKey: image.key,
  });

  return { ok: true };
}

export async function updatePackage(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = parsePackage(formData);
  if (!parsed.success) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };

  const image = await storePublicImage(formData.get("image"), "packages");
  if (!image.ok) return { ok: false, error: image.error };

  const result = await packages.update(id, {
    ...parsed.data,
    featuresTh: linesToList(formData.get("featuresTh")),
    featuresEn: linesToList(formData.get("featuresEn")),
    seasonalProduction: seasonalProduction(parsed.data.sizeKw),
    ...(image.key ? { imageKey: image.key } : {}),
  });
  if (!result) return { ok: false, error: "ไม่พบแพ็กเกจ" };

  if (image.key && result.before.imageKey) {
    await storage.delete(result.before.imageKey);
  }
  return { ok: true };
}

export async function deletePackage(id: string): Promise<ActionResult> {
  await requireAdmin();

  const before = await packages.remove(id);
  if (!before) return { ok: false, error: "ไม่พบแพ็กเกจ" };

  if (before.imageKey) {
    await storage.delete(before.imageKey);
  }
  return { ok: true };
}
