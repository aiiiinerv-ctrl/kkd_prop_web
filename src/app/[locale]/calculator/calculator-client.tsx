"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import {
  type CalcPackage,
  recommendSystem,
  useCalculatorStore,
} from "@/store/use-calculator-store";

const MIN_BILL = 500;
const MAX_BILL = 8000;
const STEP_BILL = 100;

export function CalculatorClient({ packages }: { packages: CalcPackage[] }) {
  const t = useTranslations("calculator");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const { bill, result, setBill, calculate } = useCalculatorStore();
  const [error, setError] = useState(false);

  const onCalculate = () => {
    setError(!calculate(packages));
  };

  const billValue = Number(bill);
  const liveResult = useMemo(() => {
    if (!Number.isFinite(billValue) || billValue <= 0) return null;
    return recommendSystem(billValue, packages);
  }, [billValue, packages]);
  const displayedResult = result ?? liveResult;
  const afterBill = displayedResult
    ? Math.max(billValue - displayedResult.monthlySaving, 0)
    : null;

  const formattedBill = Number.isFinite(billValue)
    ? billValue.toLocaleString(locale)
    : "0";

  return (
    <div className="mx-auto max-w-[1140px] overflow-hidden rounded-[18px] border border-[#ead9c5] bg-[#fff8ed] text-left shadow-[0_18px_55px_rgba(13,71,161,0.08)]">
      <div className="grid lg:grid-cols-[1.08fr_0.92fr]">
        <div className="bg-[#f5f8fb] p-8 sm:p-10 lg:p-[30px]">
          <h2 className="text-2xl font-bold text-primary">{t("panelTitle")}</h2>
          <p className="mt-3 text-sm text-muted-foreground">{t("panelIntro")}</p>

          <label className="mt-7 block text-sm font-bold text-foreground" htmlFor="monthly-bill">
            {t("billLabel")}
          </label>
          <div className="mt-3 flex min-h-[62px] items-center rounded-xl border border-[#ead9c5] bg-[#fff8ed] px-5">
            <span className="mr-3 text-sm font-medium text-foreground">฿</span>
            <input
              id="monthly-bill"
              type="number"
              inputMode="numeric"
              min={MIN_BILL}
              max={MAX_BILL}
              step={STEP_BILL}
              value={bill}
              onChange={(e) => setBill(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onCalculate()}
              placeholder={t("billPlaceholder")}
              className="min-w-0 flex-1 bg-transparent text-2xl font-extrabold text-[#c93a06] outline-none"
            />
            <span className="ml-2 text-sm text-muted-foreground">
              / {t("month")}
            </span>
          </div>
          {error && <p className="mt-2 text-sm text-destructive">{t("invalidBill")}</p>}

          <input
            type="range"
            aria-label={t("billLabel")}
            min={MIN_BILL}
            max={MAX_BILL}
            step={STEP_BILL}
            value={Number.isFinite(billValue) ? billValue : MIN_BILL}
            onChange={(e) => {
              setError(false);
              setBill(e.target.value);
            }}
            className="mt-5 w-full accent-[#cf3c06]"
          />

          <button type="button" onClick={onCalculate} className="btn-pill mt-6 w-full">
            {t("calculateDetailed")} <span aria-hidden="true">→</span>
          </button>
        </div>

        <div className="flex items-center bg-[#fff6e8] p-8 sm:p-10 lg:px-[30px]">
          <div className="w-full space-y-3">
            <div className="flex min-h-[54px] items-center justify-between rounded-xl border border-[#ead9c5] bg-white px-5 shadow-sm">
              <span className="text-sm font-medium text-muted-foreground">
                {t("beforeLabel")} / {t("month")}
              </span>
              <span className="text-xl font-extrabold text-[#bf3b3b]">
                ฿{formattedBill}
              </span>
            </div>

            <div className="flex min-h-[54px] items-center justify-between rounded-xl border border-[#ead9c5] bg-white px-5 shadow-sm">
              <span className="text-sm font-medium text-muted-foreground">
                {t("afterLabel")} / {t("month")}
              </span>
              <span className="text-xl font-extrabold text-emerald-600">
                ฿{afterBill !== null ? afterBill.toLocaleString(locale) : "0"}
              </span>
            </div>

            {displayedResult && (
              <div className="rounded-xl bg-[#ffe0ba] px-5 py-4 text-center">
                <p className="font-extrabold text-[#cf3c06]">
                  {displayedResult.paybackYears != null
                    ? t("saveBadgeWithPayback", {
                        amount: displayedResult.monthlySaving.toLocaleString(locale),
                        years: displayedResult.paybackYears.toLocaleString(locale, {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        }),
                      })
                    : t("saveBadge", {
                        amount: displayedResult.monthlySaving.toLocaleString(locale),
                      })}
                </p>
              </div>
            )}

            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Link
                href={{ pathname: "/booking", query: { tab: "survey" } }}
                className="btn-pill-outline"
              >
                {tCommon("bookSurvey")}
              </Link>
              <Link
                href={{ pathname: "/booking", query: { tab: "quote", bill } }}
                className="btn-pill"
              >
                {tCommon("requestQuoteFree")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
