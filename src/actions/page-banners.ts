"use server";

import { createId } from "@paralleldrive/cuid2";
import { revalidatePath } from "next/cache";
import { storePublicImage } from "@/lib/admin-content";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  BANNER_IMAGE_PREFIX,
  bannerRevalidatePaths,
  type BannerPageSlug,
} from "@/lib/page-banners";
import { storage } from "@/lib/storage";
import { pageBannerFormSchema } from "@/lib/validations/page-banner";
import type { Prisma } from "@/generated/prisma/client";

export type PageBannerActionResult =
  | { ok: true }
  | { ok: false; error: string }
  | { ok: false; conflict: true };

type BannerSnapshot = {
  pageSlug: string;
  mode: string;
  version: number;
  slides: Array<{
    id: string;
    sortOrder: number;
    imageKey: string;
    altTh: string;
    altEn: string;
    linkPath: string | null;
  }>;
};

async function loadSnapshot(bannerId: string): Promise<BannerSnapshot | null> {
  const row = await prisma.pageBanner.findUnique({
    where: { id: bannerId },
    include: { slides: { orderBy: { sortOrder: "asc" } } },
  });
  if (!row) return null;
  return {
    pageSlug: row.pageSlug,
    mode: row.mode,
    version: row.version,
    slides: row.slides.map((s) => ({
      id: s.id,
      sortOrder: s.sortOrder,
      imageKey: s.imageKey,
      altTh: s.altTh,
      altEn: s.altEn,
      linkPath: s.linkPath,
    })),
  };
}

function refreshBanner(slug: BannerPageSlug) {
  for (const path of bannerRevalidatePaths(slug)) {
    revalidatePath(path);
  }
}

/**
 * Creates or updates a page banner and its slides. Each slide may keep an
 * existing imageKey or upload a new file via `slideImage_<index>`.
 */
export async function updatePageBanner(formData: FormData): Promise<PageBannerActionResult> {
  const session = await requireRole("ADMIN", "SALES", "MARKETING", "EDITOR");

  const slidesJson = formData.get("slidesJson");
  if (typeof slidesJson !== "string") {
    return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };
  }

  let slidesRaw: unknown;
  try {
    slidesRaw = JSON.parse(slidesJson);
  } catch {
    return { ok: false, error: "ข้อมูลสไลด์ไม่ถูกต้อง" };
  }

  const parsed = pageBannerFormSchema.safeParse({
    pageSlug: formData.get("pageSlug"),
    expectedVersion: formData.get("expectedVersion"),
    mode: formData.get("mode"),
    slides: slidesRaw,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }

  const { pageSlug, expectedVersion, mode, slides } = parsed.data;
  const uploadedKeys: string[] = [];

  try {
    const slideInputs: Array<{
      altTh: string;
      altEn: string;
      linkPath: string | null;
      imageKey: string;
    }> = [];

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i]!;
      const file = formData.get(`slideImage_${i}`);
      let imageKey = slide.imageKey ?? null;

      if (file instanceof File && file.size > 0) {
        const stored = await storePublicImage(file, `${BANNER_IMAGE_PREFIX}/${pageSlug}`);
        if (!stored.ok) return { ok: false, error: stored.error };
        if (stored.key) {
          imageKey = stored.key;
          uploadedKeys.push(stored.key);
        }
      }

      if (!imageKey) {
        for (const key of uploadedKeys) {
          await storage.delete(key).catch(() => undefined);
        }
        return { ok: false, error: `กรุณาอัปโหลดรูปสำหรับสไลด์ที่ ${i + 1}` };
      }

      slideInputs.push({
        altTh: slide.altTh,
        altEn: slide.altEn,
        linkPath: slide.linkPath || null,
        imageKey,
      });
    }

    const existing = await prisma.pageBanner.findUnique({
      where: { pageSlug },
      include: { slides: true },
    });

    if (existing && existing.version !== expectedVersion) {
      for (const key of uploadedKeys) {
        await storage.delete(key).catch(() => undefined);
      }
      return { ok: false, conflict: true };
    }

    const beforeSnapshot = existing ? await loadSnapshot(existing.id) : null;
    const oldImageKeys = existing?.slides.map((s) => s.imageKey) ?? [];

    const bannerId = await prisma.$transaction(async (tx) => {
      let bannerRow;
      if (existing) {
        bannerRow = await tx.pageBanner.update({
          where: { id: existing.id },
          data: { mode, version: { increment: 1 } },
        });
        await tx.pageBannerSlide.deleteMany({ where: { bannerId: existing.id } });
      } else {
        bannerRow = await tx.pageBanner.create({
          data: { pageSlug, mode, version: 1 },
        });
      }

      if (mode !== "OFF" && slideInputs.length > 0) {
        await tx.pageBannerSlide.createMany({
          data: slideInputs.map((s, index) => ({
            id: createId(),
            bannerId: bannerRow.id,
            sortOrder: index,
            imageKey: s.imageKey,
            altTh: s.altTh,
            altEn: s.altEn,
            linkPath: s.linkPath,
          })),
        });
      }

      return bannerRow.id;
    });

    const afterSnapshot = await loadSnapshot(bannerId);
    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        action: existing ? "UPDATE" : "CREATE",
        entityType: "PageBanner",
        entityId: bannerId,
        before: beforeSnapshot as unknown as Prisma.InputJsonValue,
        after: afterSnapshot as unknown as Prisma.InputJsonValue,
      },
    });

    const keysToDelete = oldImageKeys.filter(
      (key) => !slideInputs.some((s) => s.imageKey === key)
    );
    for (const key of keysToDelete) {
      await storage.delete(key).catch(() => undefined);
    }

    refreshBanner(pageSlug);
    return { ok: true };
  } catch {
    for (const key of uploadedKeys) {
      await storage.delete(key).catch(() => undefined);
    }
    return { ok: false, error: "บันทึกไม่สำเร็จ กรุณาลองใหม่" };
  }
}
