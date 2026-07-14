import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TestimonialsClient } from "./testimonials-client";

export default async function AdminTestimonialsPage() {
  await requireAdmin();

  const [testimonials, projects] = await Promise.all([
    prisma.testimonial.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: { project: true },
    }),
    prisma.portfolioProject.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    }),
  ]);

  return (
    <TestimonialsClient
      testimonials={testimonials.map((t) => ({
        id: t.id,
        customerName: t.customerName,
        quoteTh: t.quoteTh,
        quoteEn: t.quoteEn,
        role: t.role ?? "",
        province: t.province ?? "",
        photoKey: t.photoKey,
        projectId: t.projectId ?? "",
        projectTitleTh: t.project?.titleTh ?? "",
        sortOrder: t.sortOrder,
        isPublished: t.isPublished,
      }))}
      projects={projects.map((p) => ({
        id: p.id,
        titleTh: p.titleTh,
      }))}
    />
  );
}
