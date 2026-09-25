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
};

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
