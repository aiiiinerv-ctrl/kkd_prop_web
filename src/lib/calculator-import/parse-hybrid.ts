// Server-only wrapper (mirrors parse-on-grid.ts): read the Hybrid sheet
// (read-hybrid.ts), run the shared table validator (validate-hybrid.ts), then
// map table issues/warnings back to Excel rows so import messages carry
// "ชีต Hybrid แถว N …" positions. Never import from a client component — it
// pulls in exceljs.
import type { HybridRow } from "../calculator-hybrid";
import { readHybridSheet } from "./read-hybrid";
import { validateHybridTable } from "./validate-hybrid";
import { sortIssuesByRow, toHybridExcelLocation, toHybridImportWarning } from "./messages";
import type { ImportIssue, ImportWarning } from "./messages";

export type ParseHybridResult =
  | { ok: true; present: false }
  | { ok: true; present: true; rows: HybridRow[]; warnings: ImportWarning[]; rowsRead: number }
  | { ok: false; errors: ImportIssue[] };

/** Parses the workbook's Hybrid sheet into a validated HybridRow[]. */
export async function parseHybridSheet(buf: Buffer): Promise<ParseHybridResult> {
  const read = await readHybridSheet(buf);
  if (!read.ok || !read.present) return read;

  const validation = validateHybridTable(read.rows);
  if (validation.issues.length > 0) {
    return {
      ok: false,
      errors: sortIssuesByRow(validation.issues.map((issue) => toHybridExcelLocation(issue, read.sourceRows, read.columns))),
    };
  }

  // validateHybridTable sorts exactly like the reader did, so row order is unchanged
  // and `sourceRows` still aligns with the warnings' rowIndex.
  return {
    ok: true,
    present: true,
    rows: validation.rows,
    warnings: [...read.warnings, ...validation.warnings.map((w) => toHybridImportWarning(w, read.sourceRows))],
    rowsRead: read.rowsRead,
  };
}
