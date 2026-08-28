import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";
import type { BannerMode, BannerPageSlug } from "@/lib/page-banners";

export type PageBannerAdminData = {
  version: number;
  mode: BannerMode;
  slides: Array<{
    id: string;
    altTh: string;
    altEn: string;
    linkPath: string;
    imageKey: string;
    imageUrl: string | null;
    blobMissing: boolean;
    isActive: boolean;
  }>;
};

/** Admin loader — returns banner form state for one page slug. */
export async function getPageBannerAdmin(pageSlug: BannerPageSlug): Promise<PageBannerAdminData> {
  const row = await prisma.pageBanner.findUnique({
    where: { pageSlug },
    include: { slides: { orderBy: { sortOrder: "asc" } } },
  });

  const slides = await Promise.all(
    (row?.slides ?? []).map(async (s) => ({
      id: s.id,
      altTh: s.altTh,
      altEn: s.altEn,
      linkPath: s.linkPath ?? "",
      imageKey: s.imageKey,
      imageUrl: (await storage.exists(s.imageKey))
        ? storage.publicUrl(s.imageKey)
        : null,
      blobMissing: !(await storage.exists(s.imageKey)),
      isActive: s.isActive,
    }))
  );

  return {
    version: row?.version ?? 0,
    mode: (row?.mode ?? "OFF") as PageBannerAdminData["mode"],
    slides,
  };
}
