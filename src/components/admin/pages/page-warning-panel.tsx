"use client";

import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";

export function PageWarningPanel({ children }: { children: ReactNode }) {
  return (
    <p
      role="status"
      className="flex items-start gap-2 rounded-lg border border-accent bg-accent/60 px-3 py-2 text-sm text-accent-foreground"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}
