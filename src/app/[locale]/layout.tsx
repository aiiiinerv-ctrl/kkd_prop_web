import type { Metadata } from "next";
import { Noto_Sans, Noto_Sans_Thai } from "next/font/google";
import { notFound } from "next/navigation";
import Script from "next/script";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { LocalBusinessJsonLd } from "@/components/site/local-business-jsonld";
import { MobileBookingBar } from "@/components/site/mobile-booking-bar";
import { RefConsentCapture } from "@/components/site/ref-consent-capture";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { getPublishedTestimonials } from "@/lib/content";
import { routing } from "@/i18n/routing";
import "../globals.css";

export const revalidate = 300;

const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-noto-sans-thai",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "KKD PROPERTY CO., LTD.",
};

// CookieYes runs the consent banner (quote line item 7, Free plan). The id is
// a public identifier — it ships in every page's HTML — but it stays an env
// var so the banner can be switched off by clearing it, without a code change.
//
// Read here, in the server layout — but despite the theory that a
// server-only `process.env` read on a purely dynamic render stays untouched
// by build-time inlining, this shared-hosting build pipeline still froze a
// missing value into the artifact (caught 2026-08-16: the panel had the
// correct id set at runtime, the banner still didn't render). Whatever the
// exact cause — static optimization of a layout with no per-request API
// call, output-file-tracing, or something pipeline-specific — the practical
// rule for this repo is the same as NEXT_PUBLIC_SITE_URL: the value has to
// be present in `.env.production` (loaded at build time) to reliably reach
// production, not only set in the panel. "Switch it off by clearing the
// panel value" therefore no longer works on its own — clear it in
// `.env.production` too, then rebuild and redeploy.
//
// beforeInteractive puts it ahead of our own scripts in the initial HTML,
// which CookieYes needs — its auto-blocking works by intercepting scripts
// that load after it. The strategy is only valid in a root layout, which this
// is; the admin shell is a separate root layout and deliberately has no
// banner, being staff traffic rather than public.
function CookieYesScript() {
  const id = process.env.NEXT_PUBLIC_COOKIEYES_ID;
  if (!id) return null;
  return (
    <Script
      id="cookieyes"
      strategy="beforeInteractive"
      src={`https://cdn-cookieyes.com/client_data/${id}/script.js`}
    />
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  // Whether to offer the testimonials nav link. Same cached reader the
  // testimonials page and section use, so the three places that ask "is there
  // anything published?" share one query per request and one definition of the
  // answer.
  const testimonials = await getPublishedTestimonials(locale);

  return (
    <html
      lang={locale}
      className={`${notoSans.variable} ${notoSansThai.variable} h-full antialiased [--font-sans:var(--font-noto-sans),var(--font-noto-sans-thai),sans-serif]`}
      suppressHydrationWarning
    >
      <body className="site-shell min-h-full flex flex-col">
        <CookieYesScript />
        <RefConsentCapture />
        <LocalBusinessJsonLd />
        <NextIntlClientProvider>
          <SiteHeader showTestimonials={testimonials.length > 0} />
          <div className="flex-1 flex flex-col pb-[76px] lg:pb-0">{children}</div>
          <SiteFooter />
          <MobileBookingBar />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
