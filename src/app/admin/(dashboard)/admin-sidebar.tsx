"use client";

import {
  CalendarCheck,
  ClipboardList,
  Calculator,
  FileBarChart,
  FileText,
  Home,
  Images,
  LayoutDashboard,
  LayoutTemplate,
  Megaphone,
  MessageSquareQuote,
  Package,
  ScrollText,
  Settings,
  Users,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/site/brand-logo";
import { cn } from "@/lib/utils";
import { ROLES } from "@/lib/enums";
import { useUnreadLeadCount } from "@/hooks/admin/use-unread-lead-count";
import type { Role } from "@/lib/auth";

const ALL_ROLES: Role[] = ROLES;

// Each item lists the roles allowed to see it. CHANNEL_EXECUTIVE is scoped
// to leads (read-only, aggregate view) + their own channel; FINANCE loses
// every content/management link since it never mutates anything; SALES
// loses channel/user management per spec. MARKETING/EDITOR/EXECUTIVE (added
// 2026-08-16) follow the permission matrix in
// docs/plans/rbac-marketing-editor-executive-tasks.md.
const ITEMS = [
  {
    href: "/admin",
    label: "แดชบอร์ด",
    icon: LayoutDashboard,
    exact: true,
    roles: ["ADMIN", "SALES", "FINANCE", "MARKETING", "EDITOR", "EXECUTIVE"] as Role[],
  },
  { href: "/admin/leads", label: "ลูกค้า (Leads)", icon: ClipboardList, roles: ALL_ROLES },
  {
    href: "/admin/bookings",
    label: "การจองสำรวจ",
    icon: CalendarCheck,
    roles: ["ADMIN", "SALES", "FINANCE", "EDITOR"] as Role[],
  },
  {
    href: "/admin/pages/services",
    label: "บริการ (Pages)",
    icon: Wrench,
    roles: ["ADMIN", "SALES", "MARKETING", "EDITOR"] as Role[],
  },
  {
    href: "/admin/pages/packages",
    label: "แพ็กเกจ (Pages)",
    icon: Package,
    roles: ["ADMIN", "SALES", "MARKETING", "EDITOR"] as Role[],
  },
  {
    href: "/admin/pages/portfolio",
    label: "ผลงาน (Pages)",
    icon: Images,
    roles: ["ADMIN", "SALES", "MARKETING", "EDITOR"] as Role[],
  },
  {
    href: "/admin/pages/calculator",
    label: "เครื่องคำนวณ (Pages)",
    icon: Calculator,
    roles: ["ADMIN", "SALES", "MARKETING", "EDITOR"] as Role[],
  },
  {
    href: "/admin/testimonials",
    label: "รีวิวลูกค้า",
    icon: MessageSquareQuote,
    roles: ["ADMIN", "SALES", "MARKETING", "EDITOR"] as Role[],
  },
  {
    href: "/admin/pages/about",
    label: "เกี่ยวกับเรา (Pages)",
    icon: FileText,
    roles: ["ADMIN", "SALES", "MARKETING", "EDITOR"] as Role[],
  },
  {
    // Pages CMS — Home Content + Properties + Shared CTA (#62 / #68)
    href: "/admin/pages/home",
    label: "หน้าแรก (Pages)",
    icon: LayoutTemplate,
    roles: ["ADMIN", "SALES", "MARKETING", "EDITOR"] as Role[],
  },
  {
    href: "/admin/channels",
    label: "ช่องทางโปรโมท",
    icon: Megaphone,
    roles: ["ADMIN", "CHANNEL_EXECUTIVE", "MARKETING", "EDITOR"] as Role[],
  },
  {
    href: "/admin/reports",
    label: "รายงาน",
    icon: FileBarChart,
    roles: ["ADMIN", "FINANCE", "MARKETING", "EDITOR", "EXECUTIVE"] as Role[],
  },
  {
    href: "/admin/users",
    label: "ผู้ใช้ระบบ",
    icon: Users,
    roles: ["ADMIN", "EXECUTIVE"] as Role[],
  },
  {
    href: "/admin/audit",
    label: "ประวัติการแก้ไข",
    icon: ScrollText,
    roles: ["ADMIN", "EXECUTIVE"] as Role[],
  },
  {
    href: "/admin/settings",
    label: "ตั้งค่าระบบ",
    icon: Settings,
    roles: ["ADMIN", "MARKETING"] as Role[],
  },
];

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

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-background md:flex">
      <div className="border-b border-border p-5">
        <BrandLogo />
      </div>
      <nav className="flex-1 space-y-0.5 p-3">
        {ITEMS.filter((i) => i.roles.includes(role)).map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg border-l-[3px] px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "border-brand-orange bg-primary/8 text-primary"
                  : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="size-4" />
              <span className="flex-1">{item.label}</span>
              {item.href === "/admin/leads" && unreadLeadCount > 0 && (
                <span
                  aria-label={`Lead ใหม่ที่ยังไม่ได้เปิด ${unreadLeadCount} รายการ`}
                  className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-orange px-1.5 text-xs font-semibold text-black"
                >
                  {unreadLeadCount > 99 ? "99+" : unreadLeadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-3">
        <Link
          href="/th"
          className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Home className="size-4" />
          ดูหน้าเว็บไซต์
        </Link>
      </div>
    </aside>
  );
}
