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

  // Slots always show real content (no slot toggles between content and nothing); the card
  // height stays constant because variants are designed to ~the same height and invisible
  // ghosts only absorb <=1-line differences inside a filled box.
  type OkResult = Extract<ReturnType<typeof recommendFromTable>, { kind: "ok" }>;
  const renderResult = (result: OkResult, bill: number) => {
    const years = (result.paybackYears ?? 9.9).toLocaleString(locale, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
    const amount = result.monthlySaving.toLocaleString(locale);
    const hasPayback = result.paybackYears != null;
    return (
      <div className="space-y-3 tabular-nums">
        <div className="flex min-h-[54px] flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl border border-border bg-white px-5 py-3 shadow-sm">
          <span className="text-sm font-medium text-muted-foreground">
            {t("beforeLabel")} / {t("month")}
          </span>
          <span className="ml-auto grid text-right text-xl font-extrabold text-[#bf3b3b]">
            <span className="col-start-1 row-start-1">฿{Number.isFinite(bill) ? bill.toLocaleString(locale) : "0"}</span>
            <span aria-hidden className="invisible col-start-1 row-start-1">฿88,888</span>
          </span>
        </div>
        <div className="flex min-h-[54px] flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl border border-border bg-white px-5 py-3 shadow-sm">
          <span className="text-sm font-medium text-muted-foreground">
            {t("afterLabel")} / {t("month")}
          </span>
          {result.coversFullBill ? (
            <span className="ml-auto inline-flex items-center gap-2">
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">100%</span>
              <span className="text-xl font-extrabold text-emerald-600">฿0</span>
            </span>
          ) : (
            <span className="ml-auto grid text-right text-xl font-extrabold text-emerald-600">
              <span className="col-start-1 row-start-1">฿{result.afterBill.toLocaleString(locale)}</span>
              <span aria-hidden className="invisible col-start-1 row-start-1">฿88,888</span>
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: t("tilePanels"), value: result.row.panels.toLocaleString(locale) },
            { label: t("tileRoofArea"), value: `${result.row.roofM2.toLocaleString(locale)} ${t("unitSqm")}` },
            { label: t("tileKwhPerMonth"), value: `${result.kwhPerMonth.toLocaleString(locale)} ${t("unitKwh")}` },
          ].map((tile) => (
            <div key={tile.label} className="min-w-0 rounded-xl border border-border bg-white px-2 py-3 text-center">
              <p className="text-[11px] leading-4 text-muted-foreground">{tile.label}</p>
              <p className="mt-1 min-h-10 break-words text-sm font-extrabold text-primary sm:min-h-5">{tile.value}</p>
            </div>
          ))}
        </div>
        <div className="rounded-xl bg-brand-gold px-5 py-4 text-center">
          {/* widest plausible digits (tabular-nums) so the line count can't depend on the amount */}
          <div className="grid">
            <p aria-hidden className="invisible col-start-1 row-start-1 font-extrabold text-primary">
              {t("saveBadge", { amount: (88888).toLocaleString(locale) })}
            </p>
            <p className="col-start-1 row-start-1 font-extrabold text-primary">{t("saveBadge", { amount })}</p>
          </div>
          <div className="grid">
            <p aria-hidden className="invisible col-start-1 row-start-1 mt-1 text-sm leading-5 font-semibold text-primary">
              {t("noPaybackCta")} {(88888).toLocaleString(locale)}
            </p>
            <p className="col-start-1 row-start-1 mt-1 text-sm leading-5 font-semibold text-primary">
              {hasPayback ? t("paybackLine", { years }) : t("noPaybackCta")}
            </p>
          </div>
        </div>
      </div>
    );
  };
  const calloutKind = displayedResult
    ? displayedResult.belowFirstRow
      ? "amber"
      : displayedResult.coversFullBill
        ? "emerald"
        : "normal"
    : "normal";
  const calloutTone = {
    amber: "bg-amber-50 text-amber-900 ring-amber-200/70",
    emerald: "bg-emerald-50 text-emerald-900 ring-emerald-200/70",
    normal: "bg-white/70 text-muted-foreground ring-border",
  }[calloutKind];
  const calloutBody =
    calloutKind === "amber" ? (
      t("belowFirstRowNote")
    ) : calloutKind === "emerald" ? (
      <>
        <b className="font-bold text-emerald-700">{t("coversFullBill")}</b> {t("coversFullBillSub")}
      </>
    ) : (
      t("coversFullBillSub")
    );
  const sampleBill = Math.max(config.minBill, sizeTable[0]?.billMin ?? config.minBill);
  const sampleRecommendation = recommendFromTable(
    sampleBill,
    sizeTable,
    packages,
    config.annualSavingMonthsMultiplier
  );
  const sampleResult = sampleRecommendation.kind === "ok" ? sampleRecommendation : null;

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
          <div className="mt-4 space-y-3">
            <p className="min-h-10 text-sm font-bold tabular-nums text-primary sm:min-h-5">
              {displayedResult && (
                <>
                  {t("resultSystemSize", { kw: displayedResult.row.kw.toLocaleString(locale) })}
                  {displayedResult.row.phases.includes(1) && displayedResult.row.phases.includes(3) && ` ${t("phaseBoth")}`}
                  {popular && ` ${t("popularSuffix")}`}
                </>
              )}
            </p>
            <div className="grid">
              <p aria-hidden className="invisible col-start-1 row-start-1 px-4 py-2.5 text-xs leading-5">
                {t("belowFirstRowNote")}
              </p>
              <p aria-hidden className="invisible col-start-1 row-start-1 px-4 py-2.5 text-xs leading-5">
                <b className="font-bold">{t("coversFullBill")}</b> {t("coversFullBillSub")}
              </p>
              <div className={`col-start-1 row-start-1 flex items-center rounded-lg px-4 py-2.5 text-xs leading-5 ring-1 ${calloutTone}`}>
                <p>{calloutBody}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center bg-accent p-8 sm:p-10 lg:px-[30px]">
          <div className="w-full space-y-3">
            {displayedResult ? (
              renderResult(displayedResult, billValue)
            ) : (
              // Same footprint as a normal result: an invisible sample panel sizes the slot,
              // the message overlays it, so the card never jumps when the state changes.
              <div className="grid">
                {sampleResult && (
                  <div aria-hidden className="invisible col-start-1 row-start-1">
                    {renderResult(sampleResult, sampleBill)}
                  </div>
                )}
                <div className="col-start-1 row-start-1 flex items-center justify-center">
                  {recommendation.kind === "tooLarge" ? (
                    <div className="w-full rounded-xl border border-border bg-white p-6 text-center shadow-sm">
                      <h3 className="text-lg font-extrabold text-primary">
                        {t("tooLargeTitle", { size: recommendation.lastRow.kw.toLocaleString(locale) })}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("tooLargeBody")}</p>
                    </div>
                  ) : (
                    <p className="text-center text-sm text-muted-foreground">{t("billPlaceholder")}</p>
                  )}
                </div>
              </div>
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
