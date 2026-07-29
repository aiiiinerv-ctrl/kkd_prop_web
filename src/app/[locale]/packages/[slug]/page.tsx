import { Check } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { CtaBanner } from "@/components/site/cta-banner";
import { SeasonalProductionTable } from "@/components/site/seasonal-production-table";
import { SectionHeading } from "@/components/site/section-heading";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { pickLocale, pickLocaleList } from "@/lib/i18n-content";
import type { Seasonal } from "@/lib/packages-seasonal";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  return pageMetadata(locale, "packages", `/packages/${slug}`);
}

export default async function PackageDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("packages");
  const tCommon = await getTranslations("common");

  const pkg = await prisma.package.findUnique({ where: { slug } });
  if (!pkg || !pkg.isPublished) {
    notFound();
  }

  const seasonal = pkg.seasonalProduction as Seasonal;

  return (
    <main>
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <Link
          href="/packages"
          className="text-sm font-semibold text-brand-orange hover:text-brand-orange-dark"
        >
          ← {t("backToPackages")}
        </Link>

        <SectionHeading
          title={pickLocale(pkg, "name", locale)}
          subtitle={pickLocale(pkg, "suitable", locale)}
          headingClassName="font-extrabold tracking-[-0.01em]"
        />

        <div className="mx-auto grid max-w-3xl gap-7">
          <div className="rounded-xl border-2 border-brand-orange bg-card p-7 text-center shadow-md">
            <span className="text-xs text-muted-foreground">{t("priceFrom")} </span>
            <span className="text-3xl font-bold text-primary">
              ฿{pkg.priceThb.toLocaleString()}
            </span>

            <h3 className="mt-6 text-left text-lg font-bold text-primary">
              {t("featuresTitle")}
            </h3>
            <ul className="mt-4 space-y-2.5 text-left text-sm">
              {pickLocaleList(pkg, "features", locale).map((f) => (
                <li key={f} className="flex items-start gap-2">
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
              className="btn-pill mt-7 inline-flex"
            >
              {tCommon("requestQuote")}
            </Link>
          </div>

          <div className="rounded-xl border border-border/70 bg-card p-7 shadow-sm">
            <h3 className="text-lg font-bold text-primary">{t("seasonalTitle")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("seasonalSubtitle", { size: pickLocale(pkg, "name", locale) })}
            </p>
            <div className="mt-5">
              <SeasonalProductionTable seasonal={seasonal} locale={locale} t={t} tCommon={tCommon} />
            </div>
          </div>

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
