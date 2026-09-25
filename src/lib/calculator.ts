// On-Grid solar sizing/savings formulas, extracted from docs/stuffs/คำนวณติดตั้ง.xlsx
// (the sales team's real installation-planning spreadsheet). Hybrid (battery) systems
// are a separate sheet in that file and are intentionally not implemented here — the
// calculator UI has no battery-size input and no Hybrid packages exist in the catalog.

import type { SizeRow } from "./calculator-size-table";

export type CalculatorParams = {
  sunHoursPerDay: number;
  daysPerMonth: number;
  pricePerKwhThb: number;
  annualSavingMonthsMultiplier: number;
  minBill: number;
  maxBill: number;
  stepBill: number;
  billThreshold3To5Kw: number;
  billThreshold5To10Kw: number;
};

/** Excel / On-Grid sheet defaults — also used to seed `CalculatorConfig`. */
export const CALCULATOR_DEFAULTS = {
  sunHoursPerDay: 5,
  daysPerMonth: 30,
  pricePerKwhThb: 4.5,
  annualSavingMonthsMultiplier: 10,
  minBill: 500,
  maxBill: 8000,
  stepBill: 100,
  billThreshold3To5Kw: 3000,
  billThreshold5To10Kw: 6000,
} satisfies CalculatorParams;

// Legacy named exports — verify-calculator.mts and tier-marker tests use these.
export const SUN_HOURS_PER_DAY = CALCULATOR_DEFAULTS.sunHoursPerDay;
export const DAYS_PER_MONTH = CALCULATOR_DEFAULTS.daysPerMonth;
export const PRICE_PER_KWH_THB = CALCULATOR_DEFAULTS.pricePerKwhThb;
export const ANNUAL_SAVING_MONTHS_MULTIPLIER =
  CALCULATOR_DEFAULTS.annualSavingMonthsMultiplier;
export const MIN_BILL = CALCULATOR_DEFAULTS.minBill;
export const MAX_BILL = CALCULATOR_DEFAULTS.maxBill;
export const STEP_BILL = CALCULATOR_DEFAULTS.stepBill;
export const BILL_THRESHOLD_3KW_TO_5KW = CALCULATOR_DEFAULTS.billThreshold3To5Kw;
export const BILL_THRESHOLD_5KW_TO_10KW = CALCULATOR_DEFAULTS.billThreshold5To10Kw;

export function resolveCalculatorParams(
  partial?: Partial<CalculatorParams> | null
): CalculatorParams {
  return { ...CALCULATOR_DEFAULTS, ...partial };
}

export function calculateTheoreticalMonthlySavingThb(
  sizeKw: number,
  params: CalculatorParams = CALCULATOR_DEFAULTS
): number {
  const dailyProductionKwh = sizeKw * params.sunHoursPerDay;
  const monthlyProductionKwh = dailyProductionKwh * params.daysPerMonth;
  return monthlyProductionKwh * params.pricePerKwhThb;
}

export function calculateTheoreticalAnnualSavingThb(
  sizeKw: number,
  params: CalculatorParams = CALCULATOR_DEFAULTS
): number {
  return (
    calculateTheoreticalMonthlySavingThb(sizeKw, params) *
    params.annualSavingMonthsMultiplier
  );
}

export function recommendSystemSizeKw(
  bill: number,
  params: CalculatorParams = CALCULATOR_DEFAULTS
): 3 | 5 | 10 {
  if (bill < params.billThreshold3To5Kw) return 3;
  if (bill < params.billThreshold5To10Kw) return 5;
  return 10;
}

export type CalcPackage = {
  sizeKw: number;
  priceThb: number;
};

export type CalcResult = {
  systemKey: "system3kw" | "system5kw" | "system10kw";
  /** Capped at the customer's bill — never more than they currently pay. */
  monthlySaving: number;
  /** What's left of the bill after that saving. */
  afterBill: number;
  paybackYears: number | null;
};

const SYSTEM_KEY_BY_SIZE_KW: Record<number, CalcResult["systemKey"]> = {
  3: "system3kw",
  5: "system5kw",
  10: "system10kw",
};

/**
 * Everything the calculator UI shows for one bill, from the raw input string
 * the field holds. Returns null when the input isn't a bill we can answer for
 * (blank, non-numeric, zero or negative) — the caller shows nothing rather
 * than deciding what "valid" means itself.
 */
export function calculateSavings(
  billInput: string,
  packages: CalcPackage[] = [],
  params: CalculatorParams = CALCULATOR_DEFAULTS
): CalcResult | null {
  const bill = Number(billInput);
  if (billInput.trim() === "" || !Number.isFinite(bill) || bill <= 0) return null;

  const sizeKw = recommendSystemSizeKw(bill, params);

  const theoreticalMonthlySaving = calculateTheoreticalMonthlySavingThb(sizeKw, params);
  const monthlySaving = Math.min(theoreticalMonthlySaving, bill);
  const afterBill = bill - monthlySaving;

  const matchedPackage = packages.find((pkg) => pkg.sizeKw === sizeKw);
  const paybackYears =
    matchedPackage && monthlySaving > 0
      ? matchedPackage.priceThb /
        (monthlySaving * params.annualSavingMonthsMultiplier)
      : null;

  return {
    systemKey: SYSTEM_KEY_BY_SIZE_KW[sizeKw],
    monthlySaving,
    afterBill,
    paybackYears,
  };
}

// --- Size-table-based recommendation (see #146, calculator-size-table.ts) ---
// Additive: nothing above this point is changed by, or aware of, the code
// below. Not called from any route/action/UI yet — see
// docs/plans/calculator-excel-import-sprints.md S1.

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
  // Same "not a bill we can answer for" cases as calculateSavings (NaN, zero, negative).
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
