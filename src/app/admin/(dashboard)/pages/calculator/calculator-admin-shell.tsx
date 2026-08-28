"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageShell } from "@/components/admin/pages";
import { PageBannerTabContent, PageBannerTabTrigger } from "@/components/admin/page-banner-tabs";
import type { PageBannerAdminData } from "@/components/admin/page-banner-panel";
import { PagePropertiesPanel, type PageSeoFormData } from "../home/home-properties-panel";
import {
  CalculatorConfigClient,
  type CalculatorConfigFormData,
} from "./calculator-config-client";
import {
  CalculatorPageContentClient,
  type CalculatorPageFormData,
} from "./calculator-page-content-client";

export function CalculatorAdminShell({
  canManageConfig,
  canMutateProperties,
  pageSeo,
  pageContent,
  calculatorConfig,
  bannerData,
}: {
  canManageConfig: boolean;
  canMutateProperties: boolean;
  pageSeo: PageSeoFormData | null;
  pageContent: CalculatorPageFormData | null;
  calculatorConfig: CalculatorConfigFormData | null;
  bannerData: PageBannerAdminData;
}) {
  const content = <CalculatorPageContentClient data={pageContent} />;
  const configTab =
    canManageConfig && calculatorConfig ? (
      <CalculatorConfigClient data={calculatorConfig} />
    ) : null;

  if (!canMutateProperties || !pageSeo) {
    return (
      <PageShell pageKey="calculator" title="เครื่องคำนวณ (Pages)">
        <Tabs defaultValue="content">
          <TabsList>
            <TabsTrigger value="content" id="calculator-tab-content">
              เนื้อหา
            </TabsTrigger>
            <PageBannerTabTrigger id="calculator-tab-banner" />
            {configTab && (
              <TabsTrigger value="config" id="calculator-tab-config">
                ตัวเลขการคำนวณ
              </TabsTrigger>
            )}
          </TabsList>
          <TabsContent value="content" className="pt-4">
            {content}
          </TabsContent>
          <PageBannerTabContent pageSlug="calculator" data={bannerData} />
          {configTab && (
            <TabsContent value="config" className="pt-4">
              {configTab}
            </TabsContent>
          )}
        </Tabs>
      </PageShell>
    );
  }

  return (
    <PageShell
      pageKey="calculator"
      title="เครื่องคำนวณ (Pages)"
      description="เนื้อหาหน้า · แบนเนอร์ · ตัวเลขการคำนวณ · Properties (SEO)"
    >
      <Tabs defaultValue="content">
        <TabsList>
          <TabsTrigger value="content" id="calculator-tab-content">
            เนื้อหา
          </TabsTrigger>
          <PageBannerTabTrigger id="calculator-tab-banner" />
          {configTab && (
            <TabsTrigger value="config" id="calculator-tab-config">
              ตัวเลขการคำนวณ
            </TabsTrigger>
          )}
          <TabsTrigger value="properties" id="calculator-tab-properties">
            Properties
          </TabsTrigger>
        </TabsList>
        <TabsContent value="content" className="pt-4">
          {content}
        </TabsContent>
        <PageBannerTabContent pageSlug="calculator" data={bannerData} />
        {configTab && (
          <TabsContent value="config" className="pt-4">
            {configTab}
          </TabsContent>
        )}
        <TabsContent value="properties" className="pt-4">
          <PagePropertiesPanel
            key={pageSeo.version}
            pageKey="calculator"
            pageSeo={pageSeo}
            title="Properties หน้าเครื่องคำนวณ"
          />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
