// Server-only (exceljs): builds the calculator Excel workbook the owner can
// download, edit and import back (docs/plans/calculator-hybrid-toggle-sprints.md
// R1-S3). The "On-grid" sheet mirrors the sales team's template: a 2-row
// header (group / sub) whose labels come from ON_GRID_HEADER in
// read-on-grid.ts, one row per (kW, phase), entered values as plain numbers
// and derived columns as formulas WITH a cached `result` (research-158 H6) so
// the file shows numbers in any viewer and the importer — which only reads
// entered columns — round-trips it with no warnings. Never import from a
// client component. No brand/category columns: the system never stores them
// (Default #9).
import ExcelJS from "exceljs";
import type { SizeRow } from "../calculator-size-table";
import { hybridMonthlySaving } from "../calculator-hybrid";
import type { HybridRow } from "../calculator-hybrid";
import { ON_GRID_HEADER as H } from "./read-on-grid";
import { HYBRID_HEADER as HH } from "./read-hybrid";

export const ON_GRID_SHEET_NAME = "On-grid";
export const HYBRID_SHEET_NAME = "Hybrid";

type Col = { group: string; sub: string; width: number; numFmt?: string };

// Order = the sales team's template minus the "ประเภท"/"ที่" and brand-price columns.
const COLS: Col[] = [
  { ...H.size, width: 14 }, // A
  { ...H.unit, width: 8 }, // B
  { ...H.phase, width: 8 }, // C
  { group: H.sunHours.group, sub: `${H.sunHours.subPrefix}ที่ผลิตสูงสุด`, width: 16 }, // D
  { group: H.sunHours.group, sub: "พลังงาน", width: 10, numFmt: "0.0#" }, // E
  { group: H.sunHours.group, sub: "หน่วย", width: 8 }, // F
  { ...H.days, width: 10 }, // G
  { group: H.days.group, sub: "หน่วย/เดือน", width: 12, numFmt: "#,##0.0" }, // H
  { group: H.panels.group, sub: "จำนวนคำนวณ", width: 12, numFmt: "0.0" }, // I
  { ...H.panels, width: 12 }, // J
  { group: H.roof.group, sub: `${H.roof.subPrefix}ที่ต้องใช้ติดตั้ง`, width: 18, numFmt: "0.0#" }, // K
  { ...H.bill, width: 11, numFmt: "#,##0" }, // L billMin
  { ...H.bill, width: 11, numFmt: "#,##0" }, // M billMax
  { group: H.bill.group, sub: "หน่วย", width: 8 }, // N
  { ...H.price, width: 12, numFmt: "0.00" }, // O
  { group: H.bill.group, sub: "จำนวนหน่วยที่ใช้/เดือน", width: 12, numFmt: "#,##0" }, // P
  { group: H.bill.group, sub: "จำนวนหน่วยที่ใช้/เดือน", width: 12, numFmt: "#,##0" }, // Q
  { group: "ลดค่าไฟได้/เดือน", sub: "ประมาณ", width: 14, numFmt: "#,##0" }, // R
  { group: "ลดค่าไฟได้/เดือน", sub: "หน่วย", width: 8 }, // S
  { group: "ลดค่าไฟได้ต่อปี", sub: "ประมาณ", width: 14, numFmt: "#,##0" }, // T
  { group: "ลดค่าไฟได้ต่อปี", sub: "หน่วย", width: 8 }, // U
];

const ROOF_M2_PER_PANEL = 2.7;
const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF2CC" } };

function colLetter(index: number): string {
  return String.fromCharCode(64 + index); // 21 columns, A..U
}

function writeOnGridSheet(workbook: ExcelJS.Workbook, rows: SizeRow[]) {
  const ws = workbook.addWorksheet(ON_GRID_SHEET_NAME, { views: [{ state: "frozen", ySplit: 2, xSplit: 3 }] });
  COLS.forEach((c, i) => {
    ws.getColumn(i + 1).width = c.width;
    ws.getRow(1).getCell(i + 1).value = c.group;
    ws.getRow(2).getCell(i + 1).value = c.sub;
  });

  // Merge like the template: identical group labels side by side, and
  // single-column groups (group === sub) across both header rows.
  let start = 0;
  for (let i = 1; i <= COLS.length; i++) {
    if (i < COLS.length && COLS[i].group === COLS[start].group) continue;
    const a = colLetter(start + 1);
    const b = colLetter(i);
    if (COLS[start].group === COLS[start].sub && i - start === 1) ws.mergeCells(`${a}1:${a}2`);
    else if (i - start > 1) ws.mergeCells(`${a}1:${b}1`);
    start = i;
  }
  // Sub-header "ประมาณ" / usage spans two columns (billMin–billMax, min–max units).
  ws.mergeCells("L2:M2");
  ws.mergeCells("P2:Q2");

  for (const r of [1, 2]) {
    const row = ws.getRow(r);
    row.font = { bold: true };
    row.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    for (let c = 1; c <= COLS.length; c++) row.getCell(c).fill = HEADER_FILL;
  }

  let n = 3;
  for (const row of [...rows].sort((a, b) => a.kw - b.kw)) {
    for (const phase of [...row.phases].sort()) {
      const x = ws.getRow(n);
      const kwhDay = row.kw * row.sunHours;
      const kwhMonth = row.days * kwhDay;
      const saving = kwhMonth * row.pricePerKwh;
      const panelsCalc = (row.kw * 0.15 + row.kw) / 0.63;
      const roofIsDerived = row.roofM2 === Math.round(row.panels * ROOF_M2_PER_PANEL * 100) / 100;

      x.getCell(1).value = row.kw;
      x.getCell(2).value = "kW";
      x.getCell(3).value = phase;
      x.getCell(4).value = row.sunHours;
      x.getCell(5).value = { formula: `D${n}*A${n}`, result: kwhDay };
      x.getCell(6).value = "kWp";
      x.getCell(7).value = row.days;
      x.getCell(8).value = { formula: `G${n}*E${n}`, result: kwhMonth };
      x.getCell(9).value = { formula: `((A${n}*0.15)+A${n})/0.63`, result: panelsCalc };
      x.getCell(10).value = row.panels;
      x.getCell(11).value = roofIsDerived
        ? { formula: `J${n}*${ROOF_M2_PER_PANEL}`, result: row.roofM2 }
        : row.roofM2; // owner-overridden roof area stays an entered value
      x.getCell(12).value = row.billMin;
      x.getCell(13).value = row.billMax;
      x.getCell(14).value = "บาท";
      x.getCell(15).value = row.pricePerKwh;
      x.getCell(16).value = { formula: `L${n}/O${n}`, result: row.billMin / row.pricePerKwh };
      x.getCell(17).value = { formula: `M${n}/O${n}`, result: row.billMax / row.pricePerKwh };
      x.getCell(18).value = { formula: `H${n}*O${n}`, result: saving };
      x.getCell(19).value = "บาท";
      x.getCell(20).value = { formula: `R${n}*10`, result: saving * 10 };
      x.getCell(21).value = "บาท";
      COLS.forEach((c, i) => {
        if (c.numFmt) x.getCell(i + 1).numFmt = c.numFmt;
      });
      n++;
    }
  }
}

// --- Hybrid sheet (R2-S5) -------------------------------------------------
// One row per (kW, phase, battery). Per-kW shared values (size, sun hours,
// days, panels, roof, bill range, tariff and their derived columns) are
// written once and merged down the kW block, like the sales team's sheet
// (research-154 §1 item 2); Phase and battery are filled on every row. Brand
// prices are plain numbers (blank = no price) under the group "ยี่ห้อ" in
// brands order — never formulas, and no battery-price block below (D6). The
// payback group is not exported: the reader never reads it.
type HybridCol = { key: string; group: string; sub: string; width: number; numFmt?: string; shared: boolean };

const HYBRID_FIXED_COLS: HybridCol[] = [
  { key: "kw", group: HH.size.group, sub: HH.size.sub, width: 10, shared: true }, // A
  { key: "unit", group: HH.size.group, sub: HH.unit.sub, width: 8, shared: true }, // B
  { key: "phase", group: HH.phase.group, sub: HH.phase.sub, width: 8, shared: false }, // C
  { key: "battery", group: HH.battery.group, sub: `${HH.battery.subPrefix} (kWh)`, width: 14, shared: false }, // D
  { key: "sunHours", group: HH.sunHours.group, sub: `${HH.sunHours.subPrefix}ที่ผลิตได้`, width: 16, shared: true }, // E
  { key: "kwhDay", group: HH.sunHours.group, sub: "พลังงาน (kWh)", width: 12, numFmt: "0.0#", shared: true }, // F
  { key: "days", group: HH.days.group, sub: HH.days.sub, width: 10, shared: true }, // G
  { key: "kwhMonth", group: HH.days.group, sub: "หน่วย/เดือน", width: 12, numFmt: "#,##0.0", shared: true }, // H
  { key: "panelsCalc", group: HH.panels.group, sub: "จำนวนคำนวณ", width: 12, numFmt: "0.0", shared: true }, // I
  { key: "panels", group: HH.panels.group, sub: HH.panels.sub, width: 12, shared: true }, // J
  { key: "roof", group: HH.roof.group, sub: `${HH.roof.subPrefix}ที่ต้องใช้ติดตั้ง`, width: 18, numFmt: "0.0#", shared: true }, // K
  { key: "billMin", group: HH.bill.group, sub: HH.bill.sub, width: 11, numFmt: "#,##0", shared: true }, // L
  { key: "billMax", group: HH.bill.group, sub: HH.bill.sub, width: 11, numFmt: "#,##0", shared: true }, // M
  { key: "price", group: HH.price.group, sub: HH.price.sub, width: 12, numFmt: "0.00", shared: true }, // N
  { key: "saving", group: "ประหยัดค่าไฟ/เดือน", sub: "ประมาณ (บาท)", width: 16, numFmt: "#,##0", shared: false }, // O
];

function writeHybridSheet(workbook: ExcelJS.Workbook, input: HybridRow[]) {
  const rows = [...input].sort((a, b) => a.kw - b.kw || a.phase - b.phase || a.batteryKwh - b.batteryKwh);
  const brands = (rows[0]?.brandPrices ?? []).map((b) => b.brand);
  const cols: HybridCol[] = [
    ...HYBRID_FIXED_COLS,
    ...brands.map((name) => ({ key: `brand:${name}`, group: HH.brand.group, sub: name, width: 13, numFmt: "#,##0", shared: false })),
  ];
  const at = (key: string) => cols.findIndex((c) => c.key === key) + 1; // 1-based column index
  const L = (key: string) => colLetter(at(key));

  const ws = workbook.addWorksheet(HYBRID_SHEET_NAME, { views: [{ state: "frozen", ySplit: 2, xSplit: 4 }] });
  cols.forEach((c, i) => {
    ws.getColumn(i + 1).width = c.width;
    ws.getRow(1).getCell(i + 1).value = c.group;
    ws.getRow(2).getCell(i + 1).value = c.sub;
  });
  let start = 0;
  for (let i = 1; i <= cols.length; i++) {
    if (i < cols.length && cols[i].group === cols[start].group) continue;
    if (i - start > 1) ws.mergeCells(`${colLetter(start + 1)}1:${colLetter(i)}1`);
    start = i;
  }
  ws.mergeCells(`${L("billMin")}2:${L("billMax")}2`);
  for (const r of [1, 2]) {
    const row = ws.getRow(r);
    row.font = { bold: true };
    row.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    for (let c = 1; c <= cols.length; c++) row.getCell(c).fill = HEADER_FILL;
  }

  let n = 3;
  let master = 3; // first row of the current kW block: the shared cells live here
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const sharedFirst = i === 0 || rows[i - 1].kw !== row.kw;
    if (sharedFirst) master = n;
    const x = ws.getRow(n);
    if (sharedFirst) {
      const kwhDay = row.kw * row.sunHours;
      const kwhMonth = row.days * kwhDay;
      const roofIsDerived = row.roofM2 === Math.round(row.panels * ROOF_M2_PER_PANEL * 100) / 100;
      const a = (key: string) => `${L(key)}${master}`;
      x.getCell(at("kw")).value = row.kw;
      x.getCell(at("unit")).value = "kW";
      x.getCell(at("sunHours")).value = row.sunHours;
      x.getCell(at("kwhDay")).value = { formula: `${a("sunHours")}*${a("kw")}`, result: kwhDay };
      x.getCell(at("days")).value = row.days;
      x.getCell(at("kwhMonth")).value = { formula: `${a("days")}*${a("kwhDay")}`, result: kwhMonth };
      x.getCell(at("panelsCalc")).value = { formula: `((${a("kw")}*0.15)+${a("kw")})/0.63`, result: (row.kw * 0.15 + row.kw) / 0.63 };
      x.getCell(at("panels")).value = row.panels;
      x.getCell(at("roof")).value = roofIsDerived
        ? { formula: `${a("panels")}*${ROOF_M2_PER_PANEL}`, result: row.roofM2 }
        : row.roofM2;
      x.getCell(at("billMin")).value = row.billMin;
      x.getCell(at("billMax")).value = row.billMax;
      x.getCell(at("price")).value = row.pricePerKwh;
    }
    x.getCell(at("phase")).value = row.phase;
    x.getCell(at("battery")).value = row.batteryKwh;
    // Same formula as the site: (kW x sun hours + battery kWh) x tariff x days.
    x.getCell(at("saving")).value = {
      formula: `(${L("kw")}${master}*${L("sunHours")}${master}+${L("battery")}${n})*${L("price")}${master}*${L("days")}${master}`,
      result: hybridMonthlySaving(row),
    };
    for (const name of brands) {
      const price = row.brandPrices.find((b) => b.brand === name)?.priceThb ?? null;
      if (price !== null) x.getCell(at(`brand:${name}`)).value = price; // plain number (D6)
    }
    cols.forEach((c, k) => {
      if (c.numFmt) x.getCell(k + 1).numFmt = c.numFmt;
    });

    const last = i === rows.length - 1 || rows[i + 1].kw !== row.kw;
    if (last && n > master) {
      for (const c of cols) if (c.shared) ws.mergeCells(`${colLetter(at(c.key))}${master}:${colLetter(at(c.key))}${n}`);
    }
    if (last) {
      for (const c of cols) {
        if (c.shared) ws.getRow(master).getCell(at(c.key)).alignment = { vertical: "middle", horizontal: "center" };
      }
    }
    n++;
  }
}

/** Builds the downloadable workbook. The Hybrid sheet exists only when `hybrid` has rows (Default #8). */
export async function buildCalculatorWorkbook(input: { onGrid: SizeRow[]; hybrid?: HybridRow[] | null }): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  writeOnGridSheet(workbook, input.onGrid);
  if (input.hybrid && input.hybrid.length > 0) writeHybridSheet(workbook, input.hybrid);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
