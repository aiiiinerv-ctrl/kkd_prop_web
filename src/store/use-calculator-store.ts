import { create } from "zustand";

export type SystemMode = "onGrid" | "hybrid";

/**
 * UI state only: the raw text of the bill field, shared between the input and
 * the slider, plus the On-grid / Hybrid choice. What that text means — whether
 * it's usable, what system it implies, what the customer would save — belongs
 * to src/lib/calculator.ts (+ calculator-hybrid.ts), which are plain functions
 * and testable without this store.
 *
 * `preferredBatteryKwh` is only what the customer last CLICKED (null = never).
 * The battery actually shown is derived from it per kW and is never written
 * back, so the earlier choice returns when the slider moves back to a size that
 * offers it. Neither Hybrid field is persisted across page loads.
 */
type CalculatorState = {
  bill: string;
  setBill: (bill: string) => void;
  systemMode: SystemMode;
  setSystemMode: (mode: SystemMode) => void;
  preferredBatteryKwh: number | null;
  setPreferredBatteryKwh: (kwh: number) => void;
};

export const useCalculatorStore = create<CalculatorState>((set) => ({
  bill: "3500",
  setBill: (bill) => set({ bill }),
  systemMode: "onGrid",
  setSystemMode: (systemMode) => set({ systemMode }),
  preferredBatteryKwh: null,
  setPreferredBatteryKwh: (preferredBatteryKwh) => set({ preferredBatteryKwh }),
}));
