"use server";

import type { Prisma } from "@/generated/prisma/client";
import { auditedAggregate } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { contentRevalidatePaths } from "@/lib/pages";
import { aboutContentSchema, ABOUT_FEATURED_MAX } from "@/lib/validations/about-content";
import type { ActionResult } from "./users";

const ABOUT_FIELDS = [
  "titleTh", "titleEn",
  "introTh", "introEn",
  "credRegisteredTitleTh", "credRegisteredTitleEn",
  "credRegisteredDescTh", "credRegisteredDescEn",
  "credEngineerTitleTh", "credEngineerTitleEn",
  "credEngineerDescTh", "credEngineerDescEn",
  "credExperienceTitleTh", "credExperienceTitleEn",
  "credExperienceDescTh", "credExperienceDescEn",
  "credSectionTitleTh", "credSectionTitleEn",
  "credSectionDescTh", "credSectionDescEn",
  "credRegisteredIcon", "credEngineerIcon", "credExperienceIcon",
  "teamDesignIcon", "teamInstallIcon", "teamSupportIcon",
  "teamTitleTh", "teamTitleEn",
  "teamDescTh", "teamDescEn",
  "teamDesignTitleTh", "teamDesignTitleEn",
  "teamDesignDescTh", "teamDesignDescEn",
  "teamInstallTitleTh", "teamInstallTitleEn",
  "teamInstallDescTh", "teamInstallDescEn",
  "teamSupportTitleTh", "teamSupportTitleEn",
  "teamSupportDescTh", "teamSupportDescEn",
  "statsProjectsLabelTh", "statsProjectsLabelEn",
  "statsYearsLabelTh", "statsYearsLabelEn",
  "statsEngineersLabelTh", "statsEngineersLabelEn",
  "statsCustomersLabelTh", "statsCustomersLabelEn",
  "testimonialsTitleTh", "testimonialsTitleEn",
  "testimonialsSubtitleTh", "testimonialsSubtitleEn",
] as const;

const BOOL_FIELDS = [
  "showCredentials",
  "showTeam",
  "showStats",
  "showTestimonials",
  "showGlobalCta",
] as const;

function parseBool(raw: FormDataEntryValue | null, fallback: boolean): boolean {
  if (raw === null || raw === undefined || raw === "") return fallback;
  if (typeof raw !== "string") return fallback;
  return raw === "true" || raw === "1" || raw === "on";
}

async function aboutSnapshot(tx: Prisma.TransactionClient, id: string) {
  const row = await tx.aboutContent.findUnique({
    where: { id },
    include: {
      featuredTestimonials: { orderBy: { sortOrder: "asc" }, select: { testimonialId: true, sortOrder: true } },
    },
  });
  if (!row) return {};
  const { featuredTestimonials, ...rest } = row;
  return { ...rest, featuredTestimonialIds: featuredTestimonials.map((f) => f.testimonialId) };
}

export async function updateAboutContent(
  formData: FormData,
): Promise<ActionResult | { ok: false; conflict: true }> {
  await requireRole("ADMIN", "SALES", "MARKETING", "EDITOR");

  const raw = Object.fromEntries(ABOUT_FIELDS.map((k) => [k, formData.get(k) ?? ""]));
  const parsed = aboutContentSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };

  const expectedVersion = Number(formData.get("version"));
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
    return { ok: false, error: "เวอร์ชันไม่ถูกต้อง" };
  }

  let featuredIds: string[] = [];
  const featuredRaw = formData.get("featuredTestimonialIdsJson");
  if (typeof featuredRaw === "string" && featuredRaw.trim()) {
    try {
      const arr = JSON.parse(featuredRaw) as unknown;
      if (!Array.isArray(arr) || !arr.every((x) => typeof x === "string")) {
        return { ok: false, error: "รายการรีวิวไม่ถูกต้อง" };
      }
      featuredIds = arr.slice(0, ABOUT_FEATURED_MAX);
    } catch {
      return { ok: false, error: "รายการรีวิวไม่ถูกต้อง" };
    }
  }

  if (featuredIds.length > 0) {
    const found = await prisma.testimonial.findMany({
      where: { id: { in: featuredIds } },
      select: { id: true },
    });
    if (found.length !== featuredIds.length) {
      return { ok: false, error: "มีรีวิวที่เลือกไม่พบในระบบ" };
    }
  }

  const existing = await prisma.aboutContent.findUnique({ where: { key: "about" } });
  if (!existing) return { ok: false, error: "ไม่พบเนื้อหา" };

  const bools = Object.fromEntries(
    BOOL_FIELDS.map((k) => [k, parseBool(formData.get(k), true)]),
  ) as Record<(typeof BOOL_FIELDS)[number], boolean>;

  const aggregate = auditedAggregate({
    entityType: "AboutContent",
    model: (client) => client.aboutContent,
    revalidate: [...contentRevalidatePaths("about")],
  });

  const result = await aggregate.save({
    id: existing.id,
    expectedVersion,
    snapshotBefore: (tx) => aboutSnapshot(tx, existing.id),
    mutate: async (tx) => {
      await tx.aboutContent.update({
        where: { id: existing.id },
        data: { ...parsed.data, ...bools },
      });

      await tx.aboutFeaturedTestimonial.deleteMany({ where: { aboutContentId: existing.id } });
      if (featuredIds.length > 0) {
        // Avoid unique sortOrder collisions: insert with final order only after clear.
        await tx.aboutFeaturedTestimonial.createMany({
          data: featuredIds.map((testimonialId, i) => ({
            aboutContentId: existing.id,
            testimonialId,
            sortOrder: i + 1,
          })),
        });
      }
    },
    snapshotAfter: (tx) => aboutSnapshot(tx, existing.id),
  });

  if (!result.ok) return { ok: false, conflict: true };
  return { ok: true };
}
