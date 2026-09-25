// On-Grid solar sizing/savings formulas. Per-row production params (sun hours,
// days, price/kWh) live on the size table (`SizeRow`) after the Excel-import
// work — see docs/plans/calculator-excel-import-sprints.md. Hybrid (battery)
// systems are intentionally not implemented here.

import type { SizeRow } from "./calculator-size-table";

/** Admin-tunable slider / payback multiplier — not per-row production params. */
export type CalculatorParams = {
  annualSavingMonthsMultiplier: number;
  minBill: number;
  maxBill: number;
  stepBill: number;
};

/** Defaults used to seed `CalculatorConfig` and as public fallback. */
export const CALCULATOR_DEFAULTS = {
  annualSavingMonthsMultiplier: 10,
  minBill: 500,
  maxBill: 8000,
  stepBill: 100,
} satisfies CalculatorParams;

export const ANNUAL_SAVING_MONTHS_MULTIPLIER =
  CALCULATOR_DEFAULTS.annualSavingMonthsMultiplier;
export const MIN_BILL = CALCULATOR_DEFAULTS.minBill;
export const MAX_BILL = CALCULATOR_DEFAULTS.maxBill;
export const STEP_BILL = CALCULATOR_DEFAULTS.stepBill;

/** Legacy On-Grid sheet constants (3/5/10 kW rows all used these). Kept for
 * theoretical helpers / verify scripts — live recommendations use SizeRow. */
const LEGACY_SUN_HOURS_PER_DAY = 5;
const LEGACY_DAYS_PER_MONTH = 30;
const LEGACY_PRICE_PER_KWH_THB = 4.5;

export function resolveCalculatorParams(
  partial?: Partial<CalculatorParams> | null
): CalculatorParams {
  return { ...CALCULATOR_DEFAULTS, ...partial };
}

export function calculateTheoreticalMonthlySavingThb(sizeKw: number): number {
  return sizeKw * LEGACY_SUN_HOURS_PER_DAY * LEGACY_DAYS_PER_MONTH * LEGACY_PRICE_PER_KWH_THB;
}

export function calculateTheoreticalAnnualSavingThb(
  sizeKw: number,
  multiplier: number = CALCULATOR_DEFAULTS.annualSavingMonthsMultiplier
): number {
  return calculateTheoreticalMonthlySavingThb(sizeKw) * multiplier;
}

export type CalcPackage = {
  sizeKw: number;
  priceThb: number;
};

export type SizeTableRecommendation =
  | { kind: "empty" }
  | { kind: "tooLarge"; lastRow: SizeRow }
  | {
      kind: "ok";
      row: SizeRow;
      /** bill is below the first row's billMin — still recommends the first row. */
      belowFirstRow: boolean;
      monthlySaving: number;
      afterBill: number;
      /** The row's theoretical monthly saving already covers the whole bill. */
      coversFullBill: boolean;
      kwhPerMonth: number;
      paybackYears: number | null;
    };

/**
 * Recommends a system size from a size table (#146): the smallest row whose
 * `billMax` exceeds the bill; a bill at or past the last row's `billMax` is
 * `tooLarge`; a bill below the first row's `billMin` still gets the first
 * row, flagged `belowFirstRow`. Payback only applies when a Package exists
 * for the exact matched `kw`.
 */
export function recommendFromTable(
  bill: number,
  table: SizeRow[],
  packages: CalcPackage[] = [],
  multiplier: number = CALCULATOR_DEFAULTS.annualSavingMonthsMultiplier
): SizeTableRecommendation {
  if (table.length === 0 || !Number.isFinite(bill) || bill <= 0) return { kind: "empty" };

  const lastRow = table[table.length - 1];
  if (bill >= lastRow.billMax) {
    return { kind: "tooLarge", lastRow };
  }

  const row = table.find((candidate) => candidate.billMax > bill) ?? lastRow;

  const theoreticalMonthlySaving = row.kw * row.sunHours * row.days * row.pricePerKwh;
  const monthlySaving = Math.min(theoreticalMonthlySaving, bill);
  const afterBill = bill - monthlySaving;
  const coversFullBill = theoreticalMonthlySaving >= bill;
  const kwhPerMonth = row.kw * row.sunHours * row.days;
  const belowFirstRow = bill < table[0].billMin;

  const matchedPackage = packages.find((pkg) => pkg.sizeKw === row.kw);
  const paybackYears =
    matchedPackage && monthlySaving > 0
      ? matchedPackage.priceThb / (monthlySaving * multiplier)
      : null;

  return {
    kind: "ok",
    row,
    belowFirstRow,
    monthlySaving,
    afterBill,
    coversFullBill,
    kwhPerMonth,
    paybackYears,
  };
}
