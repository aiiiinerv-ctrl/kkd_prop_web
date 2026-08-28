import { Check } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageBanner } from "@/components/site/page-banner";
import { Reveal } from "@/components/site/reveal";
import { Link } from "@/i18n/navigation";
import { CalculatorClient } from "./calculator-client";
import { bookingHref } from "@/lib/booking-links";
import { getCalculatorConfig, getCalculatorPageContent, getPublishedPackages } from "@/lib/content";
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
  return pageMetadata(locale, "calculator", "/calculator");
}

export default async function CalculatorPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("calculator");
  const tCommon = await getTranslations("common");

  const usePages = PAGE_REGISTRY.calculator.contentRollout === "pages";
  const [packages, pageContent, calculatorConfig] = await Promise.all([
    getPublishedPackages(locale),
    usePages ? getCalculatorPageContent(locale) : Promise.resolve(null),
    getCalculatorConfig(),
  ]);

  const hasRow = Boolean(pageContent);
  const pick = (db: string | null | undefined, key: Parameters<typeof t>[0]) => {
    if (usePages && !hasRow) return t(key);
    if (usePages) return db || "";
    return db ?? t(key);
  };

  const showPackagesSection =
    pageContent?.showPackages !== false && packages.length > 0;

  return (
    <main className="bg-background">
      <PageBanner pageSlug="calculator" />
      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
        <Reveal className="mx-auto mb-8 max-w-3xl text-center">
          <p className="text-sm font-bold text-accent-foreground">
            {pick(pageContent?.eyebrow, "eyebrow")}
          </p>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-[-0.01em] text-primary sm:text-4xl">
            {pick(pageContent?.title, "title")}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
            {pick(pageContent?.subtitle, "subtitle")}
          </p>
        </Reveal>

        <CalculatorClient
          packages={packages}
          panelTitle={usePages && hasRow ? pageContent?.panelTitle : undefined}
          panelIntro={usePages && hasRow ? pageContent?.panelIntro : undefined}
          config={calculatorConfig}
        />
      </section>

      {showPackagesSection ? (
        <section className="bg-accent">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
            <Reveal className="mx-auto mb-10 max-w-3xl text-center">
              <p className="text-sm font-bold text-accent-foreground">
                {pick(pageContent?.packagesEyebrow, "packagesEyebrow")}
              </p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.01em] text-primary">
                {pick(pageContent?.packagesTitle, "packagesTitle")}
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                {pick(pageContent?.packagesSubtitle, "packagesSubtitle")}
              </p>
            </Reveal>

            <div className="grid gap-7 md:grid-cols-3">
              {packages.map((pkg) => (
                <Reveal key={pkg.id}>
                  <div
                    className={cn(
                      "relative flex h-full flex-col rounded-2xl bg-card p-7 shadow-sm transition-all hover:-translate-y-1.5 hover:shadow-lg",
                      pkg.isPopular
                        ? "border-2 border-brand-orange"
                        : "border border-border"
                    )}
                  >
                    {pkg.isPopular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-orange px-4 py-1 text-xs font-bold text-[#0a1e3c]">
                        {tCommon("popular")}
                      </span>
                    )}
                    <h3 className="text-center text-xl font-bold text-primary">
                      {pkg.name}
                    </h3>
                    <p className="mt-2 text-center text-sm text-muted-foreground">
                      {pkg.suitable}
                    </p>
                    <div className="mt-5 text-center">
                      <span className="text-sm text-muted-foreground">{t("priceFrom")} </span>
                      <span className="text-3xl font-extrabold text-primary">
                        ฿{pkg.priceThb.toLocaleString()}
                      </span>
                    </div>
                    <ul className="mt-6 flex-1 space-y-3">
                      {pkg.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm">
                          <Check className="mt-0.5 size-4 shrink-0 text-brand-orange" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Link
                      href={bookingHref({ tab: "quote", package: pkg.slug })}
                      className={cn("mt-7", pkg.isPopular ? "btn-pill" : "btn-pill-outline")}
                    >
                      {tCommon("requestQuote")}
                    </Link>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
