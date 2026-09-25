import type { CalculatorParams } from "@/lib/calculator";
import { CALCULATOR_DEFAULTS } from "@/lib/calculator";

export type CalculatorConfigRow = {
  annualSavingMonthsMultiplier: number;
  minBill: number;
  maxBill: number;
  stepBill: number;
};

export function rowToCalculatorParams(row: CalculatorConfigRow): CalculatorParams {
  return {
    annualSavingMonthsMultiplier: row.annualSavingMonthsMultiplier,
    minBill: row.minBill,
    maxBill: row.maxBill,
    stepBill: row.stepBill,
  };
}

export function calculatorParamsToSeedData(params: CalculatorParams = CALCULATOR_DEFAULTS) {
  return { ...params };
}
