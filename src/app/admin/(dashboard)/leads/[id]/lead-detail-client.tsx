"use client";

import { ArrowLeft, Receipt } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updatePaymentStatus } from "@/actions/bookings";
import {
  assignLeadSales,
  updateLeadNotes,
  updateLeadSourceChannel,
  updateLeadStatus,
} from "@/actions/leads";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { PAYMENT_STATUS_META } from "@/lib/payment-status-labels";

const STATUS_LABELS: Record<string, string> = {
  NEW: "ใหม่ รอมอบหมาย",
  ASSIGNED: "มอบหมายแล้ว",
  CONTACTED: "กำลังติดตาม",
  QUOTED: "เสนอราคาแล้ว",
  SIGNED: "เซ็นสัญญาแล้ว",
  INSTALLING: "กำลังติดตั้ง",
  COMPLETED: "เสร็จสิ้น",
  DISQUALIFIED: "ไม่มีคุณภาพ",
};

const BUILDING_LABELS: Record<string, string> = {
  RESIDENTIAL: "บ้านพักอาศัย",
  COMMERCIAL: "เชิงพาณิชย์ / ออฟฟิศ",
  INDUSTRIAL: "อุตสาหกรรม / โกดัง",
  OTHER: "อื่นๆ",
};

const INTERESTED_SYSTEM_LABELS: Record<string, string> = {
  ON_GRID: "ออนกริด (On-Grid)",
  HYBRID: "ไฮบริด (Hybrid)",
  OFF_GRID: "ออฟกริด (Off-Grid)",
};

const SLOT_LABELS: Record<string, string> = {
  MORNING: "เช้า 9:00 - 12:00",
  AFTERNOON: "บ่าย 13:00 - 17:00",
};

const PAYMENT_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  PENDING_REVIEW: { label: "รอตรวจสอบ", variant: "default" },
  VERIFIED: { label: "ตรวจสอบแล้ว", variant: "secondary" },
  REJECTED: { label: "ปฏิเสธ", variant: "destructive" },
};

const selectCls =
  "rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none";

type LeadDetail = {
  id: string;
  type: "QUOTE" | "SURVEY";
  status: string;
  name: string;
  phone: string;
  lineId: string | null;
  province: string;
  buildingType: string;
  buildingTypeOtherText: string | null;
  avgMonthlyBill: number | null;
  interestedSystems: string[] | null;
  locale: string;
  notes: string | null;
  sourceChannelId: string | null;
  autoSourceChannelName: string | null;
  autoSourceExecutiveName: string | null;
  assignedSalesId: string | null;
  assignedSalesName: string | null;
  lastFollowUpAt: string | null;
  createdAt: string;
  booking: {
    id: string;
    address: string;
    preferredDate: string;
    timeSlot: string;
    amountThb: number;
    paymentSlipKey: string;
    paymentStatus: string;
  } | null;
};

export function LeadDetailClient({
  lead,
  channels,
  salesUsers,
  canEdit,
  canEditChannel,
  canAssignSales,
}: {
  lead: LeadDetail;
  channels: { id: string; nameTh: string }[];
  salesUsers: { id: string; name: string }[];
  canEdit: boolean;
  canEditChannel: boolean;
  canAssignSales: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState(lead.notes ?? "");

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

  const payment = lead.booking
    ? PAYMENT_STATUS_META[lead.booking.paymentStatus]
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/admin/leads">
          <Button variant="ghost" className="p-2" aria-label="กลับ">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <h1 className="flex-1 text-xl font-bold">{lead.name}</h1>
        {canEdit ? (
          <select
            className={selectCls}
            value={lead.status}
            disabled={isPending}
            onChange={(e) =>
              run(() => updateLeadStatus(lead.id, e.target.value), "อัปเดตสถานะแล้ว")
            }
          >
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        ) : (
          <Badge variant="secondary">{STATUS_LABELS[lead.status] ?? lead.status}</Badge>
        )}
      </div>

      <div className="rounded-xl border border-border/70 bg-card p-6">
        <h2 className="mb-4 font-semibold">
          {lead.type === "SURVEY" ? "นัดสำรวจหน้างาน 199฿" : "ขอใบเสนอราคา"}
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {new Date(lead.createdAt).toLocaleString("th-TH")} · ภาษา{" "}
            {lead.locale === "en" ? "EN" : "TH"}
          </span>
        </h2>
        <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">เบอร์โทร</dt>
            <dd className="font-medium">
              <a href={`tel:${lead.phone}`} className="text-primary hover:underline">
                {lead.phone}
              </a>
            </dd>
          </div>
          {lead.lineId && (
            <div>
              <dt className="text-muted-foreground">LINE ID</dt>
              <dd className="font-medium">{lead.lineId}</dd>
            </div>
          )}
          <div>
            <dt className="text-muted-foreground">จังหวัด</dt>
            <dd className="font-medium">{lead.province}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">ประเภทอาคาร</dt>
            <dd className="font-medium">
              {BUILDING_LABELS[lead.buildingType] ?? lead.buildingType}
              {lead.buildingType === "OTHER" && lead.buildingTypeOtherText
                ? ` (${lead.buildingTypeOtherText})`
                : ""}
            </dd>
          </div>
          {lead.interestedSystems && lead.interestedSystems.length > 0 && (
            <div>
              <dt className="text-muted-foreground">ระบบที่สนใจ</dt>
              <dd className="flex flex-wrap gap-1.5">
                {lead.interestedSystems.map((s) => (
                  <Badge key={s} variant="secondary">
                    {INTERESTED_SYSTEM_LABELS[s] ?? s}
                  </Badge>
                ))}
              </dd>
            </div>
          )}
          {lead.avgMonthlyBill != null && (
            <div>
              <dt className="text-muted-foreground">ค่าไฟเฉลี่ย</dt>
              <dd className="font-medium">
                {lead.avgMonthlyBill.toLocaleString()} บาท/เดือน
              </dd>
            </div>
          )}
          <div>
            <dt className="text-muted-foreground">ช่องทางที่รู้จักเรา</dt>
            <dd>
              {canEditChannel ? (
                <select
                  className={selectCls}
                  value={lead.sourceChannelId ?? ""}
                  disabled={isPending}
                  onChange={(e) =>
                    run(
                      () => updateLeadSourceChannel(lead.id, e.target.value),
                      "อัปเดตช่องทางแล้ว"
                    )
                  }
                >
                  <option value="">ไม่ระบุ</option>
                  {channels.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nameTh}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="font-medium">
                  {channels.find((c) => c.id === lead.sourceChannelId)?.nameTh ?? "ไม่ระบุ"}
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">
              ช่องทางอัตโนมัติ (จากลิงก์โปรโมท)
            </dt>
            <dd className="font-medium">
              {lead.autoSourceChannelName
                ? lead.autoSourceExecutiveName
                  ? `${lead.autoSourceChannelName} · ${lead.autoSourceExecutiveName}`
                  : lead.autoSourceChannelName
                : "เข้าโดยตรง"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">เซลส์ที่รับผิดชอบ</dt>
            <dd>
              {canAssignSales ? (
                <select
                  id="lead-sales"
                  className={selectCls}
                  value={lead.assignedSalesId ?? ""}
                  disabled={isPending}
                  onChange={(e) =>
                    run(
                      () => assignLeadSales(lead.id, e.target.value),
                      "มอบหมายเซลส์แล้ว"
                    )
                  }
                >
                  <option value="">ไม่ระบุ</option>
                  {salesUsers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="font-medium">
                  {lead.assignedSalesName ?? "ยังไม่มอบหมาย"}
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">ติดตามล่าสุด</dt>
            <dd className="font-medium">
              {lead.lastFollowUpAt
                ? new Date(lead.lastFollowUpAt).toLocaleString("th-TH")
                : "ยังไม่เคยติดตาม"}
            </dd>
          </div>
        </dl>
      </div>

      {lead.booking && payment && (
        <div className="rounded-xl border border-border/70 bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">ข้อมูลการนัดสำรวจ</h2>
            <Badge variant={payment.variant}>{payment.label}</Badge>
          </div>
          <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">ที่อยู่</dt>
              <dd className="font-medium">{lead.booking.address}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">วันนัด</dt>
              <dd className="font-medium">
                {new Date(lead.booking.preferredDate).toLocaleDateString("th-TH", {
                  dateStyle: "long",
                })}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">ช่วงเวลา</dt>
              <dd className="font-medium">
                {SLOT_LABELS[lead.booking.timeSlot] ?? lead.booking.timeSlot}
              </dd>
            </div>
          </dl>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Dialog>
              <DialogTrigger
                render={
                  <Button variant="outline">
                    <Receipt className="size-4" /> ดูสลิปโอนเงิน ({lead.booking.amountThb}฿)
                  </Button>
                }
              />
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>สลิปโอนเงิน {lead.booking.amountThb} บาท</DialogTitle>
                </DialogHeader>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/files/${lead.booking.paymentSlipKey}`}
                  alt="สลิปโอนเงิน"
                  className="max-h-[70vh] w-full rounded-lg object-contain"
                />
              </DialogContent>
            </Dialog>

            {canEdit && lead.booking.paymentStatus === "PENDING_REVIEW" && (
              <>
                <Button
                  disabled={isPending}
                  onClick={() =>
                    run(
                      () => updatePaymentStatus(lead.booking!.id, "VERIFIED"),
                      "ยืนยันสลิปแล้ว"
                    )
                  }
                >
                  ยืนยันการชำระเงิน
                </Button>
                <Button
                  variant="destructive"
                  disabled={isPending}
                  onClick={() =>
                    run(
                      () => updatePaymentStatus(lead.booking!.id, "REJECTED"),
                      "ปฏิเสธสลิปแล้ว"
                    )
                  }
                >
                  ปฏิเสธ
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border/70 bg-card p-6">
        <h2 className="mb-3 font-semibold">บันทึกภายใน</h2>
        {canEdit ? (
          <>
            <Textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="บันทึกการติดต่อ ข้อตกลง หรือรายละเอียดเพิ่มเติม..."
            />
            <Button
              className="mt-3"
              disabled={isPending || notes === (lead.notes ?? "")}
              onClick={() => run(() => updateLeadNotes(lead.id, notes), "บันทึกแล้ว")}
            >
              บันทึก
            </Button>
          </>
        ) : (
          <p className="text-sm whitespace-pre-wrap text-muted-foreground">
            {lead.notes || "ยังไม่มีบันทึก"}
          </p>
        )}
      </div>
    </div>
  );
}
