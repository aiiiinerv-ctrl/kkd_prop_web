// Table-level rules for an On-grid SizeRow[] — shared by the Excel import
// (read-on-grid.ts / parse-on-grid.ts) and, from R1-S4/S6, the admin editor.
// CLIENT-SAFE: must never import the Excel/zip libraries or anything server-only
// (docs/plans/calculator-hybrid-toggle-sprints.md Default #6). Imports only
// the zod schema and messages.ts.
//
// 1φ/3φ merge is NOT here — it is an import concern (Default #4 / C3): the
// editor stores phases as a set on one row, so "1φ/3φ rows disagree" cannot
// occur there. Roof fallback (× 2.7 m²) also stays in the reader because its
// warning names an Excel row.
import { sizeTableSchema, type SizeRow } from "../calculator-size-table";
import {
  billMaxNotIncreasingTableIssue,
  billMinGteMaxTableIssue,
  duplicateKwTableIssue,
  outOfRangeTableIssue,
  schemaTableIssue,
} from "./messages";
import type { TableIssue, TableWarning } from "./messages";

export type OnGridValidation = {
  /** Schema-parsed rows sorted by kW on success; the kW-sorted input otherwise. */
  rows: SizeRow[];
  issues: TableIssue[];
  warnings: TableWarning[];
};

/** Field-range rules for one row's production params (sun hours, days,
 * price/kWh, panels). Order is part of the contract: import messages list
 * them in this order. */
export function validateOnGridRowRanges(
  row: Pick<SizeRow, "sunHours" | "days" | "pricePerKwh" | "panels">,
  rowIndex: number
): TableIssue[] {
  const issues: TableIssue[] = [];
  if (row.sunHours < 1 || row.sunHours > 12) {
    issues.push(outOfRangeTableIssue(rowIndex, "sunHours", String(row.sunHours)));
  }
  if (row.days < 28 || row.days > 31) {
    issues.push(outOfRangeTableIssue(rowIndex, "days", String(row.days)));
  }
  if (row.pricePerKwh < 0.01 || row.pricePerKwh > 50) {
    issues.push(outOfRangeTableIssue(rowIndex, "pricePerKwh", String(row.pricePerKwh)));
  }
  if (!Number.isInteger(row.panels) || row.panels < 1) {
    issues.push(outOfRangeTableIssue(rowIndex, "panels", String(row.panels)));
  }
  return issues;
}

/** billMin must be strictly below billMax. */
export function validateOnGridRowBill(row: Pick<SizeRow, "billMin" | "billMax">, rowIndex: number): TableIssue[] {
  if (row.billMin >= row.billMax) {
    return [billMinGteMaxTableIssue(rowIndex, row.billMin.toLocaleString("th-TH"), row.billMax.toLocaleString("th-TH"))];
  }
  return [];
}

/** Validates a whole On-grid table, in stages (each stage short-circuits so
 * the admin sees one class of problem at a time): per-row ranges + bill
 * range -> duplicate kW -> billMax strictly increasing by kW -> zod schema
 * (defensive final check). `rowIndex` always indexes the array passed in. */
export function validateOnGridTable(input: SizeRow[]): OnGridValidation {
  const warnings: TableWarning[] = [];
  const order = input.map((_, i) => i).sort((a, b) => input[a].kw - input[b].kw);
  const sorted = order.map((i) => input[i]);

  const rowIssues: TableIssue[] = [];
  input.forEach((row, index) => {
    rowIssues.push(...validateOnGridRowRanges(row, index), ...validateOnGridRowBill(row, index));
  });
  if (rowIssues.length > 0) return { rows: sorted, issues: rowIssues, warnings };

  const dupIssues: TableIssue[] = [];
  const seenKw = new Set<number>();
  for (const i of order) {
    if (seenKw.has(input[i].kw)) dupIssues.push(duplicateKwTableIssue(i, input[i].kw));
    seenKw.add(input[i].kw);
  }
  if (dupIssues.length > 0) return { rows: sorted, issues: dupIssues, warnings };

  const monotoneIssues: TableIssue[] = [];
  for (let k = 1; k < order.length; k++) {
    const row = input[order[k]];
    const prev = input[order[k - 1]];
    if (row.billMax <= prev.billMax) {
      monotoneIssues.push(
        billMaxNotIncreasingTableIssue(
          order[k],
          row.kw,
          row.billMax.toLocaleString("th-TH"),
          prev.kw,
          prev.billMax.toLocaleString("th-TH")
        )
      );
    }
  }
  if (monotoneIssues.length > 0) return { rows: sorted, issues: monotoneIssues, warnings };

  const parsed = sizeTableSchema.safeParse(sorted);
  if (!parsed.success) {
    return {
      rows: sorted,
      issues: parsed.error.issues.map((issue) =>
        schemaTableIssue(typeof issue.path[0] === "number" ? order[issue.path[0]] : -1, issue.message)
      ),
      warnings,
    };
  }
  return { rows: parsed.data, issues: [], warnings };
}
