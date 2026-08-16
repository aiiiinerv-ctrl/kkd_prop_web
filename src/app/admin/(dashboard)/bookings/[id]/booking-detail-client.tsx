"use client";

import { ArrowLeft, Receipt } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import {
  assignBookingEngineer,
  assignBookingSales,
  updateBookingStatus,
  updateGiftSent,
  updatePaymentStatus,
} from "@/actions/bookings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  BOOKING_STATUS_LABELS,
  PAYMENT_STATUS_META,
  TIME_SLOT_LABELS,
} from "@/lib/enum-labels";
import type {
  BookingStatus,
  PaymentStatus,
  TimeSlot,
} from "@/generated/prisma/enums";

const selectCls =
  "rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none";

type StaffOption = { id: string; name: string; role: string };

type BookingDetail = {
  id: string;
  bookingNumber: string;
  status: BookingStatus;
  giftSent: boolean;
  address: string;
  preferredDate: string;
  timeSlot: TimeSlot;
  amountThb: number;
  paymentSlipKey: string;
  paymentStatus: PaymentStatus;
  assignedEngineerId: string | null;
  assignedSalesId: string | null;
  lead: {
    id: string;
    name: string;
    phone: string;
    province: string;
    customerMessage: string | null;
  };
};

export function BookingDetailClient({
  booking,
  staff,
  canMutate,
}: {
  booking: BookingDetail;
  staff: StaffOption[];
  canMutate: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) =>
    startTransition(async () => {
      const result = await fn();
      if (result.ok) {
        toast.success(okMsg);
        router.refresh();
      } else {
        toast.error(result.error ?? "เกิดข้อผิดพลาด");
      }
    });

  const payment = PAYMENT_STATUS_META[booking.paymentStatus];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/admin/bookings">
          <Button variant="ghost" className="p-2" aria-label="กลับ">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <h1 className="flex-1 text-xl font-bold">{booking.bookingNumber}</h1>
        {canMutate ? (
          <select
            className={selectCls}
            value={booking.status}
            disabled={isPending}
            onChange={(e) =>
              run(
                () => updateBookingStatus(booking.id, e.target.value),
                "อัปเดตสถานะแล้ว"
              )
            }
          >
            {Object.entries(BOOKING_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        ) : (
          <Badge variant="secondary">
            {BOOKING_STATUS_LABELS[booking.status] ?? booking.status}
          </Badge>
        )}
      </div>

      <div className="rounded-xl border border-border/70 bg-card p-6">
        <h2 className="mb-4 font-semibold">
          ข้อมูลลูกค้า
          <Link
            href={`/admin/leads/${booking.lead.id}`}
            className="ml-2 text-xs font-normal text-primary hover:underline"
          >
            ดูข้อมูล lead ทั้งหมด
          </Link>
        </h2>
        <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">ชื่อ</dt>
            <dd className="font-medium">{booking.lead.name}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">เบอร์โทร</dt>
            <dd className="font-medium">
              <a href={`tel:${booking.lead.phone}`} className="text-primary hover:underline">
                {booking.lead.phone}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">จังหวัด</dt>
            <dd className="font-medium">{booking.lead.province}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">ที่อยู่</dt>
            <dd className="font-medium">{booking.address}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">วันนัด</dt>
            <dd className="font-medium">
              {new Date(booking.preferredDate).toLocaleDateString("th-TH", {
                dateStyle: "long",
              })}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">ช่วงเวลา</dt>
            <dd className="font-medium">{TIME_SLOT_LABELS[booking.timeSlot]}</dd>
          </div>
          {booking.lead.customerMessage && (
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">ข้อความจากลูกค้า</dt>
              <dd className="whitespace-pre-wrap font-medium">
                {booking.lead.customerMessage}
              </dd>
            </div>
          )}
        </dl>
      </div>

      <div className="rounded-xl border border-border/70 bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">การชำระเงิน</h2>
          <Badge variant={payment.variant}>{payment.label}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Dialog>
            <DialogTrigger
              render={
                <Button variant="outline">
                  <Receipt className="size-4" /> ดูสลิปโอนเงิน ({booking.amountThb}฿)
                </Button>
              }
            />
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>สลิปโอนเงิน {booking.amountThb} บาท</DialogTitle>
              </DialogHeader>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/files/${booking.paymentSlipKey}`}
                alt="สลิปโอนเงิน"
                className="max-h-[70vh] w-full rounded-lg object-contain"
              />
            </DialogContent>
          </Dialog>

          {canMutate && booking.paymentStatus === "PENDING_REVIEW" && (
            <>
              <Button
                disabled={isPending}
                onClick={() =>
                  run(() => updatePaymentStatus(booking.id, "VERIFIED"), "ยืนยันสลิปแล้ว")
                }
              >
                ยืนยันการชำระเงิน
              </Button>
              <Button
                variant="destructive"
                disabled={isPending}
                onClick={() =>
                  run(() => updatePaymentStatus(booking.id, "REJECTED"), "ปฏิเสธสลิปแล้ว")
                }
              >
                ปฏิเสธ
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border/70 bg-card p-6">
        <h2 className="mb-4 font-semibold">มอบหมายงาน</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="b-engineer">วิศวกรผู้สำรวจ</Label>
            {canMutate ? (
              <select
                id="b-engineer"
                className={`${selectCls} w-full`}
                value={booking.assignedEngineerId ?? ""}
                disabled={isPending}
                onChange={(e) =>
                  run(
                    () => assignBookingEngineer(booking.id, e.target.value),
                    "มอบหมายวิศวกรแล้ว"
                  )
                }
              >
                <option value="">ยังไม่มอบหมาย</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm font-medium">
                {staff.find((s) => s.id === booking.assignedEngineerId)?.name ?? "ยังไม่มอบหมาย"}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="b-sales">เซลส์ผู้รับผิดชอบ</Label>
            {canMutate ? (
              <select
                id="b-sales"
                className={`${selectCls} w-full`}
                value={booking.assignedSalesId ?? ""}
                disabled={isPending}
                onChange={(e) =>
                  run(
                    () => assignBookingSales(booking.id, e.target.value),
                    "มอบหมายเซลส์แล้ว"
                  )
                }
              >
                <option value="">ยังไม่มอบหมาย</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm font-medium">
                {staff.find((s) => s.id === booking.assignedSalesId)?.name ?? "ยังไม่มอบหมาย"}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <input
            id="b-gift-sent"
            type="checkbox"
            className="size-4 rounded border-input"
            checked={booking.giftSent}
            disabled={!canMutate || isPending}
            onChange={(e) => {
              const checked = e.target.checked;
              run(
                () => updateGiftSent(booking.id, checked),
                checked ? "บันทึกส่งของขวัญแล้ว" : "ยกเลิกสถานะส่งของขวัญแล้ว"
              );
            }}
          />
          <Label htmlFor="b-gift-sent" className="cursor-pointer">
            ส่งของขวัญแล้ว
          </Label>
        </div>
      </div>
    </div>
  );
}
