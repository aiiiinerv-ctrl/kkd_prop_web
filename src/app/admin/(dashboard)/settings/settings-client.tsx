"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateBookingCapacitySetting } from "@/actions/bookings";
import { updatePaymentSettings } from "@/actions/payment-settings";
import { previewPromptPayQr } from "@/actions/promptpay-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PaymentSettingsForm = {
  promptpayId: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
};

export function SettingsClient({
  setting,
  paymentSettings,
}: {
  setting: { maxPerDay: number; maxPerSlot: number };
  paymentSettings: PaymentSettingsForm;
}) {
  const [isPending, startTransition] = useTransition();
  const [isPaymentPending, startPaymentTransition] = useTransition();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [promptpayId, setPromptpayId] = useState(paymentSettings.promptpayId);

  const onSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = await updateBookingCapacitySetting(formData);
      if (result.ok) {
        toast.success("บันทึกการตั้งค่าเรียบร้อย");
      } else {
        toast.error(result.error);
      }
    });
  };

  const onSubmitPayment = (formData: FormData) => {
    startPaymentTransition(async () => {
      const result = await updatePaymentSettings(formData);
      if (result.ok) {
        toast.success("บันทึกข้อมูลการชำระเงินเรียบร้อย");
      } else {
        toast.error(result.error);
      }
    });
  };

  const onPreviewQr = () => {
    startPaymentTransition(async () => {
      if (!promptpayId.trim()) {
        setQrDataUrl(null);
        return;
      }
      const result = await previewPromptPayQr(promptpayId.trim());
      if (result.ok) {
        setQrDataUrl(result.dataUrl);
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="max-w-xl space-y-5">
      <h1 className="text-xl font-bold">ตั้งค่าระบบ</h1>

      <div className="rounded-xl border border-border/70 bg-card p-6">
        <h2 className="mb-1 font-semibold">จำนวนนัดสำรวจสูงสุด</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          กำหนดจำนวนนัดสำรวจสูงสุดต่อวันและต่อช่วงเวลา — ลูกค้าจะไม่สามารถเลือกวัน/ช่วงเวลาที่เต็มแล้วในฟอร์มจองสำรวจได้
        </p>
        <form action={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="s-max-per-day">จำนวนนัดสำรวจสูงสุดต่อวัน</Label>
            <Input
              id="s-max-per-day"
              name="maxPerDay"
              type="number"
              min={1}
              max={100}
              required
              defaultValue={setting.maxPerDay}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-max-per-slot">จำนวนนัดสำรวจสูงสุดต่อช่วงเวลา</Label>
            <Input
              id="s-max-per-slot"
              name="maxPerSlot"
              type="number"
              min={1}
              max={100}
              required
              defaultValue={setting.maxPerSlot}
            />
          </div>
          <Button id="s-capacity-submit" type="submit" disabled={isPending}>
            {isPending ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </form>
      </div>

      <div className="rounded-xl border border-border/70 bg-card p-6">
        <h2 className="mb-1 font-semibold">ข้อมูลการชำระเงิน</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          ข้อมูลบัญชีธนาคารและ PromptPay ที่แสดงในฟอร์มจองสำรวจหน้างานฝั่งลูกค้า
        </p>
        <form action={onSubmitPayment} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="p-promptpay-id">PromptPay ID (เบอร์โทร/เลขบัตรประชาชน)</Label>
            <Input
              id="p-promptpay-id"
              name="promptpayId"
              value={promptpayId}
              onChange={(e) => setPromptpayId(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-bank-name">ชื่อธนาคาร</Label>
            <Input id="p-bank-name" name="bankName" defaultValue={paymentSettings.bankName} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-bank-account-number">เลขที่บัญชี</Label>
            <Input
              id="p-bank-account-number"
              name="bankAccountNumber"
              defaultValue={paymentSettings.bankAccountNumber}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-bank-account-name">ชื่อบัญชี</Label>
            <Input
              id="p-bank-account-name"
              name="bankAccountName"
              defaultValue={paymentSettings.bankAccountName}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button id="p-payment-submit" type="submit" disabled={isPaymentPending}>
              {isPaymentPending ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isPaymentPending}
              onClick={onPreviewQr}
            >
              พรีวิว QR PromptPay
            </Button>
          </div>
        </form>
        {qrDataUrl && (
          <div className="mt-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="พรีวิว QR PromptPay" className="size-48 rounded-lg border" />
          </div>
        )}
      </div>
    </div>
  );
}
