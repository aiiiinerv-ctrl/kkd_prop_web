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
import { ON_GRID_HEADER as H } from "./read-on-grid";

export const ON_GRID_SHEET_NAME = "On-grid";

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

/** Builds the downloadable workbook. R1 has the On-grid sheet only. */
export async function buildCalculatorWorkbook(input: { onGrid: SizeRow[] }): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  writeOnGridSheet(workbook, input.onGrid);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
