"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";
import { Link } from "@/i18n/navigation";
import {
  recommendFromTable,
  type CalcPackage,
  type CalculatorParams,
} from "@/lib/calculator";
import { bookingHref } from "@/lib/booking-links";
import type { SizeRow } from "@/lib/calculator-size-table";
import { AVG_MONTHLY_BILL_MAX } from "@/lib/validations/lead";
import { useCalculatorStore } from "@/store/use-calculator-store";

export function CalculatorClient({
  packages,
  sizeTable,
  panelTitle,
  panelIntro,
  config,
}: {
  packages: (CalcPackage & { isPopular: boolean })[];
  sizeTable: SizeRow[];
  panelTitle?: string | null;
  panelIntro?: string | null;
  config: CalculatorParams;
}) {
  const t = useTranslations("calculator");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const { bill, setBill } = useCalculatorStore();

  const maxTypedBill = sizeTable.at(-1)?.billMax ?? config.maxBill;
  const billValue = Number(bill);
  // Keep the raw input while typing; clamp only after the user leaves the field.
  const clampBill = () => {
    const value = Number.isFinite(billValue) ? billValue : config.minBill;
    setBill(String(Math.min(maxTypedBill, Math.max(config.minBill, value))));
  };
  const recommendation = useMemo(
    () => recommendFromTable(billValue, sizeTable, packages, config.annualSavingMonthsMultiplier),
    [billValue, sizeTable, packages, config.annualSavingMonthsMultiplier]
  );
  const displayedResult = recommendation.kind === "ok" ? recommendation : null;
  const popular = displayedResult && packages.some(
    (pkg) => pkg.sizeKw === displayedResult.row.kw && pkg.isPopular
  );
  const quoteBill = Number.isInteger(billValue) && billValue >= config.minBill && billValue <= AVG_MONTHLY_BILL_MAX
    ? String(billValue)
    : undefined;

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
              max={maxTypedBill}
              step={1}
              value={bill}
              onChange={(e) => setBill(e.target.value)}
              onBlur={clampBill}
              aria-describedby="bill-type-hint"
              placeholder={t("billPlaceholder")}
              className="min-w-0 flex-1 bg-transparent text-2xl font-extrabold text-primary outline-none"
            />
            <span className="ml-2 text-sm text-muted-foreground">
              / {t("month")}
            </span>
          </div>

          <input
            type="range"
            aria-label={t("billLabel")}
            min={config.minBill}
            max={config.maxBill}
            step={config.stepBill}
            value={Number.isFinite(billValue) ? Math.min(config.maxBill, Math.max(config.minBill, billValue)) : config.minBill}
            onChange={(e) => setBill(e.target.value)}
            className="mt-5 w-full accent-primary"
          />
          <p id="bill-type-hint" className="mt-1 text-xs leading-5 text-muted-foreground">
            {t("billTypeHint", { max: maxTypedBill.toLocaleString(locale) })}
          </p>
          {displayedResult && (
            <p className="mt-3 text-sm font-bold text-primary">
              {t("resultSystemSize", { kw: displayedResult.row.kw.toLocaleString(locale) })}
              {displayedResult.row.phases.includes(1) && displayedResult.row.phases.includes(3) && ` ${t("phaseBoth")}`}
              {popular && ` ${t("popularSuffix")}`}
            </p>
          )}
        </div>

        <div className="flex items-center bg-accent p-8 sm:p-10 lg:px-[30px]">
          <div className="w-full space-y-3">
            {recommendation.kind === "tooLarge" ? (
              <div className="rounded-xl border border-border bg-white p-6 text-center shadow-sm">
                <h3 className="text-lg font-extrabold text-primary">
                  {t("tooLargeTitle", { size: recommendation.lastRow.kw.toLocaleString(locale) })}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("tooLargeBody")}</p>
              </div>
            ) : displayedResult ? (
              <>
                <div className="flex min-h-[54px] flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl border border-border bg-white px-5 py-3 shadow-sm">
                  <span className="text-sm font-medium text-muted-foreground">
                    {t("beforeLabel")} / {t("month")}
                  </span>
                  <span className="text-xl font-extrabold text-[#bf3b3b]">฿{formattedBill}</span>
                </div>
                <div className="rounded-xl border border-border bg-white px-5 py-3 shadow-sm">
                  {displayedResult.coversFullBill ? (
                    <>
                      <p className="font-extrabold text-emerald-700">{t("coversFullBill")}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{t("coversFullBillSub")}</p>
                    </>
                  ) : (
                    <div className="flex min-h-[28px] flex-wrap items-center justify-between gap-x-3 gap-y-1">
                      <span className="text-sm font-medium text-muted-foreground">
                        {t("afterLabel")} / {t("month")}
                      </span>
                      <span className="text-xl font-extrabold text-emerald-600">
                        ฿{displayedResult.afterBill.toLocaleString(locale)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: t("tilePanels"), value: displayedResult.row.panels.toLocaleString(locale) },
                    { label: t("tileRoofArea"), value: `${displayedResult.row.roofM2.toLocaleString(locale)} ${t("unitSqm")}` },
                    { label: t("tileKwhPerMonth"), value: `${displayedResult.kwhPerMonth.toLocaleString(locale)} ${t("unitKwh")}` },
                  ].map((tile) => (
                    <div key={tile.label} className="min-w-0 rounded-xl border border-border bg-white px-2 py-3 text-center">
                      <p className="text-[11px] leading-4 text-muted-foreground">{tile.label}</p>
                      <p className="mt-1 break-words text-sm font-extrabold text-primary">{tile.value}</p>
                    </div>
                  ))}
                </div>
                {displayedResult.belowFirstRow && (
                  <p className="rounded-lg bg-amber-50 px-4 py-2 text-xs leading-5 text-amber-900">{t("belowFirstRowNote")}</p>
                )}
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
                      : t("saveBadge", { amount: displayedResult.monthlySaving.toLocaleString(locale) })}
                  </p>
                  {displayedResult.paybackYears == null && (
                    <p className="mt-1 text-xs leading-5 text-primary">{t("noPaybackCta")}</p>
                  )}
                </div>
              </>
            ) : (
              <p className="text-center text-sm text-muted-foreground">{t("billPlaceholder")}</p>
            )}

            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Link href={bookingHref({ tab: "survey" })} className="btn-pill-outline">
                {tCommon("bookSurvey")}
              </Link>
              <Link href={bookingHref({ tab: "quote", bill: quoteBill })} className="btn-pill">
                {tCommon("requestQuoteFree")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
