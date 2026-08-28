"use server";

import { auditedEntity } from "@/lib/audit";
import { storePublicImage } from "@/lib/admin-content";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";
import {
  contactSettingsSchema,
  headerFooterSettingsSchema,
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

  const existing = await prisma.siteSettings.findUnique({
    where: { id },
    select: { headerLogoKey: true, footerLogoKey: true },
  });
  if (!existing) return { ok: false, error: "ไม่พบการตั้งค่า" };

  const uploadedKeys: string[] = [];
  let newHeaderKey: string | undefined;
  let newFooterKey: string | undefined;

  const headerFile = formData.get("headerLogo");
  if (headerFile instanceof File && headerFile.size > 0) {
    const stored = await storePublicImage(headerFile, "site/header-logo");
    if (!stored.ok) return { ok: false, error: stored.error };
    if (stored.key) {
      newHeaderKey = stored.key;
      uploadedKeys.push(stored.key);
    }
  }

  const footerFile = formData.get("footerLogo");
  if (footerFile instanceof File && footerFile.size > 0) {
    const stored = await storePublicImage(footerFile, "site/footer-logo");
    if (!stored.ok) {
      for (const key of uploadedKeys) await storage.delete(key).catch(() => undefined);
      return { ok: false, error: stored.error };
    }
    if (stored.key) {
      newFooterKey = stored.key;
      uploadedKeys.push(stored.key);
    }
  }

  const removeHeader = formData.get("removeHeaderLogo") === "1";
  const removeFooter = formData.get("removeFooterLogo") === "1";

  try {
    const updated = await siteSettings.update(id, {
      ...parsed.data,
      ...(newHeaderKey ? { headerLogoKey: newHeaderKey } : {}),
      ...(newFooterKey ? { footerLogoKey: newFooterKey } : {}),
      ...(removeHeader ? { headerLogoKey: null } : {}),
      ...(removeFooter ? { footerLogoKey: null } : {}),
    });
    if (!updated) {
      for (const key of uploadedKeys) await storage.delete(key).catch(() => undefined);
      return { ok: false, error: "ไม่พบการตั้งค่า" };
    }

    if (newHeaderKey && existing.headerLogoKey && existing.headerLogoKey !== newHeaderKey) {
      await storage.delete(existing.headerLogoKey).catch(() => undefined);
    }
    if (removeHeader && existing.headerLogoKey) {
      await storage.delete(existing.headerLogoKey).catch(() => undefined);
    }
    if (newFooterKey && existing.footerLogoKey && existing.footerLogoKey !== newFooterKey) {
      await storage.delete(existing.footerLogoKey).catch(() => undefined);
    }
    if (removeFooter && existing.footerLogoKey) {
      await storage.delete(existing.footerLogoKey).catch(() => undefined);
    }

    return { ok: true };
  } catch {
    for (const key of uploadedKeys) await storage.delete(key).catch(() => undefined);
    return { ok: false, error: "บันทึกไม่สำเร็จ" };
  }
}

