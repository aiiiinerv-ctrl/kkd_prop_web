"use server";

import { revalidatePath } from "next/cache";
import { auditedEntity } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { defaultSitemapConfig, parseSitemapConfig } from "@/lib/sitemap/defaults";
import { buildPublicSitemapTree } from "@/lib/sitemap/public-tree";
import { sitemapConfigFromFormData } from "@/lib/validations/sitemap-settings";
import type { ActionResult } from "./users";

const SITEMAP_REVALIDATE = [
  "/th/sitemap",
  "/en/sitemap",
  "/admin/sitemap",
  "/sitemap.xml",
] as const;

const siteSettings = auditedEntity({
  entityType: "SiteSettings",
  model: (client) => client.siteSettings,
  snapshot: "full",
  revalidate: () => SITEMAP_REVALIDATE,
});

async function getOrFailSiteSettingsId(): Promise<string | null> {
  const existing = await prisma.siteSettings.findFirst({ select: { id: true } });
  return existing?.id ?? null;
}

export async function updateSitemapSettings(formData: FormData): Promise<ActionResult> {
  await requireRole("ADMIN", "MARKETING");

  const parsed = sitemapConfigFromFormData(formData);
  if (!parsed) {
    return { ok: false, error: "ข้อมูลแผนผังเว็บไซต์ไม่ถูกต้อง" };
  }

  const normalized = parseSitemapConfig(parsed);

  const id = await getOrFailSiteSettingsId();
  if (!id) return { ok: false, error: "ไม่พบการตั้งค่า" };

  const updated = await siteSettings.update(id, {
    sitemapConfigJson: normalized,
  });
  if (!updated) return { ok: false, error: "ไม่พบการตั้งค่า" };

  for (const path of SITEMAP_REVALIDATE) {
    revalidatePath(path);
  }

  return { ok: true };
}

/** Admin preview — serializable tree for one locale. */
export async function previewSitemapTree(configJson: string): Promise<
  { ok: true; groups: Awaited<ReturnType<typeof buildPublicSitemapTree>> } | { ok: false; error: string }
> {
  await requireRole(
    "ADMIN",
    "SALES",
    "MARKETING",
    "EDITOR",
    "FINANCE",
    "EXECUTIVE",
    "CHANNEL_EXECUTIVE"
  );

  let raw: unknown;
  try {
    raw = JSON.parse(configJson) as unknown;
  } catch {
    return { ok: false, error: "JSON ไม่ถูกต้อง" };
  }

  const config = parseSitemapConfig(raw);
  const groups = await buildPublicSitemapTree("th", config);
  return { ok: true, groups };
}

/** Admin read — returns normalized config (defaults when column is null). */
export async function loadSitemapConfigForAdmin() {
  const row = await prisma.siteSettings.findFirst({
    select: { sitemapConfigJson: true },
  });
  if (!row?.sitemapConfigJson) return defaultSitemapConfig();
  return parseSitemapConfig(row.sitemapConfigJson);
}
