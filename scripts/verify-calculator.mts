// Regression check for src/lib/calculator.ts against hand-verified values from
// docs/stuffs/คำนวณติดตั้ง.xlsx (On-Grid sheet). No test runner in this repo — see
// AGENTS.md — so this is a standalone assertion script instead of a jest/vitest suite.
// Usage: npx tsx scripts/verify-calculator.mts
import {
  BILL_THRESHOLD_3KW_TO_5KW,
  BILL_THRESHOLD_5KW_TO_10KW,
  CALCULATOR_DEFAULTS,
  MAX_BILL,
  MIN_BILL,
  STEP_BILL,
  calculateSavings,
  calculateTheoreticalAnnualSavingThb,
  calculateTheoreticalMonthlySavingThb,
  recommendSystemSizeKw,
} from "../src/lib/calculator";

const defaults = CALCULATOR_DEFAULTS;

let failed = false;

function assertEqual(label: string, actual: number | string | null, expected: number | string | null) {
  const ok = actual === expected;
  console.log(`${ok ? "✓" : "✗"} ${label}: got ${actual}, expected ${expected}`);
  if (!ok) failed = true;
}

function assert(label: string, ok: boolean) {
  console.log(`${ok ? "✓" : "✗"} ${label}`);
  if (!ok) failed = true;
}

console.log("=== theoretical monthly/annual saving vs. Excel rows ===");
assertEqual("monthlySaving(3kW)", calculateTheoreticalMonthlySavingThb(3, defaults), 2025);
assertEqual("monthlySaving(5kW)", calculateTheoreticalMonthlySavingThb(5, defaults), 3375);
assertEqual("monthlySaving(10kW)", calculateTheoreticalMonthlySavingThb(10, defaults), 6750);
assertEqual("annualSaving(3kW)", calculateTheoreticalAnnualSavingThb(3, defaults), 20250);
assertEqual("annualSaving(5kW)", calculateTheoreticalAnnualSavingThb(5, defaults), 33750);
assertEqual("annualSaving(10kW)", calculateTheoreticalAnnualSavingThb(10, defaults), 67500);

console.log("\n=== bill-bracket recommendation ===");
assertEqual("recommend(2999)", recommendSystemSizeKw(2999, defaults), 3);
assertEqual("recommend(3000)", recommendSystemSizeKw(BILL_THRESHOLD_3KW_TO_5KW, defaults), 5);
assertEqual("recommend(5999)", recommendSystemSizeKw(5999, defaults), 5);
assertEqual("recommend(6000)", recommendSystemSizeKw(BILL_THRESHOLD_5KW_TO_10KW, defaults), 10);
assertEqual("recommend(500, below 3kW floor)", recommendSystemSizeKw(500, defaults), 3);
assertEqual("recommend(50000)", recommendSystemSizeKw(50000, defaults), 10);

console.log("\n=== calculateSavings: capping + payback against real package prices ===");
const packages = [
  { sizeKw: 3, priceThb: 99000 },
  { sizeKw: 5, priceThb: 155000 },
  { sizeKw: 10, priceThb: 285000 },
];

const uncappedCase = calculateSavings("10000", packages, defaults)!;
assertEqual("uncapped(10000).systemKey", uncappedCase.systemKey, "system10kw");
assertEqual("uncapped(10000).monthlySaving", uncappedCase.monthlySaving, 6750);
assertEqual(
  "uncapped(10000).paybackYears",
  Number(uncappedCase.paybackYears?.toFixed(4)),
  Number((285000 / (6750 * 10)).toFixed(4)),
);

const cappedCase = calculateSavings("2000", packages, defaults)!;
assertEqual("capped(2000).monthlySaving", cappedCase.monthlySaving, 2000);
assertEqual(
  "capped(2000).paybackYears",
  Number(cappedCase.paybackYears?.toFixed(4)),
  Number((99000 / (2000 * 10)).toFixed(4)),
);

const noPackageCase = calculateSavings("3500", [], defaults)!;
assertEqual("noPackage(3500).paybackYears", noPackageCase.paybackYears, null);

console.log("\n=== afterBill: the figure the customer actually reads ===");
// Previously computed in the component with a Math.max(..., 0) guard; it lives
// here now, next to the cap that is the reason it can't go negative.
assertEqual("uncapped(10000).afterBill", uncappedCase.afterBill, 10000 - 6750);
assertEqual("capped(2000).afterBill is zero, not negative", cappedCase.afterBill, 0);
assertEqual("mid-range(3500).afterBill", calculateSavings("3500", packages, defaults)!.afterBill, 3500 - 3375);
for (const bill of [MIN_BILL, 1000, 2999, 3000, 5999, 6000, MAX_BILL]) {
  const result = calculateSavings(String(bill), packages, defaults)!;
  assert(
    `afterBill(${bill}) is between 0 and the bill`,
    result.afterBill >= 0 && result.afterBill <= bill
  );
}

console.log("\n=== unusable input yields no result rather than a wrong one ===");
for (const input of ["", "   ", "abc", "0", "-500", "NaN"]) {
  assert(`calculateSavings(${JSON.stringify(input)}) === null`, calculateSavings(input, packages, defaults) === null);
}
assert('calculateSavings("3500") is not null', calculateSavings("3500", packages, defaults) !== null);

console.log("\n=== slider range and tier thresholds agree ===");
// The tier markers are positioned as a percentage of [MIN_BILL, MAX_BILL]; a
// threshold outside that range would render off the track, and out-of-order
// thresholds would draw the zones wrong.
assert("MIN_BILL < MAX_BILL", MIN_BILL < MAX_BILL);
assert(
  "3kW→5kW threshold sits inside the slider range",
  BILL_THRESHOLD_3KW_TO_5KW > MIN_BILL && BILL_THRESHOLD_3KW_TO_5KW < MAX_BILL
);
assert(
  "5kW→10kW threshold sits inside the slider range",
  BILL_THRESHOLD_5KW_TO_10KW > MIN_BILL && BILL_THRESHOLD_5KW_TO_10KW < MAX_BILL
);
assert(
  "thresholds are in ascending order",
  BILL_THRESHOLD_3KW_TO_5KW < BILL_THRESHOLD_5KW_TO_10KW
);
assert("every tier is reachable from the slider", MAX_BILL >= BILL_THRESHOLD_5KW_TO_10KW + STEP_BILL);

console.log(failed ? "\nFAILED — see ✗ above" : "\nAll assertions passed ✓");
process.exit(failed ? 1 : 0);
