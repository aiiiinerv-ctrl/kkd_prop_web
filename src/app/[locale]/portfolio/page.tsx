import { getTranslations, setRequestLocale } from "next-intl/server";
import { CtaBanner } from "@/components/site/cta-banner";
import { SectionHeading } from "@/components/site/section-heading";
import { getPortfolioPageContent, getPublishedProjects } from "@/lib/content";
import { PAGE_REGISTRY } from "@/lib/pages";
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

  const usePages = PAGE_REGISTRY.portfolio.contentRollout === "pages";
  const [projects, pageContent] = await Promise.all([
    getPublishedProjects(locale),
    usePages ? getPortfolioPageContent(locale) : Promise.resolve(null),
  ]);

  const hasRow = Boolean(pageContent);
  const pick = (db: string | null | undefined, key: Parameters<typeof t>[0]) => {
    if (usePages && !hasRow) return t(key);
    if (usePages) return db || "";
    return db ?? t(key);
  };

  const showGlobalCta = pageContent?.showGlobalCta !== false;

  return (
    <main>
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <SectionHeading
          title={pick(pageContent?.title, "title")}
          subtitle={pick(pageContent?.subtitle, "subtitle")}
          caption={pick(pageContent?.imageDisclaimer, "imageDisclaimer")}
          headingClassName="font-extrabold tracking-[-0.01em]"
          underline
        />

        {projects.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">
            {pick(pageContent?.empty, "empty")}
          </p>
        ) : (
          <PortfolioGrid initialCategory={category ?? "all"} projects={projects} />
        )}
      </section>

      {showGlobalCta ? <CtaBanner /> : null}
    </main>
  );
}
