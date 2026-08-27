"use client";

import type { ComponentProps } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageShell } from "@/components/admin/pages";
import { ServicesClient } from "../../services/services-client";
import { PagePropertiesPanel, type PageSeoFormData } from "../home/home-properties-panel";
import { ServicesPageContentClient, type ServicesPageFormData } from "./services-page-content-client";

type ServicesClientProps = ComponentProps<typeof ServicesClient>;

export function ServicesAdminShell({
  canMutateProperties,
  pageSeo,
  pageContent,
  ...servicesProps
}: ServicesClientProps & {
  canMutateProperties: boolean;
  pageSeo: PageSeoFormData | null;
  pageContent: ServicesPageFormData | null;
}) {
  const content = (
    <div className="space-y-10">
      <ServicesPageContentClient data={pageContent} />
      <div className="border-t border-border pt-8">
        <ServicesClient {...servicesProps} embedded />
      </div>
    </div>
  );

  if (!canMutateProperties || !pageSeo) {
    return (
      <PageShell pageKey="services" title="บริการ (Pages)">
        {content}
      </PageShell>
    );
  }

  return (
    <PageShell
      pageKey="services"
      title="บริการ (Pages)"
      description="เนื้อหาหน้า · รายการบริการ · Properties (SEO)"
    >
      <Tabs defaultValue="content">
        <TabsList>
          <TabsTrigger value="content" id="services-tab-content">
            เนื้อหา
          </TabsTrigger>
          <TabsTrigger value="properties" id="services-tab-properties">
            Properties
          </TabsTrigger>
        </TabsList>
        <TabsContent value="content" className="pt-4">
          {content}
        </TabsContent>
        <TabsContent value="properties" className="pt-4">
          <PagePropertiesPanel
            key={pageSeo.version}
            pageKey="services"
            pageSeo={pageSeo}
            title="Properties หน้าบริการ"
          />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
