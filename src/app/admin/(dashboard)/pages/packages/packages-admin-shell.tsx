"use client";

import type { ComponentProps } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageShell } from "@/components/admin/pages";
import { PageBannerTabContent, PageBannerTabTrigger } from "@/components/admin/page-banner-tabs";
import type { PageBannerAdminData } from "@/components/admin/page-banner-panel";
import { PackagesClient } from "../../packages/packages-client";
import { PagePropertiesPanel, type PageSeoFormData } from "../home/home-properties-panel";
import { PackagesPageContentClient, type PackagesPageFormData } from "./packages-page-content-client";

type PackagesClientProps = ComponentProps<typeof PackagesClient>;

export function PackagesAdminShell({
  canMutateProperties,
  pageSeo,
  pageContent,
  bannerData,
  ...packagesProps
}: PackagesClientProps & {
  canMutateProperties: boolean;
  pageSeo: PageSeoFormData | null;
  pageContent: PackagesPageFormData | null;
  bannerData: PageBannerAdminData;
}) {
  const content = (
    <div className="space-y-10">
      <PackagesPageContentClient data={pageContent} />
      <div className="border-t border-border pt-8">
        <PackagesClient {...packagesProps} embedded />
      </div>
    </div>
  );

  if (!canMutateProperties || !pageSeo) {
    return (
      <PageShell pageKey="packages" title="แพ็กเกจ (Pages)">
        <Tabs defaultValue="content">
          <TabsList>
            <TabsTrigger value="content" id="packages-tab-content">
              เนื้อหา
            </TabsTrigger>
            <PageBannerTabTrigger id="packages-tab-banner" />
          </TabsList>
          <TabsContent value="content" className="pt-4">
            {content}
          </TabsContent>
          <PageBannerTabContent pageSlug="packages" data={bannerData} />
        </Tabs>
      </PageShell>
    );
  }

  return (
    <PageShell
      pageKey="packages"
      title="แพ็กเกจ (Pages)"
      description="เนื้อหาหน้า · แบนเนอร์ · รายการแพ็กเกจ · Properties (SEO)"
    >
      <Tabs defaultValue="content">
        <TabsList>
          <TabsTrigger value="content" id="packages-tab-content">
            เนื้อหา
          </TabsTrigger>
          <PageBannerTabTrigger id="packages-tab-banner" />
          <TabsTrigger value="properties" id="packages-tab-properties">
            Properties
          </TabsTrigger>
        </TabsList>
        <TabsContent value="content" className="pt-4">
          {content}
        </TabsContent>
        <PageBannerTabContent pageSlug="packages" data={bannerData} />
        <TabsContent value="properties" className="pt-4">
          <PagePropertiesPanel
            key={pageSeo.version}
            pageKey="packages"
            pageSeo={pageSeo}
            title="Properties หน้าแพ็กเกจ"
          />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
