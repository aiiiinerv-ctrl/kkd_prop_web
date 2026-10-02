// Thai-only copy for the admin Excel import flow (calculator size table).
// Admin UI is Thai-only (root admin layout) — these strings never go through
// src/messages/*.json; the TH/EN parity rule in AGENTS.md applies to public
// strings only (see S7). Wording here is copied verbatim from the source of
// truth: docs/plans/calculator-excel-import-admin-ui-spec.md §7 — keep this
// file in sync if that section changes.
//
// Pure module: no I/O, no React. validate-xlsx.ts / read-on-grid.ts /
// validate-on-grid.ts / diff.ts build ImportIssue values with these functions instead of inlining
// strings, so the copy stays in exactly one place.

export type ImportIssue = {
  /** Machine-stable key for tests — never shown to admins. */
  code: string;
  /** Full "{position}: {problem}" text (row-level issues also fold their
   *  "→ what to do" into this string, per spec §7.3's single "ข้อความ" column). */
  message: string;
  /** Separate "→ what to do" line — only set for file/structure-level issues
   *  (spec §7.1/§7.2 have a dedicated action column; §7.3 does not). */
  action?: string;
  /** 1-based Excel row this issue is about, when applicable — used to sort
   *  row-level issues before returning them. */
  row?: number;
};

export type ImportWarning = {
  code: string;
  message: string;
  row?: number;
};

/** Cell text can be arbitrarily long; anything echoed from the file into a
 * message (shown in the admin preview, later stored with the import) is capped. */
const MAX_ECHO_CHARS = 40;
export function clip(value: string): string {
  const oneLine = value.replace(/\s+/g, " ").trim();
  return oneLine.length > MAX_ECHO_CHARS ? `${oneLine.slice(0, MAX_ECHO_CHARS)}…` : oneLine;
}

function issue(code: string, message: string, extra?: { action?: string; row?: number }): ImportIssue {
  return { code, message, ...extra };
}
const issue_ = issue;

function warning(code: string, message: string, row?: number): ImportWarning {
  return { code, message, row };
}

// ---- §7.1 Reject — file level ----

export const invalidXlsxIssue = (): ImportIssue =>
  issue("invalid-xlsx", "รองรับเฉพาะไฟล์ .xlsx ที่ไม่ใส่รหัสผ่าน", {
    action: 'เปิดใน Excel แล้วเลือก "บันทึกเป็น" › สมุดงาน Excel (.xlsx) และไม่ตั้งรหัสผ่าน',
  });

export const fileTooLargeIssue = (sizeMb: string): ImportIssue =>
  issue("file-too-large", `ไฟล์ใหญ่เกิน 2 MB (ไฟล์นี้ ${sizeMb} MB)`, {
    action: "ลบ sheet หรือรูปภาพที่ไม่ใช้ แล้วบันทึกใหม่",
  });

export const malformedZipIssue = (): ImportIssue =>
  issue("malformed-zip", "ไฟล์ผิดรูปแบบ", { action: "เปิดใน Excel แล้วบันทึกใหม่เป็น .xlsx" });

export const macroDetectedIssue = (): ImportIssue =>
  issue("macro-detected", "ไฟล์มี macro", { action: "บันทึกเป็น .xlsx ธรรมดา (ไม่ใช่ .xlsm)" });

export const sheetTooLargeIssue = (): ImportIssue =>
  issue("sheet-too-large", "ตาราง On-grid ใหญ่ผิดปกติ (เกิน 1,000 แถว หรือ 100 คอลัมน์)", {
    action: "ลบแถว/คอลัมน์ว่างที่ถูกจัดรูปแบบไว้ แล้วบันทึกใหม่",
  });

export const readErrorIssue = (): ImportIssue =>
  issue("read-error", "อ่านไฟล์ไม่ได้", {
    action: "เปิดใน Excel แล้วบันทึกใหม่เป็น .xlsx แล้วลองอีกครั้ง",
  });

// ---- §7.2 Reject — structure level ----

export const sheetNotFoundIssue = (): ImportIssue =>
  issue("sheet-not-found", "ไม่พบ sheet ชื่อ On-grid", { action: 'ตรวจชื่อ sheet ให้เป็น "On-grid"' });

export const headerNotFoundIssue = (): ImportIssue =>
  issue("header-not-found", 'ไม่พบหัวตาราง "ผลิตพลังงานต่อวัน" ใน 20 แถวแรกของ sheet On-grid', {
    action: "ตรวจว่าหัวตารางยังอยู่ด้านบนของ sheet",
  });

export const columnMissingIssue = (label: string): ImportIssue =>
  issue("column-missing", `ไม่พบคอลัมน์ "${label}"`, {
    action: "ตรวจว่าหัวคอลัมน์ยังสะกดเหมือนไฟล์เดิม",
  });

export const columnAmbiguousIssue = (label: string, c1: string, c2: string): ImportIssue =>
  issue("column-ambiguous", `พบคอลัมน์ "${label}" มากกว่า 1 คอลัมน์ (${c1}, ${c2})`, {
    action: "เหลือไว้คอลัมน์เดียว",
  });

// ---- §7.3 Reject — row level (message already includes "→ …" inline) ----

export const unitInvalidIssue = (row: number, col: string, value: string): ImportIssue =>
  issue("unit-invalid", `แถว ${row}, คอลัมน์ ${col} (หน่วย): "${clip(value)}" → ใช้ได้เฉพาะ kW หรือ MW`, { row });

export const sizeInvalidIssue = (row: number, col: string): ImportIssue =>
  issue("size-invalid", `แถว ${row}, คอลัมน์ ${col} (ขนาดกำลังผลิต): ต้องเป็นตัวเลขมากกว่า 0`, { row });

export const duplicateSamePhaseIssue = (row1: number, row2: number, kw: number, phase: 1 | 3): ImportIssue =>
  issue(
    "duplicate-same-phase",
    `แถว ${row1} และ ${row2}: ขนาด ${kw} kW ${phase} เฟส ซ้ำกัน → ลบแถวที่ซ้ำ`,
    { row: Math.min(row1, row2) }
  );

export const phaseMismatchIssue = (
  row1: number,
  row2: number,
  kw: number,
  fieldLabel: string,
  a: string,
  b: string
): ImportIssue =>
  issue(
    "phase-mismatch",
    `แถว ${row1} และ ${row2}: ขนาด ${kw} kW แบบ 1 เฟสและ 3 เฟส มี${fieldLabel}ไม่ตรงกัน (${a} กับ ${b}) → แก้ให้ตรงกัน`,
    { row: Math.min(row1, row2) }
  );

export const billMaxMissingIssue = (row: number, col: string, kw: number): ImportIssue =>
  issue(
    "bill-max-missing",
    `แถว ${row}, คอลัมน์ ${col} (ค่าไฟ ประมาณ – สูงสุด): ว่าง → ใส่ค่าไฟสูงสุดของขนาด ${kw} kW`,
    { row }
  );

export const billMinMissingIssue = (row: number, col: string, kw: number): ImportIssue =>
  issue(
    "bill-min-missing",
    `แถว ${row}, คอลัมน์ ${col} (ค่าไฟ ประมาณ – ต่ำสุด): ว่าง → ใส่ค่าไฟต่ำสุดของขนาด ${kw} kW`,
    { row }
  );

export const billMinGteMaxIssue = (row: number, min: string, max: string): ImportIssue =>
  issue(
    "bill-min-gte-max",
    `แถว ${row}: ค่าไฟต่ำสุด (${min} ฿) ต้องน้อยกว่าค่าไฟสูงสุด (${max} ฿)`,
    { row }
  );

export const billMaxNotIncreasingIssue = (
  row: number,
  kw: number,
  max: string,
  prevKw: number,
  prevMax: string
): ImportIssue =>
  issue(
    "bill-max-not-increasing",
    `แถว ${row}: ค่าไฟสูงสุดของ ${kw} kW (${max} ฿) ต้องมากกว่าของขนาดก่อนหน้า ${prevKw} kW (${prevMax} ฿) → แก้ช่วงค่าไฟให้เพิ่มขึ้นตามขนาด`,
    { row }
  );

export const OUT_OF_RANGE_LABELS = {
  sunHours: { label: "ชั่วโมงแดด", range: "1–12" },
  days: { label: "วันต่อเดือน", range: "28–31" },
  pricePerKwh: { label: "ค่าไฟ/หน่วย", range: "0.01–50 ฿" },
  panels: { label: "จำนวนแผง", range: "จำนวนเต็มตั้งแต่ 1" },
} as const;

export type OutOfRangeField = keyof typeof OUT_OF_RANGE_LABELS;

export const outOfRangeIssue = (row: number, col: string, field: OutOfRangeField, value: string): ImportIssue => {
  const { label, range } = OUT_OF_RANGE_LABELS[field];
  return issue(
    "out-of-range",
    `แถว ${row}, คอลัมน์ ${col} (${label}): ${clip(value)} อยู่นอกช่วงที่รับได้ (${range})`,
    { row }
  );
};

export const formulaNoCachedIssue = (row: number, col: string, label: string): ImportIssue =>
  issue(
    "formula-no-cached",
    `แถว ${row}, คอลัมน์ ${col} (${label}): เป็นสูตรที่ไม่มีค่าที่คำนวณไว้ → เปิดไฟล์ใน Microsoft Excel แล้วกดบันทึกอีกครั้ง`,
    { row }
  );

// ---- §7.5 Warnings (not blocking) ----

export const packageNotInTableWarning = (kw: number): ImportWarning =>
  warning(
    "package-not-in-table",
    `Package ${kw} kW ไม่มีในตาราง — เครื่องคำนวณจะไม่แนะนำขนาดนี้ (หน้า Packages ยังแสดงตามปกติ)`
  );

export const sliderMaxWarning = (max: string, lastMax: string, lastKw: number): ImportWarning =>
  warning(
    "slider-max",
    `สไลด์บิลสูงสุด ${max} ฿ ไม่น้อยกว่าค่าไฟสูงสุดของขนาดใหญ่สุด (${lastMax} ฿) — ช่วงปลายสไลด์จะแสดง "ระบบเกิน ${lastKw} kW ปรึกษาทีมงาน"`
  );

export const externalLinksWarning = (): ImportWarning =>
  warning("external-links", "ไฟล์อ้างอิงไฟล์อื่น — ระบบใช้ค่าที่บันทึกไว้ในไฟล์นี้เท่านั้น");

export const hiddenRowsWarning = (rows: string): ImportWarning =>
  warning("hidden-rows", `sheet On-grid มีแถวที่ซ่อนอยู่ (${rows}) — ระบบยังอ่านค่าในแถวเหล่านี้`);

export const textNumberWarning = (row: number, col: string, value: string): ImportWarning =>
  warning("text-number", `แถว ${row}, คอลัมน์ ${col}: ตัวเลขถูกพิมพ์เป็นข้อความ ("${clip(value)}") — ระบบแปลงให้แล้ว`, row);

export const formulaCachedWarning = (row: number, col: string, label: string, value: string): ImportWarning =>
  warning(
    "formula-cached",
    `แถว ${row}, คอลัมน์ ${col} (${label}): เป็นสูตร — ใช้ค่าที่คำนวณไว้ (${clip(value)})`,
    row
  );

export const roofEmptyWarning = (row: number): ImportWarning =>
  warning("roof-empty", `แถว ${row}: ไม่มีพื้นที่หลังคา — คำนวณจากจำนวนแผง × 2.7 ตร.ม.`, row);

export const notSortedWarning = (): ImportWarning =>
  warning("not-sorted", "ขนาดในไฟล์ไม่เรียงจากน้อยไปมาก — ระบบเรียงให้แล้ว");

export const theoreticalExceedsBillWarning = (kw: number): ImportWarning =>
  warning(
    "theoretical-exceeds-bill",
    `ขนาด ${kw} kW ผลิตไฟได้มากกว่าค่าไฟสูงสุดของช่วง — หน้าเว็บจำกัดเงินประหยัดไม่เกินบิลอยู่แล้ว`
  );

/** Sorts row-level issues by their Excel row (ascending); issues without a
 * row (file/structure level) keep their original relative order and sort first. */
export function sortIssuesByRow(items: ImportIssue[]): ImportIssue[] {
  return [...items].sort((a, b) => {
    if (a.row === undefined && b.row === undefined) return 0;
    if (a.row === undefined) return -1;
    if (b.row === undefined) return 1;
    return a.row - b.row;
  });
}

// ---- Table-level issues (shared validator, R1-S1) ----
//
// validate-on-grid.ts checks a SizeRow[] with no knowledge of Excel. Its
// issues carry a position-free `message` (for the admin editor) plus the
// `code`/`data` needed to rebuild the exact Excel-flavoured ImportIssue
// above ("แถว N, คอลัมน์ X …") via toExcelLocation(). This file must stay
// client-safe (no Excel/zip libraries) — the editor imports it.

export type TableIssue = {
  table: "onGrid" | "hybrid";
  /** 0-based index into the SizeRow[] handed to the validator (-1 = whole table). */
  rowIndex: number;
  field?: string;
  /** Same `code` the matching ImportIssue uses. */
  code: string;
  /** Position-free Thai text — no row/column prefix. */
  message: string;
  /** Values needed to rebuild the Excel message. */
  data?: Record<string, string | number>;
};

export type TableWarning = {
  table: "onGrid" | "hybrid";
  rowIndex: number;
  code: string;
  message: string;
};

export const outOfRangeTableIssue = (rowIndex: number, field: OutOfRangeField, value: string): TableIssue => {
  const { label, range } = OUT_OF_RANGE_LABELS[field];
  return {
    table: "onGrid",
    rowIndex,
    field,
    code: "out-of-range",
    message: `${label}: ${clip(value)} อยู่นอกช่วงที่รับได้ (${range})`,
    data: { value },
  };
};

export const billMinGteMaxTableIssue = (rowIndex: number, min: string, max: string): TableIssue => ({
  table: "onGrid",
  rowIndex,
  field: "billMin",
  code: "bill-min-gte-max",
  message: `ค่าไฟต่ำสุด (${min} ฿) ต้องน้อยกว่าค่าไฟสูงสุด (${max} ฿)`,
  data: { min, max },
});

export const duplicateKwTableIssue = (rowIndex: number, kw: number): TableIssue => ({
  table: "onGrid",
  rowIndex,
  field: "kw",
  code: "duplicate-kw",
  message: `ขนาด ${kw} kW ซ้ำกับแถวก่อนหน้า`,
  data: { kw },
});

export const billMaxNotIncreasingTableIssue = (
  rowIndex: number,
  kw: number,
  max: string,
  prevKw: number,
  prevMax: string
): TableIssue => ({
  table: "onGrid",
  rowIndex,
  field: "billMax",
  code: "bill-max-not-increasing",
  message: `ค่าไฟสูงสุดของ ${kw} kW (${max} ฿) ต้องมากกว่าของขนาดก่อนหน้า ${prevKw} kW (${prevMax} ฿)`,
  data: { kw, max, prevKw, prevMax },
});

export const schemaTableIssue = (rowIndex: number, message: string): TableIssue => ({
  table: "onGrid",
  rowIndex,
  code: "schema-validation",
  message,
});

/** Rebuilds the Excel-flavoured ImportIssue for a TableIssue.
 * `sourceRows[rowIndex][0]` is the Excel row the table row was read from;
 * `columns` maps `field` -> Excel column letter where the message names one. */
export function toExcelLocation(
  issue: TableIssue,
  sourceRows: number[][],
  columns: Partial<Record<string, string>> = {}
): ImportIssue {
  const row = sourceRows[issue.rowIndex]?.[0] ?? 0;
  const data = issue.data ?? {};
  switch (issue.code) {
    case "out-of-range":
      return outOfRangeIssue(row, columns[issue.field ?? ""] ?? "", issue.field as OutOfRangeField, String(data.value));
    case "bill-min-gte-max":
      return billMinGteMaxIssue(row, String(data.min), String(data.max));
    case "bill-max-not-increasing":
      return billMaxNotIncreasingIssue(row, Number(data.kw), String(data.max), Number(data.prevKw), String(data.prevMax));
    case "duplicate-kw":
      return issue_("duplicate-kw", `แถว ${row}: ขนาด ${data.kw} kW ซ้ำกับแถวก่อนหน้า → ลบแถวที่ซ้ำ`, { row });
    default:
      return issue_(issue.code, issue.message);
  }
}

/** Hand-edit flavour of a TableIssue: names the row by its size instead of an
 * Excel row ("On-grid 5 kW: …") and keeps `rowIndex`/`field` so the editor can
 * point at the cell. Whole-table issues (rowIndex -1) pass through unchanged. */
export function toManualLocation(issue: TableIssue, kwByRow: readonly number[]): TableIssue {
  const kw = kwByRow[issue.rowIndex];
  if (kw === undefined) return issue;
  const label = issue.table === "hybrid" ? "Hybrid" : "On-grid";
  return { ...issue, message: `${label} ${kw} kW: ${issue.message}` };
}
