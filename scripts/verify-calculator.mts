// Regression check for src/lib/calculator.ts against hand-verified values from
// docs/stuffs/คำนวณติดตั้ง.xlsx (On-Grid sheet). No test runner in this repo — see
// AGENTS.md — so this is a standalone assertion script instead of a jest/vitest suite.
// Usage: npx tsx scripts/verify-calculator.mts
import {
  BILL_THRESHOLD_3KW_TO_5KW,
  BILL_THRESHOLD_5KW_TO_10KW,
  calculateTheoreticalAnnualSavingThb,
  calculateTheoreticalMonthlySavingThb,
  recommendSystemSizeKw,
} from "../src/lib/calculator";
import { recommendSystem } from "../src/store/use-calculator-store";

let failed = false;

function assertEqual(label: string, actual: number | string | null, expected: number | string | null) {
  const ok = actual === expected;
  console.log(`${ok ? "✓" : "✗"} ${label}: got ${actual}, expected ${expected}`);
  if (!ok) failed = true;
}

console.log("=== theoretical monthly/annual saving vs. Excel rows ===");
assertEqual("monthlySaving(3kW)", calculateTheoreticalMonthlySavingThb(3), 2025);
assertEqual("monthlySaving(5kW)", calculateTheoreticalMonthlySavingThb(5), 3375);
assertEqual("monthlySaving(10kW)", calculateTheoreticalMonthlySavingThb(10), 6750);
assertEqual("annualSaving(3kW)", calculateTheoreticalAnnualSavingThb(3), 20250);
assertEqual("annualSaving(5kW)", calculateTheoreticalAnnualSavingThb(5), 33750);
assertEqual("annualSaving(10kW)", calculateTheoreticalAnnualSavingThb(10), 67500);

console.log("\n=== bill-bracket recommendation ===");
assertEqual("recommend(2999)", recommendSystemSizeKw(2999), 3);
assertEqual("recommend(3000)", recommendSystemSizeKw(BILL_THRESHOLD_3KW_TO_5KW), 5);
assertEqual("recommend(5999)", recommendSystemSizeKw(5999), 5);
assertEqual("recommend(6000)", recommendSystemSizeKw(BILL_THRESHOLD_5KW_TO_10KW), 10);
assertEqual("recommend(500, below 3kW floor)", recommendSystemSizeKw(500), 3);
assertEqual("recommend(50000)", recommendSystemSizeKw(50000), 10);

console.log("\n=== recommendSystem: capping + payback against real package prices ===");
const packages = [
  { sizeKw: 3, priceThb: 99000 },
  { sizeKw: 5, priceThb: 155000 },
  { sizeKw: 10, priceThb: 285000 },
];

const uncappedCase = recommendSystem(10000, packages); // bill well above 10kW's theoretical saving
assertEqual("uncapped(10000).systemKey", uncappedCase.systemKey, "system10kw");
assertEqual("uncapped(10000).monthlySaving", uncappedCase.monthlySaving, 6750);
assertEqual(
  "uncapped(10000).paybackYears",
  Number(uncappedCase.paybackYears?.toFixed(4)),
  Number((285000 / (6750 * 10)).toFixed(4)),
);

const cappedCase = recommendSystem(2000, packages); // bill below 3kW's own theoretical saving (2025)
assertEqual("capped(2000).monthlySaving", cappedCase.monthlySaving, 2000);
assertEqual(
  "capped(2000).paybackYears",
  Number(cappedCase.paybackYears?.toFixed(4)),
  Number((99000 / (2000 * 10)).toFixed(4)),
);

const noPackageCase = recommendSystem(3500, []); // no packages passed → payback is null
assertEqual("noPackage(3500).paybackYears", noPackageCase.paybackYears, null);

console.log(failed ? "\nFAILED — see ✗ above" : "\nAll assertions passed ✓");
process.exit(failed ? 1 : 0);
