"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useLeads, type LeadFilters } from "@/hooks/admin/use-leads";

export const LEAD_STATUS_LABELS: Record<string, string> = {
  NEW: "ใหม่",
  CONTACTED: "ติดต่อแล้ว",
  QUOTED: "เสนอราคาแล้ว",
  WON: "ปิดการขาย",
  LOST: "ไม่สำเร็จ",
};

const selectCls =
  "rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none";

export function LeadsClient({
  channels,
}: {
  channels: { id: string; nameTh: string }[];
}) {
  const [filters, setFilters] = useState<LeadFilters>({
    page: 1,
    type: "",
    status: "",
    channelId: "",
    search: "",
  });
  const [searchInput, setSearchInput] = useState("");
  const { data, isPending, isError } = useLeads(filters);

  const set = (patch: Partial<LeadFilters>) =>
    setFilters((f) => ({ ...f, ...patch, page: patch.page ?? 1 }));

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">ลูกค้า (Leads)</h1>

      <div className="flex flex-wrap items-center gap-3">
        <form
          className="relative"
          onSubmit={(e) => {
            e.preventDefault();
            set({ search: searchInput });
          }}
        >
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="ค้นหาชื่อ/เบอร์/จังหวัด..."
            className="w-56 pl-9"
          />
        </form>
        <select
          className={selectCls}
          value={filters.type}
          onChange={(e) => set({ type: e.target.value })}
        >
          <option value="">ทุกประเภท</option>
          <option value="QUOTE">ขอใบเสนอราคา</option>
          <option value="SURVEY">นัดสำรวจ 199฿</option>
        </select>
        <select
          className={selectCls}
          value={filters.status}
          onChange={(e) => set({ status: e.target.value })}
        >
          <option value="">ทุกสถานะ</option>
          {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
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

      <div className="rounded-xl border border-border/70 bg-card">
        {isPending ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : isError ? (
          <p className="p-8 text-center text-sm text-destructive">
            โหลดข้อมูลไม่สำเร็จ
          </p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ชื่อ</TableHead>
                  <TableHead>เบอร์โทร</TableHead>
                  <TableHead>ประเภท</TableHead>
                  <TableHead>จังหวัด</TableHead>
                  <TableHead>ช่องทาง</TableHead>
                  <TableHead>วันที่</TableHead>
                  <TableHead>สถานะ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.leads.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-10 text-center text-muted-foreground"
                    >
                      ไม่พบข้อมูล
                    </TableCell>
                  </TableRow>
                )}
                {data.leads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <Link
                        href={`/admin/leads/${lead.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {lead.name}
                      </Link>
                    </TableCell>
                    <TableCell>{lead.phone}</TableCell>
                    <TableCell>
                      {lead.type === "SURVEY" ? (
                        <span>
                          นัดสำรวจ
                          {lead.booking?.paymentStatus === "PENDING_REVIEW" && (
                            <Badge className="ml-1.5" variant="destructive">
                              รอตรวจสลิป
                            </Badge>
                          )}
                        </span>
                      ) : (
                        "ใบเสนอราคา"
                      )}
                    </TableCell>
                    <TableCell>{lead.province}</TableCell>
                    <TableCell>{lead.sourceChannel?.nameTh ?? "-"}</TableCell>
                    <TableCell>
                      {new Date(lead.createdAt).toLocaleDateString("th-TH")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={lead.status === "NEW" ? "default" : "secondary"}>
                        {LEAD_STATUS_LABELS[lead.status]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {data.pageCount > 1 && (
              <div className="flex items-center justify-between border-t border-border px-5 py-3">
                <span className="text-sm text-muted-foreground">
                  ทั้งหมด {data.total} รายการ · หน้า {data.page}/{data.pageCount}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={filters.page <= 1}
                    onClick={() => set({ page: filters.page - 1 })}
                  >
                    ก่อนหน้า
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={filters.page >= data.pageCount}
                    onClick={() => set({ page: filters.page + 1 })}
                  >
                    ถัดไป
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
