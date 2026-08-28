"use client";

import type { ComponentProps } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageShell } from "@/components/admin/pages";
import { PageBannerTabContent, PageBannerTabTrigger } from "@/components/admin/page-banner-tabs";
import type { PageBannerAdminData } from "@/components/admin/page-banner-panel";
import { AboutClient } from "./about-client";
import { PagePropertiesPanel, type PageSeoFormData } from "../home/home-properties-panel";

type AboutClientProps = ComponentProps<typeof AboutClient>;

export function AboutAdminShell({
  canMutateProperties,
  pageSeo,
  bannerData,
  ...aboutProps
}: AboutClientProps & {
  canMutateProperties: boolean;
  pageSeo: PageSeoFormData | null;
  bannerData: PageBannerAdminData;
}) {
  if (!canMutateProperties || !pageSeo) {
    return (
      <PageShell pageKey="about" title="เกี่ยวกับเรา (Pages)">
        <Tabs defaultValue="content">
          <TabsList>
            <TabsTrigger value="content" id="about-tab-content">
              เนื้อหา
            </TabsTrigger>
            <PageBannerTabTrigger id="about-tab-banner" />
          </TabsList>
          <TabsContent value="content" className="pt-4">
            <AboutClient {...aboutProps} />
          </TabsContent>
          <PageBannerTabContent pageSlug="about" data={bannerData} />
        </Tabs>
      </PageShell>
    );
  }

  return (
    <PageShell
      pageKey="about"
      title="เกี่ยวกับเรา (Pages)"
      description="เนื้อหา · แบนเนอร์ · Properties (SEO)"
    >
      <Tabs defaultValue="content">
        <TabsList>
          <TabsTrigger value="content" id="about-tab-content">
            เนื้อหา
          </TabsTrigger>
          <PageBannerTabTrigger id="about-tab-banner" />
          <TabsTrigger value="properties" id="about-tab-properties">
            Properties
          </TabsTrigger>
        </TabsList>
        <TabsContent value="content" className="pt-4">
          <AboutClient {...aboutProps} />
        </TabsContent>
        <PageBannerTabContent pageSlug="about" data={bannerData} />
        <TabsContent value="properties" className="pt-4">
          <PagePropertiesPanel
            key={pageSeo.version}
            pageKey="about"
            pageSeo={pageSeo}
            title="Properties หน้าเกี่ยวกับเรา"
          />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
