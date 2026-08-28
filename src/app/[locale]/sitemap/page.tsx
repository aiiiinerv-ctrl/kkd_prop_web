import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageSitemap } from "@/components/site/page-sitemap";
import { SectionHeading } from "@/components/site/section-heading";
import { buildPublicSitemapTree } from "@/lib/sitemap/public-tree";
import { SITEMAP_SECTION_IDS, type SitemapSectionId } from "@/lib/sitemap/types";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return pageMetadata(locale, "sitemap", "/sitemap");
}

export default async function SitemapPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("sitemap");
  const tNav = await getTranslations("nav");

  const navLabels = Object.fromEntries(
    SITEMAP_SECTION_IDS.map((id) => [id, tNav(id as SitemapSectionId)])
  ) as Record<SitemapSectionId, string>;

  const groups = await buildPublicSitemapTree(locale, null, navLabels);

  return (
    <main>
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <SectionHeading
          title={t("title")}
          headingClassName="font-extrabold tracking-[-0.01em]"
          underline
        />
        <PageSitemap groups={groups} intro={t("empty")} />
      </section>
    </main>
  );
}
