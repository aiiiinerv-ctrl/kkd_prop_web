// Table-level rules for a Hybrid HybridRow[] — shared by the Excel import
// (read-hybrid.ts + index.ts) and, from R2-S4/S6, the admin editor.
// CLIENT-SAFE: must never import the Excel/zip libraries, Prisma or anything
// server-only (docs/plans/calculator-hybrid-toggle-sprints.md Default #6).
// Imports only the zod schema/usable-price rule and messages.ts.
//
// Stages short-circuit like validate-on-grid.ts (the admin sees one class of
// problem at a time): per-row ranges -> duplicate (kW, phase, battery) E12 ->
// shared values differ within a kW E11 -> missing no-battery row E13 (C7) ->
// billMax strictly increasing by kW -> zod schema (final guard). Warnings
// (E3/E4/E5) are only produced for a table with no issues.
import { hybridTableSchema, usablePrices, type HybridRow } from "../calculator-hybrid";
import { validateOnGridRowBill, validateOnGridRowRanges } from "./validate-on-grid";
import {
  billMaxNotIncreasingTableIssue,
  hybridBatteryInvalidTableIssue,
  hybridBatteryPriceIgnoredWarning,
  hybridDuplicateTableIssue,
  hybridMissingBaseTableIssue,
  hybridNoPriceWarning,
  hybridPanelsFormulaWarning,
  hybridSchemaTableIssue,
  hybridSharedMismatchTableIssue,
  SHARED_FIELD_LABELS,
} from "./messages";
import type { SharedFieldName, TableIssue, TableWarning } from "./messages";

export type HybridValidation = {
  /** Rows sorted by (kW, phase, battery) — `rowIndex` of issues/warnings indexes the INPUT array. */
  rows: HybridRow[];
  issues: TableIssue[];
  warnings: TableWarning[];
};

/** Panel count the Excel itself calculates for a size: (kW x 1.2) / 0.63
 * (research-154 §2.3 / Default #12 — used for both import and hand edit). */
export function expectedPanels(kw: number): number {
  return (kw * 1.2) / 0.63;
}

const PANEL_TOLERANCE = 0.2;
const MAX_E3_EXAMPLES = 3;
const SHARED_FIELDS = Object.keys(SHARED_FIELD_LABELS) as SharedFieldName[];

function compareRows(a: HybridRow, b: HybridRow): number {
  return a.kw - b.kw || a.phase - b.phase || a.batteryKwh - b.batteryKwh;
}

export function validateHybridTable(input: HybridRow[]): HybridValidation {
  const warnings: TableWarning[] = [];
  const order = input.map((_, i) => i).sort((a, b) => compareRows(input[a], input[b]));
  const sorted = order.map((i) => input[i]);

  // 1. per-row ranges + bill range + battery
  const rowIssues: TableIssue[] = [];
  input.forEach((row, index) => {
    const ranges = validateOnGridRowRanges(row, index).map((i) => ({ ...i, table: "hybrid" as const }));
    const bill = validateOnGridRowBill(row, index).map((i) => ({ ...i, table: "hybrid" as const }));
    rowIssues.push(...ranges, ...bill);
    if (!Number.isFinite(row.batteryKwh) || row.batteryKwh < 0) rowIssues.push(hybridBatteryInvalidTableIssue(index));
  });
  if (rowIssues.length > 0) return { rows: sorted, issues: rowIssues, warnings };

  // 2. duplicate (kW, phase, battery) — E12
  const dupIssues: TableIssue[] = [];
  const seen = new Map<string, number>();
  for (const i of order) {
    const row = input[i];
    const key = `${row.kw}|${row.phase}|${row.batteryKwh}`;
    const first = seen.get(key);
    if (first !== undefined) dupIssues.push(hybridDuplicateTableIssue(i, first, row.kw, row.phase, row.batteryKwh));
    else seen.set(key, i);
  }
  if (dupIssues.length > 0) return { rows: sorted, issues: dupIssues, warnings };

  // 3. shared values must match within a kW — E11 (first differing field per row)
  const mismatchIssues: TableIssue[] = [];
  const firstOfKw = new Map<number, number>();
  for (const i of order) {
    const row = input[i];
    const first = firstOfKw.get(row.kw);
    if (first === undefined) {
      firstOfKw.set(row.kw, i);
      continue;
    }
    const field = SHARED_FIELDS.find((f) => input[first][f] !== row[f]);
    if (field) {
      mismatchIssues.push(hybridSharedMismatchTableIssue(i, field, row.kw, String(input[first][field]), String(row[field])));
    }
  }
  if (mismatchIssues.length > 0) return { rows: sorted, issues: mismatchIssues, warnings };

  // 4. every kW/phase keeps its no-battery row — E13 / C7
  const baseIssues: TableIssue[] = [];
  const hasBase = new Set(input.filter((r) => r.batteryKwh === 0).map((r) => `${r.kw}|${r.phase}`));
  const reported = new Set<string>();
  for (const i of order) {
    const row = input[i];
    const key = `${row.kw}|${row.phase}`;
    if (!hasBase.has(key) && !reported.has(key)) {
      reported.add(key);
      baseIssues.push(hybridMissingBaseTableIssue(i, row.kw, row.phase));
    }
  }
  if (baseIssues.length > 0) return { rows: sorted, issues: baseIssues, warnings };

  // 5. billMax strictly increasing by kW (one value per kW after stage 3)
  const monotoneIssues: TableIssue[] = [];
  const kwOrder = [...firstOfKw.entries()].sort((a, b) => a[0] - b[0]);
  for (let k = 1; k < kwOrder.length; k++) {
    const [kw, index] = kwOrder[k];
    const [prevKw, prevIndex] = kwOrder[k - 1];
    if (input[index].billMax <= input[prevIndex].billMax) {
      monotoneIssues.push(
        billMaxNotIncreasingTableIssue(
          index,
          kw,
          input[index].billMax.toLocaleString("th-TH"),
          prevKw,
          input[prevIndex].billMax.toLocaleString("th-TH")
        )
      );
    }
  }
  if (monotoneIssues.length > 0) {
    return { rows: sorted, issues: monotoneIssues.map((i) => ({ ...i, table: "hybrid" as const })), warnings };
  }

  // 6. final guard — the shared zod schema
  const parsed = hybridTableSchema.safeParse(sorted);
  if (!parsed.success) {
    return {
      rows: sorted,
      issues: parsed.error.issues.map((issue) =>
        hybridSchemaTableIssue(typeof issue.path[0] === "number" ? order[issue.path[0]] : -1, issue.message)
      ),
      warnings,
    };
  }

  // ---- warnings (E5 per kW, E3 one merged item, E4 per kW) ----
  for (const [kw, index] of kwOrder) {
    const expected = expectedPanels(kw);
    const panels = input[index].panels;
    if (Math.abs(panels - expected) / expected > PANEL_TOLERANCE) {
      warnings.push(hybridPanelsFormulaWarning(index, kw, panels, Math.round(expected * 10) / 10));
    }
  }

  // E3: a battery row's price is ignored when the same brand has no > 0 price on the no-battery row.
  const baseBrands = new Map<string, Set<string>>();
  for (const row of input) {
    if (row.batteryKwh !== 0) continue;
    baseBrands.set(
      `${row.kw}|${row.phase}`,
      new Set(row.brandPrices.filter((b) => b.priceThb !== null && b.priceThb > 0).map((b) => b.brand))
    );
  }
  let ignored = 0;
  const examples: NonNullable<TableWarning["examples"]> = [];
  for (const i of order) {
    const row = input[i];
    if (row.batteryKwh === 0) continue;
    for (const bp of row.brandPrices) {
      if (bp.priceThb === null || !(bp.priceThb > 0)) continue;
      if (baseBrands.get(`${row.kw}|${row.phase}`)?.has(bp.brand)) continue;
      ignored++;
      if (examples.length < MAX_E3_EXAMPLES) {
        examples.push({ rowIndex: i, kw: row.kw, batteryKwh: row.batteryKwh, brand: bp.brand });
      }
    }
  }
  if (ignored > 0) warnings.push(hybridBatteryPriceIgnoredWarning(ignored, examples));

  // E4: rows with no usable price at all, one warning per kW listing its batteries.
  const usable = usablePrices(input);
  const noPriceByKw = new Map<number, { index: number; batteries: Set<number>; rows: number }>();
  for (const i of order) {
    if (usable[i].min !== null) continue;
    const entry = noPriceByKw.get(input[i].kw) ?? { index: i, batteries: new Set<number>(), rows: 0 };
    entry.batteries.add(input[i].batteryKwh);
    entry.rows++;
    noPriceByKw.set(input[i].kw, entry);
  }
  for (const [kw, entry] of noPriceByKw) {
    warnings.push(hybridNoPriceWarning(entry.index, kw, [...entry.batteries].sort((a, b) => a - b), entry.rows));
  }

  return { rows: parsed.data as HybridRow[], issues: [], warnings };
}
