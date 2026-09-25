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
  recommendFromTable,
  recommendSystemSizeKw,
} from "../src/lib/calculator";
import {
  DEFAULT_SIZE_TABLE,
  resolveSizeTable,
  type SizeRow,
} from "../src/lib/calculator-size-table";

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

// === S1: recommendFromTable(DEFAULT_SIZE_TABLE) must equal calculateSavings ===
// #150: "default table ให้ผลเท่ากับ calculateSavings เดิมทุก 100 ฿ ในช่วง 500–8,000".
// This is the equality proof that lets S1's new lib exist alongside the
// legacy tier code with zero risk to the live public calculator.
console.log("\n=== equality sweep: recommendFromTable(DEFAULT_SIZE_TABLE) vs calculateSavings (500-8,000 step 100) ===");
let sweepChecked = 0;
for (let bill = MIN_BILL; bill <= MAX_BILL; bill += STEP_BILL) {
  const legacy = calculateSavings(String(bill), packages, defaults)!;
  const viaTable = recommendFromTable(bill, DEFAULT_SIZE_TABLE, packages, defaults.annualSavingMonthsMultiplier);

  if (viaTable.kind !== "ok") {
    assert(`bill ${bill}: recommendFromTable returns "ok"`, false);
    continue;
  }

  assertEqual(`bill ${bill}: size (kW)`, viaTable.row.kw, Number(legacy.systemKey.replace(/^system|kw$/g, "")));
  assertEqual(`bill ${bill}: monthlySaving`, viaTable.monthlySaving, legacy.monthlySaving);
  assertEqual(`bill ${bill}: afterBill`, viaTable.afterBill, legacy.afterBill);
  assertEqual(
    `bill ${bill}: paybackYears`,
    viaTable.paybackYears === null ? null : Number(viaTable.paybackYears.toFixed(6)),
    legacy.paybackYears === null ? null : Number(legacy.paybackYears.toFixed(6))
  );
  sweepChecked += 1;
}
assert(`equality sweep covered all 76 points (${sweepChecked}/76)`, sweepChecked === 76);

// === S1: table-driven recommendation rule (#146) on a synthetic multi-size table ===
console.log("\n=== recommendFromTable: rule coverage on a synthetic (import-shaped) table ===");
const ruleTestTable: SizeRow[] = [
  { kw: 3, phases: [1], sunHours: 5, days: 30, pricePerKwh: 4.5, panels: 6, roofM2: 16.2, billMin: 2000, billMax: 3000 },
  { kw: 5, phases: [1, 3], sunHours: 5, days: 30, pricePerKwh: 4.5, panels: 10, roofM2: 27, billMin: 3000, billMax: 6000 },
  { kw: 10, phases: [1, 3], sunHours: 5, days: 30, pricePerKwh: 4.5, panels: 18, roofM2: 48.6, billMin: 6000, billMax: 10000 },
  { kw: 40, phases: [3], sunHours: 5, days: 30, pricePerKwh: 4.5, panels: 72, roofM2: 194.4, billMin: 10000, billMax: 30000 },
  { kw: 115, phases: [3], sunHours: 5, days: 30, pricePerKwh: 4.5, panels: 207, roofM2: 558.9, billMin: 30000, billMax: 150000 },
];
const ruleTestPackages = [
  { sizeKw: 3, priceThb: 99000 },
  { sizeKw: 5, priceThb: 155000 },
  { sizeKw: 10, priceThb: 285000 },
  { sizeKw: 40, priceThb: 900000 },
  // no Package at 115 kW — exercises "no matching Package → payback null"
];

const r2500 = recommendFromTable(2500, ruleTestTable, ruleTestPackages, 10);
assert("2,500 -> 3 kW", r2500.kind === "ok" && r2500.row.kw === 3);

const r3000 = recommendFromTable(3000, ruleTestTable, ruleTestPackages, 10);
assert("3,000 -> 5 kW (billMax boundary is exclusive)", r3000.kind === "ok" && r3000.row.kw === 5);

const r25500 = recommendFromTable(25500, ruleTestTable, ruleTestPackages, 10);
assert(
  "25,500 -> 40 kW, coversFullBill",
  r25500.kind === "ok" && r25500.row.kw === 40 && r25500.coversFullBill === true
);

const r110000 = recommendFromTable(110000, ruleTestTable, ruleTestPackages, 10);
assert(
  "110,000 -> 115 kW, no Package at that size -> paybackYears null",
  r110000.kind === "ok" && r110000.row.kw === 115 && r110000.paybackYears === null
);

const r1500 = recommendFromTable(1500, ruleTestTable, ruleTestPackages, 10);
assert(
  "1,500 (below first row's billMin) -> belowFirstRow, still 3 kW",
  r1500.kind === "ok" && r1500.row.kw === 3 && r1500.belowFirstRow === true
);

const rTooLarge = recommendFromTable(150000, ruleTestTable, ruleTestPackages, 10);
assert("150,000 (>= last row's billMax) -> tooLarge", rTooLarge.kind === "tooLarge" && rTooLarge.lastRow.kw === 115);

const rEmpty = recommendFromTable(3000, [], ruleTestPackages, 10);
assert("empty table -> empty", rEmpty.kind === "empty");
for (const bad of [Number.NaN, 0, -500]) {
  assert(`invalid bill ${bad} -> empty`, recommendFromTable(bad, ruleTestTable, ruleTestPackages, 10).kind === "empty");
}

// === S1: resolveSizeTable falls back to the legacy default on bad JSON ===
console.log("\n=== resolveSizeTable: falls back to DEFAULT_SIZE_TABLE on missing/invalid JSON ===");
const originalConsoleError = console.error;
console.error = () => {}; // resolveSizeTable logs on the invalid-JSON path by design; keep output clean

const nullResult = resolveSizeTable(null);
assert("resolveSizeTable(null) -> default", nullResult.source === "default" && nullResult.table === DEFAULT_SIZE_TABLE);

const garbageResult = resolveSizeTable({ not: "a size table" });
assert("resolveSizeTable(garbage object) -> default", garbageResult.source === "default");

const duplicateKwResult = resolveSizeTable([
  { kw: 3, phases: [1], sunHours: 5, days: 30, pricePerKwh: 4.5, panels: 6, roofM2: 16.2, billMin: 2000, billMax: 3000 },
  { kw: 3, phases: [1], sunHours: 5, days: 30, pricePerKwh: 4.5, panels: 6, roofM2: 16.2, billMin: 3000, billMax: 6000 },
]);
assert("resolveSizeTable(duplicate kw) -> default", duplicateKwResult.source === "default");

const nonIncreasingBillMaxResult = resolveSizeTable([
  { kw: 3, phases: [1], sunHours: 5, days: 30, pricePerKwh: 4.5, panels: 6, roofM2: 16.2, billMin: 2000, billMax: 6000 },
  { kw: 5, phases: [1, 3], sunHours: 5, days: 30, pricePerKwh: 4.5, panels: 10, roofM2: 27, billMin: 3000, billMax: 6000 },
]);
assert("resolveSizeTable(non-increasing billMax) -> default", nonIncreasingBillMaxResult.source === "default");

const validResult = resolveSizeTable(DEFAULT_SIZE_TABLE);
assert("resolveSizeTable(valid table) -> import", validResult.source === "import" && validResult.table.length === 3);

console.error = originalConsoleError;

// === S0 baseline: the 7 bills recorded live on prod 2026-09-25/26 (see docs/plans/calculator-excel-import-sprints.md S0) ===
console.log("\n=== S0 baseline: recommendFromTable(DEFAULT_SIZE_TABLE) matches the 7 recorded prod bills ===");
const s0Baseline: { bill: number; kw: number; afterBill: number; monthlySaving: number; paybackYears: number }[] = [
  { bill: 500, kw: 3, afterBill: 0, monthlySaving: 500, paybackYears: 19.8 },
  { bill: 2500, kw: 3, afterBill: 475, monthlySaving: 2025, paybackYears: 4.9 },
  { bill: 2999, kw: 3, afterBill: 974, monthlySaving: 2025, paybackYears: 4.9 },
  { bill: 3000, kw: 5, afterBill: 0, monthlySaving: 3000, paybackYears: 5.2 },
  { bill: 5999, kw: 5, afterBill: 2624, monthlySaving: 3375, paybackYears: 4.6 },
  { bill: 6000, kw: 10, afterBill: 0, monthlySaving: 6000, paybackYears: 4.8 },
  { bill: 8000, kw: 10, afterBill: 1250, monthlySaving: 6750, paybackYears: 4.2 },
];
for (const expected of s0Baseline) {
  const result = recommendFromTable(expected.bill, DEFAULT_SIZE_TABLE, packages, defaults.annualSavingMonthsMultiplier);
  if (result.kind !== "ok") {
    assert(`S0 baseline bill ${expected.bill}: recommendFromTable returns "ok"`, false);
    continue;
  }
  assertEqual(`S0 baseline bill ${expected.bill}: kW`, result.row.kw, expected.kw);
  assertEqual(`S0 baseline bill ${expected.bill}: afterBill`, result.afterBill, expected.afterBill);
  assertEqual(`S0 baseline bill ${expected.bill}: monthlySaving`, result.monthlySaving, expected.monthlySaving);
  assertEqual(
    `S0 baseline bill ${expected.bill}: paybackYears (rounded to 1 decimal)`,
    result.paybackYears === null ? null : Number(result.paybackYears.toFixed(1)),
    expected.paybackYears
  );
}

console.log(failed ? "\nFAILED — see ✗ above" : "\nAll assertions passed ✓");
process.exit(failed ? 1 : 0);
