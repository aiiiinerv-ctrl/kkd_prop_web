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
              : "bg-white text-primary hover:bg-muted/50"
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
          <span className="inline-flex items-center gap-2 text-sm font-bold leading-tight">
            <span
              aria-hidden
              className={cn(
                "inline-flex size-3.5 items-center justify-center rounded-full ring-2",
                value === option.mode ? "bg-primary ring-white" : "bg-white ring-primary/40"
              )}
            >
              {value === option.mode && <span className="size-1.5 rounded-full bg-white" />}
            </span>
            {option.title}
          </span>
          <span
            className={cn(
              "text-xs leading-tight",
              value === option.mode ? "text-primary-foreground/90" : "text-muted-foreground"
            )}
          >
            {option.sub}
          </span>
        </label>
      ))}
    </div>
  );
}
