import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FaqSection } from "@/components/site/faq-section";
import { HomePortfolioGrid } from "@/components/site/home-portfolio-grid";
import { Reveal } from "@/components/site/reveal";
import { SectionHeading } from "@/components/site/section-heading";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { pickLocale } from "@/lib/i18n-content";
import { storage } from "@/lib/storage";
import { cn } from "@/lib/utils";

export type HomeThemeVariant = "theme-1" | "theme-2" | "theme-3" | "theme-4" | "theme-5" | "theme-6";

const THEME_3_FAMILY = new Set<HomeThemeVariant>(["theme-3", "theme-4", "theme-5", "theme-6"]);

function themedPath(themeVariant: HomeThemeVariant | undefined, path: string) {
  return themeVariant ? `/${themeVariant}${path}` : path;
}

export async function HomeContent({
  params,
  themeVariant,
}: {
  params: Promise<{ locale: string }>;
  themeVariant?: HomeThemeVariant;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const tCommon = await getTranslations("common");
  const isTheme3Family = themeVariant !== undefined && THEME_3_FAMILY.has(themeVariant);
  const bookingSurveyHref = {
    pathname: themedPath(themeVariant, "/booking"),
    query: { tab: "survey" },
  };
  const bookingQuoteHref = {
    pathname: themedPath(themeVariant, "/booking"),
    query: { tab: "quote" },
  };

  const projects = await prisma.portfolioProject.findMany({
    where: { isPublished: true },
    orderBy: [{ completedAt: "desc" }, { createdAt: "desc" }],
    take: 4,
  });

  const portfolioItems = projects.map((p) => {
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
  });

  return (
    <main
      className={
        isTheme3Family
          ? cn("theme-3-page", themeVariant !== "theme-3" && `${themeVariant}-page`)
          : undefined
      }
    >
      <section className="home-hero flex min-h-[600px] flex-col lg:flex-row">
        <div className="home-hero-media relative min-h-[320px] flex-[1.2]">
          <Image
            src="/marketing/hero-solar.jpg"
            alt={t("heroTitle")}
            fill
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
        <div className="home-hero-content relative flex flex-1 flex-col items-center justify-center bg-gradient-to-br from-[#fff5e6] to-[#fbe2c0] px-6 py-14 text-center sm:px-12 lg:items-start lg:text-left">
          <div className="absolute top-[20%] left-0 hidden h-[60%] w-1.5 rounded-r bg-brand-orange lg:block" />
          {isTheme3Family && (
            <div className="theme3-hero-kicker">{t("theme3Kicker")}</div>
          )}
          <Reveal>
            <h1 className="text-3xl leading-snug font-extrabold tracking-[-0.01em] text-foreground sm:text-4xl">
              {t("heroTitle")}
            </h1>
          </Reveal>
          <Reveal delay={120}>
            <p className="mt-5 max-w-xl text-muted-foreground">{t("heroSubtitle")}</p>
          </Reveal>
          <Reveal
            delay={240}
            className="mt-9 flex flex-wrap items-center justify-center gap-4 lg:justify-start"
          >
            <Link href={bookingSurveyHref} className="btn-pill-outline">
              {tCommon("bookSurvey")}
            </Link>
            <Link href={bookingQuoteHref} className="btn-pill">
              {tCommon("requestQuote")}
            </Link>
          </Reveal>
          {isTheme3Family && (
            <Reveal delay={320} className="theme3-proof-panel">
              <div>
                <span>{t("theme3ProofLabel")}</span>
                <strong>{t("theme3ProofTitle")}</strong>
              </div>
              <ul>
                <li>{t("theme3ProofItem1")}</li>
                <li>{t("theme3ProofItem2")}</li>
                <li>{t("theme3ProofItem3")}</li>
              </ul>
            </Reveal>
          )}
        </div>
      </section>

      <section id="latest-works" className="home-latest-works mx-auto max-w-[1440px] px-5 py-16">
        <SectionHeading
          title={t("latestProjects")}
          headingClassName="font-extrabold tracking-[-0.01em]"
        />

        {isTheme3Family && (
          <Reveal className="theme3-decision-strip">
            <div>
              <span>{t("theme3Metric1Label")}</span>
              <strong>{t("theme3Metric1Value")}</strong>
            </div>
            <div>
              <span>{t("theme3Metric2Label")}</span>
              <strong>{t("theme3Metric2Value")}</strong>
            </div>
            <div>
              <span>{t("theme3Metric3Label")}</span>
              <strong>{t("theme3Metric3Value")}</strong>
            </div>
          </Reveal>
        )}

        <HomePortfolioGrid items={portfolioItems} />

        <Reveal
          delay={120}
          className="home-action-row mt-[50px] flex flex-col items-center gap-[30px] rounded-2xl border-l-[6px] border-brand-orange bg-gradient-to-br from-white via-[#fffdfa] to-[#fff0d4] px-5 py-[30px] text-center shadow-[0_8px_30px_rgba(255,159,0,0.12)] lg:flex-row lg:items-center lg:justify-between lg:gap-10 lg:px-[50px] lg:py-10 lg:text-left"
        >
          <div className="flex-1">
            <span className="text-sm font-bold tracking-[1px] text-brand-orange uppercase">
              {t("actionRowBadge")}
            </span>
            <h3 className="mt-2 mb-2.5 text-[26px] font-bold text-[#D88100]">
              {t("actionRowTitle")}
            </h3>
            <p className="mb-4 max-w-xl text-base text-[#B37700]">
              {t("actionRowText")}
            </p>
            <Link
              href={themedPath(themeVariant, "/services")}
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-brand-orange transition-all hover:gap-2.5 hover:text-brand-orange-dark"
            >
              {t("actionRowLink")} <span aria-hidden="true">→</span>
            </Link>
          </div>
          <Link
            href={themedPath(themeVariant, "/portfolio")}
            className="inline-flex shrink-0 items-center justify-center gap-2.5 whitespace-nowrap rounded-[30px] border-2 border-brand-orange bg-transparent px-9 py-3.5 text-base font-semibold text-brand-orange transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand-orange hover:text-white hover:shadow-[0_8px_20px_rgba(255,159,0,0.3)] max-lg:w-full"
          >
            {t("viewAllPortfolio")} <span aria-hidden="true">→</span>
          </Link>
        </Reveal>
      </section>

      <FaqSection />
    </main>
  );
}
