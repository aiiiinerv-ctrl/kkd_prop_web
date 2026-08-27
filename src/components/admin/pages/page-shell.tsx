"use client";

import type { ReactNode } from "react";
import type { PageKey } from "@/lib/pages";

type PageShellProps = {
  pageKey: PageKey;
  title: string;
  description?: string;
  warnings?: ReactNode;
  children: ReactNode;
};

/**
 * Shared Pages admin chrome (#67). Home and future page editors wrap
 * content here so tabs/status/unsaved patterns stay consistent.
 */
export function PageShell({ pageKey, title, description, warnings, children }: PageShellProps) {
  return (
    <div className="max-w-3xl space-y-6" data-page-key={pageKey}>
      <header className="space-y-1">
        <h1 className="text-xl font-bold">{title}</h1>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </header>
      {warnings ? <div className="space-y-2">{warnings}</div> : null}
      {children}
    </div>
  );
}
