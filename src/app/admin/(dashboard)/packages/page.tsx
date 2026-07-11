import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PackagesClient } from "./packages-client";

export default async function AdminPackagesPage() {
  await requireAdmin();

  const packages = await prisma.package.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return (
    <PackagesClient
      packages={packages.map((p) => ({
        id: p.id,
        nameTh: p.nameTh,
        nameEn: p.nameEn,
        sizeKw: p.sizeKw,
        priceThb: p.priceThb,
        isPopular: p.isPopular,
        suitableTh: p.suitableTh,
        suitableEn: p.suitableEn,
        featuresTh: (p.featuresTh as string[] | null) ?? [],
        featuresEn: (p.featuresEn as string[] | null) ?? [],
        sortOrder: p.sortOrder,
        isPublished: p.isPublished,
      }))}
    />
  );
}
