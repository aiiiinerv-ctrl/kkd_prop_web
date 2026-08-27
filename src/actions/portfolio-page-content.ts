"use server";

import type { Prisma } from "@/generated/prisma/client";
import { auditedAggregate } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { contentRevalidatePaths } from "@/lib/pages";
import { portfolioPageContentSchema } from "@/lib/validations/portfolio-page-content";
import type { ActionResult } from "./users";

const TEXT_FIELDS = [
  "titleTh",
  "titleEn",
  "subtitleTh",
  "subtitleEn",
  "imageDisclaimerTh",
  "imageDisclaimerEn",
  "emptyTh",
  "emptyEn",
] as const;

const FORM_ALIASES: Record<(typeof TEXT_FIELDS)[number], string> = {
  titleTh: "pfTitleTh",
  titleEn: "pfTitleEn",
  subtitleTh: "pfSubtitleTh",
  subtitleEn: "pfSubtitleEn",
  imageDisclaimerTh: "pfImageDisclaimerTh",
  imageDisclaimerEn: "pfImageDisclaimerEn",
  emptyTh: "pfEmptyTh",
  emptyEn: "pfEmptyEn",
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
  const row = await tx.portfolioPageContent.findUnique({ where: { id } });
  return row ?? {};
}

export async function updatePortfolioPageContent(
  formData: FormData,
): Promise<ActionResult | { ok: false; conflict: true }> {
  await requireRole("ADMIN", "SALES", "MARKETING", "EDITOR");

  const raw = Object.fromEntries(
    TEXT_FIELDS.map((k) => [k, formData.get(FORM_ALIASES[k]) ?? ""]),
  );
  const parsed = portfolioPageContentSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };

  const expectedVersion = Number(formData.get("version"));
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
    return { ok: false, error: "เวอร์ชันไม่ถูกต้อง" };
  }

  const existing = await prisma.portfolioPageContent.findUnique({ where: { key: "portfolio" } });
  if (!existing) return { ok: false, error: "ไม่พบเนื้อหา" };

  const showGlobalCta = parseBool(formData.get("showGlobalCta"), true);
  const d = parsed.data;

  const aggregate = auditedAggregate({
    entityType: "PortfolioPageContent",
    model: (client) => client.portfolioPageContent,
    revalidate: [...contentRevalidatePaths("portfolio")],
  });

  const result = await aggregate.save({
    id: existing.id,
    expectedVersion,
    snapshotBefore: (tx) => snapshot(tx, existing.id),
    mutate: async (tx) => {
      await tx.portfolioPageContent.update({
        where: { id: existing.id },
        data: {
          titleTh: d.titleTh || "",
          titleEn: d.titleEn || "",
          subtitleTh: nullIfEmpty(d.subtitleTh),
          subtitleEn: nullIfEmpty(d.subtitleEn),
          imageDisclaimerTh: nullIfEmpty(d.imageDisclaimerTh),
          imageDisclaimerEn: nullIfEmpty(d.imageDisclaimerEn),
          emptyTh: nullIfEmpty(d.emptyTh),
          emptyEn: nullIfEmpty(d.emptyEn),
          showGlobalCta,
        },
      });
    },
    snapshotAfter: (tx) => snapshot(tx, existing.id),
  });

  if (!result.ok) return { ok: false, conflict: true };
  return { ok: true };
}
