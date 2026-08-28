import type { CalculatorParams } from "@/lib/calculator";
import { CALCULATOR_DEFAULTS } from "@/lib/calculator";

export type CalculatorConfigRow = {
  sunHoursPerDay: number;
  daysPerMonth: number;
  pricePerKwhThb: number;
  annualSavingMonthsMultiplier: number;
  minBill: number;
  maxBill: number;
  stepBill: number;
  billThreshold3To5Kw: number;
  billThreshold5To10Kw: number;
};

export function rowToCalculatorParams(row: CalculatorConfigRow): CalculatorParams {
  return {
    sunHoursPerDay: row.sunHoursPerDay,
    daysPerMonth: row.daysPerMonth,
    pricePerKwhThb: row.pricePerKwhThb,
    annualSavingMonthsMultiplier: row.annualSavingMonthsMultiplier,
    minBill: row.minBill,
    maxBill: row.maxBill,
    stepBill: row.stepBill,
    billThreshold3To5Kw: row.billThreshold3To5Kw,
    billThreshold5To10Kw: row.billThreshold5To10Kw,
  };
}

export function calculatorParamsToSeedData(params: CalculatorParams = CALCULATOR_DEFAULTS) {
  return { ...params };
}
