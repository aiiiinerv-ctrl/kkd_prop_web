import { LineChart, MessageCircle, Phone, ShieldCheck, Sun, Wrench } from "lucide-react";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FaqSection } from "@/components/site/faq-section";
import { HomePortfolioGrid } from "@/components/site/home-portfolio-grid";
import { IconFacebook } from "@/components/site/icon-facebook";
import { Reveal } from "@/components/site/reveal";
import { SectionHeading } from "@/components/site/section-heading";
import { Link } from "@/i18n/navigation";
import { bookingHref } from "@/lib/booking-links";
import { getLatestProjects } from "@/lib/content";

/* Same hrefs as the contact page so quick-contact info never drifts out of sync. */
const QUICK_CONTACT_LINE_URL = "https://line.me/R/ti/p/@kkdsolar";
const QUICK_CONTACT_FACEBOOK_URL = "https://facebook.com/kkdsolar";

export async function HomeContent({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const tCommon = await getTranslations("common");
  const tContact = await getTranslations("contact");
  const bookingSurveyHref = bookingHref({ tab: "survey" });
  const bookingQuoteHref = bookingHref({ tab: "quote" });

  const portfolioItems = await getLatestProjects(locale, 4);

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
          <div className="theme3-hero-kicker">{t("theme3Kicker")}</div>
          <Reveal>
            <h1 className="theme6-hero-title">
              <span>{t("theme6HeroTitleWhite")}</span> <em>{t("theme6HeroTitleGold")}</em>
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
          <Reveal
            delay={280}
            className="mt-5 flex flex-wrap items-center justify-center gap-3 lg:justify-start"
          >
            <span className="text-xs font-semibold text-muted-foreground">
              {t("quickContactTitle")}
            </span>
            <a
              href="tel:0824731567"
              aria-label={tContact("phone")}
              className="flex size-9 items-center justify-center rounded-full border border-border/70 bg-card text-primary transition-colors hover:border-brand-orange hover:text-brand-orange"
            >
              <Phone className="size-4" />
            </a>
            <a
              href={QUICK_CONTACT_LINE_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={tContact("line")}
              className="flex size-9 items-center justify-center rounded-full border border-border/70 bg-card text-primary transition-colors hover:border-brand-orange hover:text-brand-orange"
            >
              <MessageCircle className="size-4" />
            </a>
            <a
              href={QUICK_CONTACT_FACEBOOK_URL}
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
              <span>{t("theme6Feature1")}</span>
            </div>
            <div>
              <ShieldCheck aria-hidden="true" />
              <span>{t("theme6Feature2")}</span>
            </div>
            <div>
              <Wrench aria-hidden="true" />
              <span>{t("theme6Feature3")}</span>
            </div>
            <div>
              <LineChart aria-hidden="true" />
              <span>{t("theme6Feature4")}</span>
            </div>
          </div>
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
        </div>
      </section>

      <section id="latest-works" className="home-latest-works mx-auto max-w-[1440px] px-5 py-16">
        <SectionHeading
          title={t("latestProjects")}
          headingClassName="font-extrabold tracking-[-0.01em]"
        />

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

        <HomePortfolioGrid items={portfolioItems} />

        <Reveal
          delay={120}
          className="home-action-row mt-[50px] flex flex-col items-center gap-[30px] rounded-2xl border-l-[6px] border-brand-orange bg-gradient-to-br from-white via-[#fffdfa] to-[#fff0d4] px-5 py-[30px] text-center shadow-[0_8px_30px_rgba(255,159,0,0.12)] lg:flex-row lg:items-center lg:justify-between lg:gap-10 lg:px-[50px] lg:py-10 lg:text-left"
        >
          <div className="flex-1">
            <span className="text-sm font-bold tracking-[1px] text-brand-orange uppercase">
              {t("actionRowBadge")}
            </span>
            <h3 className="mt-2 mb-2.5 text-[26px] font-bold">
              {t("actionRowTitle")}
            </h3>
            <p className="mb-4 max-w-xl text-base">
              {t("actionRowText")}
            </p>
            <Link
              href="/services"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-brand-orange transition-all hover:gap-2.5 hover:text-brand-orange-dark"
            >
              {t("actionRowLink")} <span aria-hidden="true">→</span>
            </Link>
          </div>
          <Link
            href="/portfolio"
            className="inline-flex shrink-0 items-center justify-center gap-2.5 whitespace-nowrap rounded-[30px] border-2 border-brand-orange bg-transparent px-9 py-3.5 text-base font-semibold text-brand-orange transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(255,159,0,0.3)] max-lg:w-full"
          >
            {t("viewAllPortfolio")} <span aria-hidden="true">→</span>
          </Link>
        </Reveal>
      </section>

      <FaqSection />
    </main>
  );
}
