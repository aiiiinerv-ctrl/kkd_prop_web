"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo } from "react";
import { Link } from "@/i18n/navigation";
import {
  calculateSavings,
  type CalcPackage,
  type CalculatorParams,
} from "@/lib/calculator";
import { bookingHref } from "@/lib/booking-links";
import { cn } from "@/lib/utils";
import { useCalculatorStore } from "@/store/use-calculator-store";

/** Where a bill sits along the slider track, as a percentage. */
function billToPercent(bill: number, minBill: number, maxBill: number) {
  return ((bill - minBill) / (maxBill - minBill)) * 100;
}

export function CalculatorClient({
  packages,
  panelTitle,
  panelIntro,
  config,
}: {
  packages: CalcPackage[];
  panelTitle?: string | null;
  panelIntro?: string | null;
  config: CalculatorParams;
}) {
  const t = useTranslations("calculator");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const { bill, setBill } = useCalculatorStore();

  useEffect(() => {
    const n = Number(bill);
    if (!Number.isFinite(n)) return;
    const clamped = Math.min(config.maxBill, Math.max(config.minBill, n));
    if (clamped !== n) setBill(String(clamped));
  }, [config.minBill, config.maxBill, bill, setBill]);

  const billValue = Number(bill);
  const displayedResult = useMemo(
    () => calculateSavings(bill, packages, config),
    [bill, packages, config]
  );

  const formattedBill = Number.isFinite(billValue)
    ? billValue.toLocaleString(locale)
    : "0";

  const resolvedPanelTitle = panelTitle ?? t("panelTitle");
  const resolvedPanelIntro = panelIntro ?? t("panelIntro");

  return (
    <div className="mx-auto max-w-[1140px] overflow-hidden rounded-[18px] border border-border bg-card text-left shadow-[0_18px_55px_rgba(13,71,161,0.08)]">
      <div className="grid lg:grid-cols-[1.08fr_0.92fr]">
        <div className="bg-muted p-8 sm:p-10 lg:p-[30px]">
          <h2 className="text-2xl font-bold text-primary">{resolvedPanelTitle}</h2>
          <p className="mt-3 text-sm text-muted-foreground">{resolvedPanelIntro}</p>

          <label className="mt-7 block text-sm font-bold text-foreground" htmlFor="monthly-bill">
            {t("billLabel")}
          </label>
          <div className="mt-3 flex min-h-[62px] items-center rounded-xl border border-border bg-accent px-5">
            <span className="mr-3 text-sm font-medium text-foreground">฿</span>
            <input
              id="monthly-bill"
              type="number"
              inputMode="numeric"
              min={config.minBill}
              max={config.maxBill}
              step={config.stepBill}
              value={bill}
              onChange={(e) => setBill(e.target.value)}
              placeholder={t("billPlaceholder")}
              className="min-w-0 flex-1 bg-transparent text-2xl font-extrabold text-primary outline-none"
            />
            <span className="ml-2 text-sm text-muted-foreground">
              / {t("month")}
            </span>
          </div>

          <div className="relative mt-5">
            <input
              type="range"
              aria-label={t("billLabel")}
              min={config.minBill}
              max={config.maxBill}
              step={config.stepBill}
              value={Number.isFinite(billValue) ? billValue : config.minBill}
              onChange={(e) => setBill(e.target.value)}
              className="relative z-10 w-full accent-primary"
            />
            <div className="pointer-events-none absolute inset-x-0 top-1/2 h-3 -translate-y-1/2">
              <div
                className="absolute top-0 h-3 w-px bg-primary/40"
                style={{
                  left: `${billToPercent(config.billThreshold3To5Kw, config.minBill, config.maxBill)}%`,
                }}
              />
              <div
                className="absolute top-0 h-3 w-px bg-primary/40"
                style={{
                  left: `${billToPercent(config.billThreshold5To10Kw, config.minBill, config.maxBill)}%`,
                }}
              />
            </div>
          </div>
          <div className="relative mt-1.5 h-4 text-[11px] text-muted-foreground">
            <span
              className={cn(
                "absolute -translate-x-1/2",
                displayedResult?.systemKey === "system3kw" && "font-bold text-primary"
              )}
              style={{
                left: `${billToPercent(
                  (config.minBill + config.billThreshold3To5Kw) / 2,
                  config.minBill,
                  config.maxBill
                )}%`,
              }}
            >
              {t("tierZone3kw")}
            </span>
            <span
              className={cn(
                "absolute -translate-x-1/2",
                displayedResult?.systemKey === "system5kw" && "font-bold text-primary"
              )}
              style={{
                left: `${billToPercent(
                  (config.billThreshold3To5Kw + config.billThreshold5To10Kw) / 2,
                  config.minBill,
                  config.maxBill
                )}%`,
              }}
            >
              {t("tierZone5kw")}
            </span>
            <span
              className={cn(
                "absolute -translate-x-1/2",
                displayedResult?.systemKey === "system10kw" && "font-bold text-primary"
              )}
              style={{
                left: `${billToPercent(
                  (config.billThreshold5To10Kw + config.maxBill) / 2,
                  config.minBill,
                  config.maxBill
                )}%`,
              }}
            >
              {t("tierZone10kw")}
            </span>
          </div>

          {displayedResult && (
            <p className="mt-3 text-sm text-muted-foreground">
              {t("resultSystem", { system: t(displayedResult.systemKey) })}
            </p>
          )}
        </div>

        <div className="flex items-center bg-accent p-8 sm:p-10 lg:px-[30px]">
          <div className="w-full space-y-3">
            <div className="flex min-h-[54px] items-center justify-between rounded-xl border border-border bg-white px-5 shadow-sm">
              <span className="text-sm font-medium text-muted-foreground">
                {t("beforeLabel")} / {t("month")}
              </span>
              <span className="text-xl font-extrabold text-[#bf3b3b]">
                ฿{formattedBill}
              </span>
            </div>

            <div className="flex min-h-[54px] items-center justify-between rounded-xl border border-border bg-white px-5 shadow-sm">
              <span className="text-sm font-medium text-muted-foreground">
                {t("afterLabel")} / {t("month")}
              </span>
              <span className="text-xl font-extrabold text-emerald-600">
                ฿
                {displayedResult
                  ? displayedResult.afterBill.toLocaleString(locale)
                  : "0"}
              </span>
            </div>

            {displayedResult && (
              <div className="rounded-xl bg-brand-gold px-5 py-4 text-center">
                <p className="font-extrabold text-primary">
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
              <Link href={bookingHref({ tab: "survey" })} className="btn-pill-outline">
                {tCommon("bookSurvey")}
              </Link>
              <Link href={bookingHref({ tab: "quote", bill })} className="btn-pill">
                {tCommon("requestQuoteFree")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
