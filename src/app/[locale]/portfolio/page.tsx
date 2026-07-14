import { getTranslations, setRequestLocale } from "next-intl/server";
import { CtaBanner } from "@/components/site/cta-banner";
import { SectionHeading } from "@/components/site/section-heading";
import { prisma } from "@/lib/db";
import { pickLocale } from "@/lib/i18n-content";
import { storage } from "@/lib/storage";
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

  const projects = await prisma.portfolioProject.findMany({
    where: { isPublished: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

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
          projects={projects.map((p) => {
            const imageKeys = p.imageKeys as string[];
            return {
              id: p.id,
              title: pickLocale(p, "title", locale),
              description: pickLocale(p, "description", locale),
              province: p.province,
              systemSizeKw: p.systemSizeKw,
              category: p.category,
              imageUrl: imageKeys[0] ? storage.publicUrl(imageKeys[0]) : null,
            };
          })}
        />
      </section>

      <CtaBanner />
    </main>
  );
}
