import { Check } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CtaBanner } from "@/components/site/cta-banner";
import { PageBanner } from "@/components/site/page-banner";
import { SeasonalProductionTable } from "@/components/site/seasonal-production-table";
import { SectionHeading } from "@/components/site/section-heading";
import { Link } from "@/i18n/navigation";
import { bookingHref } from "@/lib/booking-links";
import { getPackagesPageContent, getPublishedPackages } from "@/lib/content";
import { PAGE_REGISTRY } from "@/lib/pages";
import { pageMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const revalidate = 300;

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

  const usePages = PAGE_REGISTRY.packages.contentRollout === "pages";
  const [packages, pageContent] = await Promise.all([
    getPublishedPackages(locale),
    usePages ? getPackagesPageContent(locale) : Promise.resolve(null),
  ]);

  const hasRow = Boolean(pageContent);
  const pick = (db: string | null | undefined, key: Parameters<typeof t>[0]) => {
    if (usePages && !hasRow) return t(key);
    if (usePages) return db || "";
    return db ?? t(key);
  };

  const pickSize = (db: string | null | undefined, size: string) => {
    if (usePages && !hasRow) return t("seasonalSubtitle", { size });
    if (usePages) return (db || "").replaceAll("{size}", size);
    return t("seasonalSubtitle", { size });
  };

  const popular = packages.find((p) => p.isPopular) ?? packages[0];
  const seasonal = popular?.seasonal;
  const showSeasonal = pageContent?.showSeasonal !== false && Boolean(seasonal && popular);
  const showPayback = pageContent?.showPayback !== false;
  const showGlobalCta = pageContent?.showGlobalCta !== false;

  return (
    <main>
      <PageBanner pageSlug="packages" />
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <SectionHeading
          title={pick(pageContent?.title, "title")}
          subtitle={pick(pageContent?.subtitle, "subtitle")}
          headingClassName="font-extrabold tracking-[-0.01em]"
        />

        {packages.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">{pick(pageContent?.empty, "empty")}</p>
        ) : (
          <div className="grid gap-7 md:grid-cols-3">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className={
                  pkg.isPopular
                    ? "group relative flex flex-col rounded-xl border-2 border-brand-orange bg-card p-7 shadow-md transition-all hover:-translate-y-1.5 hover:shadow-[var(--shadow-gold)]"
                    : "flex flex-col rounded-xl border border-border/70 bg-card p-7 shadow-sm transition-all hover:-translate-y-1.5 hover:shadow-lg"
                }
              >
                {pkg.isPopular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-orange-cta px-4 py-0.5 text-xs font-semibold whitespace-nowrap text-[#0a1e3c] transition-shadow group-hover:shadow-[var(--shadow-gold)]">
                    {tCommon("popular")}
                  </span>
                )}
                <h3 className="text-center text-xl font-bold text-primary">{pkg.name}</h3>
                <p className="mt-1 text-center text-sm text-muted-foreground">{pkg.suitable}</p>
                <div className="mt-4 text-center">
                  <span className="text-xs text-muted-foreground">{t("priceFrom")} </span>
                  <span className="text-2xl font-bold text-primary">
                    ฿{pkg.priceThb.toLocaleString()}
                  </span>
                </div>
                <ul className="mt-5 flex-1 space-y-2.5">
                  {pkg.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 size-4 shrink-0 text-brand-orange" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/packages/${pkg.slug}`}
                  className="mt-5 text-center text-sm font-semibold text-brand-orange hover:text-brand-orange-dark"
                >
                  {tCommon("learnMore")}
                </Link>
                <Link
                  href={bookingHref({ tab: "quote", package: pkg.slug })}
                  className={cn("mt-3", pkg.isPopular ? "btn-pill" : "btn-pill-outline")}
                >
                  {tCommon("requestQuote")}
                </Link>
              </div>
            ))}
          </div>
        )}

        {(showSeasonal || showPayback) && (
          <div className="mx-auto mt-14 grid max-w-3xl gap-7">
            {showSeasonal && seasonal && popular ? (
              <div className="rounded-xl border border-border/70 bg-card p-7 shadow-sm">
                <h3 className="text-lg font-bold text-primary">
                  {pick(pageContent?.seasonalTitle, "seasonalTitle")}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {pickSize(pageContent?.seasonalSubtitle, popular.name)}
                </p>
                <div className="mt-5">
                  <SeasonalProductionTable seasonal={seasonal} locale={locale} t={t} tCommon={tCommon} />
                </div>
              </div>
            ) : null}

            {showPayback ? (
              <div className="rounded-xl border border-border/70 bg-card p-7 shadow-sm">
                <h3 className="text-lg font-bold text-primary">
                  {pick(pageContent?.paybackTitle, "paybackTitle")}
                </h3>
                <ul className="mt-4 space-y-2.5 text-sm">
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-brand-orange" />
                    {pick(pageContent?.paybackOnGrid, "paybackOnGrid")}
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-brand-orange" />
                    {pick(pageContent?.paybackHybrid, "paybackHybrid")}
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-brand-orange" />
                    {pick(pageContent?.paybackOffGrid, "paybackOffGrid")}
                  </li>
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </section>

      {showGlobalCta ? <CtaBanner /> : null}
    </main>
  );
}
