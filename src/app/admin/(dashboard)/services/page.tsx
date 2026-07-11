import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ServicesClient } from "./services-client";

export default async function AdminServicesPage() {
  await requireAdmin();

  const services = await prisma.service.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return (
    <ServicesClient
      services={services.map((s) => ({
        id: s.id,
        kind: s.kind,
        titleTh: s.titleTh,
        titleEn: s.titleEn,
        descriptionTh: s.descriptionTh,
        descriptionEn: s.descriptionEn,
        featuresTh: (s.featuresTh as string[] | null) ?? [],
        featuresEn: (s.featuresEn as string[] | null) ?? [],
        imageKey: s.imageKey,
        sortOrder: s.sortOrder,
        isPublished: s.isPublished,
      }))}
    />
  );
}
