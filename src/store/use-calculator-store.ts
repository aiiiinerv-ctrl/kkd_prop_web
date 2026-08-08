import { create } from "zustand";
import {
  ANNUAL_SAVING_MONTHS_MULTIPLIER,
  calculateTheoreticalMonthlySavingThb,
  recommendSystemSizeKw,
} from "@/lib/calculator";

export type CalcPackage = {
  sizeKw: number;
  priceThb: number;
};

export type CalcResult = {
  systemKey: "system3kw" | "system5kw" | "system10kw";
  monthlySaving: number;
  paybackYears: number | null;
};

const SYSTEM_KEY_BY_SIZE_KW: Record<number, CalcResult["systemKey"]> = {
  3: "system3kw",
  5: "system5kw",
  10: "system10kw",
};

export function recommendSystem(bill: number, packages: CalcPackage[] = []): CalcResult {
  const sizeKw = recommendSystemSizeKw(bill);
  const systemKey = SYSTEM_KEY_BY_SIZE_KW[sizeKw];

  // Cap the displayed saving at the customer's actual bill — a system whose
  // theoretical production exceeds what they currently pay shouldn't show a
  // "saving" larger than the bill itself, or the "after" figure would go negative.
  const theoreticalMonthlySaving = calculateTheoreticalMonthlySavingThb(sizeKw);
  const monthlySaving = Math.min(theoreticalMonthlySaving, bill);

  const matchedPackage = packages.find((pkg) => pkg.sizeKw === sizeKw);
  const paybackYears =
    matchedPackage && monthlySaving > 0
      ? matchedPackage.priceThb / (monthlySaving * ANNUAL_SAVING_MONTHS_MULTIPLIER)
      : null;

  return { systemKey, monthlySaving, paybackYears };
}

type CalculatorState = {
  bill: string;
  result: CalcResult | null;
  setBill: (bill: string) => void;
  calculate: (packages?: CalcPackage[]) => boolean;
};

export const useCalculatorStore = create<CalculatorState>((set, get) => ({
  bill: "3500",
  result: null,
  setBill: (bill) => set({ bill }),
  calculate: (packages = []) => {
    const value = Number(get().bill);
    if (!Number.isFinite(value) || value <= 0) {
      set({ result: null });
      return false;
    }
    set({ result: recommendSystem(value, packages) });
    return true;
  },
}));
