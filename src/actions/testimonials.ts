"use server";

import { z } from "zod";
import { storePublicImage } from "@/lib/admin-content";
import { auditedEntity } from "@/lib/audit";
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

const testimonials = auditedEntity({
  entityType: "Testimonial",
  model: (client) => client.testimonial,
  snapshot: "full",
  revalidate: () => [
    "/admin/testimonials",
    ["/[locale]", "layout"],
    ["/[locale]", "page"],
    ["/[locale]/about", "page"],
    ["/[locale]/testimonials", "page"],
    "/sitemap.xml",
  ],
});

async function resolveProjectId(projectId: string | undefined) {
  if (!projectId) return null;
  const project = await prisma.portfolioProject.findUnique({
    where: { id: projectId },
  });
  return project ? project.id : null;
}

export async function createTestimonial(formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const parsed = parseTestimonial(formData);
  if (!parsed.success) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };

  const photo = await storePublicImage(formData.get("photo"), "testimonials");
  if (!photo.ok) return { ok: false, error: photo.error };

  const { role, province, projectId, ...rest } = parsed.data;
  const resolvedProjectId = await resolveProjectId(projectId);

  await testimonials.create({
    ...rest,
    role: role || null,
    province: province || null,
    projectId: resolvedProjectId,
    photoKey: photo.key,
  });

  return { ok: true };
}

export async function updateTestimonial(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = parseTestimonial(formData);
  if (!parsed.success) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };

  const photo = await storePublicImage(formData.get("photo"), "testimonials");
  if (!photo.ok) return { ok: false, error: photo.error };

  const { role, province, projectId, ...rest } = parsed.data;
  const resolvedProjectId = await resolveProjectId(projectId);

  const result = await testimonials.update(id, {
    ...rest,
    role: role || null,
    province: province || null,
    projectId: resolvedProjectId,
    ...(photo.key ? { photoKey: photo.key } : {}),
  });
  if (!result) return { ok: false, error: "ไม่พบรีวิว" };

  if (photo.key && result.before.photoKey) {
    await storage.delete(result.before.photoKey);
  }
  return { ok: true };
}

export async function deleteTestimonial(id: string): Promise<ActionResult> {
  await requireAdmin();

  const before = await testimonials.remove(id);
  if (!before) return { ok: false, error: "ไม่พบรีวิว" };

  if (before.photoKey) {
    await storage.delete(before.photoKey);
  }
  return { ok: true };
}
