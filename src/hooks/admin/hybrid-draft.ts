// Pure model of the Hybrid working copy used by the admin size-table editor
// (R2-S6, design-162 §5.4 / §6.1). One draft entry per kW size (the shared
// values live on the size, the phase x battery x brand prices on its rows),
// resolved to the flat `HybridRow[]` that `validateHybridTable` and
// `saveCalculatorTables` use. CLIENT-SAFE: imports only the pure Hybrid model
// and the shared validator — never the import lib's index (exceljs).
import { hybridMonthlySaving, MAX_HYBRID_ROWS, type HybridRow } from "@/lib/calculator-hybrid";
import { expectedPanels, validateHybridTable } from "@/lib/calculator-import/validate-hybrid";
import type { TableIssue, TableWarning } from "@/lib/calculator-import/messages";

export const ROOF_M2_PER_PANEL = 2.7;
const PANEL_TOLERANCE = 0.2;

export type HybridSharedField =
  | "sunHours"
  | "days"
  | "pricePerKwh"
  | "panels"
  | "roofM2"
  | "billMin"
  | "billMax";
export type HybridField = "kw" | "phases" | HybridSharedField | "batteryKwh" | "prices";

export const HYBRID_FIELD_LABEL: Record<"kw" | HybridSharedField, string> = {
  kw: "ขนาด (kW)",
  sunHours: "ชม.แดด/วัน",
  days: "วัน/เดือน",
  pricePerKwh: "ค่าไฟ/หน่วย (฿)",
  panels: "จำนวนแผง",
  roofM2: "หลังคา (ตร.ม.)",
  billMin: "ค่าไฟต่ำสุด (฿)",
  billMax: "ค่าไฟสูงสุด (฿)",
};

/** DOM id of a shared field's input inside the Hybrid dialog (design-162 §5.4 / §13.4). */
export const HYBRID_FIELD_DOM_ID: Record<"kw" | "phases" | HybridSharedField, string> = {
  kw: "hy-kw",
  phases: "hy-phase-1",
  sunHours: "hy-sun",
  days: "hy-days",
  pricePerKwh: "hy-price",
  panels: "hy-panels",
  roofM2: "hy-roof",
  billMin: "hy-bill-min",
  billMax: "hy-bill-max",
};

/** One phase x battery row of a size. `prices` is aligned with the table's brand order. */
export type HybridBatteryDraft = {
  key: string;
  phase: 1 | 3;
  /** null = blank (a row added in this session that is not filled in yet). */
  batteryKwh: number | null;
  /** null = no price; NaN = unparseable text. */
  prices: (number | null)[];
  isNew: boolean;
  deleted: boolean;
};

export type HybridSizeValues = {
  kw: number | null;
  sunHours: number | null;
  days: number | null;
  pricePerKwh: number | null;
  panels: number | null;
  roofM2: number | null;
  billMin: number | null;
  billMax: number | null;
  rows: HybridBatteryDraft[];
};

export type DraftHybridSize = {
  key: string;
  /** Rows of the live size (sorted); null for a size added in this session. */
  original: HybridRow[] | null;
  current: HybridSizeValues;
  deleted: boolean;
};

export type HybridDraftStatus = "same" | "changed" | "new" | "deleted";

export type HybridIssue = {
  /** DraftHybridSize key; "" for a whole-table issue. */
  key: string;
  field: HybridField | "table";
  /** Battery row the issue is about (when known). */
  rowKey?: string;
  /** Position-free Thai text. */
  message: string;
};

/** Battery / price problems belong to one battery row; every other field is shared by all rows of a size. */
export const isHybridRowField = (i: Pick<HybridIssue, "field">) => i.field === "batteryKwh" || i.field === "prices";

/**
 * The ONE way Hybrid errors are counted (row badge, sub-tab badge, save bar, dialog summary). The
 * validator reports a shared-field problem (e.g. a bad bill range) once per battery row; the admin
 * sees one problem, so collapse by size + field + message (+ rowKey for battery / price issues only).
 */
export function dedupeHybridIssues(issues: HybridIssue[]): HybridIssue[] {
  const seen = new Set<string>();
  return issues.filter((i) => {
    const k = `${i.key}|${i.field}|${i.message}|${isHybridRowField(i) ? (i.rowKey ?? "") : ""}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

const isNum = (v: number | null): v is number => typeof v === "number" && Number.isFinite(v);
const round2 = (n: number) => Math.round(n * 100) / 100;
const kwId = (kw: number) => String(kw).replace(".", "_");

export const hybridSizeKey = (kw: number) => `hy-${kwId(kw)}`;
const originalRowKey = (phase: number, battery: number) => `${phase}|${battery}`;

/** DOM id of one price cell: `hy-price-{brandIndex}-{phase}-{kWh}` (new rows use their key). */
export function hybridPriceId(brandIndex: number, row: HybridBatteryDraft): string {
  const tail = row.isNew
    ? row.key
    : `${row.phase}-${row.batteryKwh === null ? "x" : kwId(row.batteryKwh)}`;
  return `hy-price-${brandIndex}-${tail}`;
}
/** DOM id of the kWh input of a row added in this session. */
export const hybridBatteryInputId = (row: HybridBatteryDraft) => `hy-battery-${row.key}`;

export function sizeValuesFromRows(rows: HybridRow[]): HybridSizeValues {
  const first = rows[0];
  return {
    kw: first.kw,
    sunHours: first.sunHours,
    days: first.days,
    pricePerKwh: first.pricePerKwh,
    panels: first.panels,
    roofM2: first.roofM2,
    billMin: first.billMin,
    billMax: first.billMax,
    rows: [...rows]
      .sort((a, b) => a.phase - b.phase || a.batteryKwh - b.batteryKwh)
      .map((r) => ({
        key: originalRowKey(r.phase, r.batteryKwh),
        phase: r.phase,
        batteryKwh: r.batteryKwh,
        prices: r.brandPrices.map((b) => b.priceThb),
        isNew: false,
        deleted: false,
      })),
  };
}

/** Groups a flat table into per-kW drafts, ascending by kW. null = no Hybrid table. */
export function hybridSizesFromRows(rows: HybridRow[] | null): DraftHybridSize[] | null {
  if (!rows || rows.length === 0) return null;
  const byKw = new Map<number, HybridRow[]>();
  for (const row of rows) byKw.set(row.kw, [...(byKw.get(row.kw) ?? []), row]);
  return [...byKw.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([kw, group]) => ({
      key: hybridSizeKey(kw),
      original: [...group].sort((a, b) => a.phase - b.phase || a.batteryKwh - b.batteryKwh),
      current: sizeValuesFromRows(group),
      deleted: false,
    }));
}

export const liveRows = (v: HybridSizeValues) => v.rows.filter((r) => !r.deleted);

/** Phases that still have at least one (not deleted) row. */
export function livePhases(v: HybridSizeValues): (1 | 3)[] {
  return [...new Set(liveRows(v).map((r) => r.phase))].sort() as (1 | 3)[];
}

/** Flat rows of a size, or null while a required field / battery is blank or not a number. */
export function resolveHybridSize(v: HybridSizeValues, brands: string[]): HybridRow[] | null {
  if (
    !isNum(v.kw) ||
    v.kw <= 0 ||
    !isNum(v.sunHours) ||
    !isNum(v.days) ||
    !isNum(v.pricePerKwh) ||
    !isNum(v.panels) ||
    !isNum(v.billMin) ||
    !isNum(v.billMax)
  ) {
    return null;
  }
  const live = liveRows(v);
  if (live.length === 0) return null;
  const roofM2 = isNum(v.roofM2) && v.roofM2 > 0 ? v.roofM2 : round2(v.panels * ROOF_M2_PER_PANEL);
  const out: HybridRow[] = [];
  for (const r of live) {
    if (!isNum(r.batteryKwh) || r.batteryKwh < 0) return null;
    if (r.prices.some((p) => p !== null && (!Number.isFinite(p) || p < 0))) return null;
    out.push({
      kw: v.kw,
      phase: r.phase,
      batteryKwh: r.batteryKwh,
      sunHours: v.sunHours,
      days: v.days,
      pricePerKwh: v.pricePerKwh,
      panels: v.panels,
      roofM2,
      billMin: v.billMin,
      billMax: v.billMax,
      brandPrices: brands.map((brand, i) => ({ brand, priceThb: r.prices[i] ?? null })),
    });
  }
  return out.sort((a, b) => a.phase - b.phase || a.batteryKwh - b.batteryKwh);
}

function sameRowSet(a: HybridRow[], b: HybridRow[]): boolean {
  if (a.length !== b.length) return false;
  const order = (x: HybridRow, y: HybridRow) => x.phase - y.phase || x.batteryKwh - y.batteryKwh;
  const sa = [...a].sort(order);
  const sb = [...b].sort(order);
  return sa.every((x, i) => {
    const y = sb[i];
    return (
      x.kw === y.kw &&
      x.phase === y.phase &&
      x.batteryKwh === y.batteryKwh &&
      x.sunHours === y.sunHours &&
      x.days === y.days &&
      x.pricePerKwh === y.pricePerKwh &&
      x.panels === y.panels &&
      x.roofM2 === y.roofM2 &&
      x.billMin === y.billMin &&
      x.billMax === y.billMax &&
      x.brandPrices.length === y.brandPrices.length &&
      x.brandPrices.every((p, k) => p.brand === y.brandPrices[k].brand && p.priceThb === y.brandPrices[k].priceThb)
    );
  });
}

/** "Edited back to the original" counts as unchanged (design-162 §6.1). */
export function hybridSizeStatus(size: DraftHybridSize, brands: string[]): HybridDraftStatus {
  if (!size.original) return "new";
  if (size.deleted) return "deleted";
  const resolved = resolveHybridSize(size.current, brands);
  return resolved && sameRowSet(resolved, size.original) ? "same" : "changed";
}

export type HybridChangeSet = {
  fields: Set<HybridSharedField>;
  phases: boolean;
  /** Battery rows added/removed. */
  batteries: boolean;
  prices: boolean;
};

/** Which parts of an edited size differ from the original (for highlighting). */
export function hybridChanges(size: DraftHybridSize): HybridChangeSet {
  const out: HybridChangeSet = { fields: new Set(), phases: false, batteries: false, prices: false };
  const o = size.original;
  if (!o) return out;
  const c = size.current;
  const first = o[0];
  const roof = isNum(c.panels) ? (isNum(c.roofM2) && c.roofM2 > 0 ? c.roofM2 : round2(c.panels * ROOF_M2_PER_PANEL)) : c.roofM2;
  const cmp: [HybridSharedField, unknown, unknown][] = [
    ["sunHours", c.sunHours, first.sunHours],
    ["days", c.days, first.days],
    ["pricePerKwh", c.pricePerKwh, first.pricePerKwh],
    ["panels", c.panels, first.panels],
    ["roofM2", roof, first.roofM2],
    ["billMin", c.billMin, first.billMin],
    ["billMax", c.billMax, first.billMax],
  ];
  for (const [field, a, b] of cmp) if (a !== b) out.fields.add(field);

  const live = liveRows(c);
  out.phases = livePhases(c).join() !== [...new Set(o.map((r) => r.phase))].sort().join();
  const originalKeys = new Set(o.map((r) => originalRowKey(r.phase, r.batteryKwh)));
  const liveKeys = new Set(live.map((r) => (isNum(r.batteryKwh) ? originalRowKey(r.phase, r.batteryKwh) : r.key)));
  out.batteries =
    originalKeys.size !== liveKeys.size || [...originalKeys].some((k) => !liveKeys.has(k));
  for (const r of live) {
    if (!isNum(r.batteryKwh)) continue;
    const base = o.find((x) => x.phase === r.phase && x.batteryKwh === r.batteryKwh);
    if (!base) continue;
    if (r.prices.some((p, i) => (p ?? null) !== (base.brandPrices[i]?.priceThb ?? null))) out.prices = true;
  }
  return out;
}

const SHARED_REQUIRED = ["sunHours", "days", "pricePerKwh", "panels", "billMin", "billMax"] as const;

function localIssues(size: DraftHybridSize): Omit<HybridIssue, "key">[] {
  const v = size.current;
  const out: Omit<HybridIssue, "key">[] = [];
  if (!isNum(v.kw) || v.kw <= 0) out.push({ field: "kw", message: `${HYBRID_FIELD_LABEL.kw}: กรอกตัวเลขมากกว่า 0` });
  for (const field of SHARED_REQUIRED) {
    if (!isNum(v[field])) out.push({ field, message: `${HYBRID_FIELD_LABEL[field]}: กรอกตัวเลข` });
  }
  if (isNum(v.billMin) && v.billMin < 0) {
    out.push({ field: "billMin", message: `${HYBRID_FIELD_LABEL.billMin}: ต้องไม่ติดลบ` });
  }
  if (v.roofM2 !== null && (!isNum(v.roofM2) || v.roofM2 <= 0)) {
    out.push({ field: "roofM2", message: `${HYBRID_FIELD_LABEL.roofM2}: ต้องมากกว่า 0 หรือเว้นว่างไว้` });
  }
  const live = liveRows(v);
  if (live.length === 0) out.push({ field: "phases", message: "เฟส: เลือกอย่างน้อย 1 เฟส" });
  for (const r of live) {
    if (!isNum(r.batteryKwh) || r.batteryKwh < 0) {
      out.push({ field: "batteryKwh", rowKey: r.key, message: "ขนาดแบต (kWh): กรอกตัวเลขตั้งแต่ 0" });
    }
    if (r.prices.some((p) => p !== null && (!Number.isFinite(p) || p < 0))) {
      out.push({ field: "prices", rowKey: r.key, message: "ราคา: กรอกเป็นตัวเลขตั้งแต่ 0 หรือเว้นว่างถ้าไม่มีราคา" });
    }
  }
  return out;
}

const VALIDATOR_FIELD: Record<string, HybridField> = {
  kw: "kw",
  phase: "phases",
  batteryKwh: "batteryKwh",
  brandPrices: "prices",
  sunHours: "sunHours",
  days: "days",
  pricePerKwh: "pricePerKwh",
  panels: "panels",
  roofM2: "roofM2",
  billMin: "billMin",
  billMax: "billMax",
};

/** Maps a validator `field` (client or server TableIssue) to a Hybrid draft field. */
export function toHybridField(field: string | undefined): HybridField {
  return VALIDATOR_FIELD[field ?? ""] ?? "kw";
}

export type HybridValidation = {
  issues: HybridIssue[];
  warnings: TableWarning[];
  /** Resolved flat table (kW, phase, battery order) when there are no issues. */
  table: HybridRow[] | null;
};

/** Validates the live (not deleted) sizes as one table. */
export function validateHybridDraft(sizes: DraftHybridSize[], brands: string[]): HybridValidation {
  const live = sizes.filter((s) => !s.deleted);
  if (live.length === 0) {
    return {
      issues: [
        {
          key: "",
          field: "table",
          message:
            "ตาราง Hybrid ต้องมีอย่างน้อย 1 ขนาด — ถ้าไม่ต้องการ Hybrid ให้นำเข้าไฟล์ Excel ที่ไม่มีชีต Hybrid",
        },
      ],
      warnings: [],
      table: null,
    };
  }

  const issues: HybridIssue[] = [];
  const totalRows = live.reduce((n, s) => n + liveRows(s.current).length, 0);
  if (totalRows > MAX_HYBRID_ROWS) {
    issues.push({ key: "", field: "table", message: `ตาราง Hybrid มีได้ไม่เกิน ${MAX_HYBRID_ROWS} แถว` });
  }

  const flat: HybridRow[] = [];
  const meta: { key: string; rowKey: string }[] = [];
  for (const size of live) {
    const local = localIssues(size);
    if (local.length > 0) {
      issues.push(...local.map((i) => ({ key: size.key, ...i })));
      continue;
    }
    const resolved = resolveHybridSize(size.current, brands);
    if (!resolved) continue;
    // resolveHybridSize sorts; keep the same order for the row-key lookup.
    const liveSorted = [...liveRows(size.current)].sort(
      (a, b) => a.phase - b.phase || (a.batteryKwh as number) - (b.batteryKwh as number)
    );
    resolved.forEach((row, i) => {
      flat.push(row);
      meta.push({ key: size.key, rowKey: liveSorted[i].key });
    });
  }

  const validation = validateHybridTable(flat);
  const mapIssue = (issue: TableIssue): HybridIssue => {
    const target = meta[issue.rowIndex];
    return {
      key: target?.key ?? "",
      field: target ? toHybridField(issue.field) : "table",
      rowKey: target?.rowKey,
      message: issue.message,
    };
  };
  issues.push(...validation.issues.map(mapIssue));
  if (issues.length > 0) return { issues, warnings: [], table: null };
  return { issues, warnings: validation.warnings, table: validation.rows };
}

/** "Hybrid 5 kW: …" label for lists that mix several sizes (save bar, confirm). */
export function hybridIssueText(issue: HybridIssue, sizes: DraftHybridSize[]): string {
  const size = sizes.find((s) => s.key === issue.key);
  if (!size) return issue.message;
  const kw = isNum(size.current.kw) ? `${size.current.kw.toLocaleString("th-TH")} kW` : "ขนาดใหม่";
  return `Hybrid ${kw}: ${issue.message}`;
}

// ---- derived numbers (list / dialog) ----

/** Brands (by index) with a usable price on at least one row — same rule as `usablePrices`. */
export function usableBrandIndexes(rows: HybridRow[]): Set<number> {
  const base = new Map<string, Set<number>>();
  for (const row of rows) {
    if (row.batteryKwh !== 0) continue;
    const set = new Set<number>();
    row.brandPrices.forEach((bp, i) => {
      if (bp.priceThb !== null && bp.priceThb > 0) set.add(i);
    });
    base.set(`${row.kw}|${row.phase}`, set);
  }
  const out = new Set<number>();
  for (const row of rows) {
    row.brandPrices.forEach((bp, i) => {
      if (bp.priceThb === null || !(bp.priceThb > 0)) return;
      if (row.batteryKwh > 0 && !base.get(`${row.kw}|${row.phase}`)?.has(i)) return;
      out.add(i);
    });
  }
  return out;
}

export type RowPayback = {
  /** Cheapest usable price of the row (null = none). */
  minPrice: number | null;
  minBrand: string | null;
  saving: number;
  paybackYears: number | null;
};

/** Per-row saving + payback in the same order as `rows` (design-162 §5.4: uncapped saving, cheapest usable price). */
export function hybridRowPaybacks(rows: HybridRow[], multiplier: number): RowPayback[] {
  const baseBrands = new Map<string, Set<number>>();
  for (const row of rows) {
    if (row.batteryKwh !== 0) continue;
    const set = new Set<number>();
    row.brandPrices.forEach((bp, i) => {
      if (bp.priceThb !== null && bp.priceThb > 0) set.add(i);
    });
    baseBrands.set(`${row.kw}|${row.phase}`, set);
  }
  return rows.map((row) => {
    let min: { brand: string; price: number } | null = null;
    row.brandPrices.forEach((bp, i) => {
      if (bp.priceThb === null || !(bp.priceThb > 0)) return;
      if (row.batteryKwh > 0 && !baseBrands.get(`${row.kw}|${row.phase}`)?.has(i)) return;
      if (min === null || bp.priceThb < min.price) min = { brand: bp.brand, price: bp.priceThb };
    });
    const saving = hybridMonthlySaving(row);
    const found = min as { brand: string; price: number } | null;
    return {
      minPrice: found?.price ?? null,
      minBrand: found?.brand ?? null,
      saving,
      paybackYears: found && saving > 0 ? found.price / (saving * multiplier) : null,
    };
  });
}

export type HybridSizeSummary = {
  phases: (1 | 3)[];
  batteries: number[];
  brandsWithPrice: number;
  brandCount: number;
  paybackMin: number | null;
  paybackMax: number | null;
  rowsWithoutPrice: number;
};

export function summarizeHybridRows(rows: HybridRow[], multiplier: number): HybridSizeSummary {
  const paybacks = hybridRowPaybacks(rows, multiplier);
  const values = paybacks.flatMap((p) => (p.paybackYears === null ? [] : [p.paybackYears]));
  return {
    phases: [...new Set(rows.map((r) => r.phase))].sort() as (1 | 3)[],
    batteries: [...new Set(rows.map((r) => r.batteryKwh))].sort((a, b) => a - b),
    brandsWithPrice: usableBrandIndexes(rows).size,
    brandCount: rows[0]?.brandPrices.length ?? 0,
    paybackMin: values.length ? Math.min(...values) : null,
    paybackMax: values.length ? Math.max(...values) : null,
    rowsWithoutPrice: paybacks.filter((p) => p.paybackYears === null).length,
  };
}

/** E5 (hand-edit flavour): panels differ from the Excel's own (kW x 1.2) / 0.63 by more than 20%. */
export function panelsFormulaGap(kw: number | null, panels: number | null): { expected: number } | null {
  if (!isNum(kw) || kw <= 0 || !isNum(panels)) return null;
  const expected = expectedPanels(kw);
  return Math.abs(panels - expected) / expected > PANEL_TOLERANCE ? { expected: Math.ceil(expected) } : null;
}

/** E3 for one price cell: a battery row's price is ignored when the same brand
 * has no > 0 price on the no-battery row of the same phase. */
export function isIgnoredBatteryPrice(v: HybridSizeValues, row: HybridBatteryDraft, brandIndex: number): boolean {
  const price = row.prices[brandIndex];
  if (row.deleted || !isNum(row.batteryKwh) || row.batteryKwh <= 0) return false;
  if (price === null || price === undefined || !Number.isFinite(price) || !(price > 0)) return false;
  const base = liveRows(v).find((r) => r.phase === row.phase && r.batteryKwh === 0);
  const basePrice = base?.prices[brandIndex];
  return !(typeof basePrice === "number" && Number.isFinite(basePrice) && basePrice > 0);
}
