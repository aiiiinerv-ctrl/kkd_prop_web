"use client";

import { useLocale, useTranslations } from "next-intl";
import { PhasePill } from "./phase-pill";
import { cn } from "@/lib/utils";

const BOX = "flex h-full flex-col rounded-xl border border-border bg-white px-4 py-3.5 shadow-sm";

/**
 * Top box of the result side when the Hybrid toggle exists (design-157 Variant B).
 *
 * Hybrid: the size being priced, its phases, a segmented radiogroup for the
 * battery (numbers only, the unit is in the caption, so even 7 options fit one
 * row on a phone and the customer never has to scroll to find the biggest one)
 * and the one-cycle-per-day assumption.
 *
 * `ghost` renders the same box without inputs so the caller can reserve the
 * footprint of the largest size; the card then never changes height.
 */
export function BatteryPicker({
  kw,
  phases,
  options,
  value,
  preferred,
  onChange,
  ghost = false,
}: {
  kw: number;
  phases: (1 | 3)[];
  /** kWh ascending; 0 = no battery. */
  options: number[];
  /** Battery shown (derived). */
  value: number;
  /** What the customer last clicked (null = never). */
  preferred: number | null;
  onChange?: (kwh: number) => void;
  ghost?: boolean;
}) {
  const t = useTranslations("calculator");
  const locale = useLocale();
  const kwText = kw.toLocaleString(locale);
  const full = (kwh: number) => (kwh === 0 ? t("batteryNone") : t("batteryOption", { kwh: kwh.toLocaleString(locale) }));
  const short = (kwh: number) => (kwh === 0 ? t("batteryNone") : kwh.toLocaleString(locale));
  const adjusted = !ghost && preferred !== null && preferred !== value;
  const caption = adjusted
    ? t("batteryAutoAdjusted", { kwh: full(value), kw: kwText })
    : `${t("batteryFor", { kw: kwText })} (kWh)`;

  return (
    <div className={BOX} {...(ghost ? { "aria-hidden": true } : {})}>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-extrabold tabular-nums text-primary">
        <span>{kwText} kW Hybrid</span>
        <PhasePill phases={phases} />
      </p>
      <p
        id={ghost ? undefined : "calc-battery-label"}
        aria-live={ghost ? undefined : "polite"}
        className={cn("mt-1 text-xs leading-5", adjusted ? "text-accent-foreground" : "text-muted-foreground")}
      >
        <span className="sr-only">{t("batteryLabel")}: </span>
        {caption}
      </p>
      <div
        {...(ghost ? {} : { role: "radiogroup", "aria-labelledby": "calc-battery-label" })}
        className="mt-2.5 flex gap-[3px] overflow-x-auto rounded-[10px] border border-border bg-muted p-[3px]"
      >
        {options.map((kwh) => {
          const selected = kwh === value;
          const cls = cn(
            "relative flex min-h-11 flex-1 shrink-0 items-center justify-center whitespace-nowrap rounded-lg px-1.5 text-[13px] font-bold tabular-nums text-primary transition-colors",
            selected ? "bg-white shadow-sm" : "hover:bg-white/60",
            !ghost && "cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/50"
          );
          return ghost ? (
            <span key={kwh} className={cls}>
              {short(kwh)}
            </span>
          ) : (
            <label key={kwh} className={cls} aria-label={full(kwh)}>
              <input
                type="radio"
                name="calc-battery"
                value={kwh}
                checked={selected}
                onChange={() => onChange?.(kwh)}
                className="sr-only"
              />
              {short(kwh)}
            </label>
          );
        })}
      </div>
      <p className={cn("mt-auto pt-2 text-center text-xs leading-5 text-muted-foreground", (ghost || value === 0) && "invisible")}>
        {t("batteryAssumption")}
      </p>
    </div>
  );
}

/**
 * Same footprint as the battery box: On-grid mode, and Hybrid when there is no
 * size to price (empty / too large). The panel fills the rows the segmented
 * control would take, so the box is never hollow.
 */
export function ModeInfoBox({
  mode,
  phases,
}: {
  mode: "onGrid" | "hybrid";
  phases?: (1 | 3)[];
}) {
  const t = useTranslations("calculator");
  return (
    <div className={BOX}>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-extrabold tabular-nums text-primary">
        <span>{mode === "onGrid" ? "On-grid" : "Hybrid"}</span>
        {phases && <PhasePill phases={phases} />}
      </p>
      <p className={cn("mt-1 text-xs leading-5 text-muted-foreground", mode === "hybrid" && "invisible")}>
        {t("modeOnGridHint")}
      </p>
      <p className="mt-2.5 flex flex-1 items-center justify-center rounded-[10px] border border-border bg-muted px-3 py-2 text-center text-xs leading-5 text-muted-foreground">
        {mode === "onGrid" ? t("modeOnGridNoBattery") : t("modeHybridHint")}
      </p>
    </div>
  );
}
