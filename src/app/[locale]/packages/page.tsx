import { Check } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CtaBanner } from "@/components/site/cta-banner";
import { SectionHeading } from "@/components/site/section-heading";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { pickLocale, pickLocaleList } from "@/lib/i18n-content";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 300;

type SeasonRow = { monthsTh: string; monthsEn: string; unitsPerDay: number };
type Seasonal = Record<"summer" | "earlyRainy" | "rainy" | "winter", SeasonRow>;

const SEASON_KEYS = [
  ["summer", "seasonSummer"],
  ["earlyRainy", "seasonEarlyRainy"],
  ["rainy", "seasonRainy"],
  ["winter", "seasonWinter"],
] as const;


export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return pageMetadata(locale, "packages", "/packages");
}

export default async function PackagesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("packages");
  const tCommon = await getTranslations("common");

  const packages = await prisma.package.findMany({
    where: { isPublished: true },
    orderBy: { sortOrder: "asc" },
  });

  const popular = packages.find((p) => p.isPopular) ?? packages[0];
  const seasonal = popular?.seasonalProduction as Seasonal | undefined;

  return (
    <main>
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <SectionHeading title={t("title")} subtitle={t("subtitle")} />

        <div className="grid gap-7 md:grid-cols-3">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className={
                pkg.isPopular
                  ? "relative flex flex-col rounded-xl border-2 border-brand-orange bg-card p-7 shadow-md"
                  : "flex flex-col rounded-xl border border-border/70 bg-card p-7 shadow-sm"
              }
            >
              {pkg.isPopular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-orange px-4 py-0.5 text-xs font-semibold whitespace-nowrap text-white">
                  {tCommon("popular")}
                </span>
              )}
              <h3
                className={
                  pkg.isPopular
                    ? "text-center text-xl font-bold text-brand-orange"
                    : "text-center text-xl font-bold text-primary"
                }
              >
                {pickLocale(pkg, "name", locale)}
              </h3>
              <p className="mt-1 text-center text-sm text-muted-foreground">
                {pickLocale(pkg, "suitable", locale)}
              </p>
              <div className="mt-4 text-center">
                <span className="text-xs text-muted-foreground">{t("priceFrom")} </span>
                <span className="text-2xl font-bold text-primary">
                  ฿{pkg.priceThb.toLocaleString()}
                </span>
              </div>
              <ul className="mt-5 flex-1 space-y-2.5">
                {pickLocaleList(pkg, "features", locale).map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-brand-orange" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={{
                  pathname: "/booking",
                  query: { tab: "quote", package: pkg.slug },
                }}
                className={
                  pkg.isPopular
                    ? "mt-7 rounded-full bg-brand-orange px-5 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-brand-orange-dark"
                    : "mt-7 rounded-full border-2 border-brand-orange px-5 py-2.5 text-center text-sm font-semibold text-brand-orange transition-colors hover:bg-brand-orange hover:text-white"
                }
              >
                {tCommon("requestQuote")}
              </Link>
            </div>
          ))}
        </div>

        {seasonal && popular && (
          <div className="mx-auto mt-14 max-w-3xl rounded-xl border border-border/70 bg-card p-7 shadow-sm">
            <h3 className="text-lg font-bold text-primary">{t("seasonalTitle")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("seasonalSubtitle", { size: pickLocale(popular, "name", locale) })}
            </p>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-primary text-white">
                    <th className="border border-border px-4 py-2.5 font-semibold">
                      {t("colSeason")}
                    </th>
                    <th className="border border-border px-4 py-2.5 font-semibold">
                      {t("colMonths")}
                    </th>
                    <th className="border border-border px-4 py-2.5 font-semibold">
                      {t("colProduction")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {SEASON_KEYS.map(([dataKey, labelKey]) => {
                    const row = seasonal[dataKey];
                    if (!row) return null;
                    return (
                      <tr key={dataKey} className="text-center even:bg-muted/40">
                        <td className="border border-border px-4 py-2.5">
                          {t(labelKey)}
                        </td>
                        <td className="border border-border px-4 py-2.5">
                          {locale === "en" ? row.monthsEn : row.monthsTh}
                        </td>
                        <td className="border border-border px-4 py-2.5">
                          ~{row.unitsPerDay} {tCommon("unitsPerDay")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <CtaBanner />
    </main>
  );
}
