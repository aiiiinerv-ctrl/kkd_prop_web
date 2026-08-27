import { LineChart, MessageCircle, Phone, ShieldCheck, Sun, Wrench } from "lucide-react";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FaqSection, type FaqEntry } from "@/components/site/faq-section";
import { HomePortfolioGrid } from "@/components/site/home-portfolio-grid";
import { IconFacebook } from "@/components/site/icon-facebook";
import { Reveal } from "@/components/site/reveal";
import { SectionHeading } from "@/components/site/section-heading";
import { Link } from "@/i18n/navigation";
import { bookingHref } from "@/lib/booking-links";
import {
  getHomePageContent,
  getLatestProjects,
  getSiteSettings,
  resolveHomeHeroImage,
} from "@/lib/content";
import { PAGE_REGISTRY } from "@/lib/pages";

const FALLBACK_LINE_URL = "https://line.me/R/ti/p/@kkdsolar";
const FALLBACK_FACEBOOK_URL = "https://facebook.com/kkdsolar";
const FALLBACK_PHONE = "0824731567";
const MESSAGE_FAQ_KEYS = ["q1", "q2", "q3", "q4", "q5"] as const;

/**
 * Everything the JSX below needs, resolved once up front so the render is a
 * single source regardless of where the data came from. Built two ways
 * (never mixed field-by-field — Home CMS slice edge case C1 / L2):
 * - DB row present: every field comes from `HomePageContent` + `HomeFaqItem`.
 * - No row (or registry still `legacy`): every field comes from `messages`,
 *   identical to the pre-cutover static render.
 */
type HomeViewModel = {
  heroKicker: string;
  heroTitleWhite: string;
  heroTitleGold: string;
  heroSubtitle: string;
  heroAlt: string;
  heroImageKey: string | null;
  ctaPrimaryLabel: string;
  ctaSecondaryLabel: string;
  quickContactLabel: string;
  proofLabel: string;
  proofTitle: string;
  proofItem1: string;
  proofItem2: string;
  proofItem3: string;
  feature1Label: string;
  feature2Label: string;
  feature3Label: string;
  feature4Label: string;
  showLatestWorks: boolean;
  latestWorksHeading: string;
  metric1Label: string;
  metric1Value: string;
  metric2Label: string;
  metric2Value: string;
  metric3Label: string;
  metric3Value: string;
  viewAllLabel: string;
  showServicesCta: boolean;
  servicesCtaBadge: string;
  servicesCtaTitle: string;
  servicesCtaText: string;
  servicesCtaLinkLabel: string;
  showFaq: boolean;
  faqBadge: string;
  faqTitle: string;
  faqIntro: string;
  faqLineButtonLabel: string;
  faqItems: FaqEntry[];
};

export async function HomeContent({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const tCommon = await getTranslations("common");
  const tFaq = await getTranslations("faq");
  const tContact = await getTranslations("contact");
  const bookingSurveyHref = bookingHref({ tab: "survey" });
  const bookingQuoteHref = bookingHref({ tab: "quote" });

  const [portfolioItems, siteSettings, homeRow] = await Promise.all([
    getLatestProjects(locale, 4),
    getSiteSettings(locale),
    PAGE_REGISTRY.home.contentRollout === "pages" ? getHomePageContent(locale) : Promise.resolve(null),
  ]);

  const phone = siteSettings?.phone ?? FALLBACK_PHONE;
  const lineUrl = siteSettings?.socialLinks.find((s) => s.key === "line")?.url ?? FALLBACK_LINE_URL;
  const facebookUrl = siteSettings?.facebookUrl ?? FALLBACK_FACEBOOK_URL;

  const view: HomeViewModel = homeRow
    ? {
        heroKicker: homeRow.content.heroKicker,
        heroTitleWhite: homeRow.content.heroTitleWhite,
        heroTitleGold: homeRow.content.heroTitleGold,
        heroSubtitle: homeRow.content.heroSubtitle,
        heroAlt: homeRow.content.heroAlt,
        heroImageKey: homeRow.content.heroImageKey,
        ctaPrimaryLabel: homeRow.content.ctaPrimaryLabel,
        ctaSecondaryLabel: homeRow.content.ctaSecondaryLabel,
        quickContactLabel: homeRow.content.quickContactLabel,
        proofLabel: homeRow.content.proofLabel,
        proofTitle: homeRow.content.proofTitle,
        proofItem1: homeRow.content.proofItem1,
        proofItem2: homeRow.content.proofItem2,
        proofItem3: homeRow.content.proofItem3,
        feature1Label: homeRow.content.feature1Label,
        feature2Label: homeRow.content.feature2Label,
        feature3Label: homeRow.content.feature3Label,
        feature4Label: homeRow.content.feature4Label,
        showLatestWorks: homeRow.content.showLatestWorks,
        latestWorksHeading: homeRow.content.latestWorksHeading,
        metric1Label: homeRow.content.metric1Label,
        metric1Value: homeRow.content.metric1Value,
        metric2Label: homeRow.content.metric2Label,
        metric2Value: homeRow.content.metric2Value,
        metric3Label: homeRow.content.metric3Label,
        metric3Value: homeRow.content.metric3Value,
        viewAllLabel: homeRow.content.viewAllLabel,
        showServicesCta: homeRow.content.showServicesCta,
        servicesCtaBadge: homeRow.content.servicesCtaBadge,
        servicesCtaTitle: homeRow.content.servicesCtaTitle,
        servicesCtaText: homeRow.content.servicesCtaText,
        servicesCtaLinkLabel: homeRow.content.servicesCtaLinkLabel,
        showFaq: homeRow.content.showFaq,
        faqBadge: homeRow.content.faqBadge,
        faqTitle: homeRow.content.faqTitle,
        faqIntro: homeRow.content.faqIntro,
        faqLineButtonLabel: homeRow.content.faqLineButtonLabel,
        faqItems: homeRow.faqItems.map((item) => ({
          id: item.id,
          question: item.question,
          answer: item.answer,
        })),
      }
    : {
        heroKicker: t("theme3Kicker"),
        heroTitleWhite: t("theme6HeroTitleWhite"),
        heroTitleGold: t("theme6HeroTitleGold"),
        heroSubtitle: t("heroSubtitle"),
        heroAlt: t("heroTitle"),
        heroImageKey: null,
        ctaPrimaryLabel: tCommon("requestQuote"),
        ctaSecondaryLabel: tCommon("bookSurvey"),
        quickContactLabel: t("quickContactTitle"),
        proofLabel: t("theme3ProofLabel"),
        proofTitle: t("theme3ProofTitle"),
        proofItem1: t("theme3ProofItem1"),
        proofItem2: t("theme3ProofItem2"),
        proofItem3: t("theme3ProofItem3"),
        feature1Label: t("theme6Feature1"),
        feature2Label: t("theme6Feature2"),
        feature3Label: t("theme6Feature3"),
        feature4Label: t("theme6Feature4"),
        showLatestWorks: true,
        latestWorksHeading: t("latestProjects"),
        metric1Label: t("theme3Metric1Label"),
        metric1Value: t("theme3Metric1Value"),
        metric2Label: t("theme3Metric2Label"),
        metric2Value: t("theme3Metric2Value"),
        metric3Label: t("theme3Metric3Label"),
        metric3Value: t("theme3Metric3Value"),
        viewAllLabel: t("viewAllPortfolio"),
        showServicesCta: true,
        servicesCtaBadge: t("actionRowBadge"),
        servicesCtaTitle: t("actionRowTitle"),
        servicesCtaText: t("actionRowText"),
        servicesCtaLinkLabel: t("actionRowLink"),
        showFaq: true,
        faqBadge: tFaq("badge"),
        faqTitle: tFaq("title"),
        faqIntro: tFaq("intro"),
        faqLineButtonLabel: tFaq("lineButton"),
        faqItems: MESSAGE_FAQ_KEYS.map((key, i) => ({
          id: key,
          question: tFaq(key),
          answer: tFaq(`a${i + 1}` as "a1" | "a2" | "a3" | "a4" | "a5"),
        })),
      };

  const hero = await resolveHomeHeroImage(view.heroImageKey);

  return (
    <main>
      <section className="home-hero flex min-h-[600px] flex-col lg:flex-row">
        <svg
          className="theme6-hero-chevron"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <polyline points="48,0 60,50 48,100" />
          <polyline points="52,0 64,50 52,100" />
        </svg>
        <div className="home-hero-media relative min-h-[320px] flex-[1.2]">
          <Image
            src={hero.url}
            alt={view.heroAlt}
            fill
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
        <div className="home-hero-content relative flex flex-1 flex-col items-center justify-center bg-gradient-to-br from-[#fff5e6] to-[#fbe2c0] px-6 py-14 text-center sm:px-12 lg:items-start lg:text-left">
          <div className="absolute top-[20%] left-0 hidden h-[60%] w-1.5 rounded-r bg-brand-orange lg:block" />
          <div className="theme3-hero-kicker">{view.heroKicker}</div>
          <Reveal>
            <h1 className="theme6-hero-title">
              <span>{view.heroTitleWhite}</span> <em>{view.heroTitleGold}</em>
            </h1>
          </Reveal>
          <Reveal delay={120}>
            <p className="mt-5 max-w-xl text-muted-foreground">{view.heroSubtitle}</p>
          </Reveal>
          <Reveal
            delay={240}
            className="mt-9 flex flex-wrap items-center justify-center gap-4 lg:justify-start"
          >
            <Link href={bookingSurveyHref} className="btn-pill-outline">
              {view.ctaSecondaryLabel}
            </Link>
            <Link href={bookingQuoteHref} className="btn-pill">
              {view.ctaPrimaryLabel}
            </Link>
          </Reveal>
          <Reveal
            delay={280}
            className="mt-5 flex flex-wrap items-center justify-center gap-3 lg:justify-start"
          >
            <span className="text-xs font-semibold text-muted-foreground">
              {view.quickContactLabel}
            </span>
            <a
              href={`tel:${phone.replace(/[-\s]/g, "")}`}
              aria-label={tContact("phone")}
              className="flex size-9 items-center justify-center rounded-full border border-border/70 bg-card text-primary transition-colors hover:border-brand-orange hover:text-brand-orange"
            >
              <Phone className="size-4" />
            </a>
            <a
              href={lineUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={tContact("line")}
              className="flex size-9 items-center justify-center rounded-full border border-border/70 bg-card text-primary transition-colors hover:border-brand-orange hover:text-brand-orange"
            >
              <MessageCircle className="size-4" />
            </a>
            <a
              href={facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={tContact("facebook")}
              className="flex size-9 items-center justify-center rounded-full border border-border/70 bg-card text-primary transition-colors hover:border-brand-orange hover:text-brand-orange"
            >
              <IconFacebook className="size-4" />
            </a>
          </Reveal>
          <div className="theme6-feature-row">
            <div>
              <Sun aria-hidden="true" />
              <span>{view.feature1Label}</span>
            </div>
            <div>
              <ShieldCheck aria-hidden="true" />
              <span>{view.feature2Label}</span>
            </div>
            <div>
              <Wrench aria-hidden="true" />
              <span>{view.feature3Label}</span>
            </div>
            <div>
              <LineChart aria-hidden="true" />
              <span>{view.feature4Label}</span>
            </div>
          </div>
          <Reveal delay={320} className="theme3-proof-panel">
            <div>
              <span>{view.proofLabel}</span>
              <strong>{view.proofTitle}</strong>
            </div>
            <ul>
              <li>{view.proofItem1}</li>
              <li>{view.proofItem2}</li>
              <li>{view.proofItem3}</li>
            </ul>
          </Reveal>
        </div>
      </section>

      {(view.showLatestWorks || view.showServicesCta) && (
        <section id="latest-works" className="home-latest-works mx-auto max-w-[1440px] px-5 py-16">
          {view.showLatestWorks && (
            <>
              <SectionHeading
                title={view.latestWorksHeading}
                headingClassName="font-extrabold tracking-[-0.01em]"
              />

              <Reveal className="theme3-decision-strip">
                <div>
                  <span>{view.metric1Label}</span>
                  <strong>{view.metric1Value}</strong>
                </div>
                <div>
                  <span>{view.metric2Label}</span>
                  <strong>{view.metric2Value}</strong>
                </div>
                <div>
                  <span>{view.metric3Label}</span>
                  <strong>{view.metric3Value}</strong>
                </div>
              </Reveal>

              <HomePortfolioGrid items={portfolioItems} />
            </>
          )}

          {(view.showServicesCta || view.showLatestWorks) && (
            <Reveal
              delay={120}
              className="home-action-row mt-[50px] flex flex-col items-center gap-[30px] rounded-2xl border-l-[6px] border-brand-orange bg-gradient-to-br from-white via-[#fffdfa] to-[#fff0d4] px-5 py-[30px] text-center shadow-[0_8px_30px_rgba(255,159,0,0.12)] lg:flex-row lg:items-center lg:justify-between lg:gap-10 lg:px-[50px] lg:py-10 lg:text-left"
            >
              {view.showServicesCta && (
                <div className="flex-1">
                  <span className="text-sm font-bold tracking-[1px] text-brand-orange uppercase">
                    {view.servicesCtaBadge}
                  </span>
                  <h3 className="mt-2 mb-2.5 text-[26px] font-bold">
                    {view.servicesCtaTitle}
                  </h3>
                  <p className="mb-4 max-w-xl text-base">
                    {view.servicesCtaText}
                  </p>
                  <Link
                    href="/services"
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-brand-orange transition-all hover:gap-2.5 hover:text-brand-orange-dark"
                  >
                    {view.servicesCtaLinkLabel} <span aria-hidden="true">→</span>
                  </Link>
                </div>
              )}
              {view.showLatestWorks && (
                <Link
                  href="/portfolio"
                  className="inline-flex shrink-0 items-center justify-center gap-2.5 whitespace-nowrap rounded-[30px] border-2 border-brand-orange bg-transparent px-9 py-3.5 text-base font-semibold text-brand-orange transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(255,159,0,0.3)] max-lg:w-full"
                >
                  {view.viewAllLabel} <span aria-hidden="true">→</span>
                </Link>
              )}
            </Reveal>
          )}
        </section>
      )}

      {view.showFaq && (
        <FaqSection
          badge={view.faqBadge}
          title={view.faqTitle}
          intro={view.faqIntro}
          lineButtonLabel={view.faqLineButtonLabel}
          lineUrl={lineUrl}
          items={view.faqItems}
        />
      )}
    </main>
  );
}
