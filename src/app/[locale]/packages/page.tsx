import { Check } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CtaBanner } from "@/components/site/cta-banner";
import { SeasonalProductionTable } from "@/components/site/seasonal-production-table";
import { SectionHeading } from "@/components/site/section-heading";
import { Link } from "@/i18n/navigation";
import { getPublishedPackages } from "@/lib/content";
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

  const packages = await getPublishedPackages(locale);

  const popular = packages.find((p) => p.isPopular) ?? packages[0];
  const seasonal = popular?.seasonal;

  return (
    <main>
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <SectionHeading
          title={t("title")}
          subtitle={t("subtitle")}
          headingClassName="font-extrabold tracking-[-0.01em]"
        />

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
              <h3 className="text-center text-xl font-bold text-primary">
                {pkg.name}
              </h3>
              <p className="mt-1 text-center text-sm text-muted-foreground">
                {pkg.suitable}
              </p>
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
                href={{
                  pathname: "/booking",
                  query: { tab: "quote", package: pkg.slug },
                }}
                className={cn("mt-3", pkg.isPopular ? "btn-pill" : "btn-pill-outline")}
              >
                {tCommon("requestQuote")}
              </Link>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-14 grid max-w-3xl gap-7">
          {seasonal && popular && (
            <div className="rounded-xl border border-border/70 bg-card p-7 shadow-sm">
              <h3 className="text-lg font-bold text-primary">{t("seasonalTitle")}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("seasonalSubtitle", { size: popular.name })}
              </p>
              <div className="mt-5">
                <SeasonalProductionTable seasonal={seasonal} locale={locale} t={t} tCommon={tCommon} />
              </div>
            </div>
          )}

          <div className="rounded-xl border border-border/70 bg-card p-7 shadow-sm">
            <h3 className="text-lg font-bold text-primary">{t("paybackTitle")}</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-brand-orange" />
                {t("paybackOnGrid")}
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-brand-orange" />
                {t("paybackHybrid")}
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-brand-orange" />
                {t("paybackOffGrid")}
              </li>
            </ul>
          </div>
        </div>
      </section>

      <CtaBanner />
    </main>
  );
}
