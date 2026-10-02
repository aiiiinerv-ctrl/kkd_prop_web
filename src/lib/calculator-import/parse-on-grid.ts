// Server-only wrapper kept so callers (index.ts) see the same API as before
// R1-S1: read the sheet (read-on-grid.ts), run the shared table validator
// (validate-on-grid.ts), then map table issues back to Excel rows with
// toExcelLocation() so import messages are unchanged. Never import from a
// client component — it pulls in exceljs.
import { readOnGridSheet } from "./read-on-grid";
import { validateOnGridTable } from "./validate-on-grid";
import { sortIssuesByRow, toExcelLocation } from "./messages";
import type { ImportIssue, ImportWarning } from "./messages";
import type { SizeRow } from "../calculator-size-table";

export type ParseOnGridResult =
  | { ok: true; rows: SizeRow[]; warnings: ImportWarning[]; rowsRead: number; skippedSheets: string[] }
  | { ok: false; errors: ImportIssue[] };

/** Parses the workbook's On-grid sheet into a validated SizeRow[]. */
export async function parseOnGridSheet(buf: Buffer): Promise<ParseOnGridResult> {
  const read = await readOnGridSheet(buf);
  if (!read.ok) return read;

  const validation = validateOnGridTable(read.rows);
  if (validation.issues.length > 0) {
    return {
      ok: false,
      errors: sortIssuesByRow(validation.issues.map((issue) => toExcelLocation(issue, read.sourceRows))),
    };
  }

  return {
    ok: true,
    rows: validation.rows,
    warnings: read.warnings,
    rowsRead: read.rowsRead,
    skippedSheets: read.skippedSheets,
  };
}
