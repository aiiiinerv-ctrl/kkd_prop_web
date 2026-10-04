// Builds synthesized On-grid workbooks in memory (exceljs + jszip) for
// scripts/verify-calculator-import.mts. Never reads or writes the real
// sales-team Excel files, and never embeds a brand price — the repo is
// PUBLIC (docs/plans/calculator-excel-import-sprints.md S2 Default #4,
// R2). Only used by scripts/, not by src/.
import ExcelJS from "exceljs";
import JSZip from "jszip";

type ExcelJsLoadBuffer = Parameters<ExcelJS.Workbook["xlsx"]["load"]>[0];

export type FixtureCell = number | string | { formula: string; result?: number } | null;

export type FixtureRow = {
  category?: string | null;
  size: FixtureCell;
  unit: string | null;
  phase: FixtureCell;
  sunHours: FixtureCell;
  days: FixtureCell;
  panels: FixtureCell;
  roof?: FixtureCell;
  billMin: FixtureCell;
  billMax: FixtureCell;
  pricePerKwh: FixtureCell;
};

export type BuildOptions = {
  /** Include the "ประเภท" category column (new-file style) — the old file
   * doesn't have it, and column position shifts left by one without it. */
  includeCategory?: boolean;
  rows: FixtureRow[];
  /** A second On-grid-like table further down the sheet, past a blank row —
   * proves the parser stops at the first blank size cell. */
  secondTableBelow?: boolean;
  /** Extra non-"On-grid" sheets (e.g. "Hybrid") to prove they're ignored. */
  extraSheetNames?: string[];
  /** Omit the sheet named "On-grid" entirely. */
  omitOnGridSheet?: boolean;
  /** Write header rows but never the "ผลิตพลังงานต่อวัน" marker text. */
  omitHeaderMarker?: boolean;
  /** Drop this 0-based column index from the header + every data row —
   * simulates a required column going missing. */
  dropColumnIndex?: number;
  /** Also write a "Hybrid" sheet (R2-S2). Synthetic data only. */
  hybrid?: HybridSheetOptions;
};

// ---- Hybrid sheet (R2-S2) ----
// Layout mirrors the real sheet's shape (research-154 §2): column A blank,
// 2 header rows (group row 2, sub row 3, groups merged across their columns),
// the "ขนาดกำลังผลิต" group spans size/unit/phase/battery/battery-unit, shared
// per-kW values merged down their block, a payback group that REUSES the brand
// names (so a reader that picks the wrong group reads different numbers), the
// "ยี่ห้อ" price group last, a blank row, then a second header block below.
// Brand names are BrandA…BrandE and every price is made up.

export type HybridFixtureRow = {
  kw: FixtureCell;
  phase: FixtureCell;
  battery: FixtureCell;
  /** Defaults to " kW" (leading space, like the real file — E15). */
  unit?: string | null;
  sunHours?: FixtureCell;
  days?: FixtureCell;
  pricePerKwh?: FixtureCell;
  panels: FixtureCell;
  roof?: FixtureCell;
  billMin: FixtureCell;
  billMax: FixtureCell;
  /** One cell per brand column, in `brands` order. */
  prices: FixtureCell[];
};

export type HybridSheetOptions = {
  rows: HybridFixtureRow[];
  brands?: string[];
  /** Merge the per-kW shared cells down each block (like the real sheet). Default true. */
  mergeBlocks?: boolean;
  /** Header text of the brand group is replaced so no "ยี่ห้อ" group exists. */
  omitBrandGroup?: boolean;
  /** Second table below the first: after a blank row (default) or directly beneath (no blank). */
  blockBelow?: "blank" | "none";
  /** Sheet name (default "Hybrid"). */
  sheetName?: string;
  /** Write the header rows but not the "ผลิตพลังงานต่อวัน" marker. */
  omitHeaderMarker?: boolean;
};

export const FIXTURE_BRANDS = ["BrandA", "BrandB", "BrandC", "BrandD", "BrandE"];
const HYBRID_FIRST_COL = 2; // B

function hybridLayout(brands: string[], omitBrandGroup: boolean) {
  const fixed = [
    { key: "kw", group: "ขนาดกำลังผลิต", sub: "ขนาด" },
    { key: "unit", group: "ขนาดกำลังผลิต", sub: "หน่วย" },
    { key: "phase", group: "ขนาดกำลังผลิต", sub: "Phase" },
    { key: "battery", group: "ขนาดกำลังผลิต", sub: "ขนาดแบตเตอรี่" },
    { key: "batteryUnit", group: "ขนาดกำลังผลิต", sub: "" },
    { key: "sunHours", group: "ผลิตพลังงานต่อวัน", sub: "จำนวนชั่วโมงที่ผลิตได้" },
    { key: "days", group: "ผลิตพลังงานต่อเดือน", sub: "จำนวนวัน" },
    { key: "panelsCalc", group: "แผงโซล่าเซลล์", sub: "จำนวนคำนวณ" },
    { key: "panels", group: "แผงโซล่าเซลล์", sub: "จำนวนติดตั้ง" },
    { key: "roof", group: "แผงโซล่าเซลล์", sub: "พื้นที่หลังคาที่ต้องใช้" },
    { key: "billMin", group: "ค่าไฟ", sub: "ประมาณ" },
    { key: "billMax", group: "ค่าไฟ", sub: "ประมาณ" },
    { key: "pricePerKwh", group: "ค่าไฟ", sub: "ค่าไฟ/หน่วย" },
  ];
  const payback = brands.map((b, i) => ({ key: `payback${i}`, group: "ระยะเวลาคืนทุน(ปี)", sub: b }));
  const brandGroup = omitBrandGroup ? "ราคาอุปกรณ์" : "ยี่ห้อ";
  const prices = brands.map((b, i) => ({ key: `price${i}`, group: brandGroup, sub: b }));
  return [...fixed, ...payback, ...prices].map((c, i) => ({ ...c, col: HYBRID_FIRST_COL + i }));
}

function addHybridSheet(workbook: ExcelJS.Workbook, opts: HybridSheetOptions) {
  const brands = opts.brands ?? FIXTURE_BRANDS;
  const ws = workbook.addWorksheet(opts.sheetName ?? "Hybrid");
  const layout = hybridLayout(brands, opts.omitBrandGroup ?? false);
  const colOf = (key: string) => layout.find((c) => c.key === key)!.col;

  const writeHeader = (groupRowNo: number) => {
    const groupRow = ws.getRow(groupRowNo);
    const subRow = ws.getRow(groupRowNo + 1);
    for (const c of layout) {
      const group = opts.omitHeaderMarker ? c.group.replace("ผลิตพลังงานต่อวัน", "x") : c.group;
      groupRow.getCell(c.col).value = group;
      if (c.sub !== "") subRow.getCell(c.col).value = c.sub;
    }
    // Group cells merge across their columns, like the real sheet.
    let start = 0;
    for (let i = 1; i <= layout.length; i++) {
      if (i === layout.length || layout[i].group !== layout[start].group) {
        if (i - 1 > start) ws.mergeCells(groupRowNo, layout[start].col, groupRowNo, layout[i - 1].col);
        start = i;
      }
    }
  };

  writeHeader(2);

  const dataStart = 4;
  opts.rows.forEach((r, i) => {
    const row = ws.getRow(dataStart + i);
    const put = (key: string, v: FixtureCell | undefined) => setCell(row, colOf(key), v === undefined ? null : v);
    put("kw", r.kw);
    put("unit", r.unit === undefined ? " kW" : r.unit);
    put("phase", r.phase);
    put("battery", r.battery);
    put("batteryUnit", "kWh");
    put("sunHours", r.sunHours === undefined ? 5 : r.sunHours);
    put("days", r.days === undefined ? 30 : r.days);
    put("panelsCalc", typeof r.kw === "number" ? { formula: `(B${dataStart + i}*1.2)/0.63`, result: (r.kw * 1.2) / 0.63 } : null);
    put("panels", r.panels);
    put("roof", r.roof);
    put("billMin", r.billMin);
    put("billMax", r.billMax);
    put("pricePerKwh", r.pricePerKwh === undefined ? 4.5 : r.pricePerKwh);
    r.prices.forEach((p, b) => {
      put(`price${b}`, p);
      // Payback group: formulas with cached numbers that must never be read as prices.
      put(`payback${b}`, { formula: `AD${dataStart + i}/1`, result: 777.77 + b });
    });
  });

  if (opts.mergeBlocks ?? true) {
    const mergeKeys = ["kw", "unit", "sunHours", "days", "panelsCalc", "panels", "roof", "billMin", "billMax", "pricePerKwh"];
    let blockStart = 0;
    for (let i = 1; i <= opts.rows.length; i++) {
      if (i === opts.rows.length || opts.rows[i].kw !== opts.rows[blockStart].kw) {
        if (i - 1 > blockStart) {
          for (const key of mergeKeys) {
            ws.mergeCells(dataStart + blockStart, colOf(key), dataStart + i - 1, colOf(key));
          }
        }
        blockStart = i;
      }
    }
  }

  if (opts.blockBelow) {
    // A second table (same headers, bogus data) — the reader must stop before it
    // when a blank row separates them, and reject cleanly when it does not.
    const gap = opts.blockBelow === "blank" ? 1 : 0;
    const headerRow = dataStart + opts.rows.length + gap;
    writeHeader(headerRow);
    const extra = ws.getRow(headerRow + 2);
    setCell(extra, colOf("kw"), 999);
    setCell(extra, colOf("unit"), "kW");
    setCell(extra, colOf("phase"), 3);
    setCell(extra, colOf("battery"), 0);
  }
}

/** Synthetic Hybrid rows: 5 kW (1φ+3φ), 10 kW (3φ), 20 kW (3φ). No warnings by
 * design: panels follow (kW x 1.2)/0.63, every battery row's brand also has a
 * base price, every row has at least one price. BrandC has no base price on the
 * 5 kW 1φ row only in the E3 fixtures below. */
export function goodHybridRows(): HybridFixtureRow[] {
  const b5 = { panels: 10, roof: 27, billMin: 3000, billMax: 6000 };
  const b10 = { panels: 19, roof: 51.3, billMin: 6000, billMax: 12000 };
  const b20 = { panels: 38, roof: 102.6, billMin: 13000, billMax: 20000 };
  return [
    { kw: 5, phase: 1, battery: 0, ...b5, prices: [100000, 110000, null, null, null] },
    { kw: 5, phase: 1, battery: 16, ...b5, prices: [160000, 170000, null, null, null] },
    { kw: 5, phase: 3, battery: 0, ...b5, prices: [106000, 116000, null, null, null] },
    { kw: 5, phase: 3, battery: 16, ...b5, prices: [166000, 176000, null, null, null] },
    { kw: 10, phase: 3, battery: 0, ...b10, prices: [150000, 155000, 160000, null, null] },
    { kw: 10, phase: 3, battery: 16, ...b10, prices: [210000, 215000, 220000, null, null] },
    { kw: 10, phase: 3, battery: 32, ...b10, prices: [270000, 275000, 280000, null, null] },
    { kw: 20, phase: 3, battery: 0, ...b20, prices: [250000, 255000, null, 260000, null] },
    { kw: 20, phase: 3, battery: 16, ...b20, prices: [310000, 315000, null, 320000, null] },
  ];
}

function setCell(row: ExcelJS.Row, col: number, value: FixtureCell) {
  if (value === null) return; // leave the cell empty
  row.getCell(col).value = value as ExcelJS.CellValue;
}

/** Column order matches research-145 §2.3 (group|sub label pairs), reduced
 * to only the imported columns — real files interleave extra decorative
 * columns (formula previews, brand prices) that we deliberately don't
 * reproduce since the parser matches by label, not position. */
function columnLayout(includeCategory: boolean) {
  const base = [
    { group: "ขนาดกำลังผลิต", sub: "ขนาดกำลังผลิต" },
    { group: "หน่วย", sub: "หน่วย" },
    { group: "Phase", sub: "Phase" },
    { group: "ผลิตพลังงานต่อวัน", sub: "จำนวนชั่วโมงที่ผลิตได้" },
    { group: "ผลิตพลังงานต่อเดือน", sub: "จำนวนวัน" },
    { group: "แผงโซล่าเซลล์", sub: "จำนวนติดตั้ง" },
    { group: "แผงโซล่าเซลล์", sub: "พื้นที่หลังคาที่ต้องใช้" },
    { group: "ค่าไฟ", sub: "ประมาณ" },
    { group: "ค่าไฟ", sub: "ประมาณ" },
    { group: "ค่าไฟ", sub: "ค่าไฟ/หน่วย" },
  ];
  if (includeCategory) {
    return [{ group: "ประเภท", sub: "ประเภท" }, ...base];
  }
  return base;
}

function rowValues(row: FixtureRow, includeCategory: boolean): FixtureCell[] {
  const base = [
    row.size,
    row.unit,
    row.phase,
    row.sunHours,
    row.days,
    row.panels,
    row.roof ?? null,
    row.billMin,
    row.billMax,
    row.pricePerKwh,
  ];
  return includeCategory ? [row.category ?? "บ้าน", ...base] : base;
}

async function buildWorkbookBuffer(opts: BuildOptions): Promise<Buffer> {
  const includeCategory = opts.includeCategory ?? true;
  const workbook = new ExcelJS.Workbook();

  if (!opts.omitOnGridSheet) {
    const ws = workbook.addWorksheet("On-grid");
    let layout = columnLayout(includeCategory);
    if (opts.dropColumnIndex !== undefined) {
      layout = layout.filter((_, i) => i !== opts.dropColumnIndex);
    }

    const groupRow = ws.getRow(1);
    const subRow = ws.getRow(2);
    layout.forEach((col, i) => {
      const c = i + 1;
      groupRow.getCell(c).value = opts.omitHeaderMarker ? col.group.replace("ผลิตพลังงานต่อวัน", "x") : col.group;
      subRow.getCell(c).value = col.sub;
    });

    let excelRow = 3;
    for (const fixtureRow of opts.rows) {
      let values = rowValues(fixtureRow, includeCategory);
      if (opts.dropColumnIndex !== undefined) {
        values = values.filter((_, i) => i !== opts.dropColumnIndex);
      }
      const row = ws.getRow(excelRow);
      values.forEach((v, i) => setCell(row, i + 1, v));
      excelRow++;
    }

    if (opts.secondTableBelow) {
      excelRow += 2; // blank row(s) end the first table
      const groupRow2 = ws.getRow(excelRow);
      const subRow2 = ws.getRow(excelRow + 1);
      layout.forEach((col, i) => {
        groupRow2.getCell(i + 1).value = col.group;
        subRow2.getCell(i + 1).value = col.sub;
      });
      const secondRow = ws.getRow(excelRow + 2);
      const values = rowValues(
        {
          category: "บ้าน",
          size: 999,
          unit: "kW",
          phase: 3,
          sunHours: 5,
          days: 30,
          panels: 1000,
          roof: 2700,
          billMin: 1,
          billMax: 2,
          pricePerKwh: 4.5,
        },
        includeCategory
      );
      values.forEach((v, i) => setCell(secondRow, i + 1, v));
    }
  }

  for (const name of opts.extraSheetNames ?? []) {
    workbook.addWorksheet(name);
  }

  if (opts.hybrid) addHybridSheet(workbook, opts.hybrid);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/** Builds a valid On-grid workbook matching `opts` and returns its bytes. */
export async function buildOnGridFixture(opts: BuildOptions): Promise<Buffer> {
  return buildWorkbookBuffer(opts);
}

/** A small "good file" fixture: 3 kW (1φ), 5 kW (1φ+3φ, mergeable),
 * 10 kW (1φ+3φ, mergeable) — legacy-table numbers so parity is easy to eyeball. */
export function goodRows(): FixtureRow[] {
  return [
    { category: "บ้าน", size: 3, unit: "kW", phase: 1, sunHours: 5, days: 30, panels: 6, roof: 16.2, billMin: 2000, billMax: 3000, pricePerKwh: 4.5 },
    { category: "บ้าน", size: 5, unit: "kW", phase: 1, sunHours: 5, days: 30, panels: 10, roof: 27, billMin: 3000, billMax: 6000, pricePerKwh: 4.5 },
    { category: "บ้าน", size: 5, unit: "kW", phase: 3, sunHours: 5, days: 30, panels: 10, roof: 27, billMin: 3000, billMax: 6000, pricePerKwh: 4.5 },
    { category: "บ้าน", size: 10, unit: "kW", phase: 1, sunHours: 5, days: 30, panels: 18, roof: 48.6, billMin: 6000, billMax: 10000, pricePerKwh: 4.5 },
    { category: "บ้าน", size: 10, unit: "kW", phase: 3, sunHours: 5, days: 30, panels: 18, roof: 48.6, billMin: 6000, billMax: 10000, pricePerKwh: 4.5 },
  ];
}

/** Adds a `xl/vbaProject.bin` entry to a valid xlsx buffer — simulates a
 * macro-enabled file renamed to .xlsx. */
export async function withMacroEntry(buf: Buffer): Promise<Buffer> {
  const zip = await JSZip.loadAsync(buf as unknown as ExcelJsLoadBuffer);
  zip.file("xl/vbaProject.bin", Buffer.from("fake vba project"));
  const out = await zip.generateAsync({ type: "nodebuffer" });
  return out;
}

/** Adds `extraCount` empty dummy entries to a valid xlsx buffer — pushes zip
 * entry count over the 200 cap. */
export async function withExtraZipEntries(buf: Buffer, extraCount: number): Promise<Buffer> {
  const zip = await JSZip.loadAsync(buf as unknown as ExcelJsLoadBuffer);
  for (let i = 0; i < extraCount; i++) {
    zip.file(`extra/filler-${i}.txt`, "x");
  }
  const out = await zip.generateAsync({ type: "nodebuffer" });
  return out;
}

/** Adds one large, uncompressed (STORE) entry to a valid xlsx buffer so the
 * final file is over `minTotalBytes`. Used for both the "> 2 MB" file-size
 * guard and (with a bigger target) the zip-bomb uncompressed-size guard. */
export async function withLargeEntry(buf: Buffer, sizeBytes: number, store: boolean): Promise<Buffer> {
  const zip = await JSZip.loadAsync(buf as unknown as ExcelJsLoadBuffer);
  // Incompressible bytes (not all-zero) so STORE vs DEFLATE both land near sizeBytes.
  const filler = Buffer.alloc(sizeBytes);
  for (let i = 0; i < filler.length; i++) filler[i] = i % 251;
  zip.file("xl/media/filler.bin", filler, store ? { compression: "STORE" } : { compression: "DEFLATE" });
  const out = await zip.generateAsync({ type: "nodebuffer" });
  return out;
}

/** Bytes for an OLE/CFB file (legacy .xls / password-protected .xlsx) —
 * just the magic header, no valid document needed since validateXlsxBuffer
 * rejects on the magic bytes alone. */
export function oleMagicBuffer(): Buffer {
  return Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
}

/** Adds a highly compressible entry (all zeros) — a small file that inflates
 * to `inflatedBytes`: the classic zip-bomb shape for the uncompressed-size guard. */
export async function withZipBombEntry(buf: Buffer, inflatedBytes: number): Promise<Buffer> {
  const zip = await JSZip.loadAsync(buf as unknown as ExcelJsLoadBuffer);
  zip.file("xl/media/bomb.bin", Buffer.alloc(inflatedBytes), { compression: "DEFLATE" });
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

/** Rewrites the uncompressed-size field of `entryName` in both the local file
 * header and the central directory to `fakeSize` — a bomb that lies about
 * itself, which a guard trusting header sizes would wave through. */
export function forgeUncompressedSize(buf: Buffer, entryName: string, fakeSize: number): Buffer {
  const out = Buffer.from(buf);
  const name = Buffer.from(entryName, "utf8");
  let patched = 0;
  for (let i = 0; i + 46 <= out.length; i++) {
    const sig = out.readUInt32LE(i);
    if (sig === 0x04034b50) {
      const nameLen = out.readUInt16LE(i + 26);
      if (out.subarray(i + 30, i + 30 + nameLen).equals(name)) {
        out.writeUInt32LE(fakeSize, i + 22);
        patched++;
      }
    } else if (sig === 0x02014b50) {
      const nameLen = out.readUInt16LE(i + 28);
      if (out.subarray(i + 46, i + 46 + nameLen).equals(name)) {
        out.writeUInt32LE(fakeSize, i + 24);
        patched++;
      }
    }
  }
  if (patched < 2) throw new Error(`forgeUncompressedSize: patched ${patched} headers for ${entryName}`);
  return out;
}
