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
import {
  BUILDING_TYPE_LABELS,
  INTERESTED_SYSTEM_LABELS,
  LEAD_STATUS_LABELS,
  TIME_SLOT_RANGE_LABELS,
  PAYMENT_STATUS_META,
} from "@/lib/enum-labels";
import type {
  BuildingType,
  LeadStatus,
  PaymentStatus,
  TimeSlot,
} from "@/generated/prisma/enums";

const selectCls =
  "rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none";

type LeadDetail = {
  id: string;
  type: "QUOTE" | "SURVEY";
  status: LeadStatus;
  name: string;
  phone: string;
  lineId: string | null;
  referrerName: string | null;
  province: string;
  buildingType: BuildingType;
  buildingTypeOtherText: string | null;
  avgMonthlyBill: number | null;
  interestedSystems: string[] | null;
  interestedPackageSlug: string | null;
  interestedServiceSlug: string | null;
  locale: string;
  customerMessage: string | null;
  internalNotes: string | null;
  sourceChannelId: string | null;
  autoSourceRefCode: string | null;
  autoSourceName: string | null;
  assignedSalesId: string | null;
  assignedSalesName: string | null;
  lastFollowUpAt: string | null;
  createdAt: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  landingPath: string | null;
  booking: {
    id: string;
    address: string;
    preferredDate: string;
    timeSlot: TimeSlot;
    amountThb: number;
    paymentSlipKey: string;
    paymentStatus: PaymentStatus;
  } | null;
};

export function LeadDetailClient({
  lead,
  channels,
  salesUsers,
  canMutate,
  canEditChannel,
  canAssignSales,
}: {
  lead: LeadDetail;
  channels: { id: string; nameTh: string }[];
  salesUsers: { id: string; name: string }[];
  canMutate: boolean;
  canEditChannel: boolean;
  canAssignSales: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState(lead.internalNotes ?? "");

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
        {canMutate ? (
          <select
            className={selectCls}
            value={lead.status}
            disabled={isPending}
            onChange={(e) =>
              run(() => updateLeadStatus(lead.id, e.target.value), "อัปเดตสถานะแล้ว")
            }
          >
            {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        ) : (
          <Badge variant="secondary">{LEAD_STATUS_LABELS[lead.status] ?? lead.status}</Badge>
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
          {lead.referrerName && (
            <div>
              <dt className="text-muted-foreground">ผู้แนะนำ</dt>
              <dd className="font-medium">{lead.referrerName}</dd>
            </div>
          )}
          <div>
            <dt className="text-muted-foreground">จังหวัด</dt>
            <dd className="font-medium">{lead.province}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">ประเภทอาคาร</dt>
            <dd className="font-medium">
              {BUILDING_TYPE_LABELS[lead.buildingType] ?? lead.buildingType}
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
          {lead.interestedPackageSlug && (
            <div>
              <dt className="text-muted-foreground">แพ็กเกจที่สนใจ (จากลิงก์)</dt>
              <dd className="font-medium">{lead.interestedPackageSlug}</dd>
            </div>
          )}
          {lead.interestedServiceSlug && (
            <div>
              <dt className="text-muted-foreground">บริการที่สนใจ (จากลิงก์)</dt>
              <dd className="font-medium">{lead.interestedServiceSlug}</dd>
            </div>
          )}
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

      {/* Attribution lives in its own card: the manual dropdown ("how did you
          hear about us", what the customer said) and the automatic ?ref=
          tracking are two different answers to the same question, and reading
          them side by side is the only way to spot a mismatch. */}
      <div className="rounded-xl border border-border/70 bg-card p-6">
        <h2 className="mb-4 font-semibold">ที่มาของลูกค้า</h2>
        <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
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
              {lead.autoSourceRefCode
                ? lead.autoSourceName
                  ? `${lead.autoSourceRefCode} - ${lead.autoSourceName}`
                  : lead.autoSourceRefCode
                : "เข้าโดยตรง"}
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
                {TIME_SLOT_RANGE_LABELS[lead.booking.timeSlot] ?? lead.booking.timeSlot}
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

            {canMutate && lead.booking.paymentStatus === "PENDING_REVIEW" && (
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

      {lead.customerMessage && (
        <div className="rounded-xl border border-border/70 bg-card p-6">
          <h2 className="mb-3 font-semibold">ข้อความจากลูกค้า</h2>
          <p className="text-sm whitespace-pre-wrap">{lead.customerMessage}</p>
        </div>
      )}

      {/* Marketing metadata, not something sales reads while working a lead —
          kept below internal notes so the fields that matter for follow-up
          (address, message, notes) don't require scrolling past a section
          nobody but marketing checks. */}
      {(lead.utmSource ||
        lead.utmMedium ||
        lead.utmCampaign ||
        lead.utmContent ||
        lead.utmTerm ||
        lead.landingPath) && (
        <div className="rounded-xl border border-border/70 bg-card p-6">
          <h2 className="mb-4 font-semibold">ข้อมูลแคมเปญ (UTM)</h2>
          <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">UTM Source</dt>
              <dd className="font-medium">{lead.utmSource ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">UTM Medium</dt>
              <dd className="font-medium">{lead.utmMedium ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">UTM Campaign</dt>
              <dd className="font-medium">{lead.utmCampaign ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">UTM Content</dt>
              <dd className="font-medium">{lead.utmContent ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">UTM Term</dt>
              <dd className="font-medium">{lead.utmTerm ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Landing Path</dt>
              <dd className="font-medium">{lead.landingPath ?? "-"}</dd>
            </div>
          </dl>
        </div>
      )}

      <div className="rounded-xl border border-border/70 bg-card p-6">
        <h2 className="mb-3 font-semibold">บันทึกภายใน</h2>
        {canMutate ? (
          <>
            <Textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="บันทึกการติดต่อ ข้อตกลง หรือรายละเอียดเพิ่มเติม..."
            />
            <Button
              className="mt-3"
              disabled={isPending || notes === (lead.internalNotes ?? "")}
              onClick={() => run(() => updateLeadNotes(lead.id, notes), "บันทึกแล้ว")}
            >
              บันทึก
            </Button>
          </>
        ) : (
          <p className="text-sm whitespace-pre-wrap text-muted-foreground">
            {lead.internalNotes || "ยังไม่มีบันทึก"}
          </p>
        )}
      </div>
    </div>
  );
}
