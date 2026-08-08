"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { calculateTheoreticalMonthlySavingThb } from "@/lib/calculator";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  type CalcPackage,
  recommendSystem,
  useCalculatorStore,
} from "@/store/use-calculator-store";

const MIN_BILL = 500;
const MAX_BILL = 8000;
const STEP_BILL = 100;

// Mirrors the bracket sizes in src/lib/calculator.ts's recommendSystemSizeKw —
// used to render the comparison table in the "detail" panel below.
const BRACKET_ROWS = [
  { sizeKw: 3, systemKey: "system3kw", billRangeKey: "billRange3kw" },
  { sizeKw: 5, systemKey: "system5kw", billRangeKey: "billRange5kw" },
  { sizeKw: 10, systemKey: "system10kw", billRangeKey: "billRange10kw" },
] as const;

export function CalculatorClient({ packages }: { packages: CalcPackage[] }) {
  const t = useTranslations("calculator");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const { bill, result, setBill, calculate } = useCalculatorStore();
  const [error, setError] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);

  const onCalculate = () => {
    const ok = calculate(packages);
    setError(!ok);
    if (ok) {
      setShowDetail(true);
      // Scroll after the panel has actually rendered, so the target height exists.
      requestAnimationFrame(() => {
        detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
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
    <>
    <div className="mx-auto max-w-[1140px] overflow-hidden rounded-[18px] border border-border bg-card text-left shadow-[0_18px_55px_rgba(13,71,161,0.08)]">
      <div className="grid lg:grid-cols-[1.08fr_0.92fr]">
        <div className="bg-muted p-8 sm:p-10 lg:p-[30px]">
          <h2 className="text-2xl font-bold text-primary">{t("panelTitle")}</h2>
          <p className="mt-3 text-sm text-muted-foreground">{t("panelIntro")}</p>

          <label className="mt-7 block text-sm font-bold text-foreground" htmlFor="monthly-bill">
            {t("billLabel")}
          </label>
          <div className="mt-3 flex min-h-[62px] items-center rounded-xl border border-border bg-accent px-5">
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
              className="min-w-0 flex-1 bg-transparent text-2xl font-extrabold text-primary outline-none"
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
            className="mt-5 w-full accent-primary"
          />

          <button type="button" onClick={onCalculate} className="btn-pill mt-6 w-full">
            {t("calculateDetailed")} <span aria-hidden="true">→</span>
          </button>
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
                ฿{afterBill !== null ? afterBill.toLocaleString(locale) : "0"}
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

    {showDetail && (
      <div
        ref={detailRef}
        className="mx-auto mt-6 max-w-[1140px] scroll-mt-6 rounded-[18px] border border-border bg-card p-8 sm:p-10"
      >
        <h3 className="text-xl font-bold text-primary">{t("methodologyTitle")}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{t("methodologyDesc")}</p>

        <Table className="mt-6">
          <TableHeader>
            <TableRow>
              <TableHead>{t("colBillRange")}</TableHead>
              <TableHead>{t("colSystemSize")}</TableHead>
              <TableHead>{t("colEstSaving")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {BRACKET_ROWS.map((row) => (
              <TableRow
                key={row.sizeKw}
                className={cn(displayedResult?.systemKey === row.systemKey && "bg-accent")}
              >
                <TableCell>{t(row.billRangeKey)}</TableCell>
                <TableCell className="font-semibold text-primary">{t(row.systemKey)}</TableCell>
                <TableCell>
                  ~฿{calculateTheoreticalMonthlySavingThb(row.sizeKw).toLocaleString(locale)} /{" "}
                  {t("month")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <p className="mt-4 text-xs text-muted-foreground">{t("disclaimer")}</p>
      </div>
    )}
    </>
  );
}
