"use client";

import type { ComponentProps } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageShell } from "@/components/admin/pages";
import { PagePropertiesPanel, type PageSeoFormData } from "../home/home-properties-panel";
import { AboutClient } from "./about-client";

type AboutClientProps = ComponentProps<typeof AboutClient>;

export function AboutAdminShell({
  canMutateProperties,
  pageSeo,
  ...aboutProps
}: AboutClientProps & {
  canMutateProperties: boolean;
  pageSeo: PageSeoFormData | null;
}) {
  if (!canMutateProperties || !pageSeo) {
    return (
      <PageShell pageKey="about" title="เกี่ยวกับเรา (Pages)">
        <AboutClient {...aboutProps} />
      </PageShell>
    );
  }

  return (
    <PageShell
      pageKey="about"
      title="เกี่ยวกับเรา (Pages)"
      description="เนื้อหา · Properties (SEO)"
    >
      <Tabs defaultValue="content">
        <TabsList>
          <TabsTrigger value="content" id="about-tab-content">
            เนื้อหา
          </TabsTrigger>
          <TabsTrigger value="properties" id="about-tab-properties">
            Properties
          </TabsTrigger>
        </TabsList>
        <TabsContent value="content" className="pt-4">
          <AboutClient {...aboutProps} />
        </TabsContent>
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
