import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPaymentSettings } from "@/actions/payment-settings";
import { SectionHeading } from "@/components/site/section-heading";
import { prisma } from "@/lib/db";
import { pickLocale } from "@/lib/i18n-content";
import { generatePromptPayQrDataUrl } from "@/lib/promptpay";
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
  searchParams: Promise<{ tab?: string; bill?: string }>;
}) {
  const { locale } = await params;
  const { tab, bill } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("booking");

  const [channels, paymentSettings] = await Promise.all([
    prisma.promoChannel.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    getPaymentSettings(),
  ]);

  // Survey booking fee is a fixed ฿199 (same constant used in the UI copy
  // and lib/notifications/format.ts) — embed it so scanning apps prefill it.
  const promptpayQrDataUrl = paymentSettings?.promptpayId
    ? await generatePromptPayQrDataUrl(paymentSettings.promptpayId, 199)
    : null;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
      <SectionHeading
        title={t("title")}
        headingClassName="font-extrabold tracking-[-0.01em]"
      />
      <BookingForms
        initialTab={tab === "survey" ? "survey" : "quote"}
        initialBill={bill && /^\d+$/.test(bill) ? bill : ""}
        channels={channels.map((c) => ({
          id: c.id,
          name: pickLocale(c, "name", locale),
        }))}
        bankInfo={{
          bankName: paymentSettings?.bankName ?? "",
          bankAccountNumber: paymentSettings?.bankAccountNumber ?? "",
          bankAccountName: paymentSettings?.bankAccountName ?? "",
        }}
        promptpayQrDataUrl={promptpayQrDataUrl}
      />
    </main>
  );
}
