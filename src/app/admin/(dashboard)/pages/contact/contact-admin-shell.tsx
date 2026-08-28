"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageBannerTabContent, PageBannerTabTrigger } from "@/components/admin/page-banner-tabs";
import type { PageBannerAdminData } from "@/components/admin/page-banner-panel";
import { ContactContentClient, type ContactSiteSettingsForm } from "./contact-content-client";

/**
 * Bespoke shell for the Contact page menu — not registered in `PAGE_REGISTRY`
 * (closed six-page set, Sprint 10). Contact content lives in the `SiteSettings`
 * singleton (shared with footer/header/other pages), not a per-page content
 * table, so it doesn't fit the registry's aggregate-content pattern.
 */
export function ContactAdminShell({
  siteSettings,
  bannerData,
}: {
  siteSettings: ContactSiteSettingsForm | null;
  bannerData: PageBannerAdminData;
}) {
  return (
    <div className="max-w-3xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-bold">ติดต่อเรา (Pages)</h1>
        <p className="text-sm text-muted-foreground">เนื้อหา · แบนเนอร์</p>
      </header>
      <Tabs defaultValue="content">
        <TabsList>
          <TabsTrigger value="content" id="contact-tab-content">
            เนื้อหา
          </TabsTrigger>
          <PageBannerTabTrigger id="contact-tab-banner" />
        </TabsList>
        <TabsContent value="content" className="pt-4">
          <ContactContentClient siteSettings={siteSettings} />
        </TabsContent>
        <PageBannerTabContent pageSlug="contact" data={bannerData} />
      </Tabs>
    </div>
  );
}
