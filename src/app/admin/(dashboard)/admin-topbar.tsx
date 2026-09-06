import { LogOut } from "lucide-react";
import { logout } from "@/actions/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Role } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/enum-labels";
import { AdminMobileNav } from "./admin-mobile-nav";

export function AdminTopbar({
  name,
  role,
}: {
  name: string;
  role: Role;
}) {
  return (
    <header className="flex items-center justify-between border-b border-border bg-background px-4 py-3 md:px-6">
      <div className="flex items-center gap-2">
        <AdminMobileNav role={role} />
        <div className="text-sm font-semibold">ระบบหลังบ้าน</div>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden text-sm sm:inline">{name}</span>
        <Badge variant={role === "ADMIN" ? "default" : "secondary"}>
          {ROLE_LABELS[role].label}
        </Badge>
        <form action={logout}>
          <Button type="submit" variant="ghost" size="sm" aria-label="ออกจากระบบ">
            <LogOut className="size-4" />
            <span className="hidden sm:inline">ออกจากระบบ</span>
          </Button>
        </form>
      </div>
    </header>
  );
}
