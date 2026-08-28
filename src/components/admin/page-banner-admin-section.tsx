import { getPageBannerAdmin } from "@/lib/admin/page-banner-admin";
import { PageBannerPanel, type PageBannerAdminData } from "@/components/admin/page-banner-panel";
import type { BannerPageSlug } from "@/lib/page-banners";

export async function PageBannerAdminSection({ pageSlug }: { pageSlug: BannerPageSlug }) {
  const data: PageBannerAdminData = await getPageBannerAdmin(pageSlug);
  return <PageBannerPanel key={`${pageSlug}-${data.version}-${data.mode}`} pageSlug={pageSlug} data={data} />;
}
