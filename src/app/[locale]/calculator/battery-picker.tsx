"use client";

import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

const BOX = "flex h-full flex-col rounded-xl border border-border bg-white px-4 py-3.5 shadow-sm";

/**
 * Shell of the "system" box on the input side of the Hybrid-toggle calculator
 * (rebalance spec, Option A). It always has the same four rows (header, caption,
 * track, footer) whichever mode or state it shows, so the card never changes
 * height. Each row stacks invisible ghosts of every variant it can display in one
 * grid cell: a variant that wraps to a second line on a phone then reserves that
 * line in all the others.
 */
export function SystemBox({
  header,
  headerGhosts,
  caption,
  captionId,
  captionAdjusted = false,
  captionGhosts,
  track,
  footer,
  footerGhosts,
}: {
  header: ReactNode;
  headerGhosts: ReactNode[];
  caption: ReactNode;
  /** Set when the battery radiogroup is labelled by the caption. */
  captionId?: string;
  /** Highlights the caption and announces it (battery auto-adjusted). */
  captionAdjusted?: boolean;
  captionGhosts: ReactNode[];
  track: ReactNode;
  footer: ReactNode;
  footerGhosts: ReactNode[];
}) {
  const headerCls = "flex min-h-6 flex-wrap content-start items-center gap-x-2 gap-y-1 text-sm font-extrabold tabular-nums text-primary";
  const captionCls = "mt-1 text-xs leading-5 text-muted-foreground";
  const footerCls = "mt-2 text-center text-xs leading-5 text-muted-foreground";
  return (
    <div className={BOX}>
      <div className="grid">
        {headerGhosts.map((ghost, i) => (
          <p key={i} aria-hidden className={cn(headerCls, "invisible col-start-1 row-start-1")}>
            {ghost}
          </p>
        ))}
        <p className={cn(headerCls, "col-start-1 row-start-1")}>{header}</p>
      </div>
      <div className="grid">
        {captionGhosts.map((ghost, i) => (
          <p key={i} aria-hidden className={cn(captionCls, "invisible col-start-1 row-start-1")}>
            {ghost}
          </p>
        ))}
        <p
          id={captionId}
          aria-live={captionId ? "polite" : undefined}
          className={cn(captionCls, "col-start-1 row-start-1", captionAdjusted && "text-accent-foreground")}
        >
          {caption}
        </p>
      </div>
      <div className="mt-2.5">{track}</div>
      <div className="mt-auto grid">
        {footerGhosts.map((ghost, i) => (
          <p key={i} aria-hidden className={cn(footerCls, "invisible col-start-1 row-start-1")}>
            {ghost}
          </p>
        ))}
        <p className={cn(footerCls, "col-start-1 row-start-1")}>{footer}</p>
      </div>
    </div>
  );
}

const TRACK = "rounded-[10px] border border-border bg-muted p-[3px]";
const CELL_BASE =
  "relative flex min-h-11 min-w-0 items-center justify-center rounded-lg px-1 text-center text-[13px] font-bold leading-tight tabular-nums transition-colors sm:whitespace-nowrap sm:px-1.5";

/**
 * Battery sizes as a segmented control. Below 640px it is always exactly two rows
 * (n options -> ceil(n/2) per row, the second row stretches to fill), so even 7
 * options keep cells wide enough to tap and the track height does not depend on
 * how many sizes the table offers. From 640px it is one row.
 *
 * `options` without `onChange` renders the disabled look (Hybrid has nothing to
 * price: too large / empty bill): no selection, no radios.
 */
export function BatteryTrack({
  options,
  value,
  onChange,
  label,
  optionLabel,
  optionText,
  labelledBy,
}: {
  /** kWh ascending; 0 = no battery. */
  options: number[];
  value?: number;
  onChange?: (kwh: number) => void;
  label?: string;
  optionLabel: (kwh: number) => string;
  optionText: (kwh: number) => string;
  labelledBy?: string;
}) {
  const disabled = !onChange;
  const perRow = Math.max(1, Math.ceil(options.length / 2));
  return (
    <div
      {...(disabled
        ? { "aria-disabled": true }
        : { role: "radiogroup", "aria-labelledby": labelledBy, "aria-label": label })}
      style={{ "--cell-basis": `calc(100% / ${perRow} - 3px)` } as CSSProperties}
      className={cn(TRACK, "flex flex-wrap gap-[3px] sm:flex-nowrap", disabled && "cursor-not-allowed opacity-50")}
    >
      {options.map((kwh) => {
        const selected = !disabled && kwh === value;
        const cls = cn(
          CELL_BASE,
          "grow basis-(--cell-basis) sm:flex-1 sm:basis-0",
          selected ? "bg-primary text-primary-foreground shadow-sm" : "text-primary",
          !disabled && !selected && "hover:bg-white",
          !disabled && "cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/50 has-[:focus-visible]:ring-offset-1"
        );
        return disabled ? (
          <span key={kwh} className={cls}>
            {optionText(kwh)}
          </span>
        ) : (
          <label key={kwh} className={cls} aria-label={optionLabel(kwh)}>
            <input
              type="radio"
              name="calc-battery"
              value={kwh}
              checked={selected}
              onChange={() => onChange?.(kwh)}
              className="sr-only"
            />
            {optionText(kwh)}
          </label>
        );
      })}
    </div>
  );
}

/**
 * On-grid's track: two non-interactive facts (one benefit, one limitation) with the
 * same track geometry as the battery control (two stacked rows below 640px, two
 * columns from 640px), so the card keeps its height across tabs.
 */
export function FactTrack({ facts }: { facts: { icon: ReactNode; text: string }[] }) {
  return (
    <ul className={cn(TRACK, "flex flex-col gap-[3px] sm:grid sm:grid-cols-2")}>
      {facts.map((f) => (
        <li key={f.text} className="flex min-h-11 min-w-0 items-center gap-2 rounded-lg px-3 text-xs font-semibold leading-4 text-foreground/80">
          <span aria-hidden className="shrink-0">
            {f.icon}
          </span>
          <span className="min-w-0">{f.text}</span>
        </li>
      ))}
    </ul>
  );
}
