import { z } from "zod";

// S6 (docs/plans/calculator-excel-import-sprints.md): the admin config form
// keeps only the ×10 multiplier + slider bounds. Sun hours / price-per-kWh /
// tier thresholds moved to the per-row Excel size table (S1/S5) — those old
// `CalculatorConfig` columns still exist in the DB (kept for the still-live
// public tiered calculator until S7) but are no longer written by this form.
export const calculatorConfigSchema = z
  .object({
    annualSavingMonthsMultiplier: z.coerce.number().int().min(1).max(12),
    minBill: z.coerce.number().int().min(100).max(99_999),
    maxBill: z.coerce.number().int().min(100).max(99_999),
    stepBill: z.coerce.number().int(),
  })
  .superRefine((data, ctx) => {
    if (data.minBill >= data.maxBill) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "บิลขั้นต่ำต้องน้อยกว่าบิลสูงสุด",
        path: ["minBill"],
      });
    }
    if (data.stepBill <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "ขั้นสไลด์ต้องมากกว่า 0",
        path: ["stepBill"],
      });
    }
  });

export type CalculatorConfigInput = z.infer<typeof calculatorConfigSchema>;
