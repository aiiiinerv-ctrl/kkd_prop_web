import { requireAdmin } from "@/lib/auth";
import { AdminSidebar } from "./admin-sidebar";
import { AdminTopbar } from "./admin-topbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdmin();

  return (
    <div className="flex min-h-screen">
      <AdminSidebar role={session.user.role} />
      <div className="flex flex-1 flex-col">
        <AdminTopbar name={session.user.name ?? ""} role={session.user.role} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
