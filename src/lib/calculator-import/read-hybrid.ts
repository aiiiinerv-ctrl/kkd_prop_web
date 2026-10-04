// Reads the "Hybrid" sheet of the sales team's Excel workbook into a
// HybridRow[] (src/lib/calculator-hybrid.ts) — one row per (kW, phase,
// battery) — plus, per row, the Excel row it came from (`sourceRows`).
// Contract: research-154 §2 / §4 (backlogs/done/ISSUE_153_…/research-154-
// hybrid-read-contract.md), R2-S2 in docs/plans/calculator-hybrid-toggle-sprints.md.
//
// - Sheet is found by name (/^hybrid$/i), header block by the marker
//   "ผลิตพลังงานต่อวัน"; columns by group|sub label, never by position.
// - Prices are read ONLY from the group "ยี่ห้อ" (the payback group repeats
//   the same brand names with formulas — never read from it).
// - Reading stops at the first row whose size cell is empty, so the second
//   block below the table (battery-price block) is never read (E16).
// - Never evaluates formulas: cached `result` only. Price 0 / blank = no
//   price (null, E1/E2); no `formula-cached` warning for price columns (the
//   103 formula cells would only be noise — research-154 §2.4).
// - Table-level rules (ranges, duplicates, E11–E13, warnings E3–E5) live in
//   the client-safe validate-hybrid.ts and are applied by parse-hybrid.ts.
//
// Pure w.r.t. the outside world once handed a Buffer; call validateXlsxBuffer()
// first (guards run before exceljs touches the file). Never import from a
// client component.
import ExcelJS from "exceljs";
import { BRAND_FORBIDDEN_CHARS, brandNameKey } from "../calculator-hybrid";
import type { HybridRow } from "../calculator-hybrid";
import { validateOnGridRowBill, validateOnGridRowRanges } from "./validate-on-grid";
import {
  asHybridIssue,
  asHybridWarning,
  billMaxMissingIssue,
  billMinMissingIssue,
  formulaNoCachedIssue,
  hybridBatteryInvalidIssue,
  hybridBrandGroupMissingIssue,
  hybridBrandInvalidIssue,
  hybridColumnAmbiguousIssue,
  hybridColumnMissingIssue,
  hybridHeaderNotFoundIssue,
  hybridHiddenRowsWarning,
  hybridNoRowsIssue,
  hybridPhaseInvalidIssue,
  hybridPriceNotNumberIssue,
  hybridSheetTooLargeIssue,
  outOfRangeIssue,
  readErrorIssue,
  roofEmptyWarning,
  sizeInvalidIssue,
  sortIssuesByRow,
  textNumberWarning,
  toExcelLocation,
  unitInvalidIssue,
} from "./messages";
import type { ImportIssue, ImportWarning } from "./messages";
import {
  cellNumber,
  cellText,
  columnLetter,
  HEADER_MARKER,
  isCellEmpty,
  MAX_COL_COUNT,
  MAX_HEADER_SCAN_ROWS,
  MAX_ROW_COUNT,
  ROOF_M2_PER_PANEL,
} from "./read-on-grid";
import type { ExcelJsLoadBuffer } from "./read-on-grid";

/** Header labels this reader matches on (group row / sub row). `*Prefix` subs
 * are matched with startsWith. Exported so the Hybrid export (R2-S5) writes
 * headers from the same constants and can never drift from the reader. */
export const HYBRID_HEADER = {
  size: { group: "ขนาดกำลังผลิต", sub: "ขนาด" },
  unit: { sub: "หน่วย" },
  phase: { group: "ขนาดกำลังผลิต", sub: "Phase" },
  battery: { group: "ขนาดกำลังผลิต", subPrefix: "ขนาดแบตเตอรี่" },
  sunHours: { group: HEADER_MARKER, subPrefix: "จำนวนชั่วโมง" },
  days: { group: "ผลิตพลังงานต่อเดือน", sub: "จำนวนวัน" },
  panels: { group: "แผงโซล่าเซลล์", sub: "จำนวนติดตั้ง" },
  roof: { group: "แผงโซล่าเซลล์", subPrefix: "พื้นที่หลังคา" },
  bill: { group: "ค่าไฟ", sub: "ประมาณ" },
  price: { group: "ค่าไฟ", sub: "ค่าไฟ/หน่วย" },
  brand: { group: "ยี่ห้อ" },
} as const;

export const HYBRID_SHEET_NAME_PATTERN = /^hybrid$/i;
const MAX_BRANDS = 10;
const MAX_BRAND_NAME_CHARS = 50;

export type ReadHybridResult =
  | { ok: true; present: false }
  | {
      ok: true;
      present: true;
      /** Sorted by (kW, phase, battery). Not yet table-validated. */
      rows: HybridRow[];
      /** Per row (same index as `rows`): the Excel row it was read from. */
      sourceRows: number[];
      /** Field -> Excel column letter, for mapping table issues back to cells. */
      columns: Partial<Record<string, string>>;
      warnings: ImportWarning[];
      rowsRead: number;
    }
  | { ok: false; errors: ImportIssue[] };

type ColumnMap = {
  size: number;
  unit: number;
  phase: number;
  battery: number;
  sunHours: number;
  days: number;
  panels: number;
  roof: number | null;
  billMin: number;
  billMax: number;
  pricePerKwh: number;
  brands: { col: number; name: string }[];
};

function findColumns(ws: ExcelJS.Worksheet, groupRow: number, subRow: number, colCount: number): ColumnMap | ImportIssue {
  const groups: string[] = [];
  const subs: string[] = [];
  for (let c = 1; c <= colCount; c++) {
    groups.push(cellText(ws, groupRow, c));
    subs.push(cellText(ws, subRow, c));
  }
  const find = (predicate: (group: string, sub: string) => boolean): number[] => {
    const matches: number[] = [];
    for (let c = 1; c <= colCount; c++) if (predicate(groups[c - 1], subs[c - 1])) matches.push(c);
    return matches;
  };
  // Exactly one match, or the issue to return.
  const one = (label: string, matches: number[]): number | ImportIssue => {
    if (matches.length === 0) return hybridColumnMissingIssue(label);
    if (matches.length > 1) return hybridColumnAmbiguousIssue(label, columnLetter(matches[0]), columnLetter(matches[1]));
    return matches[0];
  };

  const H = HYBRID_HEADER;
  const size = one("ขนาดกำลังผลิต (ขนาด)", find((g, s) => g === H.size.group && s === H.size.sub));
  if (typeof size !== "number") return size;
  const unit = size + 1; // "คอลัมน์ถัดจาก kw" — research-154 §2.3
  if (unit > colCount || subs[unit - 1] !== H.unit.sub) return hybridColumnMissingIssue("หน่วย");

  const phase = one("Phase", find((g, s) => g === H.phase.group && s === H.phase.sub));
  if (typeof phase !== "number") return phase;
  const battery = one(
    "ขนาดแบตเตอรี่",
    find((g, s) => g === H.battery.group && s.startsWith(H.battery.subPrefix))
  );
  if (typeof battery !== "number") return battery;
  const sunHours = one(
    "ผลิตพลังงานต่อวัน (จำนวนชั่วโมงที่ผลิตได้)",
    find((g, s) => g === H.sunHours.group && s.startsWith(H.sunHours.subPrefix))
  );
  if (typeof sunHours !== "number") return sunHours;
  const days = one("ผลิตพลังงานต่อเดือน (จำนวนวัน)", find((g, s) => g === H.days.group && s === H.days.sub));
  if (typeof days !== "number") return days;
  const panels = one("แผงโซล่าเซลล์ (จำนวนติดตั้ง)", find((g, s) => g === H.panels.group && s === H.panels.sub));
  if (typeof panels !== "number") return panels;

  // roof area is optional (research-154 §2.3) — never reject on it.
  const roofMatches = find((g, s) => g === H.roof.group && s.startsWith(H.roof.subPrefix));
  const roof = roofMatches.length === 1 ? roofMatches[0] : null;

  const billMatches = find((g, s) => g === H.bill.group && s === H.bill.sub).sort((a, b) => a - b);
  if (billMatches.length < 2) return hybridColumnMissingIssue("ค่าไฟ (ประมาณ – สูงสุด)");
  if (billMatches.length > 2) {
    return hybridColumnAmbiguousIssue("ค่าไฟ (ประมาณ)", columnLetter(billMatches[0]), columnLetter(billMatches[billMatches.length - 1]));
  }
  const pricePerKwh = one("ค่าไฟ (ค่าไฟ/หน่วย)", find((g, s) => g === H.price.group && s === H.price.sub));
  if (typeof pricePerKwh !== "number") return pricePerKwh;

  // Brands: ONLY the group "ยี่ห้อ" — the payback group reuses the same names.
  const brandCols = find((g, s) => g === H.brand.group && s !== "");
  if (brandCols.length === 0) return hybridBrandGroupMissingIssue();
  const brands = brandCols.map((col) => ({ col, name: subs[col - 1] }));
  if (brands.length > MAX_BRANDS) return hybridBrandInvalidIssue(`มี ${brands.length} ยี่ห้อ`);
  // Fixed text only: a rejected name is never echoed back (it may hide bidi/control characters).
  if (brands.some((b) => BRAND_FORBIDDEN_CHARS.test(b.name))) return hybridBrandInvalidIssue("มีชื่อยี่ห้อที่มีอักขระควบคุมหรืออักขระซ่อน");
  if (new Set(brands.map((b) => brandNameKey(b.name))).size !== brands.length) return hybridBrandInvalidIssue("มีชื่อยี่ห้อซ้ำกัน");
  if (brands.some((b) => b.name.length > MAX_BRAND_NAME_CHARS)) return hybridBrandInvalidIssue("มีชื่อยี่ห้อที่ยาวเกินไป");

  return { size, unit, phase, battery, sunHours, days, panels, roof, billMin: billMatches[0], billMax: billMatches[1], pricePerKwh, brands };
}

type PriceRead =
  | { kind: "ok"; value: number | null; wasText: boolean }
  | { kind: "noCache" }
  | { kind: "bad"; raw: string };

/** Price cell: blank / 0 -> null (E1/E2); formulas contribute their cached result only. */
function readPrice(ws: ExcelJS.Worksheet, row: number, col: number): PriceRead {
  const raw = ws.getRow(row).getCell(col).value;
  let value: unknown = raw;
  let wasText = false;
  if (raw && typeof raw === "object" && ("formula" in raw || "sharedFormula" in raw)) {
    value = (raw as { result?: unknown }).result;
    if (typeof value !== "number") return { kind: "noCache" };
  }
  if (value === null || value === undefined) return { kind: "ok", value: null, wasText };
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return { kind: "ok", value: null, wasText };
    const parsed = Number(trimmed.replace(/,/g, ""));
    if (!Number.isFinite(parsed)) return { kind: "bad", raw: trimmed };
    value = parsed;
    wasText = true;
  }
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return { kind: "bad", raw: String(value) };
  return { kind: "ok", value: value === 0 ? null : value, wasText };
}

/** Reads the workbook's Hybrid sheet; `present: false` when the workbook has none (D3). */
export async function readHybridSheet(buf: Buffer): Promise<ReadHybridResult> {
  let workbook: ExcelJS.Workbook;
  try {
    workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buf as unknown as ExcelJsLoadBuffer);
  } catch {
    return { ok: false, errors: [readErrorIssue()] };
  }

  const sheets = workbook.worksheets.filter((s) => HYBRID_SHEET_NAME_PATTERN.test(s.name.trim()));
  if (sheets.length === 0) return { ok: true, present: false };
  const ws = sheets[0];

  if (ws.rowCount > MAX_ROW_COUNT || ws.columnCount > MAX_COL_COUNT) {
    return { ok: false, errors: [hybridSheetTooLargeIssue()] };
  }

  let groupRow = -1;
  const scanLimit = Math.min(MAX_HEADER_SCAN_ROWS, ws.rowCount);
  for (let r = 1; r <= scanLimit && groupRow === -1; r++) {
    for (let c = 1; c <= ws.columnCount; c++) {
      if (cellText(ws, r, c) === HEADER_MARKER) {
        groupRow = r;
        break;
      }
    }
  }
  if (groupRow === -1) return { ok: false, errors: [hybridHeaderNotFoundIssue()] };
  const subRow = groupRow + 1;

  const columns = findColumns(ws, groupRow, subRow, ws.columnCount);
  if (!("size" in columns)) return { ok: false, errors: [columns] };

  const warnings: ImportWarning[] = [];
  const rowIssues: ImportIssue[] = [];
  const read: { row: HybridRow; excelRow: number }[] = [];
  const hiddenRows: number[] = [];
  const roofWarnedKw = new Set<number>();

  let excelRow = subRow + 1;
  let rowsRead = 0;
  while (excelRow <= ws.rowCount && rowsRead < MAX_ROW_COUNT) {
    if (isCellEmpty(ws, excelRow, columns.size)) break; // E16: stop at the first blank size cell
    rowsRead++;
    if (ws.getRow(excelRow).hidden) hiddenRows.push(excelRow);
    const issuesBefore = rowIssues.length;

    const sizeRead = cellNumber(ws, excelRow, columns.size);
    if (!sizeRead.ok || sizeRead.value <= 0) {
      rowIssues.push(
        !sizeRead.ok && sizeRead.noCachedResult
          ? asHybridIssue(formulaNoCachedIssue(excelRow, columnLetter(columns.size), "ขนาดกำลังผลิต"))
          : asHybridIssue(sizeInvalidIssue(excelRow, columnLetter(columns.size)))
      );
      excelRow++;
      continue;
    }
    if (sizeRead.wasText) warnings.push(asHybridWarning(textNumberWarning(excelRow, columnLetter(columns.size), String(sizeRead.value))));

    const unitText = cellText(ws, excelRow, columns.unit);
    const unit = unitText.trim().toLowerCase(); // E15: " kW" -> trimmed
    let kw: number;
    if (unit === "kw") kw = sizeRead.value;
    else if (unit === "mw") kw = sizeRead.value * 1000;
    else {
      rowIssues.push(asHybridIssue(unitInvalidIssue(excelRow, columnLetter(columns.unit), unitText)));
      excelRow++;
      continue;
    }
    kw = Math.round(kw * 1000) / 1000;

    const phaseRead = cellNumber(ws, excelRow, columns.phase);
    if (!phaseRead.ok || (phaseRead.value !== 1 && phaseRead.value !== 3)) {
      rowIssues.push(hybridPhaseInvalidIssue(excelRow, columnLetter(columns.phase), phaseRead.ok ? String(phaseRead.value) : phaseRead.rawText));
      excelRow++;
      continue;
    }
    const phase = phaseRead.value as 1 | 3;

    const batteryRead = cellNumber(ws, excelRow, columns.battery);
    if (!batteryRead.ok || batteryRead.value < 0) {
      rowIssues.push(hybridBatteryInvalidIssue(excelRow, columnLetter(columns.battery)));
      excelRow++;
      continue;
    }
    if (batteryRead.wasText) warnings.push(asHybridWarning(textNumberWarning(excelRow, columnLetter(columns.battery), String(batteryRead.value))));

    const readRequired = (col: number, field: "sunHours" | "days" | "panels" | "pricePerKwh", label: string): number | null => {
      const r = cellNumber(ws, excelRow, col);
      if (!r.ok) {
        rowIssues.push(
          asHybridIssue(
            r.noCachedResult
              ? formulaNoCachedIssue(excelRow, columnLetter(col), label)
              : outOfRangeIssue(excelRow, columnLetter(col), field, r.rawText || "(ว่าง)")
          )
        );
        return null;
      }
      // No `formula-cached` warning here: cached results are the contract (research-154 §2.4).
      if (r.wasText) warnings.push(asHybridWarning(textNumberWarning(excelRow, columnLetter(col), String(r.value))));
      return r.value;
    };
    const sunHours = readRequired(columns.sunHours, "sunHours", "ชั่วโมงแดด");
    const days = readRequired(columns.days, "days", "วันต่อเดือน");
    const panels = readRequired(columns.panels, "panels", "จำนวนแผง");
    const pricePerKwh = readRequired(columns.pricePerKwh, "pricePerKwh", "ค่าไฟ/หน่วย");
    if (sunHours === null || days === null || panels === null || pricePerKwh === null) {
      excelRow++;
      continue;
    }

    const rowContext = [[excelRow]];
    const rangeColumns = {
      sunHours: columnLetter(columns.sunHours),
      days: columnLetter(columns.days),
      pricePerKwh: columnLetter(columns.pricePerKwh),
      panels: columnLetter(columns.panels),
    };
    for (const tableIssue of validateOnGridRowRanges({ sunHours, days, pricePerKwh, panels }, 0)) {
      rowIssues.push(asHybridIssue(toExcelLocation(tableIssue, rowContext, rangeColumns)));
    }

    let roofM2: number;
    const roofRead = columns.roof !== null ? cellNumber(ws, excelRow, columns.roof) : null;
    if (roofRead?.ok) {
      roofM2 = roofRead.value;
    } else {
      roofM2 = Math.round(panels * ROOF_M2_PER_PANEL * 100) / 100;
      if (!roofWarnedKw.has(kw)) {
        roofWarnedKw.add(kw);
        warnings.push(asHybridWarning(roofEmptyWarning(excelRow)));
      }
    }

    const billMaxRead = cellNumber(ws, excelRow, columns.billMax);
    const billMinRead = cellNumber(ws, excelRow, columns.billMin);
    if (!billMaxRead.ok) {
      rowIssues.push(asHybridIssue(billMaxMissingIssue(excelRow, columnLetter(columns.billMax), kw)));
      excelRow++;
      continue;
    }
    if (!billMinRead.ok) {
      rowIssues.push(asHybridIssue(billMinMissingIssue(excelRow, columnLetter(columns.billMin), kw)));
      excelRow++;
      continue;
    }
    for (const tableIssue of validateOnGridRowBill({ billMin: billMinRead.value, billMax: billMaxRead.value }, 0)) {
      rowIssues.push(asHybridIssue(toExcelLocation(tableIssue, rowContext)));
    }

    const brandPrices: HybridRow["brandPrices"] = [];
    for (const brand of columns.brands) {
      const price = readPrice(ws, excelRow, brand.col);
      if (price.kind === "noCache") {
        rowIssues.push(asHybridIssue(formulaNoCachedIssue(excelRow, columnLetter(brand.col), brand.name)));
        brandPrices.push({ brand: brand.name, priceThb: null });
      } else if (price.kind === "bad") {
        rowIssues.push(hybridPriceNotNumberIssue(excelRow, columnLetter(brand.col), brand.name, price.raw));
        brandPrices.push({ brand: brand.name, priceThb: null });
      } else {
        if (price.wasText) warnings.push(asHybridWarning(textNumberWarning(excelRow, columnLetter(brand.col), String(price.value))));
        brandPrices.push({ brand: brand.name, priceThb: price.value });
      }
    }

    if (rowIssues.length === issuesBefore) {
      read.push({
        excelRow,
        row: {
          kw,
          phase,
          batteryKwh: batteryRead.value,
          sunHours: Math.round(sunHours * 10) / 10,
          days,
          pricePerKwh: Math.round(pricePerKwh * 100) / 100,
          panels,
          roofM2,
          billMin: billMinRead.value,
          billMax: billMaxRead.value,
          brandPrices,
        },
      });
    }
    excelRow++;
  }

  if (hiddenRows.length > 0) {
    const shown = hiddenRows.slice(0, 10).join(", ") + (hiddenRows.length > 10 ? ", …" : "");
    warnings.push(hybridHiddenRowsWarning(`แถว ${shown}`));
  }
  if (rowIssues.length > 0) return { ok: false, errors: sortIssuesByRow(rowIssues) };
  if (read.length === 0) return { ok: false, errors: [hybridNoRowsIssue()] };

  read.sort((a, b) => a.row.kw - b.row.kw || a.row.phase - b.row.phase || a.row.batteryKwh - b.row.batteryKwh);
  const columnLetters: Partial<Record<string, string>> = {
    sunHours: columnLetter(columns.sunHours),
    days: columnLetter(columns.days),
    pricePerKwh: columnLetter(columns.pricePerKwh),
    panels: columnLetter(columns.panels),
    billMin: columnLetter(columns.billMin),
    billMax: columnLetter(columns.billMax),
    batteryKwh: columnLetter(columns.battery),
  };
  if (columns.roof !== null) columnLetters.roofM2 = columnLetter(columns.roof);

  return {
    ok: true,
    present: true,
    rows: read.map((r) => r.row),
    sourceRows: read.map((r) => r.excelRow),
    columns: columnLetters,
    warnings,
    rowsRead,
  };
}
