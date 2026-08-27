"use client";

import type { ComponentProps } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageShell } from "@/components/admin/pages";
import { HomeClient } from "./home-client";
import { HomePropertiesPanel, type HomePageSeoData } from "./home-properties-panel";
import { HomeSharedCtaPanel, type SharedCtaData } from "./home-shared-cta-panel";

type HomeClientProps = ComponentProps<typeof HomeClient>;

export function HomeAdminShell({
  canMutateProperties,
  pageSeo,
  sharedCta,
  ...homeProps
}: HomeClientProps & {
  canMutateProperties: boolean;
  pageSeo: HomePageSeoData | null;
  sharedCta: SharedCtaData | null;
}) {
  if (!canMutateProperties || !pageSeo) {
    return <HomeClient {...homeProps} />;
  }

  return (
    <PageShell
      pageKey="home"
      title="หน้าแรก (Pages)"
      description="เนื้อหา · Properties (SEO) · CTA รวม — บันทึกแยกแท็บ"
    >
      <Tabs defaultValue="content">
        <TabsList>
          <TabsTrigger value="content" id="home-tab-content">
            เนื้อหา
          </TabsTrigger>
          <TabsTrigger value="properties" id="home-tab-properties">
            Properties
          </TabsTrigger>
          <TabsTrigger value="shared-cta" id="home-tab-shared-cta">
            CTA รวม
          </TabsTrigger>
        </TabsList>
        <TabsContent value="content" className="pt-4">
          <HomeClientEmbedded {...homeProps} />
        </TabsContent>
        <TabsContent value="properties" className="pt-4">
          <HomePropertiesPanel key={pageSeo.version} pageSeo={pageSeo} />
        </TabsContent>
        <TabsContent value="shared-cta" className="pt-4">
          {sharedCta ? (
            <HomeSharedCtaPanel key={sharedCta.ctaVersion} cta={sharedCta} />
          ) : (
            <p className="text-sm text-muted-foreground">ยังไม่มีแถว SiteSettings</p>
          )}
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}

/** Avoid double PageShell when nested under tabs. */
function HomeClientEmbedded(props: HomeClientProps) {
  return <HomeClient {...props} embedded />;
}
