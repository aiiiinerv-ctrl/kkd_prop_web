import { LogOut } from "lucide-react";
import { logout } from "@/actions/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function AdminTopbar({
  name,
  role,
}: {
  name: string;
  role: "ADMIN" | "EDITOR";
}) {
  return (
    <header className="flex items-center justify-between border-b border-border bg-background px-6 py-3">
      <div className="text-sm font-semibold">ระบบหลังบ้าน</div>
      <div className="flex items-center gap-3">
        <span className="text-sm">{name}</span>
        <Badge variant={role === "ADMIN" ? "default" : "secondary"}>{role}</Badge>
        <form action={logout}>
          <Button type="submit" variant="ghost" size="sm">
            <LogOut className="size-4" />
            ออกจากระบบ
          </Button>
        </form>
      </div>
    </header>
  );
}
