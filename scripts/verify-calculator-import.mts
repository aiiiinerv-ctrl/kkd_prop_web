// Regression + security-guard check for src/lib/calculator-import/* — the
// Excel size-table parser (docs/plans/calculator-excel-import-sprints.md S2).
// No test runner in this repo — see AGENTS.md — so this is a standalone
// assertion script like scripts/verify-calculator.mts.
//
// All fixtures are synthesized in memory (scripts/lib/calculator-import-fixtures.ts)
// — never reads/writes the real sales-team Excel files. The two optional
// real-file checks below only run when those files exist locally (they are
// gitignored, never committed — S0 / Default #4) and only print aggregate
// facts (row counts, kW range), never prices.
// Usage: npx tsx scripts/verify-calculator-import.mts
import fs from "node:fs/promises";
import path from "node:path";
import { validateXlsxBuffer } from "../src/lib/calculator-import/validate-xlsx";
import { importOnGridSizeTable, importCalculatorWorkbook } from "../src/lib/calculator-import/index";
import { diffSizeTables, diffHybridTables, DIFF_SAMPLE_BILLS } from "../src/lib/calculator-import/diff";
import { validateOnGridTable } from "../src/lib/calculator-import/validate-on-grid";
import { validateHybridTable } from "../src/lib/calculator-import/validate-hybrid";
import type { HybridRow } from "../src/lib/calculator-hybrid";
import { toExcelLocation } from "../src/lib/calculator-import/messages";
import { DEFAULT_SIZE_TABLE } from "../src/lib/calculator-size-table";
import type { SizeRow } from "../src/lib/calculator-size-table";
import { buildCalculatorWorkbook } from "../src/lib/calculator-import/export";
import {
  buildOnGridFixture,
  goodRows,
  goodHybridRows,
  FIXTURE_BRANDS,
  oleMagicBuffer,
  forgeUncompressedSize,
  withExtraZipEntries,
  withLargeEntry,
  withMacroEntry,
  withZipBombEntry,
} from "./lib/calculator-import-fixtures";
import ExcelJS from "exceljs";
import type { FixtureRow, HybridFixtureRow, HybridSheetOptions } from "./lib/calculator-import-fixtures";

let failed = false;

function assert(label: string, ok: boolean, detail?: string) {
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed = true;
}

function row(overrides: Partial<FixtureRow> = {}): FixtureRow {
  return {
    category: "บ้าน",
    size: 3,
    unit: "kW",
    phase: 1,
    sunHours: 5,
    days: 30,
    panels: 6,
    roof: 16.2,
    billMin: 2000,
    billMax: 3000,
    pricePerKwh: 4.5,
    ...overrides,
  };
}

// === 1. Good file (new-file style, with ประเภท column + 1φ/3φ merge) ===
console.log("=== file guards + parser: synthesized fixtures ===");
{
  const buf = await buildOnGridFixture({ includeCategory: true, rows: goodRows() });
  const result = await importOnGridSizeTable(buf, "คำนวณติดตั้ง.xlsx");
  assert("good file (new-style, with category) -> accept", result.ok);
  if (result.ok) {
    assert("good file -> 3 rows after 1φ/3φ merge", result.rows.length === 3, String(result.rows.length));
    assert(
      "good file -> matches DEFAULT_SIZE_TABLE",
      JSON.stringify(result.rows) === JSON.stringify(DEFAULT_SIZE_TABLE)
    );
  }
}

// === 2. Shifted columns (old-file style, no ประเภท column) ===
{
  const buf = await buildOnGridFixture({ includeCategory: false, rows: goodRows() });
  const result = await importOnGridSizeTable(buf, "คำนวณติดตั้ง.xlsx");
  assert("shifted columns (old-style, no category) -> accept", result.ok);
  if (result.ok) {
    assert("shifted columns -> 3 rows after merge", result.rows.length === 3, String(result.rows.length));
  }
}

// === 3. No On-grid sheet ===
{
  const buf = await buildOnGridFixture({ rows: goodRows(), omitOnGridSheet: true, extraSheetNames: ["Hybrid"] });
  const result = await importOnGridSizeTable(buf, "test.xlsx");
  assert("no On-grid sheet -> reject", !result.ok);
  if (!result.ok) assert("  code = sheet-not-found", result.errors[0]?.code === "sheet-not-found");
}

// === 4. Header row missing ===
{
  const buf = await buildOnGridFixture({ rows: goodRows(), omitHeaderMarker: true });
  const result = await importOnGridSizeTable(buf, "test.xlsx");
  assert("header row missing -> reject", !result.ok);
  if (!result.ok) assert("  code = header-not-found", result.errors[0]?.code === "header-not-found");
}

// === 5. Required column missing (price/kWh dropped) ===
{
  const buf = await buildOnGridFixture({ rows: goodRows(), dropColumnIndex: 9 }); // last column = pricePerKwh
  const result = await importOnGridSizeTable(buf, "test.xlsx");
  assert("required column missing (ค่าไฟ/หน่วย) -> reject", !result.ok);
  if (!result.ok) assert("  code = column-missing", result.errors[0]?.code === "column-missing");
}

// === 6. OLE magic (legacy .xls / password-protected) ===
{
  const result = await validateXlsxBuffer(oleMagicBuffer(), "test.xlsx");
  assert("OLE magic bytes -> reject", !result.ok);
  if (!result.ok) assert("  code = invalid-xlsx", result.errors[0]?.code === "invalid-xlsx");
}

// === 7. Wrong extension ===
{
  const buf = await buildOnGridFixture({ rows: goodRows() });
  const result = await validateXlsxBuffer(buf, "คำนวณติดตั้ง.xls");
  assert("wrong extension (.xls) -> reject", !result.ok);
  if (!result.ok) assert("  code = invalid-xlsx", result.errors[0]?.code === "invalid-xlsx");
}

// === 8. Macro entry ===
{
  const base = await buildOnGridFixture({ rows: goodRows() });
  const buf = await withMacroEntry(base);
  const result = await validateXlsxBuffer(buf, "test.xlsx");
  assert("macro entry (xl/vbaProject.bin) -> reject", !result.ok);
  if (!result.ok) assert("  code = macro-detected", result.errors[0]?.code === "macro-detected");
}

// === 9. Zip entries over cap (>200) ===
{
  const base = await buildOnGridFixture({ rows: goodRows() });
  const buf = await withExtraZipEntries(base, 190);
  const result = await validateXlsxBuffer(buf, "test.xlsx");
  assert("zip entries > 200 -> reject", !result.ok);
  if (!result.ok) assert("  code = malformed-zip", result.errors[0]?.code === "malformed-zip");
}

// === 10. File over 2 MB ===
{
  const base = await buildOnGridFixture({ rows: goodRows() });
  const buf = await withLargeEntry(base, 2.3 * 1024 * 1024, true);
  const result = await validateXlsxBuffer(buf, "test.xlsx");
  assert("file > 2 MB -> reject", !result.ok, `size=${(buf.length / 1024 / 1024).toFixed(2)}MB`);
  if (!result.ok) assert("  code = file-too-large", result.errors[0]?.code === "file-too-large");
}

// === 10b. Zip bomb: small file that inflates past the 20 MB cap ===
{
  const base = await buildOnGridFixture({ rows: goodRows() });
  const buf = await withZipBombEntry(base, 25 * 1024 * 1024);
  const result = await validateXlsxBuffer(buf, "test.xlsx");
  assert("zip bomb (25 MB inflated) -> reject", !result.ok, `file=${(buf.length / 1024).toFixed(0)}KB`);
  assert("  file itself is under the 2 MB cap (so only the inflate guard catches it)", buf.length < 2 * 1024 * 1024);
  if (!result.ok) assert("  code = malformed-zip", result.errors[0]?.code === "malformed-zip");
}

// === 10c. Zip bomb that lies in its headers (uncompressed size forged to 1 KB) ===
{
  const base = await buildOnGridFixture({ rows: goodRows() });
  const bomb = await withZipBombEntry(base, 25 * 1024 * 1024);
  const forged = forgeUncompressedSize(bomb, "xl/media/bomb.bin", 1024);
  const result = await validateXlsxBuffer(forged, "test.xlsx");
  assert("zip bomb with forged header sizes -> reject", !result.ok);
  if (!result.ok) assert("  code = malformed-zip", result.errors[0]?.code === "malformed-zip");
}

// === 10c2. Bomb hidden in [Content_Types].xml (read for the macro check) ===
{
  const base = await buildOnGridFixture({ rows: goodRows() });
  const JSZipMod = (await import("jszip")).default;
  const zip = await JSZipMod.loadAsync(base as unknown as Parameters<typeof JSZipMod.loadAsync>[0]);
  const original = await zip.file("[Content_Types].xml")!.async("string");
  zip.file("[Content_Types].xml", original + " ".repeat(25 * 1024 * 1024));
  const buf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  const result = await validateXlsxBuffer(buf, "test.xlsx");
  assert("bomb in [Content_Types].xml -> reject before full read", !result.ok, `file=${(buf.length / 1024).toFixed(0)}KB`);
  if (!result.ok) assert("  code = malformed-zip", result.errors[0]?.code === "malformed-zip");
}

// === 10d. Sheet with > 1,000 rows (stray formatted cell far below the table) ===
{
  const base = await buildOnGridFixture({ rows: goodRows() });
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(base as unknown as Parameters<ExcelJS.Workbook["xlsx"]["load"]>[0]);
  wb.getWorksheet("On-grid")!.getCell("A1500").value = "x";
  const buf = Buffer.from(await wb.xlsx.writeBuffer());
  const result = await importOnGridSizeTable(buf, "test.xlsx");
  assert("sheet rowCount > 1,000 -> reject", !result.ok);
  if (!result.ok) assert("  code = sheet-too-large", result.errors.some((e) => e.code === "sheet-too-large"));
}

// === 11. Formula without a cached result ===
{
  const rows = [row({ sunHours: { formula: "2+3" } })];
  const buf = await buildOnGridFixture({ rows });
  const result = await importOnGridSizeTable(buf, "test.xlsx");
  assert("formula without cached result -> reject", !result.ok);
  if (!result.ok) assert("  code = formula-no-cached", result.errors[0]?.code === "formula-no-cached");
}

// === 12. billMax does not strictly increase ===
{
  const rows = [row({ size: 3, billMin: 2000, billMax: 3000 }), row({ size: 5, billMin: 1000, billMax: 2500 })];
  const buf = await buildOnGridFixture({ rows });
  const result = await importOnGridSizeTable(buf, "test.xlsx");
  assert("billMax not strictly increasing -> reject", !result.ok);
  if (!result.ok) assert("  code = bill-max-not-increasing", result.errors[0]?.code === "bill-max-not-increasing");
}

// === 13. 1φ/3φ rows disagree on a field ===
{
  const rows = [row({ size: 5, phase: 1, panels: 10 }), row({ size: 5, phase: 3, panels: 12 })];
  const buf = await buildOnGridFixture({ rows });
  const result = await importOnGridSizeTable(buf, "test.xlsx");
  assert("1φ/3φ rows disagree -> reject", !result.ok);
  if (!result.ok) assert("  code = phase-mismatch", result.errors[0]?.code === "phase-mismatch");
}

// === 14. billMax missing ===
{
  const rows = [row({ billMax: null })];
  const buf = await buildOnGridFixture({ rows });
  const result = await importOnGridSizeTable(buf, "test.xlsx");
  assert("billMax missing -> reject", !result.ok);
  if (!result.ok) assert("  code = bill-max-missing", result.errors[0]?.code === "bill-max-missing");
}

// === 14b. billMin missing gets its own message (not the billMax one) ===
{
  const buf = await buildOnGridFixture({ rows: [row({ billMin: null })] });
  const result = await importOnGridSizeTable(buf, "test.xlsx");
  assert("billMin missing -> reject", !result.ok);
  if (!result.ok) assert("  code = bill-min-missing", result.errors[0]?.code === "bill-min-missing");
}

// === 14c. Huge text in a cell is clipped before it reaches a message ===
{
  const buf = await buildOnGridFixture({ rows: [row({ unit: "x".repeat(50_000) })] });
  const result = await importOnGridSizeTable(buf, "test.xlsx");
  assert("50,000-char unit cell -> reject", !result.ok);
  if (!result.ok) {
    const longest = Math.max(...result.errors.map((e) => e.message.length));
    assert("  every message stays short (≤ 200 chars)", longest <= 200, `longest=${longest}`);
  }
}

// === 14d. Hidden rows are imported but warned about ===
{
  const base = await buildOnGridFixture({ rows: goodRows() });
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(base as unknown as Parameters<ExcelJS.Workbook["xlsx"]["load"]>[0]);
  const ws = wb.getWorksheet("On-grid")!;
  let firstDataRow = 1;
  while (firstDataRow < 20 && typeof ws.getCell(firstDataRow, 1).value !== "number" && typeof ws.getCell(firstDataRow, 2).value !== "number") firstDataRow++;
  ws.getRow(firstDataRow).hidden = true;
  const buf = Buffer.from(await wb.xlsx.writeBuffer());
  const result = await importOnGridSizeTable(buf, "test.xlsx");
  assert("hidden row -> still accepted", result.ok);
  if (result.ok) assert("  hidden-rows warning present", result.warnings.some((w) => w.code === "hidden-rows"));
}

// === 15. Unit not kW/MW ===
{
  const rows = [row({ unit: "W" })];
  const buf = await buildOnGridFixture({ rows });
  const result = await importOnGridSizeTable(buf, "test.xlsx");
  assert('unit "W" -> reject', !result.ok);
  if (!result.ok) assert("  code = unit-invalid", result.errors[0]?.code === "unit-invalid");
}

// === 16. DOCTYPE/XXE in a text cell — proves no crash, exceljs/saxes don't resolve external entities ===
{
  const rows = [row({ category: '<!DOCTYPE root [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>&xxe;' })];
  const buf = await buildOnGridFixture({ rows, includeCategory: true });
  const result = await importOnGridSizeTable(buf, "test.xlsx");
  assert("DOCTYPE/XXE payload in a text cell -> accept (no crash)", result.ok);
}

// === 17. A second table below the first (past a blank row) ===
{
  const rows = [row({ size: 3, billMin: 2000, billMax: 3000 }), row({ size: 5, billMin: 3000, billMax: 6000 })];
  const buf = await buildOnGridFixture({ rows, secondTableBelow: true });
  const result = await importOnGridSizeTable(buf, "test.xlsx");
  assert("second table below -> accept, reads only the first table", result.ok);
  if (result.ok) {
    assert("  rowsRead = 2 (not the row from the second table)", result.rowsRead === 2, String(result.rowsRead));
    assert("  rows.length = 2", result.rows.length === 2, String(result.rows.length));
  }
}

// === diffSizeTables: a table against itself has no changes ===
console.log("\n=== diffSizeTables ===");
{
  const diff = diffSizeTables(DEFAULT_SIZE_TABLE, DEFAULT_SIZE_TABLE, [], 8000);
  assert("table vs itself -> no added/removed/changed", diff.added.length === 0 && diff.removed.length === 0 && diff.changed.length === 0);
  assert("table vs itself -> unchangedCount = 3", diff.unchangedCount === 3, String(diff.unchangedCount));
  assert(
    "sample bills include 4,500 ฿ (admin UI spec §4.2.3)",
    diff.sampleBills.some((s) => s.bill === 4500) && DIFF_SAMPLE_BILLS.includes(4500)
  );
  assert("sample bills carry hasPackage", diff.sampleBills.every((s) => typeof s.before.hasPackage === "boolean"));
}
{
  const next = DEFAULT_SIZE_TABLE.map((r) => (r.kw === 5 ? { ...r, billMax: 4000 } : r));
  const diff = diffSizeTables(DEFAULT_SIZE_TABLE, next, [{ sizeKw: 3, isPublished: true }], 8000);
  assert("changed billMax -> 1 changed row", diff.changed.length === 1 && diff.changed[0]?.kw === 5);
  assert(
    "slider max (8000) >= last billMax (10000)? no -> no slider warning here",
    !diff.warnings.some((w) => w.code === "slider-max")
  );
}
{
  const next = DEFAULT_SIZE_TABLE.filter((r) => r.kw !== 10);
  const diff = diffSizeTables(DEFAULT_SIZE_TABLE, next, [{ sizeKw: 10, isPublished: true }], 8000);
  assert("removed 10kW row -> 1 removed", diff.removed.length === 1 && diff.removed[0]?.kw === 10);
  assert(
    "removed 10kW row -> Package 10kW warning",
    diff.warnings.some((w) => w.code === "package-not-in-table")
  );
  const lastMax = next[next.length - 1]!.billMax;
  assert(
    "slider max (8000) >= new last billMax (6000) -> slider warning",
    diff.warnings.some((w) => w.code === "slider-max"),
    `lastMax=${lastMax}`
  );
}

// === shared validator (validate-on-grid.ts — client-safe, no Excel) ===
console.log("\n=== shared validator: validateOnGridTable ===");
{
  const ok = validateOnGridTable(DEFAULT_SIZE_TABLE);
  assert("DEFAULT_SIZE_TABLE -> 0 issues", ok.issues.length === 0, String(ok.issues.length));
  assert("DEFAULT_SIZE_TABLE -> rows unchanged", JSON.stringify(ok.rows) === JSON.stringify(DEFAULT_SIZE_TABLE));
}
{
  // billMax of 5 kW (index 1) no longer above 3 kW's
  const t = DEFAULT_SIZE_TABLE.map((r, i) => (i === 1 ? { ...r, billMin: 0, billMax: 2500 } : r));
  const v = validateOnGridTable(t);
  const i = v.issues[0];
  assert(
    "billMax not increasing -> 1 issue at rowIndex 1 / field billMax",
    v.issues.length === 1 && i?.code === "bill-max-not-increasing" && i.rowIndex === 1 && i.field === "billMax",
    JSON.stringify(v.issues.map((x) => [x.code, x.rowIndex, x.field]))
  );
  assert("billMax not increasing -> position-free message", !!i && !i.message.includes("แถว"));
  assert(
    "billMax not increasing -> toExcelLocation adds Excel row",
    !!i && toExcelLocation(i, [[10], [14], [18]]).message.startsWith("แถว 14: ค่าไฟสูงสุดของ 5 kW")
  );
}
{
  const t = [DEFAULT_SIZE_TABLE[0]!, { ...DEFAULT_SIZE_TABLE[1]!, kw: 3 }];
  const v = validateOnGridTable(t);
  assert(
    "duplicate kW -> issue at the later row (rowIndex 1)",
    v.issues.length === 1 && v.issues[0]?.code === "duplicate-kw" && v.issues[0].rowIndex === 1,
    JSON.stringify(v.issues.map((x) => [x.code, x.rowIndex]))
  );
}
{
  const t = DEFAULT_SIZE_TABLE.map((r, idx) => (idx === 2 ? { ...r, sunHours: 13, panels: 1.5 } : r));
  const v = validateOnGridTable(t);
  assert(
    "out-of-range sunHours + panels -> 2 issues at rowIndex 2",
    v.issues.length === 2 &&
      v.issues.every((x) => x.code === "out-of-range" && x.rowIndex === 2) &&
      v.issues[0]?.field === "sunHours" &&
      v.issues[1]?.field === "panels",
    JSON.stringify(v.issues.map((x) => [x.code, x.rowIndex, x.field]))
  );
}
{
  const t = DEFAULT_SIZE_TABLE.map((r, idx) => (idx === 0 ? { ...r, billMin: r.billMax } : r));
  const v = validateOnGridTable(t);
  assert(
    "billMin >= billMax -> issue at rowIndex 0",
    v.issues.length === 1 && v.issues[0]?.code === "bill-min-gte-max" && v.issues[0].rowIndex === 0
  );
}
{
  const reversed = [...DEFAULT_SIZE_TABLE].reverse();
  const v = validateOnGridTable(reversed);
  assert(
    "unsorted input -> 0 issues, rows returned sorted by kW",
    v.issues.length === 0 && v.rows.map((r) => r.kw).join() === "3,5,10"
  );
}

// === Export round-trip: export -> importOnGridSizeTable (R1-S3) ===
console.log("\n=== export round-trip ===");
const SYNTHETIC_TABLE: SizeRow[] = [
  { kw: 3.3, phases: [1], sunHours: 4.8, days: 30, pricePerKwh: 4.25, panels: 6, roofM2: 16.2, billMin: 1500, billMax: 2500 },
  { kw: 5, phases: [1, 3], sunHours: 5, days: 30.5, pricePerKwh: 4.5, panels: 10, roofM2: 27, billMin: 2500, billMax: 4000 },
  // roof area differs from panels x 2.7 -> must stay an entered value
  { kw: 12.5, phases: [3], sunHours: 4.9, days: 31, pricePerKwh: 4.7, panels: 22, roofM2: 61, billMin: 4000, billMax: 9500 },
  { kw: 99.9, phases: [1, 3], sunHours: 5.1, days: 30, pricePerKwh: 4.1, panels: 180, roofM2: 486, billMin: 9500, billMax: 120000 },
  { kw: 1000, phases: [3], sunHours: 4.5, days: 30, pricePerKwh: 3.9, panels: 1800, roofM2: 4860, billMin: 120000, billMax: 900000 },
];
for (const [label, table] of [
  ["DEFAULT_SIZE_TABLE", DEFAULT_SIZE_TABLE],
  ["synthetic table (1φ/3φ, decimals, MW-scale, overridden roof)", SYNTHETIC_TABLE],
] as const) {
  const exported = await buildCalculatorWorkbook({ onGrid: [...table] });
  const back = await importOnGridSizeTable(exported, "export.xlsx");
  assert(`${label}: export re-imports ok`, back.ok);
  if (back.ok) {
    assert(`${label}: table deep-equals the original`, JSON.stringify(back.rows) === JSON.stringify(table));
    assert(`${label}: 0 warnings`, back.warnings.length === 0, back.warnings.map((w) => w.code).join(","));
    assert(`${label}: no other sheets`, back.skippedSheets.length === 0);
    assert(`${label}: passes the shared table validator`, validateOnGridTable(back.rows).issues.length === 0);
  } else {
    console.log("  errors:", back.errors.slice(0, 5).map((e) => e.message));
  }
}
{
  const exported = await buildCalculatorWorkbook({ onGrid: SYNTHETIC_TABLE });
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(exported as unknown as Parameters<ExcelJS.Workbook["xlsx"]["load"]>[0]);
  const ws = wb.getWorksheet("On-grid")!;
  const f = ws.getRow(3).getCell(8).value as { formula?: string; result?: number };
  assert("derived cell is a formula with cached result", typeof f === "object" && !!f.formula && typeof f.result === "number");
  assert("entered cell (price) is a plain number", typeof ws.getRow(3).getCell(15).value === "number");
  assert("2 header rows, data from row 3 (1φ/3φ split into 2 rows for kW 5)", ws.getRow(4).getCell(1).value === 5 && ws.getRow(5).getCell(1).value === 5);
}


// === Hybrid sheet (R2-S2) — synthesized BrandA…E fixtures only ===
console.log("\n=== hybrid sheet: importCalculatorWorkbook ===");
async function importWith(hybrid: HybridSheetOptions | undefined, onGridRows: FixtureRow[] = goodRows(), extra: string[] = []) {
  const buf = await buildOnGridFixture({ includeCategory: true, rows: onGridRows, hybrid, extraSheetNames: extra });
  return importCalculatorWorkbook(buf, "คำนวณติดตั้ง.xlsx");
}
const hybridWarnings = (r: Awaited<ReturnType<typeof importWith>>) => (r.ok ? r.warnings.filter((w) => w.sheet === "hybrid") : []);
const hybridErrors = (r: Awaited<ReturnType<typeof importWith>>) => (r.ok ? [] : r.groups.hybrid);

{
  const r = await importWith({ rows: goodHybridRows() }, goodRows(), ["Notes"]);
  assert("good 2-sheet file -> accept", r.ok);
  if (r.ok) {
    assert("good file -> On-grid 3 sizes, Hybrid 9 rows", r.onGrid.length === 3 && r.hybrid?.length === 9, `${r.onGrid.length}/${r.hybrid?.length}`);
    assert("good file -> hasHybridSheet true", r.hasHybridSheet === true);
    assert("Hybrid is no longer in skippedSheets (other sheets still are)", r.skippedSheets.join() === "Notes", r.skippedSheets.join());
    assert("good file -> 0 hybrid warnings", hybridWarnings(r).length === 0, hybridWarnings(r).map((w) => w.code).join());
    const first = r.hybrid![0];
    assert(
      "prices come from the 'ยี่ห้อ' group, not the payback group (BrandA 100000)",
      first.brandPrices[0].brand === "BrandA" && first.brandPrices[0].priceThb === 100000 && first.brandPrices[1].priceThb === 110000
    );
    assert("blank price cell -> null", first.brandPrices[3].priceThb === null && first.brandPrices[2].priceThb === null);
    assert("brand order kept", first.brandPrices.map((b) => b.brand).join() === FIXTURE_BRANDS.join());
    assert("unit ' kW' (leading space) trimmed (E15)", first.kw === 5);
    assert("rows sorted by kW/phase/battery", r.hybrid!.map((x) => `${x.kw}|${x.phase}|${x.batteryKwh}`).join() === "5|1|0,5|1|16,5|3|0,5|3|16,10|3|0,10|3|16,10|3|32,20|3|0,20|3|16");
    assert("no formula-cached warning on price columns", !r.warnings.some((w) => w.code === "formula-cached" && w.sheet === "hybrid"));
  }
}
{
  const r = await importWith(undefined);
  assert("no Hybrid sheet -> accept (D3)", r.ok);
  if (r.ok) assert("no Hybrid sheet -> hybrid null, hasHybridSheet false", r.hybrid === null && r.hasHybridSheet === false);
}
{
  const r = await importWith({ rows: goodHybridRows(), sheetName: " hybrid " });
  assert("sheet name matched case-insensitively after trim", r.ok && r.hasHybridSheet);
}
{
  const r = await importWith({ rows: goodHybridRows(), omitBrandGroup: true });
  assert("no 'ยี่ห้อ' group -> reject (D4: whole file)", !r.ok);
  assert("  brand-group-missing, only in the Hybrid group", hybridErrors(r).length === 1 && hybridErrors(r)[0].code === "brand-group-missing" && !r.ok && r.groups.onGrid.length === 0);
  assert("  message copy (design-162 §8.4)", hybridErrors(r)[0]?.message === 'ไม่พบกลุ่มคอลัมน์ "ยี่ห้อ" ในชีต Hybrid');
}
{
  const rows = goodHybridRows();
  rows.push({ ...rows[1] }); // duplicate (5 kW, 1φ, 16)
  const r = await importWith({ rows });
  const e = hybridErrors(r)[0];
  assert("duplicate (kW, phase, battery) -> reject", !r.ok && e?.code === "duplicate-hybrid-row", e?.code);
  assert("  copy: ชีต Hybrid แถว r1 และ r2 … ซ้ำกัน", !!e && /^ชีต Hybrid แถว 5 และ 13: ขนาด 5 kW 1 เฟส แบต 16 kWh ซ้ำกัน → ลบแถวที่ซ้ำ$/.test(e.message), e?.message);
}
{
  const rows = goodHybridRows();
  rows[3] = { ...rows[3], panels: 11 }; // 5 kW 3φ battery 16 differs from the first 5 kW row
  const r = await importWith({ rows, mergeBlocks: false });
  const e = hybridErrors(r)[0];
  assert("shared value differs inside one kW -> reject (E11)", !r.ok && e?.code === "shared-mismatch", e?.code);
  assert("  names row + column + both values", !!e && e.message.includes("ชีต Hybrid แถว 7, คอลัมน์") && e.message.includes("(จำนวนแผง): 5 kW") && e.message.includes("(10 กับ 11)"), e?.message);
}
{
  const rows = goodHybridRows().filter((r) => !(r.kw === 10 && r.battery === 0));
  const r = await importWith({ rows });
  const e = hybridErrors(r)[0];
  assert("kW/phase without a battery-0 row -> reject (E13, C7)", !r.ok && e?.code === "missing-base-row", e?.code);
  assert("  copy mentions 'แบต 0' and 10 kW 3 เฟส", !!e && e.message.includes("ไม่มีแถวไม่มีแบต (แบต 0) ของ 10 kW 3 เฟส"), e?.message);
}
{
  const rows = goodHybridRows();
  rows[1] = { ...rows[1], battery: -16 };
  const r = await importWith({ rows });
  assert("negative battery -> reject battery-invalid", !r.ok && hybridErrors(r)[0]?.code === "battery-invalid", hybridErrors(r)[0]?.code);
  rows[1] = { ...rows[1], battery: "abc" };
  const r2 = await importWith({ rows });
  assert("text battery -> reject battery-invalid", !r2.ok && hybridErrors(r2)[0]?.code === "battery-invalid");
}
{
  const rows = goodHybridRows();
  rows[0] = { ...rows[0], prices: ["abc", 110000, null, null, null] };
  const r = await importWith({ rows });
  const e = hybridErrors(r)[0];
  assert("price that is not a number -> reject", !r.ok && e?.code === "price-not-number", e?.code);
  assert("  copy names the brand column and says to leave blank", !!e && e.message.includes("(BrandA)") && e.message.includes("ไม่ใช่ตัวเลข → ใส่ราคาเป็นตัวเลข หรือเว้นว่างถ้าไม่มีราคา"), e?.message);
}
{
  const rows = goodHybridRows();
  rows[0] = { ...rows[0], prices: [0, "12,000", { formula: "1+1", result: 1234 }, null, null] };
  const r = await importWith({ rows });
  assert("price 0 / text number / formula with cached result -> accept", r.ok);
  if (r.ok) {
    const p = r.hybrid![0].brandPrices;
    assert("  0 -> null (E1), '12,000' -> 12000, formula -> cached 1234", p[0].priceThb === null && p[1].priceThb === 12000 && p[2].priceThb === 1234, JSON.stringify(p.map((x) => x.priceThb)));
    assert("  text price -> text-number warning, formula price -> no warning", hybridWarnings(r).some((w) => w.code === "text-number") && !hybridWarnings(r).some((w) => w.code === "formula-cached"));
  }
  rows[0] = { ...rows[0], prices: [{ formula: "1+1" }, null, null, null, null] };
  const r2 = await importWith({ rows });
  assert("price formula without cached result -> reject formula-no-cached (never evaluated)", !r2.ok && hybridErrors(r2)[0]?.code === "formula-no-cached");
}
{
  // E3: battery price present but the brand has no base price -> ONE merged warning
  const rows: HybridFixtureRow[] = [
    { kw: 5, phase: 1, battery: 0, panels: 10, roof: 27, billMin: 3000, billMax: 6000, prices: [100000, 110000, 0, null, null] },
    { kw: 5, phase: 1, battery: 16, panels: 10, roof: 27, billMin: 3000, billMax: 6000, prices: [160000, 170000, 60000, 60000, 60000] },
    { kw: 10, phase: 3, battery: 0, panels: 19, roof: 51.3, billMin: 6000, billMax: 12000, prices: [150000, null, null, null, null] },
    { kw: 10, phase: 3, battery: 16, panels: 19, roof: 51.3, billMin: 6000, billMax: 12000, prices: [210000, 70000, 70000, null, null] },
  ];
  const r = await importWith({ rows });
  assert("E3 file -> accept (warning only)", r.ok);
  const e3 = hybridWarnings(r).filter((w) => w.code === "hybrid-battery-price-ignored");
  assert("E3 -> exactly 1 warning for all cells", e3.length === 1, String(e3.length));
  assert("  counts 5 cells, copy per design-162 §8.5", !!e3[0] && e3[0].message.startsWith("ชีต Hybrid: ราคาแบต 5 ช่องไม่มีราคาชุดไม่มีแบตของยี่ห้อเดียวกัน จึงไม่นำมาคิด (เช่น แถว "), e3[0]?.message);
  assert("  at most 3 examples", !!e3[0] && (e3[0].message.match(/แถว \d+/g) ?? []).length === 3, e3[0]?.message);
}
{
  // E5: panels far from (kW x 1.2) / 0.63 -> one warning per kW
  const rows = goodHybridRows().map((r) => (r.kw === 20 ? { ...r, panels: 28 } : r));
  rows.push(
    { kw: 30, phase: 3, battery: 0, panels: 28, roof: 75.6, billMin: 20000, billMax: 30000, prices: [400000, null, null, null, null] },
    { kw: 40, phase: 3, battery: 0, panels: 76, roof: 205.2, billMin: 25000, billMax: 40000, prices: [500000, null, null, null, null] }
  );
  const r = await importWith({ rows });
  const e5 = hybridWarnings(r).filter((w) => w.code === "hybrid-panels-formula");
  assert("E5 -> one warning per kW (20 and 30; 40 within 20%)", e5.length === 2, String(e5.length));
  assert("  copy names the kW, the filled count and the formula figure", e5.some((w) => w.message === "ชีต Hybrid: จำนวนแผงของ 20 kW ต่างจากสูตรเกิน 20% (เช่น 20 kW กรอก 28 แต่สูตรได้ ≈38.1)"), e5[0]?.message);
  assert("  is a warning, file still accepted", r.ok);
}
{
  // E4: a kW whose rows have no usable price -> one warning per kW listing its batteries
  const rows: HybridFixtureRow[] = [
    ...goodHybridRows(),
    { kw: 40, phase: 3, battery: 0, panels: 76, roof: 205.2, billMin: 25000, billMax: 40000, prices: [null, null, null, null, null] },
    { kw: 40, phase: 3, battery: 100, panels: 76, roof: 205.2, billMin: 25000, billMax: 40000, prices: [0, null, null, null, null] },
  ];
  const r = await importWith({ rows });
  const e4 = hybridWarnings(r).filter((w) => w.code === "hybrid-no-price");
  assert("E4 -> 1 warning for the kW (2 rows)", r.ok && e4.length === 1, String(e4.length));
  assert("  copy lists the batteries", e4[0]?.message === "ชีต Hybrid: 40 kW แบต 0, 100 kWh ไม่มีราคา — หน้าเว็บจะไม่แสดงระยะคืนทุน", e4[0]?.message);
}
{
  const r = await importWith({ rows: goodHybridRows(), blockBelow: "blank" });
  assert("second block below a blank row is not read (E16)", r.ok && r.hybrid?.length === 9, r.ok ? String(r.hybrid?.length) : "");
  const r2 = await importWith({ rows: goodHybridRows(), blockBelow: "none" });
  assert("second block directly beneath (no blank) -> reject, never silently read", !r2.ok && hybridErrors(r2).length > 0 && hybridErrors(r2)[0].message.startsWith("ชีต Hybrid แถว"), hybridErrors(r2)[0]?.message);
}
{
  const rows = goodHybridRows();
  rows[0] = { ...rows[0], phase: 2 };
  const r = await importWith({ rows });
  assert("phase other than 1/3 -> reject phase-invalid", !r.ok && hybridErrors(r)[0]?.code === "phase-invalid");
  const r2 = await importWith({ rows: goodHybridRows(), omitHeaderMarker: true } as HybridSheetOptions);
  assert("no header marker -> reject header-not-found (Hybrid copy)", !r2.ok && hybridErrors(r2)[0]?.code === "header-not-found" && hybridErrors(r2)[0].message.includes("ชีต Hybrid"));
  const r3 = await importWith({ rows: goodHybridRows(), brands: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"].map((b) => `Brand${b}`) });
  assert("more than 10 brands -> reject brand-invalid", !r3.ok && hybridErrors(r3)[0]?.code === "brand-invalid");
  const r4 = await importWith({ rows: goodHybridRows(), brands: ["BrandA", "BrandA", "BrandC", "BrandD", "BrandE"] });
  assert("duplicate brand names -> reject brand-invalid", !r4.ok && hybridErrors(r4)[0]?.code === "brand-invalid");
}
{
  // D4: any Hybrid issue rejects the whole file, even when On-grid is fine; both sheets bad -> both groups
  const badHybrid = goodHybridRows();
  badHybrid.push({ ...badHybrid[0] });
  const r = await importWith({ rows: badHybrid });
  assert("D4: On-grid ok + Hybrid bad -> whole file rejected", !r.ok);
  assert("  groups: On-grid 0 / Hybrid >0; errors = their concat", !r.ok && r.groups.onGrid.length === 0 && r.groups.hybrid.length > 0 && r.errors.length === r.groups.hybrid.length);
  const badOnGrid = goodRows();
  badOnGrid[1] = { ...badOnGrid[1], billMax: null };
  const r2 = await importWith({ rows: goodHybridRows() }, badOnGrid);
  assert("On-grid bad + Hybrid ok -> rejected, Hybrid group empty", !r2.ok && r2.groups.onGrid.length > 0 && r2.groups.hybrid.length === 0);
  const r3 = await importWith({ rows: badHybrid }, badOnGrid);
  assert("both sheets bad -> both groups filled, On-grid first", !r3.ok && r3.groups.onGrid.length > 0 && r3.groups.hybrid.length > 0 && r3.errors[0] === r3.groups.onGrid[0]);
  assert("  every Hybrid issue is prefixed 'ชีต Hybrid'", !r3.ok && r3.groups.hybrid.every((e) => e.sheet === "hybrid" && (e.message.startsWith("ชีต Hybrid") || e.message.includes("Hybrid"))));
  const r4 = await importCalculatorWorkbook(Buffer.from("not a zip"), "x.xlsx");
  assert("file-level guard failure -> rejected with the guard issue", !r4.ok && r4.errors.length === 1);
}
{
  // The old entry point keeps working unchanged for existing callers
  const buf = await buildOnGridFixture({ includeCategory: true, rows: goodRows(), hybrid: { rows: goodHybridRows() } });
  const old = await importOnGridSizeTable(buf, "x.xlsx");
  assert("importOnGridSizeTable still accepts a 2-sheet file (On-grid only)", old.ok && old.rows.length === 3);
}

console.log("\n=== hybrid validator + client safety ===");
{
  const rows = (await importWith({ rows: goodHybridRows() }).then((r) => (r.ok ? r.hybrid! : []))) as HybridRow[];
  const ok = validateHybridTable(rows);
  assert("validateHybridTable: good table -> 0 issues, 0 warnings", ok.issues.length === 0 && ok.warnings.length === 0);
  const dup = validateHybridTable([...rows, { ...rows[0] }]);
  assert("validator: duplicate -> duplicate-hybrid-row at the later index", dup.issues[0]?.code === "duplicate-hybrid-row" && dup.issues[0].rowIndex === rows.length);
  const noBase = validateHybridTable(rows.filter((r) => !(r.kw === 5 && r.phase === 1 && r.batteryKwh === 0)));
  assert("validator: missing battery-0 row -> missing-base-row", noBase.issues[0]?.code === "missing-base-row");
  const notIncreasing = validateHybridTable(rows.map((r) => (r.kw === 20 ? { ...r, billMin: 5000, billMax: 11000 } : r)));
  assert("validator: billMax not increasing across kW -> bill-max-not-increasing", notIncreasing.issues.some((i) => i.code === "bill-max-not-increasing"));
  const badRange = validateHybridTable(rows.map((r, i) => (i === 0 ? { ...r, sunHours: 99 } : r)));
  assert("validator: out-of-range sunHours -> out-of-range, table 'hybrid'", badRange.issues[0]?.code === "out-of-range" && badRange.issues[0].table === "hybrid");
  const manual = validateHybridTable(rows.map((r) => (r.kw === 10 ? { ...r, panels: 5 } : r)));
  assert("validator: E5 hand-edit copy", manual.warnings[0]?.message === "Hybrid 10 kW: จำนวนแผง 5 ต่างจากที่สูตรคำนวณได้ (≈19) เกิน 20%", manual.warnings[0]?.message);
}
{
  // validate-hybrid.ts must stay client-safe: no excel/zip/prisma anywhere in its import graph
  const root = path.resolve(import.meta.dirname, "../src/lib");
  const seen = new Set<string>();
  const bad: string[] = [];
  async function walk(file: string) {
    if (seen.has(file)) return;
    seen.add(file);
    const text = await fs.readFile(file, "utf8");
    for (const m of text.matchAll(/from\s+["']([^"']+)["']/g)) {
      const spec = m[1];
      if (/^(exceljs|jszip|@prisma|prisma|node:)/.test(spec) || spec.includes("generated/prisma") || spec.endsWith("/prisma") || spec.includes("lib/prisma")) bad.push(`${path.basename(file)} -> ${spec}`);
      if (spec.startsWith(".")) {
        const base = path.resolve(path.dirname(file), spec);
        for (const candidate of [`${base}.ts`, path.join(base, "index.ts")]) {
          try {
            await fs.access(candidate);
            await walk(candidate);
            break;
          } catch {}
        }
      }
    }
  }
  await walk(path.join(root, "calculator-import/validate-hybrid.ts"));
  await walk(path.join(root, "calculator-import/diff.ts"));
  assert(`validate-hybrid.ts + diff.ts import graph (${seen.size} files) has no exceljs/jszip/prisma`, bad.length === 0, bad.join("; "));
}

console.log("\n=== hybrid diff ===");
{
  const rows = (await importWith({ rows: goodHybridRows() }).then((r) => (r.ok ? r.hybrid! : []))) as HybridRow[];
  const same = diffHybridTables(rows, structuredClone(rows), 10);
  assert("diff: identical -> all unchanged", same.added.length === 0 && same.removed.length === 0 && same.changed.length === 0 && same.unchangedCount === rows.length);
  const next = structuredClone(rows);
  next[0].brandPrices[0].priceThb = 99000; // price change
  next[1].panels = 11; // panels change
  const gone = next.pop()!; // removed row
  next.push({ ...gone, kw: 40, phase: 3, batteryKwh: 0, billMin: 25000, billMax: 40000 }); // added row
  const d = diffHybridTables(rows, next, 10);
  assert("diff: 1 added, 1 removed, 2 changed", d.added.length === 1 && d.removed.length === 1 && d.changed.length === 2, `${d.added.length}/${d.removed.length}/${d.changed.length}`);
  assert("diff: price change reported as brandPrices, panels as panels", d.changed[0].changedFields.some((f) => f.field === "brandPrices") && d.changed[1].changedFields.some((f) => f.field === "panels"));
  assert("diff: sample bills use the same bill set as On-grid", d.sampleBills.map((s) => s.bill).join() === DIFF_SAMPLE_BILLS.join());
  const noPrice = structuredClone(rows).map((r) => ({ ...r, brandPrices: r.brandPrices.map((b) => ({ ...b, priceThb: null })) }));
  const p = diffHybridTables(rows, noPrice, 10);
  const at8000 = p.sampleBills.find((s) => s.bill === 8000)!;
  assert("diff: payback shown before, hidden after prices vanish (8,000 ฿)", at8000.before.paybackYears !== null && at8000.after.paybackYears === null);
  assert("diff: 8,000 ฿ -> 10 kW, starting battery 16 (smallest > 0)", at8000.before.kw === 10 && at8000.before.batteryKwh === 16);
  const fresh = diffHybridTables(null, rows, 10);
  assert("diff: no current table -> currentEmpty, before outcomes 'empty', all rows added", fresh.currentEmpty && !fresh.nextEmpty && fresh.added.length === rows.length && fresh.sampleBills.every((s) => s.before.status === "empty"));
  const removedAll = diffHybridTables(rows, null, 10);
  assert("diff: Hybrid removed (D3) -> nextEmpty, all rows removed", removedAll.nextEmpty && removedAll.removed.length === rows.length);
}

// === Optional: real workbook, both sheets — aggregate counts only (never prices/brands) ===
console.log("\n=== real workbook, hybrid sheet (optional) ===");
{
  const candidates = [process.env.REAL_CALC_XLSX, path.join(path.resolve(import.meta.dirname, ".."), "stuffs/คำนวณติดตั้ง.xlsx")].filter((x): x is string => !!x);
  let buf: Buffer | null = null;
  for (const c of candidates) {
    try {
      buf = await fs.readFile(c);
      break;
    } catch {}
  }
  if (!buf) {
    console.log("- skipped (real workbook not present; set REAL_CALC_XLSX to run)");
  } else {
    const r = await importCalculatorWorkbook(buf, "คำนวณติดตั้ง.xlsx");
    assert("real workbook -> accept", r.ok);
    if (r.ok && r.hybrid) {
      const sizes = new Set(r.hybrid.map((x) => x.kw)).size;
      assert(`real: Hybrid ${r.hybrid.length} rows / ${sizes} sizes (expect 52 / 13)`, r.hybrid.length === 52 && sizes === 13);
      const hw = r.warnings.filter((w) => w.sheet === "hybrid");
      const e3 = hw.filter((w) => w.code === "hybrid-battery-price-ignored");
      assert(`real: E3 = ${e3.length} warning, ${e3[0]?.message.match(/ราคาแบต (\d+) ช่อง/)?.[1]} cells (expect 1 / 42)`, e3.length === 1 && /ราคาแบต 42 ช่อง/.test(e3[0].message));
      const e5 = hw.filter((w) => w.code === "hybrid-panels-formula");
      const e5kw = e5.map((w) => w.message.match(/ของ ([\d.]+) kW/)?.[1]).join("/");
      assert(`real: E5 = ${e5kw} kW (expect 20/30/50/99.9)`, e5kw === "20/30/50/99.9");
      const e4 = hw.filter((w) => w.code === "hybrid-no-price");
      const e4rows = r.hybrid.filter((row, _i, all) => {
        const hasPrice = row.brandPrices.some((b) => b.priceThb !== null && b.priceThb > 0);
        return !hasPrice || (row.batteryKwh > 0 && !all.some((o) => o.kw === row.kw && o.phase === row.phase && o.batteryKwh === 0 && row.brandPrices.some((b, bi) => b.priceThb && o.brandPrices[bi].priceThb)));
      }).length;
      assert(`real: E4 = ${e4rows} rows in ${e4.length} kW warnings (expect 7 rows)`, e4rows === 7 && e4.length === 3);
      assert("real: Hybrid not in skippedSheets", !r.skippedSheets.some((n) => /^hybrid$/i.test(n.trim())), r.skippedSheets.join());
      assert("real: no hybrid formula-cached warnings", !hw.some((w) => w.code === "formula-cached"));
      const kwRange = `${Math.min(...r.hybrid.map((x) => x.kw))}-${Math.max(...r.hybrid.map((x) => x.kw))}`;
      console.log(`  (info) On-grid ${r.onGrid.length} sizes, Hybrid kW ${kwRange}, hybrid warnings ${hw.length}`);
    } else if (r.ok) {
      assert("real: has a Hybrid sheet", false);
    } else {
      console.log("  errors:", r.errors.slice(0, 5).map((e) => e.code));
    }
  }
}

// === Optional: real files (never committed — gitignored, S0) ===
console.log("\n=== real files (optional, skipped when not present locally) ===");
const repoRoot = path.resolve(import.meta.dirname, "..");

async function checkRealFile(label: string, relPath: string, expect: "accept" | "reject") {
  const fullPath = path.join(repoRoot, relPath);
  let buf: Buffer;
  try {
    buf = await fs.readFile(fullPath);
  } catch {
    console.log(`- skipped (file not present): ${relPath}`);
    return;
  }
  const result = await importOnGridSizeTable(buf, path.basename(relPath));
  if (expect === "accept") {
    assert(`${label} -> accept`, result.ok);
    if (result.ok) {
      const again = await importOnGridSizeTable(await buildCalculatorWorkbook({ onGrid: result.rows }), "export.xlsx");
      assert(
        `${label} -> export round-trip: same ${result.rows.length} rows, 0 warnings`,
        again.ok && JSON.stringify(again.rows) === JSON.stringify(result.rows) && again.warnings.length === 0
      );
      const kws = result.rows.map((r) => r.kw);
      assert(
        `${label} -> ${result.rows.length} rows after merge, read ${result.rowsRead} raw rows, kW ${Math.min(...kws)} → ${Math.max(...kws)}`,
        true
      );
    } else {
      console.log("  errors:", result.errors.slice(0, 5).map((e) => e.message));
    }
  } else {
    assert(`${label} -> reject`, !result.ok);
    if (!result.ok) {
      const hasBillMaxMissing = result.errors.some((e) => e.code === "bill-max-missing");
      assert("  includes a bill-max-missing issue", hasBillMaxMissing);
    } else {
      assert(`${label} -> unexpectedly accepted ${result.rows.length} rows`, false);
    }
  }
}

await checkRealFile("stuffs/คำนวณติดตั้ง.xlsx (new file)", "stuffs/คำนวณติดตั้ง.xlsx", "accept");
await checkRealFile("docs/stuffs/คำนวณติดตั้ง.xlsx (old file)", "docs/stuffs/คำนวณติดตั้ง.xlsx", "reject");

console.log(failed ? "\nFAILED — see ✗ above" : "\nAll assertions passed ✓");
process.exit(failed ? 1 : 0);
