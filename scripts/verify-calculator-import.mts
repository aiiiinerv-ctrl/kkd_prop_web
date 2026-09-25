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
import { importOnGridSizeTable } from "../src/lib/calculator-import/index";
import { diffSizeTables, DIFF_SAMPLE_BILLS } from "../src/lib/calculator-import/diff";
import { DEFAULT_SIZE_TABLE } from "../src/lib/calculator-size-table";
import {
  buildOnGridFixture,
  goodRows,
  oleMagicBuffer,
  forgeUncompressedSize,
  withExtraZipEntries,
  withLargeEntry,
  withMacroEntry,
  withZipBombEntry,
} from "./lib/calculator-import-fixtures";
import ExcelJS from "exceljs";
import type { FixtureRow } from "./lib/calculator-import-fixtures";

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
