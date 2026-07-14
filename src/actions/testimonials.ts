"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { storePublicImage } from "@/lib/admin-content";
import { withAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";
import type { ActionResult } from "./users";

const testimonialSchema = z.object({
  customerName: z.string().trim().min(2).max(120),
  quoteTh: z.string().trim().min(2).max(2000),
  quoteEn: z.string().trim().min(2).max(2000),
  role: z.string().trim().max(120).optional().or(z.literal("")),
  province: z.string().trim().max(80).optional().or(z.literal("")),
  projectId: z.string().trim().max(60).optional().or(z.literal("")),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  isPublished: z.coerce.boolean(),
});

function parseTestimonial(formData: FormData) {
  return testimonialSchema.safeParse({
    customerName: formData.get("customerName"),
    quoteTh: formData.get("quoteTh"),
    quoteEn: formData.get("quoteEn"),
    role: formData.get("role") || undefined,
    province: formData.get("province") || undefined,
    projectId: formData.get("projectId") || undefined,
    sortOrder: formData.get("sortOrder") || 0,
    isPublished: formData.get("isPublished") === "on",
  });
}

function revalidate() {
  revalidatePath("/admin/testimonials");
  revalidatePath("/[locale]", "page");
  revalidatePath("/[locale]/about", "page");
  revalidatePath("/[locale]/testimonials", "page");
}

async function resolveProjectId(projectId: string | undefined) {
  if (!projectId) return null;
  const project = await prisma.portfolioProject.findUnique({
    where: { id: projectId },
  });
  return project ? project.id : null;
}

export async function createTestimonial(formData: FormData): Promise<ActionResult> {
  const session = await requireAdmin();

  const parsed = parseTestimonial(formData);
  if (!parsed.success) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };

  const photo = await storePublicImage(formData.get("photo"), "testimonials");
  if (!photo.ok) return { ok: false, error: photo.error };

  const { role, province, projectId, ...rest } = parsed.data;
  const resolvedProjectId = await resolveProjectId(projectId);

  await withAudit({
    actorId: session.user.id,
    action: "CREATE",
    entityType: "Testimonial",
    run: () =>
      prisma.testimonial.create({
        data: {
          ...rest,
          role: role || null,
          province: province || null,
          projectId: resolvedProjectId,
          photoKey: photo.key,
        },
      }),
  });

  revalidate();
  return { ok: true };
}

export async function updateTestimonial(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const session = await requireAdmin();

  const before = await prisma.testimonial.findUnique({ where: { id } });
  if (!before) return { ok: false, error: "ไม่พบรีวิว" };

  const parsed = parseTestimonial(formData);
  if (!parsed.success) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };

  const photo = await storePublicImage(formData.get("photo"), "testimonials");
  if (!photo.ok) return { ok: false, error: photo.error };

  const { role, province, projectId, ...rest } = parsed.data;
  const resolvedProjectId = await resolveProjectId(projectId);

  await withAudit({
    actorId: session.user.id,
    action: "UPDATE",
    entityType: "Testimonial",
    before,
    run: () =>
      prisma.testimonial.update({
        where: { id },
        data: {
          ...rest,
          role: role || null,
          province: province || null,
          projectId: resolvedProjectId,
          ...(photo.key ? { photoKey: photo.key } : {}),
        },
      }),
  });

  if (photo.key && before.photoKey) {
    await storage.delete(before.photoKey);
  }
  revalidate();
  return { ok: true };
}

export async function deleteTestimonial(id: string): Promise<ActionResult> {
  const session = await requireAdmin();

  const before = await prisma.testimonial.findUnique({ where: { id } });
  if (!before) return { ok: false, error: "ไม่พบรีวิว" };

  await withAudit({
    actorId: session.user.id,
    action: "DELETE",
    entityType: "Testimonial",
    before,
    run: async () => {
      await prisma.testimonial.delete({ where: { id } });
      return null;
    },
  });

  if (before.photoKey) {
    await storage.delete(before.photoKey);
  }
  revalidate();
  return { ok: true };
}
