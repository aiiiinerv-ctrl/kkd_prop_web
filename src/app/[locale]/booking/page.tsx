import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { SectionHeading } from "@/components/site/section-heading";
import { bookingLinkParamsSchema, SERVICE_SLUG_TO_INTERESTED_SYSTEM } from "@/lib/booking-links";
import {
  getActiveChannels,
  getPackageBySlug,
  getPaymentSettings,
  getServiceBySlug,
  getSiteSettings,
} from "@/lib/content";
import { generatePromptPayQrDataUrl } from "@/lib/promptpay";
import { resolveRefAttribution, resolveRefReferrerName } from "@/lib/ref-attribution";
import { BookingForms } from "./booking-forms";
import { pageMetadata } from "@/lib/seo";


export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return pageMetadata(locale, "booking", "/booking");
}

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string; bill?: string; package?: string; service?: string }>;
}) {
  const { locale } = await params;
  // Parsed with the same contract the link-side helper (bookingHref) builds
  // against (#13 decision 4) — an unknown-shaped param is dropped, not
  // trusted. `package`/`service` existence against the DB is checked below;
  // an unrecognized slug is never handed to the form.
  const rawParams = await searchParams;
  const parsedParams = bookingLinkParamsSchema.safeParse(rawParams);
  const { bill, package: packageSlug, service: serviceSlug } = parsedParams.success
    ? parsedParams.data
    : {};
  setRequestLocale(locale);
  const t = await getTranslations("booking");

  const [
    channels,
    paymentSettings,
    packageRow,
    serviceRow,
    initialReferrerName,
    refAttribution,
    siteSettings,
  ] = await Promise.all([
    getActiveChannels(locale),
    getPaymentSettings(),
    packageSlug ? getPackageBySlug(packageSlug, locale) : null,
    serviceSlug ? getServiceBySlug(serviceSlug, locale) : null,
    resolveRefReferrerName(),
    resolveRefAttribution(),
    getSiteSettings(locale),
  ]);

  // A promo link's channel pre-selects the visible "รู้จักเราจากช่องทางไหน"
  // dropdown, mirroring the "ผู้แนะนำ" prefill. Only when the resolved channel
  // is actually one of the active options shown (an inactive/unknown channel
  // would just render blank). Reporting still counts by the ref (auto column),
  // not this self-report field — see effectiveChannel() in lib/reports/aggregate.
  const initialSourceChannelId =
    refAttribution.autoSourceChannelId &&
    channels.some((c) => c.id === refAttribution.autoSourceChannelId)
      ? refAttribution.autoSourceChannelId
      : "";

  // Survey booking fee is a fixed ฿199 (same constant used in the UI copy
  // and lib/notifications/format.ts) — embed it so scanning apps prefill it.
  const promptpayQrDataUrl = paymentSettings?.promptpayId
    ? await generatePromptPayQrDataUrl(paymentSettings.promptpayId, 199)
    : null;

  // A system service card ("ขอใบเสนอราคา" on on-grid/hybrid/off-grid) pre-ticks
  // the matching "ระบบที่สนใจ" checkbox. Derived from the resolved (real) slug,
  // so an unknown/maintenance service pre-selects nothing.
  const interestedSystem = serviceRow
    ? SERVICE_SLUG_TO_INTERESTED_SYSTEM[serviceRow.slug]
    : undefined;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
      <SectionHeading
        title={t("title")}
        headingClassName="font-extrabold tracking-[-0.01em]"
      />
      {/* BookingForms reads the active tab from useSearchParams (#13 decision
          1) — Next 16 requires a Suspense boundary around any client
          component that calls it, or `npm run build` fails even though
          `npm run dev` looks fine (see use-search-params.md). */}
      <Suspense fallback={null}>
        <BookingForms
          initialBill={bill ?? ""}
          initialPackageSlug={packageRow?.slug ?? ""}
          initialServiceSlug={serviceRow?.slug ?? ""}
          initialInterestedSystems={interestedSystem ? [interestedSystem] : []}
          initialSourceChannelId={initialSourceChannelId}
          initialReferrerName={initialReferrerName}
          channels={channels}
          bankInfo={{
            bankName: paymentSettings?.bankName ?? "",
            bankAccountNumber: paymentSettings?.bankAccountNumber ?? "",
            bankAccountName: paymentSettings?.bankAccountName ?? "",
          }}
          promptpayQrDataUrl={promptpayQrDataUrl}
          phone={siteSettings?.phone ?? "0824731567"}
          lineUrl={siteSettings?.socialLinks.find((s) => s.key === "line")?.url ?? "https://line.me/R/ti/p/@kkdsolar"}
        />
      </Suspense>
    </main>
  );
}
