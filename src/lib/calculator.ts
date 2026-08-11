// On-Grid solar sizing/savings formulas, extracted from docs/stuffs/คำนวณติดตั้ง.xlsx
// (the sales team's real installation-planning spreadsheet). Hybrid (battery) systems
// are a separate sheet in that file and are intentionally not implemented here — the
// calculator UI has no battery-size input and no Hybrid packages exist in the catalog.

// Peak sun hours per day — constant across every row of the On-Grid sheet.
export const SUN_HOURS_PER_DAY = 5;

// Days per month used for monthly production — constant across every row.
export const DAYS_PER_MONTH = 30;

// Electricity price per kWh unit — constant across every row for the 3/5/10kW sizes
// this calculator recommends (a higher rate appears only on much larger, out-of-scope
// rows in the sheet).
export const PRICE_PER_KWH_THB = 4.5;

// Annual saving = monthly saving x 10, not calendar 12 — this is the sheet's own
// convention (confirmed with the business: no further reasoning beyond "that's the
// number we use"), presumably a conservative buffer for lower-output months.
export const ANNUAL_SAVING_MONTHS_MULTIPLIER = 10;

// The bill range the calculator answers for: the slider's ends, and the bounds
// the number input accepts. Both tier thresholds must sit strictly inside this
// range or the tier markers render off the track — asserted in
// scripts/verify-calculator.mts.
export const MIN_BILL = 500;
export const MAX_BILL = 8000;
export const STEP_BILL = 100;

// Theoretical monthly saving if the system's full production offset electricity
// otherwise bought at PRICE_PER_KWH_THB. Not capped to any particular bill —
// calculateSavings() below applies the cap against the customer's actual bill.
export function calculateTheoreticalMonthlySavingThb(sizeKw: number): number {
  const dailyProductionKwh = sizeKw * SUN_HOURS_PER_DAY;
  const monthlyProductionKwh = dailyProductionKwh * DAYS_PER_MONTH;
  return monthlyProductionKwh * PRICE_PER_KWH_THB;
}

export function calculateTheoreticalAnnualSavingThb(sizeKw: number): number {
  return calculateTheoreticalMonthlySavingThb(sizeKw) * ANNUAL_SAVING_MONTHS_MULTIPLIER;
}

// Bill-bracket boundaries for recommending a system size, derived from the sheet's own
// "ค่าไฟประมาณ" (estimated bill) range per row. The sheet's 3kW row (2,000-3,000) and
// 5kW row (3,000-4,000) meet exactly at 3,000 — no gap there. But only 3kW/5kW/10kW are
// real sellable packages, and the sheet's 5kW row (up to 4,000) and 10kW row (from
// 8,000) leave a gap with no package in it; BILL_THRESHOLD_5KW_TO_10KW fills that gap
// with its midpoint since no package exists to anchor a better boundary.
export const BILL_THRESHOLD_3KW_TO_5KW = 3000;
export const BILL_THRESHOLD_5KW_TO_10KW = 6000;

// Below the 3kW row's own floor (2,000), there is still no cheaper package to
// recommend, so every bill under BILL_THRESHOLD_3KW_TO_5KW maps to 3kW.
export function recommendSystemSizeKw(bill: number): 3 | 5 | 10 {
  if (bill < BILL_THRESHOLD_3KW_TO_5KW) return 3;
  if (bill < BILL_THRESHOLD_5KW_TO_10KW) return 5;
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
  packages: CalcPackage[] = []
): CalcResult | null {
  const bill = Number(billInput);
  if (billInput.trim() === "" || !Number.isFinite(bill) || bill <= 0) return null;

  const sizeKw = recommendSystemSizeKw(bill);

  // Cap the displayed saving at the customer's actual bill — a system whose
  // theoretical production exceeds what they currently pay shouldn't show a
  // "saving" larger than the bill itself. afterBill is the same fact from the
  // other side, which is why the two live together: the cap is what keeps it
  // from going negative.
  const theoreticalMonthlySaving = calculateTheoreticalMonthlySavingThb(sizeKw);
  const monthlySaving = Math.min(theoreticalMonthlySaving, bill);
  const afterBill = bill - monthlySaving;

  const matchedPackage = packages.find((pkg) => pkg.sizeKw === sizeKw);
  const paybackYears =
    matchedPackage && monthlySaving > 0
      ? matchedPackage.priceThb / (monthlySaving * ANNUAL_SAVING_MONTHS_MULTIPLIER)
      : null;

  return {
    systemKey: SYSTEM_KEY_BY_SIZE_KW[sizeKw],
    monthlySaving,
    afterBill,
    paybackYears,
  };
}
