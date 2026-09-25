// Parses the "On-grid" sheet of the sales team's Excel workbook into a
// SizeRow[] (src/lib/calculator-size-table.ts) — the row-per-system-size
// model used by the calculator. Contract: research-145 §2; edge cases:
// research-145 §4.2/§4.3 as overridden by #146/C5 in
// docs/plans/calculator-excel-import-sprints.md (billMax must strictly
// increase = Reject; 1φ/3φ rows that differ = Reject; missing billMax =
// Reject; billMin gaps/overlaps are not warned).
//
// Pure w.r.t. the outside world once handed a Buffer: no Prisma, no
// storage, no fetch. Call validateXlsxBuffer() first — this module assumes
// the buffer already passed those file-level guards. Never import from a
// client component.
import ExcelJS from "exceljs";
import { sizeTableSchema, type SizeRow } from "../calculator-size-table";
import {
  billMaxMissingIssue,
  billMinMissingIssue,
  billMaxNotIncreasingIssue,
  billMinGteMaxIssue,
  columnAmbiguousIssue,
  columnMissingIssue,
  duplicateSamePhaseIssue,
  formulaCachedWarning,
  formulaNoCachedIssue,
  headerNotFoundIssue,
  hiddenRowsWarning,
  notSortedWarning,
  outOfRangeIssue,
  phaseMismatchIssue,
  readErrorIssue,
  roofEmptyWarning,
  sheetNotFoundIssue,
  sheetTooLargeIssue,
  sizeInvalidIssue,
  textNumberWarning,
  theoreticalExceedsBillWarning,
  unitInvalidIssue,
  sortIssuesByRow,
} from "./messages";
import type { ImportIssue, ImportWarning } from "./messages";

// exceljs's own .d.ts declares a global `Buffer extends ArrayBuffer {}` that
// conflicts with @types/node's generic Buffer<T> in this TS/Node version —
// extract exceljs's actual expected parameter type instead of fighting the
// ambient merge with a hand-written one.
type ExcelJsLoadBuffer = Parameters<ExcelJS.Workbook["xlsx"]["load"]>[0];

const MAX_HEADER_SCAN_ROWS = 20;
const MAX_ROW_COUNT = 1000;
const MAX_COL_COUNT = 100;
const HEADER_MARKER = "ผลิตพลังงานต่อวัน";
const ROOF_M2_PER_PANEL = 2.7;

export type ParseOnGridResult =
  | { ok: true; rows: SizeRow[]; warnings: ImportWarning[]; rowsRead: number; skippedSheets: string[] }
  | { ok: false; errors: ImportIssue[] };

function columnLetter(index: number): string {
  let n = index;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function richTextToString(v: ExcelJS.CellValue): string | null {
  if (v && typeof v === "object" && "richText" in v && Array.isArray((v as { richText?: unknown[] }).richText)) {
    return (v as { richText: { text: string }[] }).richText.map((t) => t.text).join("");
  }
  return null;
}

/** Text of a cell, resolving merged ranges to their master cell's value. */
function cellText(ws: ExcelJS.Worksheet, row: number, col: number): string {
  const cell = ws.getRow(row).getCell(col);
  const master = cell.isMerged ? cell.master : cell;
  const raw = master.value;
  if (raw === null || raw === undefined) return "";
  const rich = richTextToString(raw);
  if (rich !== null) return normalizeWhitespace(rich);
  if (typeof raw === "object" && "result" in raw) {
    const result = (raw as { result?: unknown }).result;
    return normalizeWhitespace(result === null || result === undefined ? "" : String(result));
  }
  return normalizeWhitespace(String(raw));
}

type NumericCellRead =
  | { ok: true; value: number; wasFormula: boolean; wasText: boolean; noCachedResult: false }
  | { ok: false; noCachedResult: boolean; rawText: string };

/** Reads a cell that should hold a plain entered number — never evaluates
 * formulas, only reads their cached `result` (research-145 §2.4). */
function cellNumber(ws: ExcelJS.Worksheet, row: number, col: number): NumericCellRead {
  const cell = ws.getRow(row).getCell(col);
  const raw = cell.value;

  if (typeof raw === "number") {
    return { ok: true, value: raw, wasFormula: false, wasText: false, noCachedResult: false };
  }

  if (raw && typeof raw === "object" && "formula" in raw) {
    const result = (raw as { result?: unknown }).result;
    if (typeof result === "number") {
      return { ok: true, value: result, wasFormula: true, wasText: false, noCachedResult: false };
    }
    return { ok: false, noCachedResult: true, rawText: "" };
  }

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    const normalizedDigits = trimmed.replace(/,/g, "");
    const parsed = Number(normalizedDigits);
    if (trimmed !== "" && Number.isFinite(parsed)) {
      return { ok: true, value: parsed, wasFormula: false, wasText: true, noCachedResult: false };
    }
    return { ok: false, noCachedResult: false, rawText: trimmed };
  }

  return { ok: false, noCachedResult: false, rawText: raw === null || raw === undefined ? "" : String(raw) };
}

function isCellEmpty(ws: ExcelJS.Worksheet, row: number, col: number): boolean {
  const cell = ws.getRow(row).getCell(col);
  const v = cell.value;
  return v === null || v === undefined || (typeof v === "string" && v.trim() === "");
}

type ColumnMap = {
  size: number;
  unit: number;
  phase: number;
  sunHours: number;
  days: number;
  panels: number;
  roof: number | null;
  billMin: number;
  billMax: number;
  pricePerKwh: number;
};

function findColumns(ws: ExcelJS.Worksheet, groupRow: number, subRow: number, colCount: number): ColumnMap | ImportIssue {
  const groups: string[] = [];
  const subs: string[] = [];
  for (let c = 1; c <= colCount; c++) {
    groups.push(cellText(ws, groupRow, c));
    subs.push(cellText(ws, subRow, c));
  }

  const findOne = (label: string, predicate: (group: string, sub: string, col: number) => boolean): number[] => {
    const matches: number[] = [];
    for (let c = 1; c <= colCount; c++) {
      if (predicate(groups[c - 1], subs[c - 1], c)) matches.push(c);
    }
    return matches;
  };

  const sizeMatches = findOne("ขนาดกำลังผลิต", (_g, s) => s === "ขนาดกำลังผลิต");
  if (sizeMatches.length === 0) return columnMissingIssue("ขนาดกำลังผลิต");
  if (sizeMatches.length > 1) {
    return columnAmbiguousIssue("ขนาดกำลังผลิต", columnLetter(sizeMatches[0]), columnLetter(sizeMatches[1]));
  }
  const size = sizeMatches[0];
  const unit = size + 1; // "คอลัมน์ถัดจาก size" — research-145 §2.3
  if (unit > colCount || subs[unit - 1] !== "หน่วย") {
    return columnMissingIssue("หน่วย");
  }

  const phaseMatches = findOne("Phase", (_g, s) => s === "Phase");
  if (phaseMatches.length === 0) return columnMissingIssue("Phase");
  if (phaseMatches.length > 1) {
    return columnAmbiguousIssue("Phase", columnLetter(phaseMatches[0]), columnLetter(phaseMatches[1]));
  }

  const sunMatches = findOne(
    "ผลิตพลังงานต่อวัน (จำนวนชั่วโมงที่ผลิตได้)",
    (g, s) => g === "ผลิตพลังงานต่อวัน" && s.startsWith("จำนวนชั่วโมง")
  );
  if (sunMatches.length === 0) return columnMissingIssue("ผลิตพลังงานต่อวัน (จำนวนชั่วโมงที่ผลิตได้)");
  if (sunMatches.length > 1) {
    return columnAmbiguousIssue(
      "ผลิตพลังงานต่อวัน (จำนวนชั่วโมงที่ผลิตได้)",
      columnLetter(sunMatches[0]),
      columnLetter(sunMatches[1])
    );
  }

  const daysMatches = findOne(
    "ผลิตพลังงานต่อเดือน (จำนวนวัน)",
    (g, s) => g === "ผลิตพลังงานต่อเดือน" && s === "จำนวนวัน"
  );
  if (daysMatches.length === 0) return columnMissingIssue("ผลิตพลังงานต่อเดือน (จำนวนวัน)");
  if (daysMatches.length > 1) {
    return columnAmbiguousIssue("ผลิตพลังงานต่อเดือน (จำนวนวัน)", columnLetter(daysMatches[0]), columnLetter(daysMatches[1]));
  }

  const panelsMatches = findOne(
    "แผงโซล่าเซลล์ (จำนวนติดตั้ง)",
    (g, s) => g === "แผงโซล่าเซลล์" && s === "จำนวนติดตั้ง"
  );
  if (panelsMatches.length === 0) return columnMissingIssue("แผงโซล่าเซลล์ (จำนวนติดตั้ง)");
  if (panelsMatches.length > 1) {
    return columnAmbiguousIssue("แผงโซล่าเซลล์ (จำนวนติดตั้ง)", columnLetter(panelsMatches[0]), columnLetter(panelsMatches[1]));
  }

  const roofMatches = findOne(
    "แผงโซล่าเซลล์ (พื้นที่หลังคา)",
    (g, s) => g === "แผงโซล่าเซลล์" && s.startsWith("พื้นที่หลังคา")
  );
  // roof area is optional in the contract (research-145 §2.3) — never reject on it.
  const roof = roofMatches.length === 1 ? roofMatches[0] : null;

  const billMatches = findOne("ค่าไฟ (ประมาณ)", (g, s) => g === "ค่าไฟ" && s === "ประมาณ").sort((a, b) => a - b);
  if (billMatches.length < 2) return columnMissingIssue("ค่าไฟ (ประมาณ – สูงสุด)");
  if (billMatches.length > 2) {
    return columnAmbiguousIssue("ค่าไฟ (ประมาณ)", columnLetter(billMatches[0]), columnLetter(billMatches[billMatches.length - 1]));
  }

  const priceMatches = findOne("ค่าไฟ (ค่าไฟ/หน่วย)", (g, s) => g === "ค่าไฟ" && s === "ค่าไฟ/หน่วย");
  if (priceMatches.length === 0) return columnMissingIssue("ค่าไฟ (ค่าไฟ/หน่วย)");
  if (priceMatches.length > 1) {
    return columnAmbiguousIssue("ค่าไฟ (ค่าไฟ/หน่วย)", columnLetter(priceMatches[0]), columnLetter(priceMatches[1]));
  }

  return {
    size,
    unit,
    phase: phaseMatches[0],
    sunHours: sunMatches[0],
    days: daysMatches[0],
    panels: panelsMatches[0],
    roof,
    billMin: billMatches[0],
    billMax: billMatches[1],
    pricePerKwh: priceMatches[0],
  };
}

type RawRow = {
  excelRow: number;
  kw: number;
  phase: 1 | 3;
  sunHours: number;
  days: number;
  panels: number;
  roofM2: number;
  billMin: number;
  billMax: number;
  pricePerKwh: number;
};

/** Parses the workbook's On-grid sheet into a validated SizeRow[]. */
export async function parseOnGridSheet(buf: Buffer): Promise<ParseOnGridResult> {
  let workbook: ExcelJS.Workbook;
  try {
    workbook = new ExcelJS.Workbook();
    // exceljs's own .d.ts declares a global `Buffer extends ArrayBuffer {}`
    // that conflicts with @types/node's generic Buffer<T> — cast through
    // exceljs's own parameter type rather than fighting the ambient merge.
    await workbook.xlsx.load(buf as unknown as ExcelJsLoadBuffer);
  } catch {
    return { ok: false, errors: [readErrorIssue()] };
  }

  const onGridSheets = workbook.worksheets.filter((s) => /^on[\s-]?grid$/i.test(s.name.trim()));
  if (onGridSheets.length === 0) {
    return { ok: false, errors: [sheetNotFoundIssue()] };
  }
  const ws = onGridSheets[0];
  const skippedSheets = workbook.worksheets.filter((s) => s !== ws).map((s) => s.name);

  if (ws.rowCount > MAX_ROW_COUNT || ws.columnCount > MAX_COL_COUNT) {
    return { ok: false, errors: [sheetTooLargeIssue()] };
  }

  let groupRow = -1;
  const scanLimit = Math.min(MAX_HEADER_SCAN_ROWS, ws.rowCount);
  for (let r = 1; r <= scanLimit; r++) {
    let found = false;
    for (let c = 1; c <= ws.columnCount; c++) {
      if (cellText(ws, r, c) === HEADER_MARKER) {
        found = true;
        break;
      }
    }
    if (found) {
      groupRow = r;
      break;
    }
  }
  if (groupRow === -1) {
    return { ok: false, errors: [headerNotFoundIssue()] };
  }
  const subRow = groupRow + 1;

  const columns = findColumns(ws, groupRow, subRow, ws.columnCount);
  if (!("size" in columns)) {
    return { ok: false, errors: [columns] };
  }

  const warnings: ImportWarning[] = [];
  const rowIssues: ImportIssue[] = [];
  const rawRows: RawRow[] = [];

  const hiddenRows: number[] = [];
  let excelRow = subRow + 1;
  let rowsRead = 0;
  while (excelRow <= ws.rowCount && rowsRead < MAX_ROW_COUNT) {
    if (isCellEmpty(ws, excelRow, columns.size)) break; // "หยุดที่แถวแรกที่คอลัมน์ขนาดว่าง" — research-145 §2.2
    rowsRead++;
    if (ws.getRow(excelRow).hidden) hiddenRows.push(excelRow);

    const sizeRead = cellNumber(ws, excelRow, columns.size);
    if (!sizeRead.ok) {
      if (sizeRead.noCachedResult) {
        rowIssues.push(formulaNoCachedIssue(excelRow, columnLetter(columns.size), "ขนาดกำลังผลิต"));
      } else {
        rowIssues.push(sizeInvalidIssue(excelRow, columnLetter(columns.size)));
      }
      excelRow++;
      continue;
    }
    if (sizeRead.value <= 0) {
      rowIssues.push(sizeInvalidIssue(excelRow, columnLetter(columns.size)));
      excelRow++;
      continue;
    }
    if (sizeRead.wasText) {
      warnings.push(textNumberWarning(excelRow, columnLetter(columns.size), String(sizeRead.value)));
    }

    const unitText = cellText(ws, excelRow, columns.unit);
    const unitNormalized = unitText.trim().toLowerCase();
    let kw: number;
    if (unitNormalized === "kw") {
      kw = sizeRead.value;
    } else if (unitNormalized === "mw") {
      kw = sizeRead.value * 1000;
    } else {
      rowIssues.push(unitInvalidIssue(excelRow, columnLetter(columns.unit), unitText));
      excelRow++;
      continue;
    }
    kw = Math.round(kw * 1000) / 1000; // Default #9 — round to 3 decimals

    const phaseRead = cellNumber(ws, excelRow, columns.phase);
    if (!phaseRead.ok || (phaseRead.value !== 1 && phaseRead.value !== 3)) {
      const phaseText = phaseRead.ok ? String(phaseRead.value) : phaseRead.rawText;
      rowIssues.push(unitInvalidIssue(excelRow, columnLetter(columns.phase), phaseText));
      excelRow++;
      continue;
    }
    const phase = phaseRead.value as 1 | 3;

    let hadFormulaIssue = false;
    const readRequiredNumber = (
      col: number,
      field: "sunHours" | "days" | "panels" | "pricePerKwh",
      label: string
    ): number | null => {
      const read = cellNumber(ws, excelRow, col);
      if (!read.ok) {
        if (read.noCachedResult) {
          rowIssues.push(formulaNoCachedIssue(excelRow, columnLetter(col), label));
        } else {
          rowIssues.push(outOfRangeIssue(excelRow, columnLetter(col), field, read.rawText || "(ว่าง)"));
        }
        hadFormulaIssue = true;
        return null;
      }
      if (read.wasFormula) {
        warnings.push(formulaCachedWarning(excelRow, columnLetter(col), label, String(read.value)));
      }
      if (read.wasText) {
        warnings.push(textNumberWarning(excelRow, columnLetter(col), String(read.value)));
      }
      return read.value;
    };

    const sunHours = readRequiredNumber(columns.sunHours, "sunHours", "ชั่วโมงแดด");
    const days = readRequiredNumber(columns.days, "days", "วันต่อเดือน");
    const panels = readRequiredNumber(columns.panels, "panels", "จำนวนแผง");
    const pricePerKwh = readRequiredNumber(columns.pricePerKwh, "pricePerKwh", "ค่าไฟ/หน่วย");

    if (hadFormulaIssue || sunHours === null || days === null || panels === null || pricePerKwh === null) {
      excelRow++;
      continue;
    }

    if (sunHours < 1 || sunHours > 12) {
      rowIssues.push(outOfRangeIssue(excelRow, columnLetter(columns.sunHours), "sunHours", String(sunHours)));
    }
    if (days < 28 || days > 31) {
      rowIssues.push(outOfRangeIssue(excelRow, columnLetter(columns.days), "days", String(days)));
    }
    if (pricePerKwh < 0.01 || pricePerKwh > 50) {
      rowIssues.push(outOfRangeIssue(excelRow, columnLetter(columns.pricePerKwh), "pricePerKwh", String(pricePerKwh)));
    }
    if (!Number.isInteger(panels) || panels < 1) {
      rowIssues.push(outOfRangeIssue(excelRow, columnLetter(columns.panels), "panels", String(panels)));
    }

    let roofM2: number;
    if (columns.roof !== null) {
      const roofRead = cellNumber(ws, excelRow, columns.roof);
      if (roofRead.ok) {
        roofM2 = roofRead.value;
      } else {
        roofM2 = Math.round(panels * ROOF_M2_PER_PANEL * 100) / 100;
        warnings.push(roofEmptyWarning(excelRow));
      }
    } else {
      roofM2 = Math.round(panels * ROOF_M2_PER_PANEL * 100) / 100;
      warnings.push(roofEmptyWarning(excelRow));
    }

    const billMinRead = cellNumber(ws, excelRow, columns.billMin);
    const billMaxRead = cellNumber(ws, excelRow, columns.billMax);
    if (!billMaxRead.ok) {
      rowIssues.push(billMaxMissingIssue(excelRow, columnLetter(columns.billMax), kw));
      excelRow++;
      continue;
    }
    if (!billMinRead.ok) {
      rowIssues.push(billMinMissingIssue(excelRow, columnLetter(columns.billMin), kw));
      excelRow++;
      continue;
    }
    if (billMinRead.value >= billMaxRead.value) {
      rowIssues.push(
        billMinGteMaxIssue(excelRow, billMinRead.value.toLocaleString("th-TH"), billMaxRead.value.toLocaleString("th-TH"))
      );
      excelRow++;
      continue;
    }

    rawRows.push({
      excelRow,
      kw,
      phase,
      sunHours: Math.round(sunHours * 10) / 10,
      days,
      panels,
      roofM2,
      billMin: billMinRead.value,
      billMax: billMaxRead.value,
      pricePerKwh: Math.round(pricePerKwh * 100) / 100,
    });

    if (kw * sunHours * days * pricePerKwh > billMaxRead.value) {
      warnings.push(theoreticalExceedsBillWarning(kw));
    }

    excelRow++;
  }

  // research-145 §4.2: hidden rows are still imported, but the admin should know.
  if (hiddenRows.length > 0) {
    const shown = hiddenRows.slice(0, 10).join(", ") + (hiddenRows.length > 10 ? ", …" : "");
    warnings.push(hiddenRowsWarning(`แถว ${shown}`));
  }

  if (rowIssues.length > 0) {
    return { ok: false, errors: sortIssuesByRow(rowIssues) };
  }

  // Merge 1φ/3φ rows of the same kW (#146 / C5): identical other fields -> one
  // row with both phases; otherwise -> Reject (never silently pick a side).
  const byKw = new Map<number, RawRow[]>();
  for (const row of rawRows) {
    const list = byKw.get(row.kw) ?? [];
    list.push(row);
    byKw.set(row.kw, list);
  }

  const mergeIssues: ImportIssue[] = [];
  const merged: SizeRow[] = [];
  for (const [kw, group] of byKw) {
    if (group.length === 1) {
      const r = group[0];
      merged.push({
        kw,
        phases: [r.phase],
        sunHours: r.sunHours,
        days: r.days,
        pricePerKwh: r.pricePerKwh,
        panels: r.panels,
        roofM2: r.roofM2,
        billMin: r.billMin,
        billMax: r.billMax,
      });
      continue;
    }

    if (group.length > 2 || group[0].phase === group[1].phase) {
      // Two-or-more rows sharing a phase — flag every same-phase pair once.
      const seenPhases = new Map<number, RawRow>();
      for (const r of group) {
        const prior = seenPhases.get(r.phase);
        if (prior) {
          mergeIssues.push(duplicateSamePhaseIssue(prior.excelRow, r.excelRow, kw, r.phase));
        } else {
          seenPhases.set(r.phase, r);
        }
      }
      continue;
    }

    const [a, b] = group[0].phase === 1 ? [group[0], group[1]] : [group[1], group[0]];
    const fieldsToCompare: { field: keyof RawRow; label: string }[] = [
      { field: "sunHours", label: "ชั่วโมงแดด/วัน" },
      { field: "days", label: "วันต่อเดือน" },
      { field: "panels", label: "จำนวนแผง" },
      { field: "roofM2", label: "พื้นที่หลังคา" },
      { field: "billMin", label: "ค่าไฟต่ำสุด" },
      { field: "billMax", label: "ค่าไฟสูงสุด" },
      { field: "pricePerKwh", label: "ค่าไฟ/หน่วย" },
    ];
    const mismatch = fieldsToCompare.find(({ field }) => a[field] !== b[field]);
    if (mismatch) {
      mergeIssues.push(
        phaseMismatchIssue(a.excelRow, b.excelRow, kw, mismatch.label, String(a[mismatch.field]), String(b[mismatch.field]))
      );
      continue;
    }

    merged.push({
      kw,
      phases: [1, 3],
      sunHours: a.sunHours,
      days: a.days,
      pricePerKwh: a.pricePerKwh,
      panels: a.panels,
      roofM2: a.roofM2,
      billMin: a.billMin,
      billMax: a.billMax,
    });
  }

  if (mergeIssues.length > 0) {
    return { ok: false, errors: sortIssuesByRow(mergeIssues) };
  }

  const inputOrderKw = rawRows.map((r) => r.kw);
  const dedupedOrderKw = Array.from(new Set(inputOrderKw));
  const sortedByKw = [...dedupedOrderKw].sort((x, y) => x - y);
  const wasSorted = dedupedOrderKw.every((kw, index) => kw === sortedByKw[index]);
  if (!wasSorted) {
    warnings.push(notSortedWarning());
  }

  merged.sort((x, y) => x.kw - y.kw);

  const monotoneIssues: ImportIssue[] = [];
  let prev: SizeRow | null = null;
  for (const row of merged) {
    if (prev !== null && row.billMax <= prev.billMax) {
      const sourceRow = rawRows.find((r) => r.kw === row.kw)?.excelRow ?? subRow + 1;
      monotoneIssues.push(
        billMaxNotIncreasingIssue(
          sourceRow,
          row.kw,
          row.billMax.toLocaleString("th-TH"),
          prev.kw,
          prev.billMax.toLocaleString("th-TH")
        )
      );
    }
    prev = row;
  }
  if (monotoneIssues.length > 0) {
    return { ok: false, errors: sortIssuesByRow(monotoneIssues) };
  }

  // Defensive final check — mirrors S1's sizeTableSchema so a bug above can
  // never produce a table that fails validation downstream (S5 re-parses
  // with this same schema before writing CalculatorConfig.sizeTable).
  const parsed = sizeTableSchema.safeParse(merged);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((issue) => ({
        code: "schema-validation",
        message: issue.message,
      })),
    };
  }

  return { ok: true, rows: parsed.data, warnings, rowsRead, skippedSheets };
}
