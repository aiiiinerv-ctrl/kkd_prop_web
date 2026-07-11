import { getTranslations, setRequestLocale } from "next-intl/server";
import { CtaBanner } from "@/components/site/cta-banner";
import { SectionHeading } from "@/components/site/section-heading";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { pickLocale } from "@/lib/i18n-content";
import { storage } from "@/lib/storage";
import { cn } from "@/lib/utils";
import type { BuildingType } from "@/generated/prisma/enums";

const FILTERS = [
  { value: "all", key: "filterAll" },
  { value: "RESIDENTIAL", key: "filterResidential" },
  { value: "COMMERCIAL", key: "filterCommercial" },
  { value: "INDUSTRIAL", key: "filterIndustrial" },
] as const;

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

  const activeFilter =
    FILTERS.find((f) => f.value === category)?.value ?? "all";

  const projects = await prisma.portfolioProject.findMany({
    where: {
      isPublished: true,
      ...(activeFilter !== "all"
        ? { category: activeFilter as BuildingType }
        : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return (
    <main>
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <SectionHeading title={t("title")} subtitle={t("subtitle")} />

        <div className="mb-9 flex flex-wrap justify-center gap-2">
          {FILTERS.map((f) => (
            <Link
              key={f.value}
              href={
                f.value === "all"
                  ? "/portfolio"
                  : { pathname: "/portfolio", query: { category: f.value } }
              }
              className={cn(
                "rounded-full border px-5 py-2 text-sm font-medium transition-colors",
                activeFilter === f.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-primary bg-transparent text-primary hover:bg-primary hover:text-primary-foreground"
              )}
            >
              {t(f.key)}
            </Link>
          ))}
        </div>

        {projects.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">{t("empty")}</p>
        ) : (
          <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => {
              const imageKeys = p.imageKeys as string[];
              return (
                <div
                  key={p.id}
                  className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
                >
                  {imageKeys[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={storage.publicUrl(imageKeys[0])}
                      alt={pickLocale(p, "title", locale)}
                      className="h-52 w-full object-cover"
                      loading="lazy"
                    />
                  )}
                  <div className="p-5">
                    <h3 className="font-semibold text-primary">
                      {pickLocale(p, "title", locale)}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {pickLocale(p, "description", locale)}
                    </p>
                    <p className="mt-3 text-xs text-muted-foreground">
                      {t("province")}: {p.province} · {t("systemSize")}:{" "}
                      {p.systemSizeKw}KW
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <CtaBanner />
    </main>
  );
}
