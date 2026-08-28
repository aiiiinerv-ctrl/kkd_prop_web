"use server";

import type { Prisma } from "@/generated/prisma/client";
import { auditedAggregate } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { contentRevalidatePaths } from "@/lib/pages";
import { calculatorPageContentSchema } from "@/lib/validations/calculator-page-content";
import type { ActionResult } from "./users";

const TEXT_FIELDS = [
  "eyebrowTh",
  "eyebrowEn",
  "titleTh",
  "titleEn",
  "subtitleTh",
  "subtitleEn",
  "panelTitleTh",
  "panelTitleEn",
  "panelIntroTh",
  "panelIntroEn",
  "packagesEyebrowTh",
  "packagesEyebrowEn",
  "packagesTitleTh",
  "packagesTitleEn",
  "packagesSubtitleTh",
  "packagesSubtitleEn",
] as const;

const FORM_ALIASES: Record<(typeof TEXT_FIELDS)[number], string> = {
  eyebrowTh: "calcEyebrowTh",
  eyebrowEn: "calcEyebrowEn",
  titleTh: "calcTitleTh",
  titleEn: "calcTitleEn",
  subtitleTh: "calcSubtitleTh",
  subtitleEn: "calcSubtitleEn",
  panelTitleTh: "calcPanelTitleTh",
  panelTitleEn: "calcPanelTitleEn",
  panelIntroTh: "calcPanelIntroTh",
  panelIntroEn: "calcPanelIntroEn",
  packagesEyebrowTh: "calcPackagesEyebrowTh",
  packagesEyebrowEn: "calcPackagesEyebrowEn",
  packagesTitleTh: "calcPackagesTitleTh",
  packagesTitleEn: "calcPackagesTitleEn",
  packagesSubtitleTh: "calcPackagesSubtitleTh",
  packagesSubtitleEn: "calcPackagesSubtitleEn",
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
  const row = await tx.calculatorPageContent.findUnique({ where: { id } });
  return row ?? {};
}

export async function updateCalculatorPageContent(
  formData: FormData,
): Promise<ActionResult | { ok: false; conflict: true }> {
  await requireRole("ADMIN", "SALES", "MARKETING", "EDITOR");

  const raw = Object.fromEntries(
    TEXT_FIELDS.map((k) => [k, formData.get(FORM_ALIASES[k]) ?? ""]),
  );
  const parsed = calculatorPageContentSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };

  const expectedVersion = Number(formData.get("version"));
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
    return { ok: false, error: "เวอร์ชันไม่ถูกต้อง" };
  }

  const existing = await prisma.calculatorPageContent.findUnique({ where: { key: "calculator" } });
  if (!existing) return { ok: false, error: "ไม่พบเนื้อหา" };

  const showPackages = parseBool(formData.get("showPackages"), true);
  const d = parsed.data;

  const aggregate = auditedAggregate({
    entityType: "CalculatorPageContent",
    model: (client) => client.calculatorPageContent,
    revalidate: [...contentRevalidatePaths("calculator")],
  });

  const result = await aggregate.save({
    id: existing.id,
    expectedVersion,
    snapshotBefore: (tx) => snapshot(tx, existing.id),
    mutate: async (tx) => {
      await tx.calculatorPageContent.update({
        where: { id: existing.id },
        data: {
          eyebrowTh: nullIfEmpty(d.eyebrowTh),
          eyebrowEn: nullIfEmpty(d.eyebrowEn),
          titleTh: d.titleTh || "",
          titleEn: d.titleEn || "",
          subtitleTh: nullIfEmpty(d.subtitleTh),
          subtitleEn: nullIfEmpty(d.subtitleEn),
          panelTitleTh: nullIfEmpty(d.panelTitleTh),
          panelTitleEn: nullIfEmpty(d.panelTitleEn),
          panelIntroTh: nullIfEmpty(d.panelIntroTh),
          panelIntroEn: nullIfEmpty(d.panelIntroEn),
          packagesEyebrowTh: nullIfEmpty(d.packagesEyebrowTh),
          packagesEyebrowEn: nullIfEmpty(d.packagesEyebrowEn),
          packagesTitleTh: nullIfEmpty(d.packagesTitleTh),
          packagesTitleEn: nullIfEmpty(d.packagesTitleEn),
          packagesSubtitleTh: nullIfEmpty(d.packagesSubtitleTh),
          packagesSubtitleEn: nullIfEmpty(d.packagesSubtitleEn),
          showPackages,
        },
      });
    },
    snapshotAfter: (tx) => snapshot(tx, existing.id),
  });

  if (!result.ok) return { ok: false, conflict: true };
  return { ok: true };
}
