import { create } from "zustand";

/**
 * UI state only: the raw text of the bill field, shared between the input and
 * the slider. What that text means — whether it's usable, what system it
 * implies, what the customer would save — belongs to src/lib/calculator.ts,
 * which is plain functions and testable without this store.
 */
type CalculatorState = {
  bill: string;
  setBill: (bill: string) => void;
};

export const useCalculatorStore = create<CalculatorState>((set) => ({
  bill: "3500",
  setBill: (bill) => set({ bill }),
}));
