"use client";

import type { ComponentProps } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageShell } from "@/components/admin/pages";
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
  ...portfolioProps
}: PortfolioClientProps & {
  canMutateProperties: boolean;
  pageSeo: PageSeoFormData | null;
  pageContent: PortfolioPageFormData | null;
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
        {content}
      </PageShell>
    );
  }

  return (
    <PageShell
      pageKey="portfolio"
      title="ผลงาน (Pages)"
      description="เนื้อหาหน้า · รายการผลงาน · Properties (SEO)"
    >
      <Tabs defaultValue="content">
        <TabsList>
          <TabsTrigger value="content" id="portfolio-tab-content">
            เนื้อหา
          </TabsTrigger>
          <TabsTrigger value="properties" id="portfolio-tab-properties">
            Properties
          </TabsTrigger>
        </TabsList>
        <TabsContent value="content" className="pt-4">
          {content}
        </TabsContent>
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
