import { create } from "zustand";

// Comparable to a Flutter ChangeNotifier exposed via Provider: `create()`
// builds the store (the "notifier"), and any component calling
// useCounterStore(selector) subscribes only to the slice it reads -
// similar to `context.watch<CounterModel>()` re-rendering on notifyListeners().
type CounterState = {
  count: number;
  increment: () => void;
  reset: () => void;
};

export const useCounterStore = create<CounterState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  reset: () => set({ count: 0 }),
}));
