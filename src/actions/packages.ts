"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { linesToList, slugify, storePublicImage } from "@/lib/admin-content";
import { withAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
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

function revalidate() {
  revalidatePath("/admin/packages");
  revalidatePath("/[locale]/packages", "page");
  revalidatePath("/[locale]", "page");
}

export async function createPackage(formData: FormData): Promise<ActionResult> {
  const session = await requireAdmin();

  const parsed = parsePackage(formData);
  if (!parsed.success) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };

  const image = await storePublicImage(formData.get("image"), "packages");
  if (!image.ok) return { ok: false, error: image.error };

  await withAudit({
    actorId: session.user.id,
    action: "CREATE",
    entityType: "Package",
    run: () =>
      prisma.package.create({
        data: {
          ...parsed.data,
          slug: slugify(parsed.data.nameEn),
          featuresTh: linesToList(formData.get("featuresTh")),
          featuresEn: linesToList(formData.get("featuresEn")),
          seasonalProduction: seasonalProduction(parsed.data.sizeKw),
          imageKey: image.key,
        },
      }),
  });

  revalidate();
  return { ok: true };
}

export async function updatePackage(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const session = await requireAdmin();

  const before = await prisma.package.findUnique({ where: { id } });
  if (!before) return { ok: false, error: "ไม่พบแพ็กเกจ" };

  const parsed = parsePackage(formData);
  if (!parsed.success) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };

  const image = await storePublicImage(formData.get("image"), "packages");
  if (!image.ok) return { ok: false, error: image.error };

  await withAudit({
    actorId: session.user.id,
    action: "UPDATE",
    entityType: "Package",
    before,
    run: () =>
      prisma.package.update({
        where: { id },
        data: {
          ...parsed.data,
          featuresTh: linesToList(formData.get("featuresTh")),
          featuresEn: linesToList(formData.get("featuresEn")),
          seasonalProduction: seasonalProduction(parsed.data.sizeKw),
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

export async function deletePackage(id: string): Promise<ActionResult> {
  const session = await requireAdmin();

  const before = await prisma.package.findUnique({ where: { id } });
  if (!before) return { ok: false, error: "ไม่พบแพ็กเกจ" };

  await withAudit({
    actorId: session.user.id,
    action: "DELETE",
    entityType: "Package",
    before,
    run: async () => {
      await prisma.package.delete({ where: { id } });
      return null;
    },
  });

  if (before.imageKey) {
    await storage.delete(before.imageKey);
  }
  revalidate();
  return { ok: true };
}
