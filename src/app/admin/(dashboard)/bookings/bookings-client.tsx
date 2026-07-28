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
import { useBookings, type BookingFilters } from "@/hooks/admin/use-bookings";

export const BOOKING_STATUS_LABELS: Record<string, string> = {
  PENDING_CONFIRMATION: "รอยืนยัน",
  CONFIRMED: "ยืนยันแล้ว",
  PREPARED: "เตรียมอุปกรณ์แล้ว",
  SURVEYED: "สำรวจแล้ว",
  DESIGNED: "ออกแบบแล้ว",
  SIGNED: "เซ็นสัญญาแล้ว",
  CANCELLED: "ยกเลิก",
};

const SLOT_LABELS: Record<string, string> = {
  MORNING: "เช้า",
  AFTERNOON: "บ่าย",
};

const selectCls =
  "rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none";

export function BookingsClient() {
  const [filters, setFilters] = useState<BookingFilters>({
    page: 1,
    status: "",
    search: "",
  });
  const [searchInput, setSearchInput] = useState("");
  const { data, isPending, isError } = useBookings(filters);

  const set = (patch: Partial<BookingFilters>) =>
    setFilters((f) => ({ ...f, ...patch, page: patch.page ?? 1 }));

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">การจองสำรวจ (Bookings)</h1>

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
            placeholder="ค้นหาเลขที่จอง/ชื่อ/เบอร์..."
            className="w-56 pl-9"
          />
        </form>
        <select
          className={selectCls}
          value={filters.status}
          onChange={(e) => set({ status: e.target.value })}
        >
          <option value="">ทุกสถานะ</option>
          {Object.entries(BOOKING_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
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
                  <TableHead>เลขที่จอง</TableHead>
                  <TableHead>ชื่อ</TableHead>
                  <TableHead>เบอร์โทร</TableHead>
                  <TableHead>จังหวัด</TableHead>
                  <TableHead>วันนัด</TableHead>
                  <TableHead>ช่วงเวลา</TableHead>
                  <TableHead>วิศวกร</TableHead>
                  <TableHead>เซลส์</TableHead>
                  <TableHead>ของขวัญ</TableHead>
                  <TableHead>สถานะ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.bookings.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                      ไม่พบข้อมูล
                    </TableCell>
                  </TableRow>
                )}
                {data.bookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>
                      <Link
                        href={`/admin/bookings/${booking.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {booking.bookingNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{booking.lead.name}</TableCell>
                    <TableCell>{booking.lead.phone}</TableCell>
                    <TableCell>{booking.lead.province}</TableCell>
                    <TableCell>
                      {new Date(booking.preferredDate).toLocaleDateString("th-TH")}
                    </TableCell>
                    <TableCell>{SLOT_LABELS[booking.timeSlot]}</TableCell>
                    <TableCell>{booking.assignedEngineer?.name ?? "-"}</TableCell>
                    <TableCell>{booking.assignedSales?.name ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant={booking.giftSent ? "secondary" : "outline"}>
                        {booking.giftSent ? "ส่งแล้ว" : "ยังไม่ส่ง"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          booking.status === "CANCELLED" ? "destructive" : "secondary"
                        }
                      >
                        {BOOKING_STATUS_LABELS[booking.status]}
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
