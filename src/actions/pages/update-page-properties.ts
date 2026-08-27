"use server";

import type { Prisma } from "@/generated/prisma/client";
import { storePublicImage } from "@/lib/admin-content";
import { auditedAggregate } from "@/lib/audit";
import { prisma } from "@/lib/db";
import {
  pagePropertiesRevalidateTargets,
  requirePagePropertiesAccess,
  resolvePageKey,
} from "@/lib/pages/access";
import { storage } from "@/lib/storage";
import {
  isHighRiskPropertiesTransition,
  pagePropertiesFieldsSchema,
} from "@/lib/validations/page-properties";

const OG_PREFIX = "seo/og";

function parseBool(raw: FormDataEntryValue | null, fallback: boolean): boolean {
  if (raw === null || raw === undefined || raw === "") return fallback;
  if (typeof raw !== "string") return fallback;
  if (raw === "true" || raw === "1" || raw === "on") return true;
  if (raw === "false" || raw === "0" || raw === "off") return false;
  return fallback;
}

async function pageSeoSnapshot(
  tx: Prisma.TransactionClient,
  id: string,
): Promise<Record<string, unknown>> {
  const row = await tx.pageSeo.findUnique({ where: { id } });
  if (!row) return {};
  return {
    key: row.key,
    version: row.version,
    titleTh: row.titleTh,
    titleEn: row.titleEn,
    descriptionTh: row.descriptionTh,
    descriptionEn: row.descriptionEn,
    ogTitleTh: row.ogTitleTh,
    ogTitleEn: row.ogTitleEn,
    ogDescriptionTh: row.ogDescriptionTh,
    ogDescriptionEn: row.ogDescriptionEn,
    ogImageKey: row.ogImageKey,
    canonicalPathTh: row.canonicalPathTh,
    canonicalPathEn: row.canonicalPathEn,
    robotsIndex: row.robotsIndex,
    robotsFollow: row.robotsFollow,
  };
}

/**
 * Pages Properties mutation (#68 Home tracer).
 * Only keys with `propertiesAdminEnabled` write; others stay not_found.
 */
export async function updatePageProperties(
  formData: FormData,
): Promise<
  | { ok: true }
  | { ok: false; error: string }
  | { ok: false; conflict: true }
  | { ok: false; error: "validation"; details: unknown }
  | { ok: false; error: "high_risk_ack_required" }
> {
  const key = resolvePageKey(formData.get("pageKey"));
  if (!key) return { ok: false, error: "invalid_key" };

  const access = await requirePagePropertiesAccess(key);
  if (!access.ok) return { ok: false, error: access.error };

  const parsed = pagePropertiesFieldsSchema.safeParse({
    pageKey: key,
    expectedVersion: formData.get("expectedVersion"),
    titleTh: formData.get("titleTh") ?? "",
    titleEn: formData.get("titleEn") ?? "",
    descriptionTh: formData.get("descriptionTh") ?? "",
    descriptionEn: formData.get("descriptionEn") ?? "",
    ogTitleTh: formData.get("ogTitleTh") ?? "",
    ogTitleEn: formData.get("ogTitleEn") ?? "",
    ogDescriptionTh: formData.get("ogDescriptionTh") ?? "",
    ogDescriptionEn: formData.get("ogDescriptionEn") ?? "",
    canonicalPathTh: formData.get("canonicalPathTh") ?? "",
    canonicalPathEn: formData.get("canonicalPathEn") ?? "",
    robotsIndex: parseBool(formData.get("robotsIndex"), true),
    robotsFollow: parseBool(formData.get("robotsFollow"), true),
    highRiskAcknowledged: parseBool(formData.get("highRiskAcknowledged"), false),
    ogImageOperation: formData.get("ogImageOperation") ?? "keep",
  });
  if (!parsed.success) {
    return { ok: false, error: "validation", details: parsed.error.flatten() };
  }
  const data = parsed.data;

  const existing = await prisma.pageSeo.findUnique({ where: { key } });
  if (!existing) return { ok: false, error: "ไม่พบข้อมูล SEO ของหน้านี้" };

  if (
    isHighRiskPropertiesTransition({
      prevIndex: existing.robotsIndex,
      prevFollow: existing.robotsFollow,
      nextIndex: data.robotsIndex,
      nextFollow: data.robotsFollow,
    }) &&
    !data.highRiskAcknowledged
  ) {
    return { ok: false, error: "high_risk_ack_required" };
  }

  let nextOgKey: string | null | undefined = undefined; // undefined = leave unchanged
  let uploadedKey: string | null = null;
  const previousOgKey = existing.ogImageKey;

  if (data.ogImageOperation === "remove") {
    nextOgKey = null;
  } else if (data.ogImageOperation === "replace") {
    const stored = await storePublicImage(formData.get("ogImage"), OG_PREFIX);
    if (!stored.ok) return { ok: false, error: stored.error };
    if (!stored.key) return { ok: false, error: "ต้องอัปโหลดรูป OG เมื่อเลือกแทนที่" };
    uploadedKey = stored.key;
    nextOgKey = stored.key;
  }

  const aggregate = auditedAggregate({
    entityType: "PageSeo",
    model: (client) => client.pageSeo,
    revalidate: [...pagePropertiesRevalidateTargets(key)],
  });

  try {
    const result = await aggregate.save({
      id: existing.id,
      expectedVersion: data.expectedVersion,
      snapshotBefore: (tx) => pageSeoSnapshot(tx, existing.id),
      mutate: async (tx) => {
        await tx.pageSeo.update({
          where: { id: existing.id },
          data: {
            titleTh: data.titleTh,
            titleEn: data.titleEn,
            descriptionTh: data.descriptionTh,
            descriptionEn: data.descriptionEn,
            ogTitleTh: data.ogTitleTh,
            ogTitleEn: data.ogTitleEn,
            ogDescriptionTh: data.ogDescriptionTh,
            ogDescriptionEn: data.ogDescriptionEn,
            canonicalPathTh: data.canonicalPathTh,
            canonicalPathEn: data.canonicalPathEn,
            robotsIndex: data.robotsIndex,
            robotsFollow: data.robotsFollow,
            ...(nextOgKey !== undefined ? { ogImageKey: nextOgKey } : {}),
          },
        });
      },
      snapshotAfter: (tx) => pageSeoSnapshot(tx, existing.id),
    });

    if (!result.ok) {
      if (uploadedKey) await storage.delete(uploadedKey).catch(() => undefined);
      return { ok: false, conflict: true };
    }

    // Delete previous OG blob only after successful commit
    if (
      (data.ogImageOperation === "replace" || data.ogImageOperation === "remove") &&
      previousOgKey &&
      previousOgKey !== uploadedKey
    ) {
      await storage.delete(previousOgKey).catch(() => undefined);
    }

    return { ok: true };
  } catch (err) {
    if (uploadedKey) await storage.delete(uploadedKey).catch(() => undefined);
    throw err;
  }
}
