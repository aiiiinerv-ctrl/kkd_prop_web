"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { NavItem } from "./nav-items";

/**
 * Presentational row shared by the desktop sidebar and the mobile drawer.
 * `dense` switches the row height: `false` -> py-2.5 (desktop, 40px),
 * `true` -> py-3 (drawer, 48px) per the mobile spec.
 */
export function NavRow({
  item,
  active,
  badge,
  dense = false,
}: {
  item: NavItem;
  active: boolean;
  badge?: React.ReactNode;
  dense?: boolean;
}) {
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-2.5 rounded-lg border-l-[3px] px-3 text-sm font-medium transition-colors",
        dense ? "py-3" : "py-2.5",
        active
          ? "border-brand-orange bg-primary/8 text-primary"
          : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <item.icon className="size-4" />
      <span className="flex-1">{item.label}</span>
      {badge}
    </Link>
  );
}

export function UtilityRow({
  item,
  active,
  dense = false,
}: {
  item: NavItem;
  active: boolean;
  dense?: boolean;
}) {
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 text-xs font-normal transition-colors",
        dense ? "py-2.5" : "py-2",
        active
          ? "bg-primary/8 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <item.icon className="size-3.5" />
      {item.label}
    </Link>
  );
}
