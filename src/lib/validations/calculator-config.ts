import { z } from "zod";

export const calculatorConfigPhaseASchema = z.object({
  sunHoursPerDay: z.coerce.number().min(1).max(12),
  pricePerKwhThb: z.coerce.number().min(0.01).max(50),
  annualSavingMonthsMultiplier: z.coerce.number().int().min(1).max(12),
});

export type CalculatorConfigPhaseAInput = z.infer<typeof calculatorConfigPhaseASchema>;
