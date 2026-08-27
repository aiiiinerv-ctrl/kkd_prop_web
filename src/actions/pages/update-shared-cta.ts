"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sharedCtaFieldsSchema } from "@/lib/validations/shared-cta";

const CTA_REVALIDATE: Array<string | readonly [string, "page" | "layout"]> = [
  "/th",
  "/en",
  "/th/about",
  "/en/about",
  "/th/services",
  "/en/services",
  "/th/packages",
  "/en/packages",
  "/th/portfolio",
  "/en/portfolio",
  "/th/testimonials",
  "/en/testimonials",
  "/th/contact",
  "/en/contact",
  "/admin/pages/home",
  "/admin/settings",
  ["/th", "layout"],
  ["/en", "layout"],
];

function ctaSnapshot(row: {
  ctaVersion: number;
  ctaTitleTh: string | null;
  ctaTitleEn: string | null;
  ctaSubtitleTh: string | null;
  ctaSubtitleEn: string | null;
  ctaPrimaryLabelTh: string | null;
  ctaPrimaryLabelEn: string | null;
  ctaSecondaryLabelTh: string | null;
  ctaSecondaryLabelEn: string | null;
}) {
  return {
    ctaVersion: row.ctaVersion,
    ctaTitleTh: row.ctaTitleTh,
    ctaTitleEn: row.ctaTitleEn,
    ctaSubtitleTh: row.ctaSubtitleTh,
    ctaSubtitleEn: row.ctaSubtitleEn,
    ctaPrimaryLabelTh: row.ctaPrimaryLabelTh,
    ctaPrimaryLabelEn: row.ctaPrimaryLabelEn,
    ctaSecondaryLabelTh: row.ctaSecondaryLabelTh,
    ctaSecondaryLabelEn: row.ctaSecondaryLabelEn,
  };
}

/**
 * Shared CTA banner fields on SiteSettings (#68).
 * Uses `ctaVersion` optimistic concurrency (SiteSettings has no generic `version`).
 */
export async function updateSharedCta(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string } | { ok: false; conflict: true }> {
  await requireRole("ADMIN", "MARKETING");

  const parsed = sharedCtaFieldsSchema.safeParse({
    expectedVersion: formData.get("expectedVersion"),
    ctaTitleTh: formData.get("ctaTitleTh") ?? "",
    ctaTitleEn: formData.get("ctaTitleEn") ?? "",
    ctaSubtitleTh: formData.get("ctaSubtitleTh") ?? "",
    ctaSubtitleEn: formData.get("ctaSubtitleEn") ?? "",
    ctaPrimaryLabelTh: formData.get("ctaPrimaryLabelTh") ?? "",
    ctaPrimaryLabelEn: formData.get("ctaPrimaryLabelEn") ?? "",
    ctaSecondaryLabelTh: formData.get("ctaSecondaryLabelTh") ?? "",
    ctaSecondaryLabelEn: formData.get("ctaSecondaryLabelEn") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }

  const existing = await prisma.siteSettings.findFirst({ select: { id: true } });
  if (!existing) return { ok: false, error: "ไม่พบการตั้งค่า" };

  const session = await auth();
  const actorId = session?.user?.id;
  if (!actorId) return { ok: false, error: "forbidden" };

  const result = await prisma.$transaction(async (tx) => {
    const before = await tx.siteSettings.findUnique({ where: { id: existing.id } });
    if (!before) return { conflict: true as const };

    const { count } = await tx.siteSettings.updateMany({
      where: { id: existing.id, ctaVersion: parsed.data.expectedVersion },
      data: {
        ctaVersion: { increment: 1 },
        ctaTitleTh: parsed.data.ctaTitleTh,
        ctaTitleEn: parsed.data.ctaTitleEn,
        ctaSubtitleTh: parsed.data.ctaSubtitleTh,
        ctaSubtitleEn: parsed.data.ctaSubtitleEn,
        ctaPrimaryLabelTh: parsed.data.ctaPrimaryLabelTh,
        ctaPrimaryLabelEn: parsed.data.ctaPrimaryLabelEn,
        ctaSecondaryLabelTh: parsed.data.ctaSecondaryLabelTh,
        ctaSecondaryLabelEn: parsed.data.ctaSecondaryLabelEn,
      },
    });
    if (count === 0) return { conflict: true as const };

    const after = await tx.siteSettings.findUniqueOrThrow({ where: { id: existing.id } });
    await tx.auditLog.create({
      data: {
        actorId,
        action: "UPDATE",
        entityType: "SiteSettings",
        entityId: existing.id,
        before: ctaSnapshot(before),
        after: ctaSnapshot(after),
      },
    });
    return { conflict: false as const };
  });

  if (result.conflict) return { ok: false, conflict: true };

  for (const target of CTA_REVALIDATE) {
    if (typeof target === "string") revalidatePath(target);
    else revalidatePath(target[0], target[1]);
  }
  return { ok: true };
}
