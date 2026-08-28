"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageShell } from "@/components/admin/pages";
import { PagePropertiesPanel, type PageSeoFormData } from "../home/home-properties-panel";
import {
  CalculatorPageContentClient,
  type CalculatorPageFormData,
} from "./calculator-page-content-client";

export function CalculatorAdminShell({
  canMutateProperties,
  pageSeo,
  pageContent,
}: {
  canMutateProperties: boolean;
  pageSeo: PageSeoFormData | null;
  pageContent: CalculatorPageFormData | null;
}) {
  const content = <CalculatorPageContentClient data={pageContent} />;

  if (!canMutateProperties || !pageSeo) {
    return (
      <PageShell pageKey="calculator" title="เครื่องคำนวณ (Pages)">
        {content}
      </PageShell>
    );
  }

  return (
    <PageShell
      pageKey="calculator"
      title="เครื่องคำนวณ (Pages)"
      description="เนื้อหาหน้า · Properties (SEO)"
    >
      <Tabs defaultValue="content">
        <TabsList>
          <TabsTrigger value="content" id="calculator-tab-content">
            เนื้อหา
          </TabsTrigger>
          <TabsTrigger value="properties" id="calculator-tab-properties">
            Properties
          </TabsTrigger>
        </TabsList>
        <TabsContent value="content" className="pt-4">
          {content}
        </TabsContent>
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
