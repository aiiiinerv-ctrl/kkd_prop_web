// Regression check for src/lib/calculator.ts against hand-verified values from
// docs/stuffs/คำนวณติดตั้ง.xlsx (On-Grid sheet). No test runner in this repo — see
// AGENTS.md — so this is a standalone assertion script instead of a jest/vitest suite.
// Usage: npx tsx scripts/verify-calculator.mts
import {
  CALCULATOR_DEFAULTS,
  MAX_BILL,
  MIN_BILL,
  STEP_BILL,
  calculateTheoreticalAnnualSavingThb,
  calculateTheoreticalMonthlySavingThb,
  recommendFromTable,
  type CalcPackage,
} from "../src/lib/calculator";
import {
  hybridMonthlySaving,
  hybridTableSchema,
  recommendHybrid,
  usablePrices,
  type HybridRow,
} from "../src/lib/calculator-hybrid";
import { toPublicHybridTable } from "../src/lib/calculator-hybrid-projection";
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

// Inline copy of the pre-S8 tiered calculator (threshold 3000/6000 +
// kW×5×30×4.5 capped at bill). Kept here so the equality sweep still proves
// DEFAULT_SIZE_TABLE matches the old public behaviour after calculateSavings
// was removed from src/ (S8 Default #3).
function legacyReference(
  billInput: string,
  packages: CalcPackage[],
  multiplier: number = defaults.annualSavingMonthsMultiplier
): {
  sizeKw: 3 | 5 | 10;
  monthlySaving: number;
  afterBill: number;
  paybackYears: number | null;
} | null {
  const bill = Number(billInput);
  if (billInput.trim() === "" || !Number.isFinite(bill) || bill <= 0) return null;

  const sizeKw: 3 | 5 | 10 = bill < 3000 ? 3 : bill < 6000 ? 5 : 10;
  const theoreticalMonthlySaving = sizeKw * 5 * 30 * 4.5;
  const monthlySaving = Math.min(theoreticalMonthlySaving, bill);
  const afterBill = bill - monthlySaving;
  const matchedPackage = packages.find((pkg) => pkg.sizeKw === sizeKw);
  const paybackYears =
    matchedPackage && monthlySaving > 0
      ? matchedPackage.priceThb / (monthlySaving * multiplier)
      : null;

  return { sizeKw, monthlySaving, afterBill, paybackYears };
}

console.log("=== theoretical monthly/annual saving vs. Excel rows ===");
assertEqual("monthlySaving(3kW)", calculateTheoreticalMonthlySavingThb(3), 2025);
assertEqual("monthlySaving(5kW)", calculateTheoreticalMonthlySavingThb(5), 3375);
assertEqual("monthlySaving(10kW)", calculateTheoreticalMonthlySavingThb(10), 6750);
assertEqual("annualSaving(3kW)", calculateTheoreticalAnnualSavingThb(3), 20250);
assertEqual("annualSaving(5kW)", calculateTheoreticalAnnualSavingThb(5), 33750);
assertEqual("annualSaving(10kW)", calculateTheoreticalAnnualSavingThb(10), 67500);

console.log("\n=== legacyReference: bill-bracket recommendation ===");
assertEqual("recommend(2999)", legacyReference("2999", [])!.sizeKw, 3);
assertEqual("recommend(3000)", legacyReference("3000", [])!.sizeKw, 5);
assertEqual("recommend(5999)", legacyReference("5999", [])!.sizeKw, 5);
assertEqual("recommend(6000)", legacyReference("6000", [])!.sizeKw, 10);
assertEqual("recommend(500, below 3kW floor)", legacyReference("500", [])!.sizeKw, 3);
assertEqual("recommend(50000)", legacyReference("50000", [])!.sizeKw, 10);

console.log("\n=== legacyReference: capping + payback against real package prices ===");
const packages: CalcPackage[] = [
  { sizeKw: 3, priceThb: 99000 },
  { sizeKw: 5, priceThb: 155000 },
  { sizeKw: 10, priceThb: 285000 },
];

const uncappedCase = legacyReference("10000", packages)!;
assertEqual("uncapped(10000).sizeKw", uncappedCase.sizeKw, 10);
assertEqual("uncapped(10000).monthlySaving", uncappedCase.monthlySaving, 6750);
assertEqual(
  "uncapped(10000).paybackYears",
  Number(uncappedCase.paybackYears?.toFixed(4)),
  Number((285000 / (6750 * 10)).toFixed(4)),
);

const cappedCase = legacyReference("2000", packages)!;
assertEqual("capped(2000).monthlySaving", cappedCase.monthlySaving, 2000);
assertEqual(
  "capped(2000).paybackYears",
  Number(cappedCase.paybackYears?.toFixed(4)),
  Number((99000 / (2000 * 10)).toFixed(4)),
);

const noPackageCase = legacyReference("3500", [])!;
assertEqual("noPackage(3500).paybackYears", noPackageCase.paybackYears, null);

console.log("\n=== afterBill: the figure the customer actually reads ===");
assertEqual("uncapped(10000).afterBill", uncappedCase.afterBill, 10000 - 6750);
assertEqual("capped(2000).afterBill is zero, not negative", cappedCase.afterBill, 0);
assertEqual("mid-range(3500).afterBill", legacyReference("3500", packages)!.afterBill, 3500 - 3375);
for (const bill of [MIN_BILL, 1000, 2999, 3000, 5999, 6000, MAX_BILL]) {
  const result = legacyReference(String(bill), packages)!;
  assert(
    `afterBill(${bill}) is between 0 and the bill`,
    result.afterBill >= 0 && result.afterBill <= bill
  );
}

console.log("\n=== unusable input yields no result rather than a wrong one ===");
for (const input of ["", "   ", "abc", "0", "-500", "NaN"]) {
  assert(`legacyReference(${JSON.stringify(input)}) === null`, legacyReference(input, packages) === null);
}
assert('legacyReference("3500") is not null', legacyReference("3500", packages) !== null);

console.log("\n=== slider range agrees with legacy thresholds (historical check) ===");
assert("MIN_BILL < MAX_BILL", MIN_BILL < MAX_BILL);
assert("legacy 3→5 threshold (3000) sits inside the slider range", 3000 > MIN_BILL && 3000 < MAX_BILL);
assert("legacy 5→10 threshold (6000) sits inside the slider range", 6000 > MIN_BILL && 6000 < MAX_BILL);
assert("every legacy tier is reachable from the slider", MAX_BILL >= 6000 + STEP_BILL);

// === equality: recommendFromTable(DEFAULT_SIZE_TABLE) must equal legacyReference ===
console.log("\n=== equality sweep: recommendFromTable(DEFAULT_SIZE_TABLE) vs legacyReference (500-8,000 step 100) ===");
let sweepChecked = 0;
for (let bill = MIN_BILL; bill <= MAX_BILL; bill += STEP_BILL) {
  const legacy = legacyReference(String(bill), packages)!;
  const viaTable = recommendFromTable(bill, DEFAULT_SIZE_TABLE, packages, defaults.annualSavingMonthsMultiplier);

  if (viaTable.kind !== "ok") {
    assert(`bill ${bill}: recommendFromTable returns "ok"`, false);
    continue;
  }

  assertEqual(`bill ${bill}: size (kW)`, viaTable.row.kw, legacy.sizeKw);
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

console.log("\n=== resolveSizeTable: falls back to DEFAULT_SIZE_TABLE on missing/invalid JSON ===");
const originalConsoleError = console.error;
console.error = () => {};

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

console.log("\n=== R2-S1 Hybrid: usable price, projection, recommendHybrid (synthetic BrandA…E table) ===");
const BRANDS = ["BrandA", "BrandB", "BrandC", "BrandD", "BrandE"];
function hybridRow(
  kw: number,
  phase: 1 | 3,
  batteryKwh: number,
  prices: (number | null)[],
  shared: { panels: number; roofM2: number; billMin: number; billMax: number }
): HybridRow {
  return {
    kw,
    phase,
    batteryKwh,
    sunHours: 5,
    days: 30,
    pricePerKwh: 4.5,
    ...shared,
    brandPrices: BRANDS.map((brand, i) => ({ brand, priceThb: prices[i] ?? null })),
  };
}
const SH5 = { panels: 10, roofM2: 27, billMin: 3000, billMax: 6000 };
const SH10 = { panels: 18, roofM2: 48.6, billMin: 6000, billMax: 10000 };
const SH20 = { panels: 36, roofM2: 97.2, billMin: 10000, billMax: 20000 };
const hybridRows: HybridRow[] = [
  // 5 kW, 1φ only. 5 kWh: only a battery-only price exists (E4 -> no usable price).
  hybridRow(5, 1, 0, [150000, 0, null, null, null], SH5),
  hybridRow(5, 1, 5, [null, 41000, null, null, null], SH5),
  // 10 kW 1φ: B is cheapest with a base. C/E 16 kWh prices are battery-only (E3).
  hybridRow(10, 1, 0, [300000, 296000, 0, 310000, null], SH10),
  hybridRow(10, 1, 8, [339000, 332000, 45000, 349000, 46000], SH10),
  hybridRow(10, 1, 16, [362000, 356000, 61000, 371000, 62000], SH10),
  hybridRow(10, 1, 32, [null, null, 120000, null, 125000], SH10),
  // 10 kW 3φ: dearer for 16 kWh, cheaper for 8 kWh.
  hybridRow(10, 3, 0, [320000, 318000, null, 330000, null], SH10),
  hybridRow(10, 3, 8, [350000, 329000, null, 360000, null], SH10),
  hybridRow(10, 3, 16, [383000, 375000, null, 391000, null], SH10),
  // 20 kW 3φ only.
  hybridRow(20, 3, 0, [560000, 555000, null, 570000, null], SH20),
  hybridRow(20, 3, 16, [622000, 617000, null, 631000, null], SH20),
];

assert("hybridTableSchema accepts the synthetic table", hybridTableSchema.safeParse(hybridRows).success);
assert(
  "hybridTableSchema rejects duplicate (kw, phase, battery)",
  !hybridTableSchema.safeParse([...hybridRows, hybridRows[2]]).success
);
assert(
  "hybridTableSchema rejects a kW/phase without a battery-0 row (C7)",
  !hybridTableSchema.safeParse(hybridRows.filter((r) => !(r.kw === 20 && r.batteryKwh === 0))).success
);
assert(
  "hybridTableSchema rejects shared values that differ within a kW",
  !hybridTableSchema.safeParse(hybridRows.map((r, i) => (i === 3 ? { ...r, pricePerKwh: 5 } : r))).success
);
assert(
  "hybridTableSchema rejects non-increasing billMax across kW",
  !hybridTableSchema.safeParse(
    hybridRows.map((r) => (r.kw === 20 ? { ...r, billMin: 1000, billMax: 5000 } : r))
  ).success
);
assert(
  "hybridTableSchema rejects brand names that differ between rows",
  !hybridTableSchema.safeParse(
    hybridRows.map((r, i) =>
      i === 1 ? { ...r, brandPrices: r.brandPrices.map((b) => ({ ...b, brand: b.brand + "x" })) } : r
    )
  ).success
);

assertEqual(
  "hybridMonthlySaving(10 kW + 16 kWh) = (10×5+16)×4.5×30",
  hybridMonthlySaving({ kw: 10, sunHours: 5, days: 30, pricePerKwh: 4.5, batteryKwh: 16 }),
  8910
);

const usable = usablePrices(hybridRows);
const usableOf = (kw: number, phase: number, batt: number) =>
  usable.find((u) => u.kw === kw && u.phase === phase && u.batteryKwh === batt)!.min;
assertEqual("usable: 0 THB is not a price (5 kW base, BrandB=0 ignored)", usableOf(5, 1, 0)?.priceThb ?? null, 150000);
assertEqual("usable: battery-only price is not counted (E3, C/E ignored at 10 kW 1φ 16 kWh)", usableOf(10, 1, 16)?.brand ?? null, "BrandB");
assertEqual("usable: 10 kW 1φ 16 kWh min", usableOf(10, 1, 16)?.priceThb ?? null, 356000);
assertEqual("usable: battery-only brands give no price at all (10 kW 1φ 32 kWh)", usableOf(10, 1, 32)?.priceThb ?? null, null);
assertEqual("usable: battery price without a base price is null (E4, 5 kW 5 kWh)", usableOf(5, 1, 5)?.priceThb ?? null, null);

const pub = toPublicHybridTable(hybridRows);
assertEqual("projection: sizes sorted", pub.map((s) => s.kw).join(","), "5,10,20");
const pub10 = pub.find((s) => s.kw === 10)!;
assertEqual("projection: 10 kW phases merged", pub10.phases.join(","), "1,3");
assertEqual("projection: 10 kW battery options", pub10.batteries.map((b) => b.batteryKwh).join(","), "0,8,16,32");
const pubBatt = (batt: number) => pub10.batteries.find((b) => b.batteryKwh === batt)!;
assertEqual("projection: 16 kWh uses cheaper phase (1φ 356,000 < 3φ 375,000)", pubBatt(16).minPriceThb, 356000);
assertEqual("projection: 8 kWh uses cheaper phase (3φ 329,000 < 1φ 332,000)", pubBatt(8).minPriceThb, 329000);
assertEqual("projection: 32 kWh has no usable price", pubBatt(32).minPriceThb, null);
assertEqual("projection: 32 kWh offered in 1φ only", pubBatt(32).phases.join(","), "1");

const serialized = JSON.stringify(pub);
assert('projection JSON has no "brand" key', !/brand/i.test(serialized));
assert("projection JSON has no BrandA…E names", BRANDS.every((b) => !serialized.includes(b)));
const minPrices = new Set(
  pub.flatMap((s) => s.batteries.map((b) => b.minPriceThb)).filter((p): p is number => p !== null)
);
const nonMinPrices = [
  ...new Set(
    hybridRows
      .flatMap((r) => r.brandPrices.map((b) => b.priceThb))
      .filter((p): p is number => p !== null && p > 0 && !minPrices.has(p))
  ),
];
const leaked = nonMinPrices.filter((p) => new RegExp(`(?<![\\d.])${p}(?![\\d.])`).test(serialized));
assert(`projection JSON contains none of the ${nonMinPrices.length} non-min prices`, leaked.length === 0);

// design-157 §7: bill 9,500 -> 10 kW, battery 16, saving 8,910, after 590
const rec = recommendHybrid(9500, pub, 16, 10);
if (rec.kind !== "ok") {
  assert("recommendHybrid(9500, 16) is ok", false);
} else {
  assertEqual("design-157 §7: kW", rec.size.kw, 10);
  assertEqual("design-157 §7: battery", rec.batteryKwh, 16);
  assertEqual("design-157 §7: monthly saving", rec.monthlySaving, 8910);
  assertEqual("design-157 §7: bill after install", rec.afterBill, 590);
  assertEqual("design-157 §7: payback ≈ 4.0 years", Number((rec.paybackYears ?? 0).toFixed(1)), 4);
  assertEqual("design-157 §7: phases 1,3", rec.phases.join(","), "1,3");
  assertEqual("design-157 §7: kWh/month", rec.kwhPerMonth, (10 * 5 + 16) * 30);
}
const batteryOf = (bill: number, preferred: number | null) => {
  const r = recommendHybrid(bill, pub, preferred, 10);
  return r.kind === "ok" ? r.batteryKwh : -1;
};
assertEqual("#156: initial battery = smallest > 0", batteryOf(9500, null), 8);
assertEqual("#156: 12 not offered -> tie 8/16 resolves to smaller", batteryOf(9500, 12), 8);
assertEqual("#156: 20 not offered -> nearest 16", batteryOf(9500, 20), 16);
assertEqual("#156: preferred 0 (no battery) is honoured", batteryOf(9500, 0), 0);
const rec32 = recommendHybrid(9500, pub, 32, 10);
if (rec32.kind === "ok") {
  assertEqual("#156: saving capped at the bill (32 kWh)", rec32.monthlySaving, 9500);
  assertEqual("#156: capped -> after bill 0", rec32.afterBill, 0);
  assertEqual("#156: capped -> coversFullBill", String(rec32.coversFullBill), "true");
  assertEqual("E4: no usable price -> payback null", rec32.paybackYears, null);
} else {
  assert("recommendHybrid(9500, 32) is ok", false);
}
const rec5 = recommendHybrid(4000, pub, null, 10);
assertEqual("E4: 5 kW 5 kWh has no usable price -> payback null", rec5.kind === "ok" ? rec5.paybackYears : "x", null);
const capped = recommendHybrid(6000, pub, 16, 10);
if (capped.kind === "ok") {
  assertEqual("#156: bill 6000 -> 10 kW (billMax > bill)", capped.size.kw, 10);
  assertEqual(
    "#156: payback uses the capped saving",
    Number((capped.paybackYears ?? 0).toFixed(3)),
    Number((356000 / (6000 * 10)).toFixed(3))
  );
} else {
  assert("recommendHybrid(6000, 16) is ok", false);
}
const kwOf = (bill: number) => {
  const r = recommendHybrid(bill, pub, null, 10);
  return r.kind === "ok" ? r.size.kw : -1;
};
assertEqual("kW boundary: bill 5999 -> 5 kW", kwOf(5999), 5);
assertEqual("kW boundary: bill 10000 -> 20 kW", kwOf(10000), 20);
assertEqual("tooLarge at last billMax", recommendHybrid(20000, pub, null, 10).kind, "tooLarge");
assertEqual("empty for bill 0", recommendHybrid(0, pub, null, 10).kind, "empty");
assertEqual("empty for empty table", recommendHybrid(5000, [], null, 10).kind, "empty");
const below = recommendHybrid(1000, pub, null, 10);
assertEqual("belowFirstRow flagged, still recommends first size", below.kind === "ok" ? `${below.belowFirstRow}/${below.size.kw}` : "x", "true/5");

console.log(failed ? "\nFAILED — see ✗ above" : "\nAll assertions passed ✓");
process.exit(failed ? 1 : 0);
