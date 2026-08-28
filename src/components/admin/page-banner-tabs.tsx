"use client";

import { PageBannerPanel } from "@/components/admin/page-banner-panel";
import type { PageBannerAdminData } from "@/lib/admin/page-banner-admin";
import { TabsContent, TabsTrigger } from "@/components/ui/tabs";
import type { BannerPageSlug } from "@/lib/page-banners";

export function PageBannerTabTrigger({ id }: { id: string }) {
  return (
    <TabsTrigger value="banner" id={id}>
      แบนเนอร์
    </TabsTrigger>
  );
}

export function PageBannerTabContent({
  pageSlug,
  data,
}: {
  pageSlug: BannerPageSlug;
  data: PageBannerAdminData;
}) {
  return (
    <TabsContent value="banner" className="pt-4">
      <PageBannerPanel key={`${pageSlug}-${data.version}`} pageSlug={pageSlug} data={data} />
    </TabsContent>
  );
}
