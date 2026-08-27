import { getLocale, getTranslations } from "next-intl/server";
import { Reveal } from "@/components/site/reveal";
import { Link } from "@/i18n/navigation";
import { bookingHref } from "@/lib/booking-links";
import { getSharedCta } from "@/lib/content";

/**
 * Shared CTA banner — SiteSettings CTA columns with message fallback (#68).
 */
export async function CtaBanner() {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "home" });
  const tCommon = await getTranslations({ locale, namespace: "common" });
  const cta = await getSharedCta(locale);

  const title = cta?.title || t("ctaTitle");
  const subtitle = cta?.subtitle || t("ctaSubtitle");
  const primary = cta?.primaryLabel || tCommon("requestQuote");
  const secondary = cta?.secondaryLabel || tCommon("bookSurvey");

  return (
    <section className="bg-gradient-to-br from-[#fff5e6] to-[#fbe2c0]">
      <Reveal className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 py-14 text-center sm:px-6">
        <h2 className="text-2xl font-extrabold tracking-[-0.01em] text-foreground sm:text-3xl">
          {title}
        </h2>
        <p className="text-muted-foreground">{subtitle}</p>
        <div className="flex flex-wrap items-center justify-center gap-5">
          <Link
            href={bookingHref({ tab: "quote" })}
            className="rounded-full bg-brand-orange-cta px-7 py-3 text-sm font-semibold text-[#0a1e3c] transition-all hover:bg-brand-orange-cta-dark hover:shadow-[0_4px_10px_rgba(255,127,0,0.3)]"
          >
            {primary}
          </Link>
          <Link
            href={bookingHref({ tab: "survey" })}
            className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            {secondary}
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
