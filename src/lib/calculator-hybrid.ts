// Hybrid (battery) calculator model: row type, table schema, saving formula,
// usable-price rule and the client-side recommendation. Pure and client-safe —
// no I/O, no Excel libs, no DB. The server-only projection that strips brand
// names/prices lives in calculator-hybrid-projection.ts (Default #5).
// See docs/plans/calculator-hybrid-toggle-sprints.md R2-S1.
import { z } from "zod";
import { CALCULATOR_DEFAULTS } from "./calculator";

/** Control (Cc), format (Cf), private-use (Co) and unassigned (Cn) characters plus
 * invisible fillers (Hangul fillers U+115F/U+1160/U+3164, Braille blank U+2800,
 * combining grapheme joiner U+034F) — never valid in a brand name, which is echoed in admin UI. */
export const BRAND_FORBIDDEN_CHARS = /[\p{Cc}\p{Cf}\p{Co}\p{Cn}\u3164\u115F\u1160\u2800\u034F]/u;
/** Identity of a brand name for duplicate detection: NFC, trimmed, case-folded. */
export const brandNameKey = (name: string): string => name.normalize("NFC").trim().toLowerCase();

export type HybridBrandPrice = { brand: string; priceThb: number | null };

export type HybridRow = {
  kw: number;
  phase: 1 | 3;
  batteryKwh: number;
  sunHours: number;
  days: number;
  pricePerKwh: number;
  panels: number;
  roofM2: number;
  billMin: number;
  billMax: number;
  brandPrices: HybridBrandPrice[];
};

const hybridRowSchema = z.object({
  kw: z.coerce.number().positive(),
  phase: z.union([z.literal(1), z.literal(3)]),
  batteryKwh: z.coerce.number().nonnegative(),
  sunHours: z.coerce.number().min(1).max(12),
  days: z.coerce.number().min(28).max(31),
  pricePerKwh: z.coerce.number().min(0.01).max(50),
  panels: z.coerce.number().int().min(1),
  roofM2: z.coerce.number().positive(),
  billMin: z.coerce.number().nonnegative(),
  billMax: z.coerce.number().positive(),
  brandPrices: z
    .array(
      z.object({
        brand: z
          .string()
          .trim()
          .min(1)
          .max(50)
          .refine((v) => !BRAND_FORBIDDEN_CHARS.test(v), "ชื่อยี่ห้อมีอักขระควบคุมหรืออักขระซ่อนที่ใช้ไม่ได้"),
        priceThb: z.coerce.number().nonnegative().nullable(),
      })
    )
    .min(1),
});

const SHARED_FIELDS = [
  "sunHours",
  "days",
  "pricePerKwh",
  "panels",
  "roofM2",
  "billMin",
  "billMax",
] as const;

export const hybridTableSchema = z
  .array(hybridRowSchema)
  .min(1)
  .superRefine((rows, ctx) => {
    const seenKeys = new Set<string>();
    const firstByKw = new Map<number, number>();
    const baseKeys = new Set<string>();
    const brands = rows[0].brandPrices.map((b) => b.brand);

    rows.forEach((row, index) => {
      const label = `แถว ${index + 1}`;
      const key = `${row.kw}|${row.phase}|${row.batteryKwh}`;
      if (seenKeys.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${label}: (kW, เฟส, แบต) ซ้ำกับแถวก่อนหน้า`,
          path: [index, "batteryKwh"],
        });
      }
      seenKeys.add(key);

      if (row.billMin >= row.billMax) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${label}: billMin ต้องน้อยกว่า billMax`,
          path: [index, "billMin"],
        });
      }

      const first = firstByKw.get(row.kw);
      if (first === undefined) {
        firstByKw.set(row.kw, index);
      } else {
        for (const field of SHARED_FIELDS) {
          if (rows[first][field] !== row[field]) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `${label}: ${field} ต้องเท่ากันทุกแถวใน ${row.kw} kW`,
              path: [index, field],
            });
          }
        }
      }

      if (new Set(row.brandPrices.map((b) => brandNameKey(b.brand))).size !== row.brandPrices.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${label}: ชื่อยี่ห้อซ้ำกัน (ไม่สนตัวพิมพ์เล็ก/ใหญ่)`,
          path: [index, "brandPrices"],
        });
      }

      const sameBrands =
        row.brandPrices.length === brands.length &&
        row.brandPrices.every((b, i) => b.brand === brands[i]);
      if (!sameBrands) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${label}: ชื่อยี่ห้อต้องตรงกันทุกแถวและเรียงเหมือนเดิม`,
          path: [index, "brandPrices"],
        });
      }

      if (row.batteryKwh === 0) baseKeys.add(`${row.kw}|${row.phase}`);
    });

    // C7: every kW/phase must keep its no-battery row (it is the E3 price base).
    const required = new Set<string>(rows.map((r) => `${r.kw}|${r.phase}`));
    for (const key of required) {
      if (!baseKeys.has(key)) {
        const [kw, phase] = key.split("|");
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${kw} kW ${phase} เฟส: ต้องมีแถวแบต 0`,
          path: [rows.findIndex((r) => `${r.kw}|${r.phase}` === key), "batteryKwh"],
        });
      }
    }

    // billMax strictly increasing across kW (one billMax per kW, validated above).
    let previous: number | null = null;
    for (const [kw, index] of [...firstByKw.entries()].sort((a, b) => a[0] - b[0])) {
      const billMax = rows[index].billMax;
      if (previous !== null && billMax <= previous) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${kw} kW: billMax ต้องเพิ่มขึ้นเคร่งครัดตามลำดับขนาด`,
          path: [index, "billMax"],
        });
      }
      previous = billMax;
    }
  });

/** Uncapped monthly saving: PV + battery kWh used once per day. */
export function hybridMonthlySaving(
  row: Pick<HybridRow, "kw" | "sunHours" | "days" | "pricePerKwh" | "batteryKwh">
): number {
  return (row.kw * row.sunHours + row.batteryKwh) * row.pricePerKwh * row.days;
}

export type UsablePrice = {
  kw: number;
  phase: 1 | 3;
  batteryKwh: number;
  /** Cheapest usable price of the row, null when none. `brand` is back-office only. */
  min: { brand: string; priceThb: number } | null;
};

/**
 * Usable price rule (#155, E1/E3/E4): a price counts only when > 0; a battery
 * row's price additionally needs the same brand to have a > 0 price on the
 * no-battery row of the same kW/phase (otherwise it is just the battery cost).
 * Result is index-aligned with `rows`.
 */
export function usablePrices(rows: HybridRow[]): UsablePrice[] {
  const base = new Map<string, Set<string>>();
  for (const row of rows) {
    if (row.batteryKwh !== 0) continue;
    const brands = new Set<string>();
    for (const bp of row.brandPrices) {
      if (bp.priceThb !== null && bp.priceThb > 0) brands.add(bp.brand);
    }
    base.set(`${row.kw}|${row.phase}`, brands);
  }

  return rows.map((row) => {
    let min: UsablePrice["min"] = null;
    const baseBrands = base.get(`${row.kw}|${row.phase}`);
    for (const bp of row.brandPrices) {
      if (bp.priceThb === null || !(bp.priceThb > 0)) continue;
      if (row.batteryKwh > 0 && !baseBrands?.has(bp.brand)) continue;
      if (min === null || bp.priceThb < min.priceThb) {
        min = { brand: bp.brand, priceThb: bp.priceThb };
      }
    }
    return { kw: row.kw, phase: row.phase, batteryKwh: row.batteryKwh, min };
  });
}

/** What the browser may know: no brand names, no per-brand prices. */
export type PublicHybridSize = {
  kw: number;
  phases: (1 | 3)[];
  sunHours: number;
  days: number;
  pricePerKwh: number;
  panels: number;
  roofM2: number;
  billMin: number;
  billMax: number;
  batteries: { batteryKwh: number; phases: (1 | 3)[]; minPriceThb: number | null }[];
};

export type HybridRecommendation =
  | { kind: "empty" }
  | { kind: "tooLarge"; lastSize: PublicHybridSize }
  | {
      kind: "ok";
      size: PublicHybridSize;
      batteryKwh: number;
      batteryOptions: number[];
      phases: (1 | 3)[];
      belowFirstRow: boolean;
      monthlySaving: number;
      afterBill: number;
      coversFullBill: boolean;
      kwhPerMonth: number;
      minPriceThb: number | null;
      paybackYears: number | null;
    };

/** Smallest battery > 0 when nothing is preferred; else preferred or nearest (tie -> smaller). */
function pickBattery(options: number[], preferred: number | null): number {
  if (preferred === null) {
    return options.find((b) => b > 0) ?? options[0];
  }
  if (options.includes(preferred)) return preferred;
  let best = options[0];
  for (const option of options) {
    const d = Math.abs(option - preferred);
    const bd = Math.abs(best - preferred);
    if (d < bd || (d === bd && option < best)) best = option;
  }
  return best;
}

/**
 * Hybrid counterpart of recommendFromTable (#156): kW = smallest size whose
 * billMax exceeds the bill; battery = preferred if offered, else nearest
 * (initially the smallest > 0); saving capped at the bill and payback computed
 * from the capped figure; payback null when no usable price exists.
 */
export function recommendHybrid(
  bill: number,
  table: PublicHybridSize[],
  preferredBatteryKwh: number | null,
  multiplier: number = CALCULATOR_DEFAULTS.annualSavingMonthsMultiplier
): HybridRecommendation {
  if (table.length === 0 || !Number.isFinite(bill) || bill <= 0) return { kind: "empty" };

  const lastSize = table[table.length - 1];
  if (bill >= lastSize.billMax) return { kind: "tooLarge", lastSize };

  const size = table.find((candidate) => candidate.billMax > bill) ?? lastSize;
  const batteryOptions = size.batteries.map((b) => b.batteryKwh).sort((a, b) => a - b);
  if (batteryOptions.length === 0) return { kind: "empty" };

  const batteryKwh = pickBattery(batteryOptions, preferredBatteryKwh);
  const battery = size.batteries.find((b) => b.batteryKwh === batteryKwh)!;

  const theoretical = hybridMonthlySaving({ ...size, batteryKwh });
  const monthlySaving = Math.min(theoretical, bill);
  const afterBill = bill - monthlySaving;
  const minPriceThb =
    battery.minPriceThb !== null && battery.minPriceThb > 0 ? battery.minPriceThb : null;
  const paybackYears =
    minPriceThb !== null && monthlySaving > 0
      ? minPriceThb / (monthlySaving * multiplier)
      : null;

  return {
    kind: "ok",
    size,
    batteryKwh,
    batteryOptions,
    phases: battery.phases,
    belowFirstRow: bill < table[0].billMin,
    monthlySaving,
    afterBill,
    coversFullBill: theoretical >= bill,
    kwhPerMonth: (size.kw * size.sunHours + batteryKwh) * size.days,
    minPriceThb,
    paybackYears,
  };
}
