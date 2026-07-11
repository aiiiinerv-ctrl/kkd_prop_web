"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { useCalculatorStore } from "@/store/use-calculator-store";

export function CalculatorClient() {
  const t = useTranslations("calculator");
  const tCommon = useTranslations("common");
  const { bill, result, setBill, calculate } = useCalculatorStore();
  const [error, setError] = useState(false);

  const onCalculate = () => {
    setError(!calculate());
  };

  return (
    <div className="mx-auto max-w-xl rounded-xl border border-border/70 bg-card p-8 text-center shadow-sm">
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={bill}
        onChange={(e) => setBill(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onCalculate()}
        placeholder={t("billPlaceholder")}
        className="mx-auto block w-full max-w-xs rounded-lg border border-input bg-background px-4 py-3 text-center text-lg outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/25"
      />
      {error && <p className="mt-2 text-sm text-destructive">{t("invalidBill")}</p>}

      <button
        type="button"
        onClick={onCalculate}
        className="mt-5 rounded-full bg-brand-orange px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-orange-dark"
      >
        {t("calculate")}
      </button>

      {result && (
        <div className="mt-7 rounded-lg border border-brand-orange bg-accent p-6">
          <h3 className="text-lg font-bold text-primary">
            {t("resultSystem", { system: t(result.systemKey) })}
          </h3>
          <p className="mt-1 font-semibold">
            {t("resultSave", {
              amount: result.monthlySaving.toLocaleString(),
            })}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href={{ pathname: "/booking", query: { tab: "survey" } }}
              className="rounded-full border-2 border-brand-orange px-5 py-2.5 text-sm font-semibold text-brand-orange transition-colors hover:bg-brand-orange hover:text-white"
            >
              {tCommon("bookSurvey")}
            </Link>
            <Link
              href={{ pathname: "/booking", query: { tab: "quote", bill } }}
              className="rounded-full bg-brand-orange px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-orange-dark"
            >
              {tCommon("requestQuoteFree")}
            </Link>
          </div>
        </div>
      )}

      <p className="mt-6 text-xs text-muted-foreground">{t("disclaimer")}</p>
    </div>
  );
}
