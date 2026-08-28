"use client";

import type { ComponentProps } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageShell } from "@/components/admin/pages";
import { PageBannerTabContent, PageBannerTabTrigger } from "@/components/admin/page-banner-tabs";
import type { PageBannerAdminData } from "@/components/admin/page-banner-panel";
import { PortfolioClient } from "../../portfolio/portfolio-client";
import { PagePropertiesPanel, type PageSeoFormData } from "../home/home-properties-panel";
import {
  PortfolioPageContentClient,
  type PortfolioPageFormData,
} from "./portfolio-page-content-client";

type PortfolioClientProps = ComponentProps<typeof PortfolioClient>;

export function PortfolioAdminShell({
  canMutateProperties,
  pageSeo,
  pageContent,
  bannerData,
  ...portfolioProps
}: PortfolioClientProps & {
  canMutateProperties: boolean;
  pageSeo: PageSeoFormData | null;
  pageContent: PortfolioPageFormData | null;
  bannerData: PageBannerAdminData;
}) {
  const content = (
    <div className="space-y-10">
      <PortfolioPageContentClient data={pageContent} />
      <div className="border-t border-border pt-8">
        <PortfolioClient {...portfolioProps} embedded />
      </div>
    </div>
  );

  if (!canMutateProperties || !pageSeo) {
    return (
      <PageShell pageKey="portfolio" title="ผลงาน (Pages)">
        <Tabs defaultValue="content">
          <TabsList>
            <TabsTrigger value="content" id="portfolio-tab-content">
              เนื้อหา
            </TabsTrigger>
            <PageBannerTabTrigger id="portfolio-tab-banner" />
          </TabsList>
          <TabsContent value="content" className="pt-4">
            {content}
          </TabsContent>
          <PageBannerTabContent pageSlug="portfolio" data={bannerData} />
        </Tabs>
      </PageShell>
    );
  }

  return (
    <PageShell
      pageKey="portfolio"
      title="ผลงาน (Pages)"
      description="เนื้อหาหน้า · แบนเนอร์ · รายการผลงาน · Properties (SEO)"
    >
      <Tabs defaultValue="content">
        <TabsList>
          <TabsTrigger value="content" id="portfolio-tab-content">
            เนื้อหา
          </TabsTrigger>
          <PageBannerTabTrigger id="portfolio-tab-banner" />
          <TabsTrigger value="properties" id="portfolio-tab-properties">
            Properties
          </TabsTrigger>
        </TabsList>
        <TabsContent value="content" className="pt-4">
          {content}
        </TabsContent>
        <PageBannerTabContent pageSlug="portfolio" data={bannerData} />
        <TabsContent value="properties" className="pt-4">
          <PagePropertiesPanel
            key={pageSeo.version}
            pageKey="portfolio"
            pageSeo={pageSeo}
            title="Properties หน้าผลงาน"
          />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
