"use client";

// Text-based numeric input for the size editor (design-162 §5.2): never
// `type="number"` (scroll wheel changes the value, no thousands separator).
// While focused it shows the raw text; on blur it shows the th-TH formatted
// number. `onValue` gets a number, `null` (blank) or NaN (not a number).
import { useState } from "react";
import { flushSync } from "react-dom";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function parseNum(text: string): number | null {
  const t = text.replace(/[,\s]/g, "");
  if (t === "") return null;
  return Number(t);
}

const isFiniteNum = (v: number | null): v is number => typeof v === "number" && Number.isFinite(v);

export function NumInput({
  value,
  onValue,
  onBlurValue,
  id,
  error,
  warn,
  readOnly,
  placeholder,
  describedBy,
  ariaLabel,
}: {
  value: number | null;
  onValue: (v: number | null) => void;
  onBlurValue?: () => void;
  id?: string;
  error?: boolean;
  warn?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  describedBy?: string;
  ariaLabel?: string;
}) {
  const [focused, setFocused] = useState(false);
  // Last text typed; shown when focused or when it is not a valid number.
  const [text, setText] = useState(isFiniteNum(value) ? String(value) : "");

  const shown =
    focused || !isFiniteNum(value)
      ? text
      : value.toLocaleString("th-TH", { maximumFractionDigits: 4 });

  return (
    <Input
      id={id}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={shown}
      readOnly={readOnly}
      placeholder={placeholder}
      aria-label={ariaLabel}
      aria-invalid={error || undefined}
      aria-describedby={describedBy}
      onFocus={(event) => {
        const el = event.currentTarget;
        // Swap the formatted text for the raw number and select it in one
        // go (flushSync): the field never shows a half-way value, so typing
        // — or an automated fill — always replaces the whole number.
        flushSync(() => {
          if (isFiniteNum(value)) setText(String(value));
          setFocused(true);
        });
        if (!readOnly) el.select();
      }}
      onBlur={() => {
        setFocused(false);
        onBlurValue?.();
      }}
      onChange={(event) => {
        setText(event.target.value);
        onValue(parseNum(event.target.value));
      }}
      className={cn(
        "h-9 text-right tabular-nums",
        readOnly && "bg-muted",
        warn && !error && "border-amber-400 bg-amber-50"
      )}
    />
  );
}
