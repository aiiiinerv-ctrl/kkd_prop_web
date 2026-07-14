import { create } from "zustand";

export type CalcPackage = {
  sizeKw: number;
  priceThb: number;
};

export type CalcResult = {
  systemKey: "system3kw" | "system5kw" | "system10kw";
  monthlySaving: number;
  paybackYears: number | null;
};

const SYSTEM_SIZE_KW: Record<CalcResult["systemKey"], number> = {
  system3kw: 3,
  system5kw: 5,
  system10kw: 10,
};

// Mirrors the sizing rules used in sales: <1500฿ → 3KW (save ~70%),
// ≤3500฿ → 5KW (~60%), above → 10KW+ (~50%).
export function recommendSystem(bill: number, packages: CalcPackage[] = []): CalcResult {
  let systemKey: CalcResult["systemKey"];
  let monthlySaving: number;
  if (bill < 1500) {
    systemKey = "system3kw";
    monthlySaving = Math.round(bill * 0.7);
  } else if (bill <= 3500) {
    systemKey = "system5kw";
    monthlySaving = Math.round(bill * 0.6);
  } else {
    systemKey = "system10kw";
    monthlySaving = Math.round(bill * 0.5);
  }

  const sizeKw = SYSTEM_SIZE_KW[systemKey];
  const matchedPackage = packages.find((pkg) => pkg.sizeKw === sizeKw);
  const paybackYears =
    matchedPackage && monthlySaving > 0
      ? matchedPackage.priceThb / (monthlySaving * 12)
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
