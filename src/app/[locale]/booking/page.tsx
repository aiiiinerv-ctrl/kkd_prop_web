import { getTranslations, setRequestLocale } from "next-intl/server";
import { SectionHeading } from "@/components/site/section-heading";

// Placeholder shell — the two-route lead forms (quote / survey booking)
// are implemented in Phase 4 together with the submit actions.
export default async function BookingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("booking");

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
      <SectionHeading title={t("title")} />
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-xl border-2 border-primary bg-card p-6 text-center">
          <h2 className="font-bold text-primary">{t("tabQuoteTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("tabQuoteSubtitle")}</p>
        </div>
        <div className="rounded-xl border border-border/70 bg-card p-6 text-center">
          <h2 className="font-bold text-primary">{t("tabSurveyTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("tabSurveySubtitle")}</p>
        </div>
      </div>
    </main>
  );
}
