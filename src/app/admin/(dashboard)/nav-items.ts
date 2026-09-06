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
  Map,
  Megaphone,
  MessageSquareQuote,
  Package,
  Phone,
  ScrollText,
  Settings,
  Users,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ROLES } from "@/lib/enums";
import type { Role } from "@/lib/auth";

const ALL_ROLES: Role[] = ROLES;

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  roles: Role[];
};

export type NavZone = { key: "sales" | "content" | "system"; label: string; items: NavItem[] };

// Each item lists the roles allowed to see it. CHANNEL_EXECUTIVE is scoped
// to leads (read-only, aggregate view) + their own channel; FINANCE loses
// every content/management link since it never mutates anything; SALES
// loses channel/user management per spec. MARKETING/EDITOR/EXECUTIVE (added
// 2026-08-16) follow the permission matrix in
// docs/plans/rbac-marketing-editor-executive-tasks.md.

export const PINNED_ITEM: NavItem = {
  href: "/admin",
  label: "แดชบอร์ด",
  icon: LayoutDashboard,
  exact: true,
  roles: ["ADMIN", "SALES", "FINANCE", "MARKETING", "EDITOR", "EXECUTIVE"] as Role[],
};

const SALES_ZONE_ITEMS: NavItem[] = [
  { href: "/admin/leads", label: "ลูกค้า (Leads)", icon: ClipboardList, roles: ALL_ROLES },
  {
    href: "/admin/bookings",
    label: "การจองสำรวจ",
    icon: CalendarCheck,
    roles: ["ADMIN", "SALES", "FINANCE", "EDITOR"] as Role[],
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
];

const CONTENT_ZONE_ITEMS: NavItem[] = [
  {
    // Pages CMS — Home Content + Properties + Shared CTA (#62 / #68)
    href: "/admin/pages/home",
    label: "หน้าแรก",
    icon: LayoutTemplate,
    roles: ["ADMIN", "SALES", "MARKETING", "EDITOR"] as Role[],
  },
  {
    href: "/admin/pages/services",
    label: "บริการ",
    icon: Wrench,
    roles: ["ADMIN", "SALES", "MARKETING", "EDITOR"] as Role[],
  },
  {
    href: "/admin/pages/packages",
    label: "แพ็กเกจ",
    icon: Package,
    roles: ["ADMIN", "SALES", "MARKETING", "EDITOR"] as Role[],
  },
  {
    href: "/admin/pages/portfolio",
    label: "ผลงาน",
    icon: Images,
    roles: ["ADMIN", "SALES", "MARKETING", "EDITOR"] as Role[],
  },
  {
    href: "/admin/testimonials",
    label: "รีวิวลูกค้า",
    icon: MessageSquareQuote,
    roles: ["ADMIN", "SALES", "MARKETING", "EDITOR"] as Role[],
  },
  {
    href: "/admin/pages/calculator",
    label: "เครื่องคำนวณ",
    icon: Calculator,
    roles: ["ADMIN", "SALES", "MARKETING", "EDITOR"] as Role[],
  },
  {
    href: "/admin/pages/about",
    label: "เกี่ยวกับเรา",
    icon: FileText,
    roles: ["ADMIN", "SALES", "MARKETING", "EDITOR"] as Role[],
  },
  {
    // Bespoke shell (not in PAGE_REGISTRY) — content lives in SiteSettings singleton
    href: "/admin/pages/contact",
    label: "ติดต่อเรา",
    icon: Phone,
    roles: ["ADMIN", "SALES", "MARKETING", "EDITOR"] as Role[],
  },
];

const SYSTEM_ZONE_ITEMS: NavItem[] = [
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

export const NAV_ZONES: NavZone[] = [
  { key: "sales", label: "งานขายและการตลาด", items: SALES_ZONE_ITEMS },
  { key: "content", label: "เนื้อหาเว็บไซต์", items: CONTENT_ZONE_ITEMS },
  { key: "system", label: "ระบบ", items: SYSTEM_ZONE_ITEMS },
];

export const UTILITY_ITEMS: NavItem[] = [
  { href: "/admin/sitemap", label: "แผนผังเว็บไซต์", icon: Map, roles: ALL_ROLES },
  { href: "/th", label: "ดูหน้าเว็บไซต์", icon: Home, roles: ALL_ROLES },
];

/** All zones in canonical order, each with its items filtered to `role` (an empty
 *  `items` array means the caller renders that zone's header dimmed per §2.3 — zones
 *  are never dropped). */
export function visibleZones(role: Role): NavZone[] {
  return NAV_ZONES.map((zone) => ({
    ...zone,
    items: zone.items.filter((item) => item.roles.includes(role)),
  }));
}

/** null when the role cannot see the dashboard (e.g. CHANNEL_EXECUTIVE). */
export function visiblePinned(role: Role): NavItem | null {
  return PINNED_ITEM.roles.includes(role) ? PINNED_ITEM : null;
}
