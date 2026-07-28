"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { updateBookingCapacitySetting } from "@/actions/bookings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SettingsClient({
  setting,
}: {
  setting: { maxPerDay: number; maxPerSlot: number };
}) {
  const [isPending, startTransition] = useTransition();

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
          <Button type="submit" disabled={isPending}>
            {isPending ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </form>
      </div>
    </div>
  );
}
