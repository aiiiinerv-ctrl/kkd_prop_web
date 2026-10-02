// Server-only entry point for the calculator Excel import pipeline
// (docs/plans/calculator-excel-import-sprints.md S2). Never import this
// module (or validate-xlsx.ts / read-on-grid.ts / parse-on-grid.ts) from a client component —
// exceljs/jszip must stay out of the browser bundle. This module has no
// callers yet outside scripts/verify-calculator-import.mts; the server
// action that will call it lands in S5.
import { validateXlsxBuffer } from "./validate-xlsx";
import { parseOnGridSheet } from "./parse-on-grid";
import { parseHybridSheet } from "./parse-hybrid";
import { HYBRID_SHEET_NAME_PATTERN } from "./read-hybrid";
import type { ImportIssue, ImportWarning } from "./messages";
import type { SizeRow } from "../calculator-size-table";
import type { HybridRow } from "../calculator-hybrid";

export * from "./validate-xlsx";
export * from "./parse-on-grid";
export * from "./parse-hybrid";
export { HYBRID_HEADER, HYBRID_SHEET_NAME_PATTERN } from "./read-hybrid";
export * from "./diff";
export * from "./messages";

export type CalculatorImportResult =
  | { ok: true; rows: SizeRow[]; warnings: ImportWarning[]; rowsRead: number; skippedSheets: string[] }
  | { ok: false; errors: ImportIssue[] };

/** Runs the file guards (validateXlsxBuffer) then the parser
 * (parseOnGridSheet) in sequence — the order S5's server action must use. */
export async function importOnGridSizeTable(buf: Buffer, fileName: string): Promise<CalculatorImportResult> {
  const fileCheck = await validateXlsxBuffer(buf, fileName);
  if (!fileCheck.ok) {
    return { ok: false, errors: fileCheck.errors };
  }

  const parsed = await parseOnGridSheet(buf);
  if (!parsed.ok) {
    return { ok: false, errors: parsed.errors };
  }

  return {
    ok: true,
    rows: parsed.rows,
    warnings: [...fileCheck.warnings, ...parsed.warnings],
    rowsRead: parsed.rowsRead,
    skippedSheets: parsed.skippedSheets,
  };
}

export type CalculatorWorkbookImportResult =
  | {
      ok: true;
      onGrid: SizeRow[];
      /** null when the workbook has no Hybrid sheet (D3: applying it removes the Hybrid table). */
      hybrid: HybridRow[] | null;
      hasHybridSheet: boolean;
      /** File, On-grid and Hybrid warnings; Hybrid ones have `sheet: "hybrid"` and the "ชีต Hybrid" prefix. */
      warnings: ImportWarning[];
      rowsRead: { onGrid: number; hybrid: number };
      /** Sheets that are neither On-grid nor Hybrid. */
      skippedSheets: string[];
    }
  | {
      ok: false;
      /** All issues, On-grid first. */
      errors: ImportIssue[];
      /** Same issues split per sheet for the grouped reject list (design-162 §8.4). File-level issues go to `onGrid`. */
      groups: { onGrid: ImportIssue[]; hybrid: ImportIssue[] };
    };

/**
 * One workbook, two sheets (R2-S2): file guards -> On-grid (required) ->
 * Hybrid (optional). Both sheets are always checked so a reject can list
 * every problem; any issue on either sheet rejects the whole file (D4 — the
 * two tables are applied as one set). No Hybrid sheet is not an error: it
 * returns `hybrid: null` (D3). `importOnGridSizeTable` above is kept for
 * existing callers (src/actions/calculator-import.ts) until R2-S4 switches
 * the action over.
 */
export async function importCalculatorWorkbook(buf: Buffer, fileName: string): Promise<CalculatorWorkbookImportResult> {
  const fileCheck = await validateXlsxBuffer(buf, fileName);
  if (!fileCheck.ok) {
    return { ok: false, errors: fileCheck.errors, groups: { onGrid: fileCheck.errors, hybrid: [] } };
  }

  const onGrid = await parseOnGridSheet(buf);
  if (!onGrid.ok && onGrid.errors.some((e) => e.code === "read-error")) {
    // Unreadable workbook: the Hybrid pass would only repeat the same error.
    return { ok: false, errors: onGrid.errors, groups: { onGrid: onGrid.errors, hybrid: [] } };
  }
  const hybrid = await parseHybridSheet(buf);

  const onGridErrors = onGrid.ok ? [] : onGrid.errors;
  const hybridErrors = hybrid.ok ? [] : hybrid.errors;
  if (onGridErrors.length > 0 || hybridErrors.length > 0) {
    return {
      ok: false,
      errors: [...onGridErrors, ...hybridErrors],
      groups: { onGrid: onGridErrors, hybrid: hybridErrors },
    };
  }
  if (!onGrid.ok || !hybrid.ok) throw new Error("unreachable: errors handled above");

  return {
    ok: true,
    onGrid: onGrid.rows,
    hybrid: hybrid.present ? hybrid.rows : null,
    hasHybridSheet: hybrid.present,
    warnings: [...fileCheck.warnings, ...onGrid.warnings, ...(hybrid.present ? hybrid.warnings : [])],
    rowsRead: { onGrid: onGrid.rowsRead, hybrid: hybrid.present ? hybrid.rowsRead : 0 },
    skippedSheets: onGrid.skippedSheets.filter((name) => !HYBRID_SHEET_NAME_PATTERN.test(name.trim())),
  };
}
