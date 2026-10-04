"use client";

import { useTranslations } from "next-intl";
import type { SystemMode } from "@/store/use-calculator-store";
import { cn } from "@/lib/utils";

/**
 * Card-header switch between On-grid and Hybrid (design-157 Variant B). It looks
 * like the booking page tabs but is a radiogroup: nothing swaps panels, it only
 * changes the value fed into the calculator.
 */
export function SystemModeTabs({
  value,
  onChange,
}: {
  value: SystemMode;
  onChange: (mode: SystemMode) => void;
}) {
  const t = useTranslations("calculator");
  const options: { mode: SystemMode; title: string; sub: string }[] = [
    { mode: "onGrid", title: t("modeOnGrid"), sub: t("modeOnGridShort") },
    { mode: "hybrid", title: t("modeHybrid"), sub: t("modeHybridShort") },
  ];
  return (
    <div role="radiogroup" aria-labelledby="calc-mode-label" className="grid grid-cols-2 border-b border-border">
      <span id="calc-mode-label" className="sr-only">
        {t("modeLabel")}
      </span>
      {options.map((option) => (
        <label
          key={option.mode}
          className={cn(
            "relative flex min-h-14 cursor-pointer flex-col items-center justify-center px-3 py-2.5 text-center transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-inset has-[:focus-visible]:ring-ring/50",
            value === option.mode
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/70"
          )}
        >
          <input
            type="radio"
            name="calc-mode"
            value={option.mode}
            checked={value === option.mode}
            onChange={() => onChange(option.mode)}
            className="sr-only"
          />
          <span className="text-sm font-bold leading-tight">{option.title}</span>
          <span className="text-xs leading-tight opacity-80">{option.sub}</span>
        </label>
      ))}
    </div>
  );
}
