import { getTranslations, setRequestLocale } from "next-intl/server";
import { SectionHeading } from "@/components/site/section-heading";
import { prisma } from "@/lib/db";
import { pickLocale } from "@/lib/i18n-content";
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

  const channels = await prisma.promoChannel.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
      <SectionHeading title={t("title")} />
      <BookingForms
        initialTab={tab === "survey" ? "survey" : "quote"}
        initialBill={bill && /^\d+$/.test(bill) ? bill : ""}
        channels={channels.map((c) => ({
          id: c.id,
          name: pickLocale(c, "name", locale),
        }))}
      />
    </main>
  );
}
