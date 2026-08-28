import { z } from "zod";

export const calculatorConfigPhaseASchema = z.object({
  sunHoursPerDay: z.coerce.number().min(1).max(12),
  pricePerKwhThb: z.coerce.number().min(0.01).max(50),
  annualSavingMonthsMultiplier: z.coerce.number().int().min(1).max(12),
});

export type CalculatorConfigPhaseAInput = z.infer<typeof calculatorConfigPhaseASchema>;

export const calculatorConfigSchema = calculatorConfigPhaseASchema
  .extend({
    minBill: z.coerce.number().int().min(100).max(99_999),
    maxBill: z.coerce.number().int().min(100).max(99_999),
    stepBill: z.coerce.number().int().min(50).max(2000),
    billThreshold3To5Kw: z.coerce.number().int().min(100).max(99_999),
    billThreshold5To10Kw: z.coerce.number().int().min(100).max(99_999),
  })
  .superRefine((data, ctx) => {
    if (data.minBill >= data.maxBill) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "บิลขั้นต่ำต้องน้อยกว่าบิลสูงสุด",
        path: ["minBill"],
      });
    }
    if (
      data.billThreshold3To5Kw <= data.minBill ||
      data.billThreshold3To5Kw >= data.maxBill
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "เกณฑ์ 3→5 kW ต้องอยู่ระหว่างบิลขั้นต่ำและสูงสุด",
        path: ["billThreshold3To5Kw"],
      });
    }
    if (
      data.billThreshold5To10Kw <= data.billThreshold3To5Kw ||
      data.billThreshold5To10Kw > data.maxBill
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "เกณฑ์ 5→10 kW ต้องมากกว่าเกณฑ์ 3→5 kW และไม่เกินบิลสูงสุด",
        path: ["billThreshold5To10Kw"],
      });
    }
  });

export type CalculatorConfigInput = z.infer<typeof calculatorConfigSchema>;
