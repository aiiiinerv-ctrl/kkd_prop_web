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
  /** Set for issues found on the Hybrid sheet (On-grid issues leave it unset) —
   *  lets the admin UI group a reject list per sheet (design-162 §8.4). */
  sheet?: "hybrid";
};

export type ImportWarning = {
  code: string;
  message: string;
  row?: number;
  /** Set for warnings from the Hybrid sheet (message already carries the "ชีต Hybrid" prefix). */
  sheet?: "hybrid";
};

/** Cell text can be arbitrarily long; anything echoed from the file into a
 * message (shown in the admin preview, later stored with the import) is capped. */
const MAX_ECHO_CHARS = 40;
export function clip(value: string): string {
  // Strip control/format characters (bidi overrides, zero-width, NUL) before echoing a cell value.
  const oneLine = value.replace(/[\p{Cc}\p{Cf}]/gu, "").replace(/\s+/g, " ").trim();
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
  /** 0-based index into the validated array (-1 = whole table). */
  rowIndex: number;
  code: string;
  /** Hand-edit flavour (no Excel position); the import flavour is built by
   *  toHybridImportWarning() from `data`/`examples`. */
  message: string;
  data?: Record<string, string | number>;
  examples?: { rowIndex: number; kw: number; batteryKwh: number; brand: string }[];
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

// ---- Hybrid sheet (R2-S2) ----
//
// Copy follows design-162 §8.4/§8.5 verbatim. Row-level issues shared with
// On-grid reuse the builders above and get the "ชีต Hybrid " prefix via
// asHybridIssue(); structure-level ones need their own wording because the
// On-grid text names the sheet. Client-safe, like everything in this file.

const HYBRID = "ชีต Hybrid";

/** Row-level On-grid issue -> the same text prefixed "ชีต Hybrid " (messages start with "แถว "). */
export function asHybridIssue(i: ImportIssue): ImportIssue {
  const message = i.message.startsWith("แถว ") ? `${HYBRID} ${i.message}` : i.message;
  return { ...i, message, sheet: "hybrid" };
}

export function asHybridWarning(w: ImportWarning): ImportWarning {
  const message = w.message.startsWith("แถว ") ? `${HYBRID} ${w.message}` : `${HYBRID}: ${w.message}`;
  return { ...w, message, sheet: "hybrid" };
}

export const hybridSheetTooLargeIssue = (): ImportIssue => ({
  ...issue("sheet-too-large", "ชีต Hybrid ใหญ่ผิดปกติ (เกิน 1,000 แถว หรือ 100 คอลัมน์)", {
    action: "ลบแถว/คอลัมน์ว่างที่ถูกจัดรูปแบบไว้ แล้วบันทึกใหม่",
  }),
  sheet: "hybrid",
});

export const hybridHeaderNotFoundIssue = (): ImportIssue => ({
  ...issue("header-not-found", 'ไม่พบหัวตาราง "ผลิตพลังงานต่อวัน" ใน 20 แถวแรกของชีต Hybrid', {
    action: "ตรวจว่าหัวตารางยังอยู่ด้านบนของชีต",
  }),
  sheet: "hybrid",
});

export const hybridColumnMissingIssue = (label: string): ImportIssue => ({
  ...issue("column-missing", `ไม่พบคอลัมน์ "${label}" ในชีต Hybrid`, {
    action: "ตรวจว่าหัวคอลัมน์ยังสะกดเหมือนไฟล์เดิม",
  }),
  sheet: "hybrid",
});

export const hybridColumnAmbiguousIssue = (label: string, c1: string, c2: string): ImportIssue => ({
  ...issue("column-ambiguous", `พบคอลัมน์ "${label}" มากกว่า 1 คอลัมน์ในชีต Hybrid (${c1}, ${c2})`, {
    action: "เหลือไว้คอลัมน์เดียว",
  }),
  sheet: "hybrid",
});

export const hybridNoRowsIssue = (): ImportIssue => ({
  ...issue("no-rows", "ไม่พบแถวข้อมูลใต้หัวตารางในชีต Hybrid", { action: "ใส่ข้อมูลใต้หัวตารางโดยไม่เว้นแถวว่าง" }),
  sheet: "hybrid",
});

export const hybridBrandGroupMissingIssue = (): ImportIssue => ({
  ...issue("brand-group-missing", 'ไม่พบกลุ่มคอลัมน์ "ยี่ห้อ" ในชีต Hybrid', {
    action: "ตรวจว่าหัวตารางยังสะกดเหมือนไฟล์เดิม",
  }),
  sheet: "hybrid",
});

export const hybridBrandInvalidIssue = (detail: string): ImportIssue => ({
  ...issue("brand-invalid", `กลุ่มคอลัมน์ "ยี่ห้อ" ในชีต Hybrid ใช้ไม่ได้: ${detail}`, {
    action: "ใช้ชื่อยี่ห้อไม่ซ้ำกัน ไม่เกิน 10 ยี่ห้อ ชื่อยาวไม่เกิน 50 ตัวอักษร",
  }),
  sheet: "hybrid",
});

export const hybridPhaseInvalidIssue = (row: number, col: string, value: string): ImportIssue =>
  asHybridIssue(issue("phase-invalid", `แถว ${row}, คอลัมน์ ${col} (Phase): "${clip(value)}" → ใช้ได้เฉพาะ 1 หรือ 3`, { row }));

export const hybridBatteryInvalidIssue = (row: number, col: string): ImportIssue =>
  asHybridIssue(issue("battery-invalid", `แถว ${row}, คอลัมน์ ${col} (ขนาดแบตเตอรี่): ต้องเป็นตัวเลขตั้งแต่ 0`, { row }));

export const hybridPriceNotNumberIssue = (row: number, col: string, brand: string, value: string): ImportIssue =>
  asHybridIssue(
    issue(
      "price-not-number",
      `แถว ${row}, คอลัมน์ ${col} (${clip(brand)}): "${clip(value)}" ไม่ใช่ตัวเลข → ใส่ราคาเป็นตัวเลข หรือเว้นว่างถ้าไม่มีราคา`,
      { row }
    )
  );

export const hybridDuplicateRowIssue = (r1: number, r2: number, kw: number, phase: number, battery: number): ImportIssue =>
  asHybridIssue(
    issue("duplicate-hybrid-row", `แถว ${r1} และ ${r2}: ขนาด ${kw} kW ${phase} เฟส แบต ${battery} kWh ซ้ำกัน → ลบแถวที่ซ้ำ`, {
      row: Math.min(r1, r2),
    })
  );

export const hybridSharedMismatchIssue = (
  row: number,
  col: string,
  label: string,
  kw: number,
  a: string,
  b: string
): ImportIssue =>
  asHybridIssue(
    issue(
      "shared-mismatch",
      `แถว ${row}, คอลัมน์ ${col} (${label}): ${kw} kW มีค่าไม่ตรงกับแถวอื่นในขนาดเดียวกัน (${a} กับ ${b}) → แก้ให้ทุกแถวของ ${kw} kW ตรงกัน`,
      { row }
    )
  );

export const hybridMissingBaseIssue = (row: number, kw: number, phase: number): ImportIssue =>
  asHybridIssue(
    issue(
      "missing-base-row",
      `แถว ${row}: ไม่มีแถวไม่มีแบต (แบต 0) ของ ${kw} kW ${phase} เฟส → เพิ่มแถวแบต 0 ของ ${kw} kW`,
      { row }
    )
  );

export const hybridHiddenRowsWarning = (rows: string): ImportWarning => ({
  ...warning("hidden-rows", `ชีต Hybrid มีแถวที่ซ่อนอยู่ (${rows}) — ระบบยังอ่านค่าในแถวเหล่านี้`),
  sheet: "hybrid",
});

// Position-free table issues/warnings from validate-hybrid.ts (hand-edit flavour).

export const SHARED_FIELD_LABELS = {
  sunHours: "ชั่วโมงแดด/วัน",
  days: "วันต่อเดือน",
  pricePerKwh: "ค่าไฟ/หน่วย",
  panels: "จำนวนแผง",
  roofM2: "พื้นที่หลังคา",
  billMin: "ค่าไฟต่ำสุด",
  billMax: "ค่าไฟสูงสุด",
} as const;
export type SharedFieldName = keyof typeof SHARED_FIELD_LABELS;

export const hybridDuplicateTableIssue = (rowIndex: number, otherRowIndex: number, kw: number, phase: number, battery: number): TableIssue => ({
  table: "hybrid",
  rowIndex,
  field: "batteryKwh",
  code: "duplicate-hybrid-row",
  message: `ขนาด ${kw} kW ${phase} เฟส แบต ${battery} kWh ซ้ำกับแถวก่อนหน้า`,
  data: { kw, phase, battery, otherRowIndex },
});

export const hybridSharedMismatchTableIssue = (
  rowIndex: number,
  field: SharedFieldName,
  kw: number,
  a: string,
  b: string
): TableIssue => ({
  table: "hybrid",
  rowIndex,
  field,
  code: "shared-mismatch",
  message: `${SHARED_FIELD_LABELS[field]}: ${kw} kW มีค่าไม่ตรงกับแถวอื่นในขนาดเดียวกัน (${a} กับ ${b})`,
  data: { kw, a, b },
});

export const hybridMissingBaseTableIssue = (rowIndex: number, kw: number, phase: number): TableIssue => ({
  table: "hybrid",
  rowIndex,
  field: "batteryKwh",
  code: "missing-base-row",
  message: `ไม่มีแถวไม่มีแบต (แบต 0) ของ ${kw} kW ${phase} เฟส`,
  data: { kw, phase },
});

export const hybridBatteryInvalidTableIssue = (rowIndex: number): TableIssue => ({
  table: "hybrid",
  rowIndex,
  field: "batteryKwh",
  code: "battery-invalid",
  message: "ขนาดแบตเตอรี่ต้องเป็นตัวเลขตั้งแต่ 0",
});

export const hybridSchemaTableIssue = (rowIndex: number, message: string): TableIssue => ({
  ...schemaTableIssue(rowIndex, message),
  table: "hybrid",
});

const listKw = (values: number[]) => values.join(", ");

export const hybridPanelsFormulaWarning = (rowIndex: number, kw: number, panels: number, expected: number): TableWarning => ({
  table: "hybrid",
  rowIndex,
  code: "hybrid-panels-formula",
  message: `Hybrid ${kw} kW: จำนวนแผง ${panels} ต่างจากที่สูตรคำนวณได้ (≈${expected}) เกิน 20%`,
  data: { kw, panels, expected },
});

export const hybridBatteryPriceIgnoredWarning = (
  count: number,
  examples: NonNullable<TableWarning["examples"]>
): TableWarning => ({
  table: "hybrid",
  rowIndex: -1,
  code: "hybrid-battery-price-ignored",
  message: `ราคาแบต ${count} ช่องไม่มีราคาชุดไม่มีแบตของยี่ห้อเดียวกัน จึงไม่นำมาคิด (เช่น ${examples
    .map((e) => `Hybrid ${e.kw} kW ${clip(e.brand)} แบต ${e.batteryKwh}`)
    .join(", ")})`,
  data: { count },
  examples,
});

export const hybridNoPriceWarning = (rowIndex: number, kw: number, batteries: number[], rowCount: number): TableWarning => ({
  table: "hybrid",
  rowIndex,
  code: "hybrid-no-price",
  message: `Hybrid ${kw} kW แบต ${listKw(batteries)} kWh ไม่มีราคา — หน้าเว็บจะไม่แสดงระยะคืนทุน`,
  data: { kw, batteries: listKw(batteries), rowCount },
});

/** Rebuilds the Excel-flavoured ImportIssue for a hybrid TableIssue.
 * `sourceRows[rowIndex]` = Excel row the hybrid row was read from. */
export function toHybridExcelLocation(
  tableIssue: TableIssue,
  sourceRows: number[],
  columns: Partial<Record<string, string>> = {}
): ImportIssue {
  const row = sourceRows[tableIssue.rowIndex] ?? 0;
  const data = tableIssue.data ?? {};
  switch (tableIssue.code) {
    case "out-of-range":
      return asHybridIssue(
        outOfRangeIssue(row, columns[tableIssue.field ?? ""] ?? "", tableIssue.field as OutOfRangeField, String(data.value))
      );
    case "bill-min-gte-max":
      return asHybridIssue(billMinGteMaxIssue(row, String(data.min), String(data.max)));
    case "bill-max-not-increasing":
      return asHybridIssue(
        billMaxNotIncreasingIssue(row, Number(data.kw), String(data.max), Number(data.prevKw), String(data.prevMax))
      );
    case "duplicate-hybrid-row":
      return hybridDuplicateRowIssue(
        sourceRows[Number(data.otherRowIndex)] ?? 0,
        row,
        Number(data.kw),
        Number(data.phase),
        Number(data.battery)
      );
    case "shared-mismatch":
      return hybridSharedMismatchIssue(
        row,
        columns[tableIssue.field ?? ""] ?? "",
        SHARED_FIELD_LABELS[tableIssue.field as SharedFieldName] ?? "",
        Number(data.kw),
        String(data.a),
        String(data.b)
      );
    case "missing-base-row":
      return hybridMissingBaseIssue(row, Number(data.kw), Number(data.phase));
    case "battery-invalid":
      return hybridBatteryInvalidIssue(row, columns.batteryKwh ?? "");
    default:
      return { code: tableIssue.code, message: `${HYBRID}: ${tableIssue.message}`, sheet: "hybrid", ...(row ? { row } : {}) };
  }
}

/** Import flavour of a hybrid TableWarning (design-162 §8.5, "ชีต Hybrid: " prefix). */
export function toHybridImportWarning(w: TableWarning, sourceRows: number[]): ImportWarning {
  const data = w.data ?? {};
  const base = (code: string, message: string, row?: number): ImportWarning => ({ code, message, ...(row ? { row } : {}), sheet: "hybrid" });
  switch (w.code) {
    case "hybrid-panels-formula":
      return base(
        w.code,
        `${HYBRID}: จำนวนแผงของ ${data.kw} kW ต่างจากสูตรเกิน 20% (เช่น ${data.kw} kW กรอก ${data.panels} แต่สูตรได้ ≈${data.expected})`,
        sourceRows[w.rowIndex]
      );
    case "hybrid-battery-price-ignored": {
      const examples = (w.examples ?? [])
        .map((e) => `แถว ${sourceRows[e.rowIndex] ?? "?"} ${clip(e.brand)}`)
        .join(", ");
      return base(
        w.code,
        `${HYBRID}: ราคาแบต ${data.count} ช่องไม่มีราคาชุดไม่มีแบตของยี่ห้อเดียวกัน จึงไม่นำมาคิด (เช่น ${examples})`
      );
    }
    case "hybrid-no-price":
      return base(
        w.code,
        `${HYBRID}: ${data.kw} kW แบต ${data.batteries} kWh ไม่มีราคา — หน้าเว็บจะไม่แสดงระยะคืนทุน`,
        sourceRows[w.rowIndex]
      );
    default:
      return base(w.code, `${HYBRID}: ${w.message}`);
  }
}
