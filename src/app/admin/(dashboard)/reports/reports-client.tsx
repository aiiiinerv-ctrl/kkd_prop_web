"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  reportFiltersToParams,
  useReportSummary,
  type ReportFilters,
} from "@/hooks/admin/use-reports";

const selectCls =
  "rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none";

const EMPTY_FILTERS: ReportFilters = {
  from: "",
  to: "",
  channelId: "",
  executiveId: "",
  salesId: "",
};

function formatThb(n: number) {
  return n.toLocaleString("th-TH");
}

function formatPercent(n: number) {
  return `${n.toFixed(1)}%`;
}

// Month-preset helpers (Sprint 5b Task 9, nice-to-have) — client-side only,
// they just compute "from"/"to" strings in the same "YYYY-MM-DD" shape the
// plain date inputs already produce, so use-reports.ts/the API need no changes.
function toDateInputValue(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function monthRange(monthsAgo: number): { from: string; to: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  const end = new Date(now.getFullYear(), now.getMonth() - monthsAgo + 1, 0);
  return { from: toDateInputValue(start), to: toDateInputValue(end) };
}

type MonthPreset = "thisMonth" | "lastMonth" | "custom";

export function ReportsClient({
  channels,
  executives,
  salesUsers,
}: {
  channels: { id: string; nameTh: string }[];
  executives: { id: string; name: string }[];
  salesUsers: { id: string; name: string }[];
}) {
  const [filters, setFilters] = useState<ReportFilters>(EMPTY_FILTERS);
  const [monthPreset, setMonthPreset] = useState<MonthPreset>("custom");
  const { data, isPending, isError } = useReportSummary(filters);

  const set = (patch: Partial<ReportFilters>) => {
    setMonthPreset("custom");
    setFilters((f) => ({ ...f, ...patch }));
  };

  const applyMonthPreset = (preset: "thisMonth" | "lastMonth") => {
    setMonthPreset(preset);
    setFilters((f) => ({ ...f, ...monthRange(preset === "thisMonth" ? 0 : 1) }));
  };

  const exportHref = `/api/admin/reports/export?${reportFiltersToParams(filters)}`;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">รายงาน</h1>
        <a href={exportHref} download className={buttonVariants({ variant: "default" })}>
          <Download className="size-4" />
          Export Excel
        </a>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border/70 bg-card p-4">
        <div className="space-y-1.5">
          <Label>ช่วงเวลา</Label>
          <div className="flex gap-1.5">
            <Button
              type="button"
              size="sm"
              variant={monthPreset === "thisMonth" ? "default" : "outline"}
              onClick={() => applyMonthPreset("thisMonth")}
            >
              เดือนนี้
            </Button>
            <Button
              type="button"
              size="sm"
              variant={monthPreset === "lastMonth" ? "default" : "outline"}
              onClick={() => applyMonthPreset("lastMonth")}
            >
              เดือนที่แล้ว
            </Button>
            <Button
              type="button"
              size="sm"
              variant={monthPreset === "custom" ? "default" : "outline"}
              className={cn(monthPreset === "custom" && "pointer-events-none")}
              onClick={() => setMonthPreset("custom")}
            >
              กำหนดเอง
            </Button>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="r-from">ตั้งแต่วันที่</Label>
          <Input
            id="r-from"
            type="date"
            value={filters.from}
            onChange={(e) => set({ from: e.target.value })}
            className="w-40"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="r-to">ถึงวันที่</Label>
          <Input
            id="r-to"
            type="date"
            value={filters.to}
            onChange={(e) => set({ to: e.target.value })}
            className="w-40"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="r-channel">ช่องทาง</Label>
          <select
            id="r-channel"
            className={selectCls}
            value={filters.channelId}
            onChange={(e) => set({ channelId: e.target.value })}
          >
            <option value="">ทุกช่องทาง</option>
            {channels.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nameTh}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="r-executive">ผู้ดำเนินการ</Label>
          <select
            id="r-executive"
            className={selectCls}
            value={filters.executiveId}
            onChange={(e) => set({ executiveId: e.target.value })}
          >
            <option value="">ทุกคน</option>
            {executives.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="r-sales">เซลส์</Label>
          <select
            id="r-sales"
            className={selectCls}
            value={filters.salesId}
            onChange={(e) => set({ salesId: e.target.value })}
          >
            <option value="">ทุกคน</option>
            {salesUsers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        {(filters.from ||
          filters.to ||
          filters.channelId ||
          filters.executiveId ||
          filters.salesId) && (
          <Button variant="outline" size="sm" onClick={() => setFilters(EMPTY_FILTERS)}>
            ล้างตัวกรอง
          </Button>
        )}
      </div>

      {isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : isError || !data ? (
        <p className="rounded-xl border border-border/70 bg-card p-8 text-center text-sm text-destructive">
          โหลดข้อมูลไม่สำเร็จ
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  ลูกค้าเป้าหมายทั้งหมด
                </CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold">{data.totalLeads}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  นัดสำรวจทั้งหมด
                </CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold">{data.totalBookings}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  นัดยืนยันแล้ว
                </CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold">
                {data.totalConfirmedBookings}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  รายได้รวม (บาท)
                </CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold text-primary">
                ฿{formatThb(data.totalRevenueThb)}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-5">
            <BreakdownCard title="แยกตามช่องทาง">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ช่องทาง</TableHead>
                    <TableHead>ลูกค้าเป้าหมาย</TableHead>
                    <TableHead>นัดสำรวจ</TableHead>
                    <TableHead>ยืนยันแล้ว</TableHead>
                    <TableHead>ปิดการขาย</TableHead>
                    <TableHead>อัตราปิดการขาย (%)</TableHead>
                    <TableHead>รายได้ (บาท)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.channelBreakdown.length === 0 && <EmptyRow colSpan={7} />}
                  {data.channelBreakdown.map((c) => (
                    <TableRow key={c.channelId ?? "direct"}>
                      <TableCell>{c.channelName}</TableCell>
                      <TableCell>{c.leadCount}</TableCell>
                      <TableCell>{c.bookingCount}</TableCell>
                      <TableCell>{c.confirmedBookingCount}</TableCell>
                      <TableCell>{c.closedLeadCount}</TableCell>
                      <TableCell>{formatPercent(c.closeRatePercent)}</TableCell>
                      <TableCell>฿{formatThb(c.revenueThb)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </BreakdownCard>

            <BreakdownCard title="แยกตามผู้ดำเนินการ">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ผู้ดำเนินการ</TableHead>
                    <TableHead>ช่องทาง</TableHead>
                    <TableHead>ลูกค้าเป้าหมาย</TableHead>
                    <TableHead>นัดสำรวจ</TableHead>
                    <TableHead>ปิดการขาย</TableHead>
                    <TableHead>อัตราปิดการขาย (%)</TableHead>
                    <TableHead>รายได้ (บาท)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.executiveBreakdown.length === 0 && <EmptyRow colSpan={7} />}
                  {data.executiveBreakdown.map((e) => (
                    <TableRow key={e.executiveId}>
                      <TableCell>{e.executiveName}</TableCell>
                      <TableCell>{e.channelName}</TableCell>
                      <TableCell>{e.leadCount}</TableCell>
                      <TableCell>{e.bookingCount}</TableCell>
                      <TableCell>{e.closedLeadCount}</TableCell>
                      <TableCell>{formatPercent(e.closeRatePercent)}</TableCell>
                      <TableCell>฿{formatThb(e.revenueThb)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </BreakdownCard>

            <BreakdownCard title="แยกตามเซลส์">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>เซลส์</TableHead>
                    <TableHead>ลูกค้าเป้าหมาย</TableHead>
                    <TableHead>นัดสำรวจ</TableHead>
                    <TableHead>ปิดการขาย</TableHead>
                    <TableHead>อัตราปิดการขาย (%)</TableHead>
                    <TableHead>รายได้ (บาท)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.salesBreakdown.length === 0 && <EmptyRow colSpan={6} />}
                  {data.salesBreakdown.map((s) => (
                    <TableRow key={s.salesId}>
                      <TableCell>{s.salesName}</TableCell>
                      <TableCell>{s.leadCount}</TableCell>
                      <TableCell>{s.bookingCount}</TableCell>
                      <TableCell>{s.closedLeadCount}</TableCell>
                      <TableCell>{formatPercent(s.closeRatePercent)}</TableCell>
                      <TableCell>฿{formatThb(s.revenueThb)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </BreakdownCard>

            <BreakdownCard title="สถานะนัดสำรวจ">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>สถานะ</TableHead>
                    <TableHead>จำนวน</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.bookingStatusBreakdown.map((b) => (
                    <TableRow key={b.status}>
                      <TableCell>{b.label}</TableCell>
                      <TableCell>{b.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </BreakdownCard>
          </div>
        </>
      )}
    </div>
  );
}

function BreakdownCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function EmptyRow({ colSpan }: { colSpan: number }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-6 text-center text-muted-foreground">
        ไม่พบข้อมูล
      </TableCell>
    </TableRow>
  );
}
