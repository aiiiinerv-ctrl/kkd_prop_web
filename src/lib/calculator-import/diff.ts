// WARNING: the Hybrid inputs here carry raw brandPrices (brand names + per-brand
// prices). Never import this module from a public component or bundle.
//
// Compares two size tables (the one currently active vs. a freshly parsed
// import) for the admin preview screen — see
// docs/plans/calculator-excel-import-admin-ui-spec.md §4.2.3/§4.2.4.
//
// Pure: reuses recommendFromTable() from ../calculator (S1) so the "which
// size does this bill recommend" rule lives in exactly one place.
import { recommendFromTable } from "../calculator";
import type { SizeRow } from "../calculator-size-table";
import { recommendHybrid, type HybridRow } from "../calculator-hybrid";
import { toPublicHybridTable } from "../calculator-hybrid-projection";
import { packageNotInTableWarning, sliderMaxWarning } from "./messages";
import type { ImportWarning } from "./messages";

export type DiffFieldName = "phases" | "billRange" | "panels" | "roofM2" | "sunHours" | "days" | "pricePerKwh";

export type DiffFieldChange = {
  field: DiffFieldName;
  current: unknown;
  next: unknown;
};

export type ChangedRow = {
  kw: number;
  current: SizeRow;
  next: SizeRow;
  changedFields: DiffFieldChange[];
};

export type SampleBillOutcome = {
  kw: number | null;
  status: "ok" | "belowFirstRow" | "tooLarge" | "empty";
  hasPackage: boolean;
};

export type SampleBillDiff = {
  bill: number;
  before: SampleBillOutcome;
  after: SampleBillOutcome;
};

export type SizeTableDiff = {
  added: SizeRow[];
  removed: SizeRow[];
  changed: ChangedRow[];
  unchangedCount: number;
  warnings: ImportWarning[];
  sampleBills: SampleBillDiff[];
};

export type CalcPackageForDiff = { sizeKw: number; isPublished: boolean };

// Admin preview's fixed set of example bills — see plan S2 + admin UI spec
// §4.2.3 (adds 4,500 ฿, the middle of the "payback disappears" 4,000–6,999
// range called out in S10).
export const DIFF_SAMPLE_BILLS = [1500, 3000, 3500, 4500, 6000, 8000] as const;

function evaluateBill(bill: number, table: SizeRow[], packages: CalcPackageForDiff[]): SampleBillOutcome {
  const result = recommendFromTable(bill, table, [], 1);
  if (result.kind === "empty") {
    return { kw: null, status: "empty", hasPackage: false };
  }
  if (result.kind === "tooLarge") {
    return { kw: result.lastRow.kw, status: "tooLarge", hasPackage: packages.some((p) => p.sizeKw === result.lastRow.kw) };
  }
  const status = result.belowFirstRow ? "belowFirstRow" : "ok";
  return { kw: result.row.kw, status, hasPackage: packages.some((p) => p.sizeKw === result.row.kw) };
}

function roundEq(a: number, b: number, decimals: number): boolean {
  const factor = 10 ** decimals;
  return Math.round(a * factor) === Math.round(b * factor);
}

function diffFields(current: SizeRow, next: SizeRow): DiffFieldChange[] {
  const changes: DiffFieldChange[] = [];

  const phasesEqual =
    current.phases.length === next.phases.length && current.phases.every((p, i) => p === next.phases[i]);
  if (!phasesEqual) {
    changes.push({ field: "phases", current: current.phases, next: next.phases });
  }

  if (current.billMin !== next.billMin || current.billMax !== next.billMax) {
    changes.push({
      field: "billRange",
      current: { billMin: current.billMin, billMax: current.billMax },
      next: { billMin: next.billMin, billMax: next.billMax },
    });
  }

  if (current.panels !== next.panels) {
    changes.push({ field: "panels", current: current.panels, next: next.panels });
  }

  if (!roundEq(current.roofM2, next.roofM2, 1)) {
    changes.push({ field: "roofM2", current: current.roofM2, next: next.roofM2 });
  }

  if (!roundEq(current.sunHours, next.sunHours, 1)) {
    changes.push({ field: "sunHours", current: current.sunHours, next: next.sunHours });
  }

  if (current.days !== next.days) {
    changes.push({ field: "days", current: current.days, next: next.days });
  }

  if (!roundEq(current.pricePerKwh, next.pricePerKwh, 2)) {
    changes.push({ field: "pricePerKwh", current: current.pricePerKwh, next: next.pricePerKwh });
  }

  return changes;
}

/**
 * Diffs `current` (the table live on the public calculator today) against
 * `next` (a freshly parsed import) for the admin preview screen: added /
 * removed / changed rows, warnings, and the effect on a fixed set of sample
 * bills (used for the "ผลต่อบิลตัวอย่าง" table).
 */
export function diffSizeTables(
  current: SizeRow[],
  next: SizeRow[],
  packages: CalcPackageForDiff[],
  sliderMaxBill: number
): SizeTableDiff {
  const currentByKw = new Map(current.map((r) => [r.kw, r]));
  const nextByKw = new Map(next.map((r) => [r.kw, r]));

  const added: SizeRow[] = [];
  const changed: ChangedRow[] = [];
  let unchangedCount = 0;
  for (const [kw, nextRow] of nextByKw) {
    const currentRow = currentByKw.get(kw);
    if (!currentRow) {
      added.push(nextRow);
      continue;
    }
    const changedFields = diffFields(currentRow, nextRow);
    if (changedFields.length === 0) {
      unchangedCount++;
    } else {
      changed.push({ kw, current: currentRow, next: nextRow, changedFields });
    }
  }
  changed.sort((a, b) => a.kw - b.kw);
  added.sort((a, b) => a.kw - b.kw);

  const removed: SizeRow[] = [];
  for (const [kw, currentRow] of currentByKw) {
    if (!nextByKw.has(kw)) removed.push(currentRow);
  }
  removed.sort((a, b) => a.kw - b.kw);

  const warnings: ImportWarning[] = [];
  const publishedPackages = packages.filter((p) => p.isPublished);
  const nextKwSet = new Set(next.map((r) => r.kw));
  for (const pkg of publishedPackages) {
    if (!nextKwSet.has(pkg.sizeKw)) {
      warnings.push(packageNotInTableWarning(pkg.sizeKw));
    }
  }

  if (next.length > 0) {
    const lastRow = next[next.length - 1];
    if (sliderMaxBill >= lastRow.billMax) {
      warnings.push(
        sliderMaxWarning(sliderMaxBill.toLocaleString("th-TH"), lastRow.billMax.toLocaleString("th-TH"), lastRow.kw)
      );
    }
  }

  const sampleBills: SampleBillDiff[] = DIFF_SAMPLE_BILLS.map((bill) => ({
    bill,
    before: evaluateBill(bill, current, packages),
    after: evaluateBill(bill, next, packages),
  }));

  return { added, removed, changed, unchangedCount, warnings, sampleBills };
}

// ---- Hybrid (R2-S2) ----
//
// Same preview contract as the On-grid diff, keyed by (kW, phase, battery).
// Used by the admin only (preview / save confirm): it sees raw brand prices,
// which is fine in the back office — the public bundle never imports this file.

export type HybridDiffFieldName = DiffFieldName | "brandPrices";

export type HybridChangedRow = {
  kw: number;
  phase: 1 | 3;
  batteryKwh: number;
  current: HybridRow;
  next: HybridRow;
  changedFields: { field: HybridDiffFieldName; current: unknown; next: unknown }[];
};

export type HybridSampleOutcome = {
  kw: number | null;
  /** Battery the public toggle would start on (smallest > 0, #156). */
  batteryKwh: number | null;
  status: "ok" | "belowFirstRow" | "tooLarge" | "empty";
  /** Payback is shown on the public page iff this is non-null ("แสดง ({x} ปี)" / "ไม่แสดง"). */
  paybackYears: number | null;
};

export type HybridSampleBillDiff = {
  bill: number;
  before: HybridSampleOutcome;
  after: HybridSampleOutcome;
};

export type HybridTableDiff = {
  /** The live config has no Hybrid table (preview shows "เพิ่มใหม่ทั้งตาราง"). */
  currentEmpty: boolean;
  /** The incoming file has no Hybrid table (D3 — the live one will be removed). */
  nextEmpty: boolean;
  /** kW sizes of the live / incoming table — lets the admin list tell a new or removed size from a changed one (unchanged rows are not listed). */
  currentKws: number[];
  nextKws: number[];
  added: HybridRow[];
  removed: HybridRow[];
  changed: HybridChangedRow[];
  unchangedCount: number;
  sampleBills: HybridSampleBillDiff[];
};

function evaluateHybridBill(bill: number, rows: HybridRow[] | null, multiplier: number): HybridSampleOutcome {
  const result = recommendHybrid(bill, rows ? toPublicHybridTable(rows) : [], null, multiplier);
  if (result.kind === "empty") return { kw: null, batteryKwh: null, status: "empty", paybackYears: null };
  if (result.kind === "tooLarge") return { kw: result.lastSize.kw, batteryKwh: null, status: "tooLarge", paybackYears: null };
  return {
    kw: result.size.kw,
    batteryKwh: result.batteryKwh,
    status: result.belowFirstRow ? "belowFirstRow" : "ok",
    paybackYears: result.paybackYears,
  };
}

function diffHybridFields(current: HybridRow, next: HybridRow): HybridChangedRow["changedFields"] {
  const changes: HybridChangedRow["changedFields"] = [];
  if (current.billMin !== next.billMin || current.billMax !== next.billMax) {
    changes.push({
      field: "billRange",
      current: { billMin: current.billMin, billMax: current.billMax },
      next: { billMin: next.billMin, billMax: next.billMax },
    });
  }
  if (current.panels !== next.panels) changes.push({ field: "panels", current: current.panels, next: next.panels });
  if (!roundEq(current.roofM2, next.roofM2, 1)) changes.push({ field: "roofM2", current: current.roofM2, next: next.roofM2 });
  if (!roundEq(current.sunHours, next.sunHours, 1)) changes.push({ field: "sunHours", current: current.sunHours, next: next.sunHours });
  if (current.days !== next.days) changes.push({ field: "days", current: current.days, next: next.days });
  if (!roundEq(current.pricePerKwh, next.pricePerKwh, 2)) {
    changes.push({ field: "pricePerKwh", current: current.pricePerKwh, next: next.pricePerKwh });
  }
  // Brand names or any per-brand price (null = no price).
  if (JSON.stringify(current.brandPrices) !== JSON.stringify(next.brandPrices)) {
    changes.push({ field: "brandPrices", current: current.brandPrices, next: next.brandPrices });
  }
  return changes;
}

/**
 * Diffs the Hybrid table live today (`null` = none) against an incoming one
 * (`null` = none): rows added / removed / changed by (kW, phase, battery) and
 * the effect on the sample bills — including whether payback would still be
 * shown, which is what the owner cares about (design-162 §8.3 item 7).
 */
export function diffHybridTables(
  current: HybridRow[] | null,
  next: HybridRow[] | null,
  multiplier: number
): HybridTableDiff {
  const key = (r: HybridRow) => `${r.kw}|${r.phase}|${r.batteryKwh}`;
  const currentRows = current ?? [];
  const nextRows = next ?? [];
  const currentByKey = new Map(currentRows.map((r) => [key(r), r]));
  const nextByKey = new Map(nextRows.map((r) => [key(r), r]));
  const order = (a: Pick<HybridRow, "kw" | "phase" | "batteryKwh">, b: Pick<HybridRow, "kw" | "phase" | "batteryKwh">) => a.kw - b.kw || a.phase - b.phase || a.batteryKwh - b.batteryKwh;

  const added: HybridRow[] = [];
  const changed: HybridChangedRow[] = [];
  let unchangedCount = 0;
  for (const [k, nextRow] of nextByKey) {
    const currentRow = currentByKey.get(k);
    if (!currentRow) {
      added.push(nextRow);
      continue;
    }
    const changedFields = diffHybridFields(currentRow, nextRow);
    if (changedFields.length === 0) unchangedCount++;
    else {
      changed.push({
        kw: nextRow.kw,
        phase: nextRow.phase,
        batteryKwh: nextRow.batteryKwh,
        current: currentRow,
        next: nextRow,
        changedFields,
      });
    }
  }
  const removed = currentRows.filter((r) => !nextByKey.has(key(r))).sort(order);
  added.sort(order);
  changed.sort(order);

  return {
    currentEmpty: currentRows.length === 0,
    nextEmpty: nextRows.length === 0,
    currentKws: [...new Set(currentRows.map((r) => r.kw))].sort((a, b) => a - b),
    nextKws: [...new Set(nextRows.map((r) => r.kw))].sort((a, b) => a - b),
    added,
    removed,
    changed,
    unchangedCount,
    sampleBills: DIFF_SAMPLE_BILLS.map((bill) => ({
      bill,
      before: evaluateHybridBill(bill, current, multiplier),
      after: evaluateHybridBill(bill, next, multiplier),
    })),
  };
}
