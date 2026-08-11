import { getTranslations, setRequestLocale } from "next-intl/server";
import { CtaBanner } from "@/components/site/cta-banner";
import { SectionHeading } from "@/components/site/section-heading";
import { getPublishedProjects } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import { PortfolioGrid } from "./portfolio-grid";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return pageMetadata(locale, "portfolio", "/portfolio");
}

export default async function PortfolioPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string }>;
}) {
  const { locale } = await params;
  const { category } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("portfolio");

  const projects = await getPublishedProjects(locale);

  return (
    <main>
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <SectionHeading
          title={t("title")}
          subtitle={t("subtitle")}
          caption={t("imageDisclaimer")}
          headingClassName="font-extrabold tracking-[-0.01em]"
          underline
        />

        <PortfolioGrid
          initialCategory={category ?? "all"}
          projects={projects}
        />
      </section>

      <CtaBanner />
    </main>
  );
}
