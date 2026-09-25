// Server-only entry point for the calculator Excel import pipeline
// (docs/plans/calculator-excel-import-sprints.md S2). Never import this
// module (or validate-xlsx.ts / parse-on-grid.ts) from a client component —
// exceljs/jszip must stay out of the browser bundle. This module has no
// callers yet outside scripts/verify-calculator-import.mts; the server
// action that will call it lands in S5.
import { validateXlsxBuffer } from "./validate-xlsx";
import { parseOnGridSheet } from "./parse-on-grid";
import type { ImportIssue, ImportWarning } from "./messages";
import type { SizeRow } from "../calculator-size-table";

export * from "./validate-xlsx";
export * from "./parse-on-grid";
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
