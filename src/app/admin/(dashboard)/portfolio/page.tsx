import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PortfolioClient } from "./portfolio-client";

export default async function AdminPortfolioPage() {
  await requireAdmin();

  const projects = await prisma.portfolioProject.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return (
    <PortfolioClient
      projects={projects.map((p) => ({
        id: p.id,
        titleTh: p.titleTh,
        titleEn: p.titleEn,
        descriptionTh: p.descriptionTh,
        descriptionEn: p.descriptionEn,
        category: p.category,
        province: p.province,
        systemSizeKw: p.systemSizeKw,
        imageKeys: (p.imageKeys as string[] | null) ?? [],
        completedAt: p.completedAt?.toISOString().split("T")[0] ?? "",
        sortOrder: p.sortOrder,
        isPublished: p.isPublished,
      }))}
    />
  );
}
