import { ClipboardList, Clock, Receipt, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/db";

const STATUS_LABELS: Record<string, string> = {
  NEW: "ใหม่",
  CONTACTED: "ติดต่อแล้ว",
  QUOTED: "เสนอราคาแล้ว",
  WON: "ปิดการขาย",
  LOST: "ไม่สำเร็จ",
};

export default async function AdminDashboardPage() {
  const [totalLeads, newLeads, pendingSlips, wonLeads, recentLeads] =
    await Promise.all([
      prisma.lead.count(),
      prisma.lead.count({ where: { status: "NEW" } }),
      prisma.surveyBooking.count({ where: { paymentStatus: "PENDING_REVIEW" } }),
      prisma.lead.count({ where: { status: "WON" } }),
      prisma.lead.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { booking: true, sourceChannel: true },
      }),
    ]);

  const stats = [
    { label: "Lead ทั้งหมด", value: totalLeads, icon: ClipboardList },
    { label: "Lead ใหม่", value: newLeads, icon: Clock },
    { label: "สลิปรอตรวจ", value: pendingSlips, icon: Receipt },
    { label: "ปิดการขาย", value: wonLeads, icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">แดชบอร์ด</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-border/70 bg-card p-5"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <s.icon className="size-4 text-brand-orange" />
            </div>
            <div className="mt-2 text-3xl font-bold text-primary">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border/70 bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-semibold">Lead ล่าสุด</h2>
          <Link
            href="/admin/leads"
            className="text-sm font-medium text-brand-orange hover:underline"
          >
            ดูทั้งหมด →
          </Link>
        </div>
        <ul className="divide-y divide-border">
          {recentLeads.length === 0 && (
            <li className="px-5 py-8 text-center text-sm text-muted-foreground">
              ยังไม่มี lead เข้ามา
            </li>
          )}
          {recentLeads.map((lead) => (
            <li key={lead.id}>
              <Link
                href={`/admin/leads/${lead.id}`}
                className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-muted/50"
              >
                <div>
                  <div className="text-sm font-medium">
                    {lead.name}{" "}
                    <span className="text-muted-foreground">· {lead.phone}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {lead.type === "SURVEY" ? "นัดสำรวจ 199฿" : "ขอใบเสนอราคา"} ·{" "}
                    {lead.province}
                    {lead.sourceChannel ? ` · ${lead.sourceChannel.nameTh}` : ""}
                  </div>
                </div>
                <Badge variant={lead.status === "NEW" ? "default" : "secondary"}>
                  {STATUS_LABELS[lead.status] ?? lead.status}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
