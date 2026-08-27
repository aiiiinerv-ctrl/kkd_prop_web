import { Check } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { CtaBanner } from "@/components/site/cta-banner";
import { SeasonalProductionTable } from "@/components/site/seasonal-production-table";
import { SectionHeading } from "@/components/site/section-heading";
import { Link } from "@/i18n/navigation";
import { bookingHref } from "@/lib/booking-links";
import { getPackageBySlug, getPackagesPageContent } from "@/lib/content";
import { PAGE_REGISTRY } from "@/lib/pages";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const pkg = await getPackageBySlug(slug, locale);
  return pageMetadata(
    locale,
    "packages",
    `/packages/${slug}`,
    pkg ? { title: pkg.name, description: pkg.suitable } : undefined
  );
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

  const usePages = PAGE_REGISTRY.packages.contentRollout === "pages";
  const [pkg, pageContent] = await Promise.all([
    getPackageBySlug(slug, locale),
    usePages ? getPackagesPageContent(locale) : Promise.resolve(null),
  ]);
  if (!pkg) {
    notFound();
  }

  const hasRow = Boolean(pageContent);
  const pick = (db: string | null | undefined, key: Parameters<typeof t>[0]) => {
    if (usePages && !hasRow) return t(key);
    if (usePages) return db || "";
    return db ?? t(key);
  };

  const seasonal = pkg.seasonal;
  const showSeasonal = pageContent?.showSeasonal !== false && Boolean(seasonal);
  const showPayback = pageContent?.showPayback !== false;
  const showGlobalCta = pageContent?.showGlobalCta !== false;

  const seasonalSubtitle = (() => {
    if (usePages && !hasRow) return t("seasonalSubtitle", { size: pkg.name });
    if (usePages) return (pageContent?.seasonalSubtitle || "").replaceAll("{size}", pkg.name);
    return t("seasonalSubtitle", { size: pkg.name });
  })();

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
          title={pkg.name}
          subtitle={pkg.suitable}
          headingClassName="font-extrabold tracking-[-0.01em]"
        />

        <div className="mx-auto grid max-w-3xl gap-7">
          <div className="rounded-xl border-2 border-brand-orange bg-card p-7 text-center shadow-md">
            <span className="text-xs text-muted-foreground">{t("priceFrom")} </span>
            <span className="text-3xl font-bold text-primary">
              ฿{pkg.priceThb.toLocaleString()}
            </span>

            <h3 className="mt-6 text-left text-lg font-bold text-primary">{t("featuresTitle")}</h3>
            <ul className="mt-4 space-y-2.5 text-left text-sm">
              {pkg.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-brand-orange" />
                  {f}
                </li>
              ))}
            </ul>

            <Link
              href={bookingHref({ tab: "quote", package: pkg.slug })}
              className="btn-pill mt-7 inline-flex"
            >
              {tCommon("requestQuote")}
            </Link>
          </div>

          {showSeasonal && seasonal ? (
            <div className="rounded-xl border border-border/70 bg-card p-7 shadow-sm">
              <h3 className="text-lg font-bold text-primary">
                {pick(pageContent?.seasonalTitle, "seasonalTitle")}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">{seasonalSubtitle}</p>
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
      </section>

      {showGlobalCta ? <CtaBanner /> : null}
    </main>
  );
}
