"use server";

import { auditedEntity } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  contactSettingsSchema,
  headerFooterSettingsSchema,
  pageSeoSchema,
} from "@/lib/validations/site-settings";
import type { ActionResult } from "./users";

const SITE_REVALIDATE = [
  "/th",
  "/en",
  "/th/about",
  "/en/about",
  "/th/contact",
  "/en/contact",
  "/admin/settings",
  ["/th", "layout"],
  ["/en", "layout"],
] as const;

const siteSettings = auditedEntity({
  entityType: "SiteSettings",
  model: (client) => client.siteSettings,
  snapshot: "full",
  revalidate: () => SITE_REVALIDATE,
});

const pageSeo = auditedEntity({
  entityType: "PageSeo",
  model: (client) => client.pageSeo,
  snapshot: "full",
  revalidate: () => SITE_REVALIDATE,
});

async function getOrFailSiteSettingsId(): Promise<string | null> {
  const existing = await prisma.siteSettings.findFirst({ select: { id: true } });
  return existing?.id ?? null;
}

/**
 * Updates only the contact & social columns (Tab 3).
 * Does NOT touch headerCtaLabel* / footerDescription* — those belong to Tab 4.
 */
export async function updateContactSettings(formData: FormData): Promise<ActionResult> {
  await requireRole("ADMIN", "MARKETING");

  const raw = Object.fromEntries(
    [
      "phone", "email", "addressTh", "addressEn", "hoursTh", "hoursEn",
      "mapQuery", "lineUrl", "facebookUrl", "instagramUrl", "tiktokUrl",
      "youtubeUrl", "contactTitleTh", "contactTitleEn",
      "contactSubtitleTh", "contactSubtitleEn",
    ].map((k) => [k, formData.get(k) ?? ""])
  );

  const parsed = contactSettingsSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }

  const id = await getOrFailSiteSettingsId();
  if (!id) return { ok: false, error: "ไม่พบการตั้งค่า" };

  const updated = await siteSettings.update(id, parsed.data);
  if (!updated) return { ok: false, error: "ไม่พบการตั้งค่า" };

  return { ok: true };
}

/**
 * Updates only the header/footer text columns (Tab 4).
 * Does NOT touch phone/email/address/social — those belong to Tab 3.
 */
export async function updateHeaderFooterSettings(formData: FormData): Promise<ActionResult> {
  await requireRole("ADMIN", "MARKETING");

  const raw = Object.fromEntries(
    [
      "headerCtaLabelTh", "headerCtaLabelEn",
      "footerDescriptionTh", "footerDescriptionEn",
    ].map((k) => [k, formData.get(k) ?? ""])
  );

  const parsed = headerFooterSettingsSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }

  const id = await getOrFailSiteSettingsId();
  if (!id) return { ok: false, error: "ไม่พบการตั้งค่า" };

  const updated = await siteSettings.update(id, parsed.data);
  if (!updated) return { ok: false, error: "ไม่พบการตั้งค่า" };

  return { ok: true };
}

export async function updatePageSeo(key: string, formData: FormData): Promise<ActionResult> {
  await requireRole("ADMIN", "MARKETING");

  // Sprint 5–9: page SEO moved to Pages Properties for registry pages in `pages`.
  if (
    key === "home" ||
    key === "about" ||
    key === "services" ||
    key === "packages" ||
    key === "portfolio"
  ) {
    return {
      ok: false,
      error: "SEO หน้านี้ย้ายไปที่ Pages → แท็บ Properties แล้ว — กรุณารีเฟรชหน้านี้",
    };
  }

  const parsed = pageSeoSchema.safeParse({
    key,
    titleTh: formData.get("titleTh") ?? "",
    titleEn: formData.get("titleEn") ?? "",
    descriptionTh: formData.get("descriptionTh") ?? "",
    descriptionEn: formData.get("descriptionEn") ?? "",
  });
  if (!parsed.success) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };

  const existing = await prisma.pageSeo.findUnique({
    where: { key: parsed.data.key },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "ไม่พบข้อมูล SEO ของหน้านี้" };

  const updated = await pageSeo.update(existing.id, {
    titleTh: parsed.data.titleTh,
    titleEn: parsed.data.titleEn,
    descriptionTh: parsed.data.descriptionTh,
    descriptionEn: parsed.data.descriptionEn,
  });
  if (!updated) return { ok: false, error: "ไม่พบข้อมูล SEO ของหน้านี้" };

  return { ok: true };
}
