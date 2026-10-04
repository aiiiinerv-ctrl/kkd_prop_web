"use client";

import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, ArrowUp, Check, ZapOff } from "lucide-react";
import { useMemo, type ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import {
  recommendFromTable,
  type CalcPackage,
  type CalculatorParams,
} from "@/lib/calculator";
import { bookingHref } from "@/lib/booking-links";
import { recommendHybrid, type PublicHybridSize } from "@/lib/calculator-hybrid";
import type { SizeRow } from "@/lib/calculator-size-table";
import { AVG_MONTHLY_BILL_MAX } from "@/lib/validations/lead";
import { useCalculatorStore } from "@/store/use-calculator-store";
import { BatteryTrack, FactTrack, SystemBox } from "./battery-picker";
import { PhasePill } from "./phase-pill";
import { SystemModeTabs } from "./system-mode-tabs";

/** What the result box needs, whichever system produced it. */
type ResultView = {
  panels: number;
  roofM2: number;
  kwhPerMonth: number;
  monthlySaving: number;
  afterBill: number;
  coversFullBill: boolean;
  paybackYears: number | null;
};

export function CalculatorClient({
  packages,
  sizeTable,
  panelTitle,
  panelIntro,
  config,
  hybridTable,
}: {
  packages: (CalcPackage & { isPopular: boolean })[];
  sizeTable: SizeRow[];
  panelTitle?: string | null;
  panelIntro?: string | null;
  config: CalculatorParams;
  /** null / empty = no Hybrid table: no toggle, the card is the plain On-grid calculator. */
  hybridTable?: PublicHybridSize[] | null;
}) {
  const t = useTranslations("calculator");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const { bill, setBill, systemMode, setSystemMode, preferredBatteryKwh, setPreferredBatteryKwh } =
    useCalculatorStore();
  const hasHybrid = Boolean(hybridTable && hybridTable.length > 0);
  // The store may say "hybrid" while the table is gone (admin removed it): fall back to On-grid.
  const mode = hasHybrid ? systemMode : "onGrid";
  const isHybrid = mode === "hybrid";

  const maxTypedBill = (isHybrid ? hybridTable?.at(-1)?.billMax : sizeTable.at(-1)?.billMax) ?? config.maxBill;
  const billValue = Number(bill);
  // Keep the raw input while typing; clamp only after the user leaves the field.
  const clampBill = () => {
    // An empty field stays empty (empty state), not snapped to the minimum bill.
    if (bill.trim() === "") return;
    const value = Number.isFinite(billValue) ? billValue : config.minBill;
    setBill(String(Math.min(maxTypedBill, Math.max(config.minBill, value))));
  };
  const recommendation = useMemo(
    () => recommendFromTable(billValue, sizeTable, packages, config.annualSavingMonthsMultiplier),
    [billValue, sizeTable, packages, config.annualSavingMonthsMultiplier]
  );
  const hybridRecommendation = useMemo(
    () =>
      hasHybrid
        ? recommendHybrid(billValue, hybridTable!, preferredBatteryKwh, config.annualSavingMonthsMultiplier)
        : null,
    [hasHybrid, billValue, hybridTable, preferredBatteryKwh, config.annualSavingMonthsMultiplier]
  );
  const hybridOk = hybridRecommendation?.kind === "ok" ? hybridRecommendation : null;
  const displayedResult = !isHybrid && recommendation.kind === "ok" ? recommendation : null;
  const popular = displayedResult && packages.some(
    (pkg) => pkg.sizeKw === displayedResult.row.kw && pkg.isPopular
  );
  const resultView: ResultView | null = isHybrid
    ? hybridOk && {
        panels: hybridOk.size.panels,
        roofM2: hybridOk.size.roofM2,
        kwhPerMonth: hybridOk.kwhPerMonth,
        monthlySaving: hybridOk.monthlySaving,
        afterBill: hybridOk.afterBill,
        coversFullBill: hybridOk.coversFullBill,
        paybackYears: hybridOk.paybackYears,
      }
    : displayedResult && {
        panels: displayedResult.row.panels,
        roofM2: displayedResult.row.roofM2,
        kwhPerMonth: displayedResult.kwhPerMonth,
        monthlySaving: displayedResult.monthlySaving,
        afterBill: displayedResult.afterBill,
        coversFullBill: displayedResult.coversFullBill,
        paybackYears: displayedResult.paybackYears,
      };
  const belowFirstRow = isHybrid ? Boolean(hybridOk?.belowFirstRow) : Boolean(displayedResult?.belowFirstRow);
  const quoteSystem = hasHybrid ? (isHybrid ? "hybrid" : "on-grid") : undefined;
  const quoteBattery = isHybrid && hybridOk ? String(hybridOk.batteryKwh) : undefined;
  const quoteBill = Number.isInteger(billValue) && billValue >= config.minBill && billValue <= AVG_MONTHLY_BILL_MAX
    ? String(billValue)
    : undefined;

  // Slots always show real content (no slot toggles between content and nothing); the card
  // height stays constant because variants are designed to ~the same height and invisible
  // ghosts only absorb <=1-line differences inside a filled box.
  // `footnote` (Hybrid-toggle layout only): small print under the gold badge. undefined = none, so
  // the plain On-grid card keeps its original markup.
  const renderResult = (result: ResultView, bill: number, footnote?: string | null, placeholder?: boolean) => {
    const hybridLayout = footnote !== undefined;
    const years = (result.paybackYears ?? 9.9).toLocaleString(locale, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
    const amount = result.monthlySaving.toLocaleString(locale);
    const hasPayback = result.paybackYears != null;
    const ghostLine = "invisible col-start-1 row-start-1 mt-1 text-sm leading-5 font-semibold text-primary";
    const goldBadge = (
          <div className="rounded-xl bg-brand-gold px-5 py-4 text-center">
            {/* widest plausible digits (tabular-nums) so the line count can't depend on the amount */}
            <div className="grid">
              <p aria-hidden className="invisible col-start-1 row-start-1 font-extrabold text-primary">
                {t("saveBadge", { amount: (88888).toLocaleString(locale) })}
              </p>
              {hybridLayout && (
                <p aria-hidden className="invisible col-start-1 row-start-1 font-extrabold text-primary">
                  {t("emptyPrompt")}
                </p>
              )}
              {placeholder ? (
                <p className="col-start-1 row-start-1 text-center font-extrabold text-primary">
                  <ArrowUp aria-hidden className="mr-1.5 inline-block size-4 align-[-3px] lg:hidden" />
                  <ArrowLeft aria-hidden className="mr-1.5 hidden size-4 align-[-3px] lg:inline-block" />
                  {t("emptyPrompt")}
                </p>
              ) : (
                <p className="col-start-1 row-start-1 font-extrabold text-primary">{t("saveBadge", { amount })}</p>
              )}
            </div>
            <div className="grid">
              {hybridLayout ? (
                <>
                  <p aria-hidden className={ghostLine}>
                    {t("paybackLine", { years: (88.8).toLocaleString(locale, { minimumFractionDigits: 1 }) })}
                  </p>
                  <p aria-hidden className={ghostLine}>{t("noPaybackShort")}</p>
                  <p aria-hidden className={ghostLine}>{t("emptyPromptSub")}</p>
                </>
              ) : (
                <p aria-hidden className="invisible col-start-1 row-start-1 mt-1 text-sm leading-5 font-semibold text-primary">
                  {t("noPaybackCta")} {(88888).toLocaleString(locale)}
                </p>
              )}
              <p className="col-start-1 row-start-1 mt-1 text-sm leading-5 font-semibold text-primary">
                {placeholder
                  ? t("emptyPromptSub")
                  : hasPayback
                    ? t("paybackLine", { years })
                    : hybridLayout
                      ? t("noPaybackShort")
                      : t("noPaybackCta")}
              </p>
            </div>
          </div>
    );
    return (
      <div className="space-y-3 tabular-nums">
        <div className="flex min-h-[54px] flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl border border-border bg-white px-5 py-3 shadow-sm">
          <span className="text-sm font-medium text-muted-foreground">
            {t("beforeLabel")} / {t("month")}
          </span>
          <span className="ml-auto grid text-right text-xl font-extrabold text-[#bf3b3b]">
            {placeholder ? (
              <span aria-hidden className="col-start-1 row-start-1 text-muted-foreground/50">—</span>
            ) : (
              <span className="col-start-1 row-start-1">฿{Number.isFinite(bill) ? bill.toLocaleString(locale) : "0"}</span>
            )}
            <span aria-hidden className="invisible col-start-1 row-start-1">฿88,888</span>
          </span>
        </div>
        <div className="flex min-h-[54px] flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl border border-border bg-white px-5 py-3 shadow-sm">
          <span className="text-sm font-medium text-muted-foreground">
            {t("afterLabel")} / {t("month")}
          </span>
          {result.coversFullBill && !placeholder ? (
            <span className="ml-auto inline-flex items-center gap-2">
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">100%</span>
              <span className="text-xl font-extrabold text-emerald-600">฿0</span>
            </span>
          ) : (
            <span className="ml-auto grid text-right text-xl font-extrabold text-emerald-600">
              {placeholder ? (
                <span aria-hidden className="col-start-1 row-start-1 text-muted-foreground/50">—</span>
              ) : (
                <span className="col-start-1 row-start-1">฿{result.afterBill.toLocaleString(locale)}</span>
              )}
              <span aria-hidden className="invisible col-start-1 row-start-1">฿88,888</span>
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: t("tilePanels"), value: result.panels.toLocaleString(locale) },
            { label: t("tileRoofArea"), value: `${result.roofM2.toLocaleString(locale)} ${t("unitSqm")}` },
            { label: t("tileKwhPerMonth"), value: `${result.kwhPerMonth.toLocaleString(locale)} ${t("unitKwh")}` },
          ].map((tile) => (
            <div key={tile.label} className="min-w-0 rounded-xl border border-border bg-white px-2 py-3 text-center">
              <p className="text-[11px] leading-4 text-muted-foreground">{tile.label}</p>
              <p
                aria-hidden={placeholder || undefined}
                className={`mt-1 min-h-10 break-words text-sm font-extrabold sm:min-h-5 ${placeholder ? "text-muted-foreground/50" : "text-primary"}`}
              >
                {placeholder ? "—" : tile.value}
              </p>
            </div>
          ))}
        </div>
        {footnote === undefined ? (
          goldBadge
        ) : (
          <div>
            {placeholder && <span className="sr-only">{t("emptyPrompt")}</span>}
            {goldBadge}
            <div className="mt-1.5 grid text-center text-[11px] leading-4 text-muted-foreground">
              {[t("batteryAssumption"), t("noBatteryFootnote"), t("onGridFootnote")].map((text) => (
                <p key={text} aria-hidden className="invisible col-start-1 row-start-1">
                  {text}
                </p>
              ))}
              {placeholder ? (
                <p className="col-start-1 row-start-1">{t("emptyFootnote")}</p>
              ) : (
                footnote && <p className="col-start-1 row-start-1">{footnote}</p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };
  const calloutKind = resultView
    ? belowFirstRow
      ? "amber"
      : resultView.coversFullBill
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
  const sampleBill = Math.max(config.minBill, (isHybrid ? hybridTable?.[0]?.billMin : sizeTable[0]?.billMin) ?? config.minBill);
  const sampleRecommendation = recommendFromTable(
    sampleBill,
    sizeTable,
    packages,
    config.annualSavingMonthsMultiplier
  );
  const sampleHybrid = hasHybrid
    ? recommendHybrid(sampleBill, hybridTable!, null, config.annualSavingMonthsMultiplier)
    : null;
  const sampleResult: ResultView | null = isHybrid
    ? sampleHybrid?.kind === "ok"
      ? {
          panels: sampleHybrid.size.panels,
          roofM2: sampleHybrid.size.roofM2,
          kwhPerMonth: sampleHybrid.kwhPerMonth,
          monthlySaving: sampleHybrid.monthlySaving,
          afterBill: sampleHybrid.afterBill,
          coversFullBill: sampleHybrid.coversFullBill,
          paybackYears: sampleHybrid.paybackYears,
        }
      : null
    : sampleRecommendation.kind === "ok"
      ? {
          panels: sampleRecommendation.row.panels,
          roofM2: sampleRecommendation.row.roofM2,
          kwhPerMonth: sampleRecommendation.kwhPerMonth,
          monthlySaving: sampleRecommendation.monthlySaving,
          afterBill: sampleRecommendation.afterBill,
          coversFullBill: sampleRecommendation.coversFullBill,
          paybackYears: sampleRecommendation.paybackYears,
        }
      : null;

  const ghostKw = hasHybrid ? Math.max(...hybridTable!.map((size) => size.kw)) : 0;

  const resolvedPanelTitle = panelTitle ?? t("panelTitle");
  const resolvedPanelIntro = panelIntro ?? t("panelIntro");

  // --- shared by both layouts (identical markup) ---
  const inputBlock = (
    <>
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
    </>
  );
  const calloutBlock = (
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
  );
  // `compact` (Hybrid-toggle layout): one row from lg up (tighter px) so the two-column card
  // doesn't stretch the left System box when English labels would otherwise wrap to two rows.
  const ctas = (padding: string, compact = false) => (
    <div className={`flex flex-wrap justify-center gap-3 ${compact ? "lg:flex-nowrap " : ""}${padding}`}>
      <Link href={bookingHref({ tab: "survey" })} className={compact ? "btn-pill-outline lg:px-5" : "btn-pill-outline"}>
        {tCommon("bookSurvey")}
      </Link>
      <Link
        href={bookingHref({ tab: "quote", bill: quoteBill, system: quoteSystem, battery: quoteBattery })}
        className={compact ? "btn-pill lg:px-5" : "btn-pill"}
      >
        {tCommon("requestQuoteFree")}
      </Link>
    </div>
  );
  const tooLargeKw = (isHybrid && hybridRecommendation?.kind === "tooLarge"
    ? hybridRecommendation.lastSize.kw
    : recommendation.kind === "tooLarge"
      ? recommendation.lastRow.kw
      : 0
  ).toLocaleString(locale);
  const unavailableKind = isHybrid ? hybridRecommendation?.kind : recommendation.kind;
  // Same footprint as a normal result: an invisible sample panel sizes the slot, the message
  // overlays it, so the card never jumps when the state changes.
  const renderUnavailable = (hybridLayout: boolean) => (
    <div className="grid">
      {sampleResult && (
        <div aria-hidden className="invisible col-start-1 row-start-1">
          {renderResult(sampleResult, sampleBill, hybridLayout ? null : undefined)}
        </div>
      )}
      <div
        className={hybridLayout ? "col-start-1 row-start-1 flex items-stretch justify-center" : "col-start-1 row-start-1 flex items-center justify-center"}
      >
        {unavailableKind === "tooLarge" ? (
          <div
            className={`w-full rounded-xl border border-border bg-white p-6 text-center shadow-sm${hybridLayout ? " flex h-full flex-col justify-center" : ""}`}
          >
            <h3 className="text-lg font-extrabold text-primary">{t("tooLargeTitle", { size: tooLargeKw })}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("tooLargeBody")}</p>
          </div>
        ) : (
          hybridLayout ? (
            <div className="flex h-full w-full flex-col justify-center rounded-xl border border-border bg-white p-6 text-center shadow-sm">
              <p className="text-sm text-muted-foreground">{t("billPlaceholder")}</p>
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground">{t("billPlaceholder")}</p>
          )
        )}
      </div>
    </div>
  );

  if (!hasHybrid) {
    return (
      <div className="mx-auto max-w-[1140px] overflow-hidden rounded-[18px] border border-border bg-card text-left shadow-[0_18px_55px_rgba(13,71,161,0.08)]">
        <div className="grid lg:grid-cols-[1.08fr_0.92fr]">
          <div className="bg-muted p-8 sm:p-10 lg:p-[30px]">
            {inputBlock}
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
              {calloutBlock}
            </div>
          </div>

          <div className="flex items-center bg-accent p-8 sm:p-10 lg:px-[30px]">
            <div className="w-full space-y-3">
              {resultView ? renderResult(resultView, billValue) : renderUnavailable(false)}
              {ctas("pt-2")}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Hybrid toggle layout: inputs left (incl. the system box), outputs right ---
  const full = (kwh: number) => (kwh === 0 ? t("batteryNone") : t("batteryOption", { kwh: kwh.toLocaleString(locale) }));
  const short = (kwh: number) => (kwh === 0 ? t("batteryNone") : kwh.toLocaleString(locale));
  const adjusted = hybridOk !== null && preferredBatteryKwh !== null && preferredBatteryKwh !== hybridOk.batteryKwh;
  const maxBattery = Math.max(0, ...hybridTable!.flatMap((size) => size.batteries.map((b) => b.batteryKwh)));
  const maxOnGridKw = Math.max(0, ...sizeTable.map((row) => row.kw));
  const popularChip = (
    <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-accent-foreground">{tCommon("popular")}</span>
  );
  const phaseUnion = (rows: { phases: (1 | 3)[] }[]) =>
    ([1, 3] as const).filter((ph) => rows.some((r) => r.phases.includes(ph)));
  const onGridPhases = phaseUnion(sizeTable);
  const hybridPhases = phaseUnion(hybridTable!);
  // Empty headers put the pill on its own row below sm: the reserved header (title + pill + chip)
  // wraps to two rows there, so a one-row empty header would leave a hollow band.
  // What the battery track lists while Hybrid has nothing to price (disabled look).
  const idleSize =
    hybridRecommendation?.kind === "tooLarge" ? hybridRecommendation.lastSize : hybridTable![0];
  const idleOptions = idleSize.batteries.map((b) => b.batteryKwh);

  let header: ReactNode;
  let caption: ReactNode;
  let track: ReactNode;
  let footer: ReactNode;
  if (isHybrid && hybridOk) {
    header = (
      <>
        {t("hybridResultSize", { kw: hybridOk.size.kw.toLocaleString(locale) })}
        <PhasePill phases={hybridOk.phases} />
      </>
    );
    caption = (
      <>
        <span className="sr-only">{t("batteryLabel")}: </span>
        {adjusted
          ? t("batteryAutoAdjusted", { kwh: full(hybridOk.batteryKwh), kw: hybridOk.size.kw.toLocaleString(locale) })
          : `${t("batteryFor", { kw: hybridOk.size.kw.toLocaleString(locale) })} (kWh)`}
      </>
    );
    track = (
      <BatteryTrack
        options={hybridOk.batteryOptions}
        value={hybridOk.batteryKwh}
        onChange={setPreferredBatteryKwh}
        labelledBy="calc-battery-label"
        optionLabel={full}
        optionText={short}
      />
    );
    footer = t("batteryTradeoffHint");
  } else if (isHybrid) {
    header = (
      <>
        {t("modeHybrid")}
        <div className="basis-full sm:basis-auto">
          <PhasePill phases={hybridPhases} />
        </div>
      </>
    );
    caption = t("modeHybridHint");
    track = <BatteryTrack options={idleOptions} optionLabel={full} optionText={short} />;
    footer =
      hybridRecommendation?.kind === "tooLarge"
        ? t("batterySizedOnSite", { kw: hybridRecommendation.lastSize.kw.toLocaleString(locale) })
        : t("batteryEnterBill");
  } else {
    header = displayedResult ? (
      <>
        {t("resultSystemSize", { kw: displayedResult.row.kw.toLocaleString(locale) })}
        {displayedResult.row.phases.length > 0 && <PhasePill phases={displayedResult.row.phases} />}
        {popular && popularChip}
      </>
    ) : (
      <>
        {t("modeOnGrid")}
        <div className="basis-full sm:basis-auto">
          <PhasePill phases={onGridPhases} />
        </div>
      </>
    );
    caption = t("modeOnGridHint");
    track = (
      <FactTrack
        facts={[
          { icon: <Check className="size-4 text-emerald-600" />, text: t("onGridFactNoBattery") },
          { icon: <ZapOff className="size-4 text-muted-foreground" />, text: t("onGridFactOutage") },
        ]}
      />
    );
    footer = displayedResult
      ? t("onGridSizedNote")
      : recommendation.kind === "tooLarge"
        ? t("onGridSizedOnSite", { kw: recommendation.lastRow.kw.toLocaleString(locale) })
        : t("onGridEnterBill");
  }
  const footnote = resultView
    ? isHybrid
      ? hybridOk && hybridOk.batteryKwh > 0
        ? t("batteryAssumption")
        : t("noBatteryFootnote")
      : t("onGridFootnote")
    : null;

  return (
    <div className="mx-auto max-w-[1140px] overflow-hidden rounded-[18px] border border-border bg-card text-left shadow-[0_18px_55px_rgba(13,71,161,0.08)]">
      <SystemModeTabs value={mode} onChange={setSystemMode} />
      <div className="grid lg:grid-cols-[1.08fr_0.92fr]">
        <div className="flex flex-col bg-muted p-8 sm:p-10 lg:p-[30px]">
          {inputBlock}
          <div className="mt-5 flex-1">
            <SystemBox
              header={header}
              headerGhosts={[
                ...hybridTable!.map((size) => (
                  <>
                    {t("hybridResultSize", { kw: size.kw.toLocaleString(locale) })}
                    <PhasePill phases={size.phases} />
                  </>
                )),
                ...sizeTable.map((row) => (
                  <>
                    {t("resultSystemSize", { kw: row.kw.toLocaleString(locale) })}
                    {row.phases.length > 0 && <PhasePill phases={row.phases} />}
                    {packages.some((pkg) => pkg.sizeKw === row.kw && pkg.isPopular) && popularChip}
                  </>
                )),
              ]}
              caption={caption}
              captionId={isHybrid && hybridOk ? "calc-battery-label" : undefined}
              captionAdjusted={isHybrid && adjusted}
              captionGhosts={[
                `${t("batteryFor", { kw: ghostKw.toLocaleString(locale) })} (kWh)`,
                t("batteryAutoAdjusted", { kwh: full(maxBattery), kw: ghostKw.toLocaleString(locale) }),
                t("modeOnGridHint"),
                t("modeHybridHint"),
              ]}
              track={track}
              footer={footer}
              footerGhosts={[
                t("batteryTradeoffHint"),
                t("onGridSizedNote"),
                t("onGridEnterBill"),
                t("onGridSizedOnSite", { kw: maxOnGridKw.toLocaleString(locale) }),
                t("batterySizedOnSite", { kw: ghostKw.toLocaleString(locale) }),
                t("batteryEnterBill"),
              ]}
            />
          </div>
        </div>

        <div className="flex items-start bg-accent p-8 sm:p-10 lg:p-[30px]">
          <div className="w-full space-y-3">
            {resultView ? renderResult(resultView, billValue, footnote)
              : unavailableKind === "empty" && sampleResult
                ? renderResult(sampleResult, sampleBill, null, true)
                : renderUnavailable(true)}
            {calloutBlock}
            {ctas("pt-1", true)}
          </div>
        </div>
      </div>
    </div>
  );
}
