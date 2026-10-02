// SERVER-ONLY. Projects raw Hybrid rows (brand names + per-brand prices) into
// the table the browser may see. The only caller is getCalculatorConfig();
// never import this from a client component (the repo has no `server-only`
// package, so this comment is the guard). Default #5 / research-158 §3.
import {
  usablePrices,
  type HybridRow,
  type PublicHybridSize,
} from "./calculator-hybrid";

/**
 * Merges 1φ/3φ per kW; each battery uses the cheaper usable price across the
 * phases that offer it (#156 item 2). Output carries no brand and no price
 * other than that minimum.
 */
export function toPublicHybridTable(rows: HybridRow[]): PublicHybridSize[] {
  const usable = usablePrices(rows);
  const sizes = new Map<number, PublicHybridSize>();

  rows.forEach((row, index) => {
    let size = sizes.get(row.kw);
    if (!size) {
      size = {
        kw: row.kw,
        phases: [],
        sunHours: row.sunHours,
        days: row.days,
        pricePerKwh: row.pricePerKwh,
        panels: row.panels,
        roofM2: row.roofM2,
        billMin: row.billMin,
        billMax: row.billMax,
        batteries: [],
      };
      sizes.set(row.kw, size);
    }
    if (!size.phases.includes(row.phase)) size.phases.push(row.phase);

    const price = usable[index].min?.priceThb ?? null;
    let battery = size.batteries.find((b) => b.batteryKwh === row.batteryKwh);
    if (!battery) {
      battery = { batteryKwh: row.batteryKwh, phases: [], minPriceThb: null };
      size.batteries.push(battery);
    }
    if (!battery.phases.includes(row.phase)) battery.phases.push(row.phase);
    if (price !== null && (battery.minPriceThb === null || price < battery.minPriceThb)) {
      battery.minPriceThb = price;
    }
  });

  return [...sizes.values()]
    .sort((a, b) => a.kw - b.kw)
    .map((size) => ({
      ...size,
      phases: [...size.phases].sort(),
      batteries: size.batteries
        .sort((a, b) => a.batteryKwh - b.batteryKwh)
        .map((b) => ({ ...b, phases: [...b.phases].sort() })),
    }));
}
