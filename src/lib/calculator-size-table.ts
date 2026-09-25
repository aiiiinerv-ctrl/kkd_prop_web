// Size table: the row-per-system-size model that replaces the fixed 3/5/10 kW
// tiers in src/lib/calculator.ts. Each row carries its own Excel-sourced
// production params (sun hours, days, price per kWh) instead of one shared
// config — see #146 (recommendation rule) and #150 (legacy default table).
//
// This file is pure (no I/O, no Prisma) and has no callers yet outside
// scripts/verify-calculator.mts — see docs/plans/calculator-excel-import-sprints.md S1.
import { z } from "zod";

export type SizeRow = {
  kw: number;
  phases: (1 | 3)[];
  sunHours: number;
  days: number;
  pricePerKwh: number;
  panels: number;
  roofM2: number;
  billMin: number;
  billMax: number;
};

export const sizeTableSchema = z
  .array(
    z.object({
      kw: z.coerce.number().positive(),
      phases: z.array(z.union([z.literal(1), z.literal(3)])).min(1),
      sunHours: z.coerce.number().min(1).max(12),
      days: z.coerce.number().min(28).max(31),
      pricePerKwh: z.coerce.number().min(0.01).max(50),
      panels: z.coerce.number().int().min(1),
      roofM2: z.coerce.number().positive(),
      billMin: z.coerce.number().nonnegative(),
      billMax: z.coerce.number().positive(),
    })
  )
  .min(1)
  .superRefine((rows, ctx) => {
    const seenKw = new Set<number>();
    let previousBillMax: number | null = null;
    rows.forEach((row, index) => {
      if (row.billMin >= row.billMax) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `แถว ${index + 1}: billMin ต้องน้อยกว่า billMax`,
          path: [index, "billMin"],
        });
      }
      if (seenKw.has(row.kw)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `แถว ${index + 1}: kw ซ้ำกับแถวก่อนหน้า`,
          path: [index, "kw"],
        });
      }
      seenKw.add(row.kw);
      if (previousBillMax !== null && row.billMax <= previousBillMax) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `แถว ${index + 1}: billMax ต้องเพิ่มขึ้นเคร่งครัดตามลำดับขนาด`,
          path: [index, "billMax"],
        });
      }
      previousBillMax = row.billMax;
    });
  });

/**
 * The legacy 3/5/10 kW table — numbers match production's fixed-tier
 * calculator exactly (see #150). Used as the fallback whenever no Excel
 * import has been applied, and as the equality baseline in
 * scripts/verify-calculator.mts.
 */
export const DEFAULT_SIZE_TABLE: SizeRow[] = [
  {
    kw: 3,
    phases: [1],
    sunHours: 5,
    days: 30,
    pricePerKwh: 4.5,
    panels: 6,
    roofM2: 16.2,
    billMin: 2000,
    billMax: 3000,
  },
  {
    kw: 5,
    phases: [1, 3],
    sunHours: 5,
    days: 30,
    pricePerKwh: 4.5,
    panels: 10,
    roofM2: 27,
    billMin: 3000,
    billMax: 6000,
  },
  {
    kw: 10,
    phases: [1, 3],
    sunHours: 5,
    days: 30,
    pricePerKwh: 4.5,
    panels: 18,
    roofM2: 48.6,
    billMin: 6000,
    billMax: 10000,
  },
];

/**
 * Parses an unknown JSON value (e.g. `CalculatorConfig.sizeTable`) into a
 * validated size table, falling back to the legacy default when the value is
 * missing or fails validation — so a bad/absent value can never break the
 * public calculator, only downgrade it to the legacy table.
 */
export function resolveSizeTable(json: unknown): {
  table: SizeRow[];
  source: "default" | "import";
} {
  if (json === null || json === undefined) {
    return { table: DEFAULT_SIZE_TABLE, source: "default" };
  }

  const parsed = sizeTableSchema.safeParse(json);
  if (!parsed.success) {
    console.error(
      "resolveSizeTable: invalid size table JSON, falling back to default",
      parsed.error.flatten()
    );
    return { table: DEFAULT_SIZE_TABLE, source: "default" };
  }

  return { table: parsed.data, source: "import" };
}
