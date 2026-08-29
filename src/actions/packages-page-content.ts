"use server";

import type { Prisma } from "@/generated/prisma/client";
import { auditedAggregate } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { seasonalProduction, type SeasonalBaseline } from "@/lib/packages-seasonal";
import { contentRevalidatePaths } from "@/lib/pages";
import { packagesPageContentSchema } from "@/lib/validations/packages-page-content";
import type { ActionResult } from "./users";

const TEXT_FIELDS = [
  "titleTh",
  "titleEn",
  "subtitleTh",
  "subtitleEn",
  "emptyTh",
  "emptyEn",
  "seasonalTitleTh",
  "seasonalTitleEn",
  "seasonalSubtitleTh",
  "seasonalSubtitleEn",
  "paybackTitleTh",
  "paybackTitleEn",
  "paybackOnGridTh",
  "paybackOnGridEn",
  "paybackHybridTh",
  "paybackHybridEn",
  "paybackOffGridTh",
  "paybackOffGridEn",
] as const;

/** Prefixed form names so Package CRUD dialog fields don't collide. */
const FORM_ALIASES: Record<(typeof TEXT_FIELDS)[number], string> = {
  titleTh: "pkgTitleTh",
  titleEn: "pkgTitleEn",
  subtitleTh: "pkgSubtitleTh",
  subtitleEn: "pkgSubtitleEn",
  emptyTh: "pkgEmptyTh",
  emptyEn: "pkgEmptyEn",
  seasonalTitleTh: "pkgSeasonalTitleTh",
  seasonalTitleEn: "pkgSeasonalTitleEn",
  seasonalSubtitleTh: "pkgSeasonalSubtitleTh",
  seasonalSubtitleEn: "pkgSeasonalSubtitleEn",
  paybackTitleTh: "pkgPaybackTitleTh",
  paybackTitleEn: "pkgPaybackTitleEn",
  paybackOnGridTh: "pkgPaybackOnGridTh",
  paybackOnGridEn: "pkgPaybackOnGridEn",
  paybackHybridTh: "pkgPaybackHybridTh",
  paybackHybridEn: "pkgPaybackHybridEn",
  paybackOffGridTh: "pkgPaybackOffGridTh",
  paybackOffGridEn: "pkgPaybackOffGridEn",
};

const BOOL_FIELDS = ["showSeasonal", "showPayback", "showGlobalCta"] as const;

const BASELINE_FIELDS = [
  "seasonalBaselineSummer",
  "seasonalBaselineEarlyRainy",
  "seasonalBaselineRainy",
  "seasonalBaselineWinter",
] as const;

/** Prefixed form names, same reasoning as `FORM_ALIASES` above. */
const BASELINE_FORM_ALIASES: Record<(typeof BASELINE_FIELDS)[number], string> = {
  seasonalBaselineSummer: "pkgSeasonalBaselineSummer",
  seasonalBaselineEarlyRainy: "pkgSeasonalBaselineEarlyRainy",
  seasonalBaselineRainy: "pkgSeasonalBaselineRainy",
  seasonalBaselineWinter: "pkgSeasonalBaselineWinter",
};

function parseBool(raw: FormDataEntryValue | null, fallback: boolean): boolean {
  if (raw === null || raw === undefined || raw === "") return fallback;
  if (typeof raw !== "string") return fallback;
  return raw === "true" || raw === "1" || raw === "on";
}

function nullIfEmpty(v: string | null | undefined): string | null {
  return v ? v : null;
}

async function snapshot(tx: Prisma.TransactionClient, id: string) {
  const row = await tx.packagesPageContent.findUnique({ where: { id } });
  return row ?? {};
}

export async function updatePackagesPageContent(
  formData: FormData,
): Promise<ActionResult | { ok: false; conflict: true }> {
  await requireRole("ADMIN", "SALES", "MARKETING", "EDITOR");

  const raw = Object.fromEntries([
    ...TEXT_FIELDS.map((k) => [k, formData.get(FORM_ALIASES[k]) ?? ""]),
    ...BASELINE_FIELDS.map((k) => [k, formData.get(BASELINE_FORM_ALIASES[k]) ?? ""]),
  ]);
  const parsed = packagesPageContentSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };

  const expectedVersion = Number(formData.get("version"));
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
    return { ok: false, error: "เวอร์ชันไม่ถูกต้อง" };
  }

  const existing = await prisma.packagesPageContent.findUnique({ where: { key: "packages" } });
  if (!existing) return { ok: false, error: "ไม่พบเนื้อหา" };

  const bools = Object.fromEntries(
    BOOL_FIELDS.map((k) => [k, parseBool(formData.get(k), true)]),
  ) as Record<(typeof BOOL_FIELDS)[number], boolean>;

  const d = parsed.data;

  const baselineChanged =
    d.seasonalBaselineSummer !== existing.seasonalBaselineSummer ||
    d.seasonalBaselineEarlyRainy !== existing.seasonalBaselineEarlyRainy ||
    d.seasonalBaselineRainy !== existing.seasonalBaselineRainy ||
    d.seasonalBaselineWinter !== existing.seasonalBaselineWinter;
  const newBaseline: SeasonalBaseline = {
    summer: d.seasonalBaselineSummer,
    earlyRainy: d.seasonalBaselineEarlyRainy,
    rainy: d.seasonalBaselineRainy,
    winter: d.seasonalBaselineWinter,
  };
  const aggregate = auditedAggregate({
    entityType: "PackagesPageContent",
    model: (client) => client.packagesPageContent,
    revalidate: [
      ...contentRevalidatePaths("packages"),
      ["/[locale]/packages/[slug]", "page"],
      "/th/calculator",
      "/en/calculator",
    ],
  });

  const result = await aggregate.save({
    id: existing.id,
    expectedVersion,
    snapshotBefore: (tx) => snapshot(tx, existing.id),
    mutate: async (tx) => {
      await tx.packagesPageContent.update({
        where: { id: existing.id },
        data: {
          titleTh: d.titleTh || "",
          titleEn: d.titleEn || "",
          subtitleTh: nullIfEmpty(d.subtitleTh),
          subtitleEn: nullIfEmpty(d.subtitleEn),
          emptyTh: nullIfEmpty(d.emptyTh),
          emptyEn: nullIfEmpty(d.emptyEn),
          seasonalTitleTh: nullIfEmpty(d.seasonalTitleTh),
          seasonalTitleEn: nullIfEmpty(d.seasonalTitleEn),
          seasonalSubtitleTh: nullIfEmpty(d.seasonalSubtitleTh),
          seasonalSubtitleEn: nullIfEmpty(d.seasonalSubtitleEn),
          paybackTitleTh: nullIfEmpty(d.paybackTitleTh),
          paybackTitleEn: nullIfEmpty(d.paybackTitleEn),
          paybackOnGridTh: nullIfEmpty(d.paybackOnGridTh),
          paybackOnGridEn: nullIfEmpty(d.paybackOnGridEn),
          paybackHybridTh: nullIfEmpty(d.paybackHybridTh),
          paybackHybridEn: nullIfEmpty(d.paybackHybridEn),
          paybackOffGridTh: nullIfEmpty(d.paybackOffGridTh),
          paybackOffGridEn: nullIfEmpty(d.paybackOffGridEn),
          seasonalBaselineSummer: d.seasonalBaselineSummer,
          seasonalBaselineEarlyRainy: d.seasonalBaselineEarlyRainy,
          seasonalBaselineRainy: d.seasonalBaselineRainy,
          seasonalBaselineWinter: d.seasonalBaselineWinter,
          ...bools,
        },
      });

      // The baseline changed — `Package.seasonalProduction` is baked in at
      // package save time, not computed live at render time, so every
      // existing package's stored JSON is now stale and must be rewritten
      // here (not just whichever package an admin next re-saves).
      if (baselineChanged) {
        const allPackages = await tx.package.findMany({ select: { id: true, sizeKw: true } });
        await Promise.all(
          allPackages.map((pkg) =>
            tx.package.update({
              where: { id: pkg.id },
              data: { seasonalProduction: seasonalProduction(pkg.sizeKw, newBaseline) },
            }),
          ),
        );
      }
    },
    snapshotAfter: (tx) => snapshot(tx, existing.id),
  });

  if (!result.ok) return { ok: false, conflict: true };
  return { ok: true };
}
