"use server";

import type { Prisma } from "@/generated/prisma/client";
import { auditedAggregate } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { contentRevalidatePaths } from "@/lib/pages";
import { servicesPageContentSchema } from "@/lib/validations/services-page-content";
import type { ActionResult } from "./users";

const TEXT_FIELDS = [
  "titleTh",
  "titleEn",
  "subtitleTh",
  "subtitleEn",
  "systemsTitleTh",
  "systemsTitleEn",
  "maintenanceTitleTh",
  "maintenanceTitleEn",
] as const;

const FORM_ALIASES: Record<(typeof TEXT_FIELDS)[number], string> = {
  titleTh: "svcTitleTh",
  titleEn: "svcTitleEn",
  subtitleTh: "svcSubtitleTh",
  subtitleEn: "svcSubtitleEn",
  systemsTitleTh: "svcSystemsTitleTh",
  systemsTitleEn: "svcSystemsTitleEn",
  maintenanceTitleTh: "svcMaintenanceTitleTh",
  maintenanceTitleEn: "svcMaintenanceTitleEn",
};

const BOOL_FIELDS = ["showSystems", "showMaintenance", "showGlobalCta"] as const;

function parseBool(raw: FormDataEntryValue | null, fallback: boolean): boolean {
  if (raw === null || raw === undefined || raw === "") return fallback;
  if (typeof raw !== "string") return fallback;
  return raw === "true" || raw === "1" || raw === "on";
}

async function snapshot(tx: Prisma.TransactionClient, id: string) {
  const row = await tx.servicesPageContent.findUnique({ where: { id } });
  return row ?? {};
}

export async function updateServicesPageContent(
  formData: FormData,
): Promise<ActionResult | { ok: false; conflict: true }> {
  await requireRole("ADMIN", "SALES", "MARKETING", "EDITOR");

  const raw = Object.fromEntries(
    TEXT_FIELDS.map((k) => [k, formData.get(FORM_ALIASES[k]) ?? ""]),
  );
  const parsed = servicesPageContentSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };

  const expectedVersion = Number(formData.get("version"));
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
    return { ok: false, error: "เวอร์ชันไม่ถูกต้อง" };
  }

  const existing = await prisma.servicesPageContent.findUnique({ where: { key: "services" } });
  if (!existing) return { ok: false, error: "ไม่พบเนื้อหา" };

  const bools = Object.fromEntries(
    BOOL_FIELDS.map((k) => [k, parseBool(formData.get(k), true)]),
  ) as Record<(typeof BOOL_FIELDS)[number], boolean>;

  const aggregate = auditedAggregate({
    entityType: "ServicesPageContent",
    model: (client) => client.servicesPageContent,
    revalidate: [...contentRevalidatePaths("services")],
  });

  const result = await aggregate.save({
    id: existing.id,
    expectedVersion,
    snapshotBefore: (tx) => snapshot(tx, existing.id),
    mutate: async (tx) => {
      await tx.servicesPageContent.update({
        where: { id: existing.id },
        data: {
          titleTh: parsed.data.titleTh || "",
          titleEn: parsed.data.titleEn || "",
          subtitleTh: parsed.data.subtitleTh || null,
          subtitleEn: parsed.data.subtitleEn || null,
          systemsTitleTh: parsed.data.systemsTitleTh || null,
          systemsTitleEn: parsed.data.systemsTitleEn || null,
          maintenanceTitleTh: parsed.data.maintenanceTitleTh || null,
          maintenanceTitleEn: parsed.data.maintenanceTitleEn || null,
          ...bools,
        },
      });
    },
    snapshotAfter: (tx) => snapshot(tx, existing.id),
  });

  if (!result.ok) return { ok: false, conflict: true };
  return { ok: true };
}
