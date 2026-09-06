"use client";

import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/site/brand-logo";
import { cn } from "@/lib/utils";
import { useUnreadLeadCount } from "@/hooks/admin/use-unread-lead-count";
import type { Role } from "@/lib/auth";
import { UTILITY_ITEMS, visiblePinned, visibleZones } from "./nav-items";
import { NavRow, UtilityRow } from "./nav-row";

export function AdminSidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  // Only ADMIN/SALES/FINANCE get the leads detail view (CHANNEL_EXECUTIVE is
  // scoped to the read-only aggregate list, and MARKETING/EDITOR/EXECUTIVE
  // are read-only across leads entirely — see
  // /api/admin/leads/unread-count), so the hook's count is zeroed out client-
  // side too rather than showing a badge that's always stale for these roles.
  const { data: unreadLeads } = useUnreadLeadCount();
  // Semantic subset (who must not see a live unread badge), not a copy of the
  // Role enum — keep inline so verify-enums does not treat it as a redeclared map.
  const unreadLeadCount =
    role === "CHANNEL_EXECUTIVE" ||
    role === "MARKETING" ||
    role === "EDITOR" ||
    role === "EXECUTIVE"
      ? 0
      : (unreadLeads?.count ?? 0);

  const pinned = visiblePinned(role);
  const zones = visibleZones(role);

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-background md:flex">
      <div className="border-b border-border p-5">
        <BrandLogo />
      </div>
      <nav className="flex-1 overflow-y-auto p-3">
        {pinned && (
          <NavRow
            item={pinned}
            active={pathname === pinned.href}
          />
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
            active={
              item.href === "/th"
                ? false
                : pathname.startsWith(item.href)
            }
          />
        ))}
      </div>
    </aside>
  );
}
