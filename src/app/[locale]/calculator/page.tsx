import { getTranslations, setRequestLocale } from "next-intl/server";
import { SectionHeading } from "@/components/site/section-heading";
import { CalculatorClient } from "./calculator-client";

export default async function CalculatorPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("calculator");

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
      <SectionHeading title={t("title")} subtitle={t("subtitle")} />
      <CalculatorClient />
    </main>
  );
}
