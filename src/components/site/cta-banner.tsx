import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function CtaBanner() {
  const t = useTranslations("home");
  const tCommon = useTranslations("common");

  return (
    <section className="bg-gradient-to-br from-[#fff5e6] to-[#fbe2c0]">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 py-14 text-center sm:px-6">
        <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
          {t("ctaTitle")}
        </h2>
        <p className="text-muted-foreground">{t("ctaSubtitle")}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href={{ pathname: "/booking", query: { tab: "survey" } }}
            className="rounded-full border-2 border-brand-orange px-7 py-3 text-sm font-semibold text-brand-orange transition-colors hover:bg-brand-orange hover:text-white"
          >
            {tCommon("bookSurvey")}
          </Link>
          <Link
            href={{ pathname: "/booking", query: { tab: "quote" } }}
            className="rounded-full bg-brand-orange px-7 py-3 text-sm font-semibold text-white transition-all hover:bg-brand-orange-dark hover:shadow-[0_4px_10px_rgba(255,127,0,0.3)]"
          >
            {tCommon("requestQuote")}
          </Link>
        </div>
      </div>
    </section>
  );
}
