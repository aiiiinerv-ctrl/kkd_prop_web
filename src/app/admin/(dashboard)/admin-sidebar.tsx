"use client";

import {
  CalendarCheck,
  ClipboardList,
  FileBarChart,
  Home,
  Images,
  LayoutDashboard,
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

type Role = "ADMIN" | "SALES" | "FINANCE" | "CHANNEL_EXECUTIVE";

const ALL_ROLES: Role[] = ["ADMIN", "SALES", "FINANCE", "CHANNEL_EXECUTIVE"];

// Each item lists the roles allowed to see it. CHANNEL_EXECUTIVE is scoped
// to leads (read-only, aggregate view) + their own channel; FINANCE loses
// every content/management link since it never mutates anything; SALES
// loses channel/user management per spec.
const ITEMS = [
  {
    href: "/admin",
    label: "แดชบอร์ด",
    icon: LayoutDashboard,
    exact: true,
    roles: ["ADMIN", "SALES", "FINANCE"] as Role[],
  },
  { href: "/admin/leads", label: "ลูกค้า (Leads)", icon: ClipboardList, roles: ALL_ROLES },
  {
    href: "/admin/bookings",
    label: "การจองสำรวจ",
    icon: CalendarCheck,
    roles: ["ADMIN", "SALES", "FINANCE"] as Role[],
  },
  {
    href: "/admin/services",
    label: "บริการ",
    icon: Wrench,
    roles: ["ADMIN", "SALES"] as Role[],
  },
  {
    href: "/admin/packages",
    label: "แพ็กเกจ",
    icon: Package,
    roles: ["ADMIN", "SALES"] as Role[],
  },
  {
    href: "/admin/portfolio",
    label: "ผลงาน",
    icon: Images,
    roles: ["ADMIN", "SALES"] as Role[],
  },
  {
    href: "/admin/testimonials",
    label: "รีวิวลูกค้า",
    icon: MessageSquareQuote,
    roles: ["ADMIN", "SALES"] as Role[],
  },
  {
    href: "/admin/channels",
    label: "ช่องทางโปรโมท",
    icon: Megaphone,
    roles: ["ADMIN", "CHANNEL_EXECUTIVE"] as Role[],
  },
  {
    href: "/admin/reports",
    label: "รายงาน",
    icon: FileBarChart,
    roles: ["ADMIN", "FINANCE"] as Role[],
  },
  { href: "/admin/users", label: "ผู้ใช้ระบบ", icon: Users, roles: ["ADMIN"] as Role[] },
  {
    href: "/admin/audit",
    label: "ประวัติการแก้ไข",
    icon: ScrollText,
    roles: ["ADMIN"] as Role[],
  },
  {
    href: "/admin/settings",
    label: "ตั้งค่าระบบ",
    icon: Settings,
    roles: ["ADMIN"] as Role[],
  },
];

export function AdminSidebar({ role }: { role: Role }) {
  const pathname = usePathname();

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
              {item.label}
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
