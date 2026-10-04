import type { CalculatorConfig } from "@/generated/prisma/client";
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

/**
 * Audit snapshot of a CalculatorConfig row: the Hybrid table carries per-brand
 * prices, so only its row count is stored (never the rows themselves).
 */
export function calculatorConfigAuditView(
  row: CalculatorConfig
): Omit<CalculatorConfig, "hybridSizeTable"> & { hybridRowCount: number } {
  const { hybridSizeTable, ...rest } = row;
  return { ...rest, hybridRowCount: Array.isArray(hybridSizeTable) ? hybridSizeTable.length : 0 };
}
