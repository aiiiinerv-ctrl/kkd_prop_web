"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/site/brand-logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUnreadLeadCount } from "@/hooks/admin/use-unread-lead-count";
import type { Role } from "@/lib/auth";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { UTILITY_ITEMS, visiblePinned, visibleZones } from "./nav-items";
import { NavRow, UtilityRow } from "./nav-row";

export function AdminMobileNav({ role }: { role: Role }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Route-change close is mandatory — without it the drawer covers the page
  // the user just navigated to.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const { data: unreadLeads } = useUnreadLeadCount();
  const unreadLeadCount =
    role === "CHANNEL_EXECUTIVE" ||
    role === "MARKETING" ||
    role === "EDITOR" ||
    role === "EXECUTIVE"
      ? 0
      : (unreadLeads?.count ?? 0);

  const pinned = visiblePinned(role);
  const zones = visibleZones(role);
  const hasUnread = unreadLeadCount > 0;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <button
        type="button"
        aria-label={hasUnread ? "เปิดเมนู (มี Lead ใหม่)" : "เปิดเมนู"}
        onClick={() => setOpen(true)}
        className="relative -ml-1 inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:hidden"
      >
        <Menu className="size-5" />
        {hasUnread && (
          <span
            aria-hidden
            className="absolute right-2 top-2 size-2 rounded-full bg-brand-orange ring-2 ring-background"
          />
        )}
      </button>
      <SheetContent>
        <SheetTitle>เมนูระบบหลังบ้าน</SheetTitle>
        <div className="flex items-center justify-between border-b border-border p-5">
          <BrandLogo />
          <SheetClose
            render={
              <Button variant="ghost" size="icon" aria-label="ปิดเมนู" className="size-11" />
            }
          >
            <X className="size-5" />
          </SheetClose>
        </div>
        <nav className="flex-1 overflow-y-auto p-3">
          {pinned && (
            <NavRow item={pinned} active={pathname === pinned.href} dense />
          )}
          {zones.map((zone) => (
            <div key={zone.key} className="mt-4 border-t border-border/60 pt-3">
              <div
                className={cn(
                  "px-3 pb-1.5 text-[11px] font-semibold leading-4 tracking-[0.04em]",
                  zone.items.length === 0
                    ? "text-muted-foreground/50"
                    : "text-muted-foreground"
                )}
              >
                {zone.label}
              </div>
              {zone.items.length > 0 && (
                <div className="space-y-0.5">
                  {zone.items.map((item) => {
                    const active = item.exact
                      ? pathname === item.href
                      : pathname.startsWith(item.href);
                    return (
                      <NavRow
                        key={item.href}
                        item={item}
                        active={active}
                        dense
                        badge={
                          item.href === "/admin/leads" && unreadLeadCount > 0 ? (
                            <span
                              aria-label={`Lead ใหม่ที่ยังไม่ได้เปิด ${unreadLeadCount} รายการ`}
                              className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-orange px-1.5 text-xs font-semibold text-black"
                            >
                              {unreadLeadCount > 99 ? "99+" : unreadLeadCount}
                            </span>
                          ) : undefined
                        }
                      />
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>
        <div className="shrink-0 border-t border-border p-3 space-y-0.5">
          {UTILITY_ITEMS.map((item) => (
            <UtilityRow
              key={item.href}
              item={item}
              active={item.href === "/th" ? false : pathname.startsWith(item.href)}
              dense
            />
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
