"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageBannerTabContent, PageBannerTabTrigger } from "@/components/admin/page-banner-tabs";
import type { PageBannerAdminData } from "@/components/admin/page-banner-panel";
import { ContactContentClient, type ContactSiteSettingsForm } from "./contact-content-client";
import { PagePropertiesPanel, type PageSeoFormData } from "../home/home-properties-panel";

/**
 * Bespoke shell for the Contact page menu — Content is not registered in
 * `PAGE_REGISTRY` (Contact content lives in the `SiteSettings` singleton,
 * shared with footer/header/other pages, not a per-page content table, so
 * it doesn't fit the registry's aggregate-content pattern). Properties
 * (SEO/meta) *is* registered (properties-only entry) and reuses the shared
 * `PagePropertiesPanel`, same as `about`/`home`/etc.
 */
export function ContactAdminShell({
  siteSettings,
  bannerData,
  canMutateProperties,
  pageSeo,
}: {
  siteSettings: ContactSiteSettingsForm | null;
  bannerData: PageBannerAdminData;
  canMutateProperties: boolean;
  pageSeo: PageSeoFormData | null;
}) {
  return (
    <div className="max-w-3xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-bold">ติดต่อเรา (Pages)</h1>
        <p className="text-sm text-muted-foreground">
          {canMutateProperties && pageSeo ? "เนื้อหา · แบนเนอร์ · Properties (SEO)" : "เนื้อหา · แบนเนอร์"}
        </p>
      </header>
      <Tabs defaultValue="content">
        <TabsList>
          <TabsTrigger value="content" id="contact-tab-content">
            เนื้อหา
          </TabsTrigger>
          <PageBannerTabTrigger id="contact-tab-banner" />
          {canMutateProperties && pageSeo ? (
            <TabsTrigger value="properties" id="contact-tab-properties">
              Properties
            </TabsTrigger>
          ) : null}
        </TabsList>
        <TabsContent value="content" className="pt-4">
          <ContactContentClient siteSettings={siteSettings} />
        </TabsContent>
        <PageBannerTabContent pageSlug="contact" data={bannerData} />
        {canMutateProperties && pageSeo ? (
          <TabsContent value="properties" className="pt-4">
            <PagePropertiesPanel
              key={pageSeo.version}
              pageKey="contact"
              pageSeo={pageSeo}
              title="Properties หน้าติดต่อเรา"
            />
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}
