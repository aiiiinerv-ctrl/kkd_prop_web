import { create } from "zustand";

export type CalcResult = {
  systemKey: "system3kw" | "system5kw" | "system10kw";
  monthlySaving: number;
};

// Mirrors the sizing rules used in sales: <1500฿ → 3KW (save ~70%),
// ≤3500฿ → 5KW (~60%), above → 10KW+ (~50%).
export function recommendSystem(bill: number): CalcResult {
  if (bill < 1500) {
    return { systemKey: "system3kw", monthlySaving: Math.round(bill * 0.7) };
  }
  if (bill <= 3500) {
    return { systemKey: "system5kw", monthlySaving: Math.round(bill * 0.6) };
  }
  return { systemKey: "system10kw", monthlySaving: Math.round(bill * 0.5) };
}

type CalculatorState = {
  bill: string;
  result: CalcResult | null;
  setBill: (bill: string) => void;
  calculate: () => boolean;
};

export const useCalculatorStore = create<CalculatorState>((set, get) => ({
  bill: "",
  result: null,
  setBill: (bill) => set({ bill }),
  calculate: () => {
    const value = Number(get().bill);
    if (!Number.isFinite(value) || value <= 0) {
      set({ result: null });
      return false;
    }
    set({ result: recommendSystem(value) });
    return true;
  },
}));
