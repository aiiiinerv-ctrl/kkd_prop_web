"use client";

import {
  ClipboardList,
  Home,
  Images,
  LayoutDashboard,
  Megaphone,
  MessageSquareQuote,
  Package,
  ScrollText,
  Users,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/site/brand-logo";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin", label: "แดชบอร์ด", icon: LayoutDashboard, exact: true },
  { href: "/admin/leads", label: "ลูกค้า (Leads)", icon: ClipboardList },
  { href: "/admin/services", label: "บริการ", icon: Wrench },
  { href: "/admin/packages", label: "แพ็กเกจ", icon: Package },
  { href: "/admin/portfolio", label: "ผลงาน", icon: Images },
  { href: "/admin/testimonials", label: "รีวิวลูกค้า", icon: MessageSquareQuote },
  { href: "/admin/channels", label: "ช่องทางโปรโมท", icon: Megaphone },
  { href: "/admin/users", label: "ผู้ใช้ระบบ", icon: Users, adminOnly: true },
  { href: "/admin/audit", label: "ประวัติการแก้ไข", icon: ScrollText },
];

export function AdminSidebar({ role }: { role: "ADMIN" | "EDITOR" }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-background md:flex">
      <div className="border-b border-border p-5">
        <BrandLogo />
      </div>
      <nav className="flex-1 space-y-0.5 p-3">
        {ITEMS.filter((i) => !i.adminOnly || role === "ADMIN").map((item) => {
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
