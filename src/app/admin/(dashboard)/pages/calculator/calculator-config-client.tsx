"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { ExternalLink, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  resetCalculatorConfigToDefaults,
  updateCalculatorConfig,
} from "@/actions/calculator-config";
import {
  CALCULATOR_DEFAULTS,
  calculateSavings,
  type CalculatorParams,
} from "@/lib/calculator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PREVIEW_BILL = "3500";

export type CalculatorConfigFormData = {
  version: number;
  sunHoursPerDay: number;
  pricePerKwhThb: number;
  annualSavingMonthsMultiplier: number;
  params: CalculatorParams;
};

export function CalculatorConfigClient({ data }: { data: CalculatorConfigFormData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [resetPending, startResetTransition] = useTransition();
  const [sunHoursPerDay, setSunHoursPerDay] = useState(String(data.sunHoursPerDay));
  const [pricePerKwhThb, setPricePerKwhThb] = useState(String(data.pricePerKwhThb));
  const [annualSavingMonthsMultiplier, setAnnualSavingMonthsMultiplier] = useState(
    String(data.annualSavingMonthsMultiplier)
  );

  const draftParams = useMemo((): CalculatorParams => {
    const sun = Number(sunHoursPerDay);
    const price = Number(pricePerKwhThb);
    const annual = Number(annualSavingMonthsMultiplier);
    return {
      ...data.params,
      sunHoursPerDay: Number.isFinite(sun) ? sun : data.params.sunHoursPerDay,
      pricePerKwhThb: Number.isFinite(price) ? price : data.params.pricePerKwhThb,
      annualSavingMonthsMultiplier: Number.isFinite(annual)
        ? annual
        : data.params.annualSavingMonthsMultiplier,
    };
  }, [
    annualSavingMonthsMultiplier,
    data.params,
    pricePerKwhThb,
    sunHoursPerDay,
  ]);

  const preview = useMemo(
    () => calculateSavings(PREVIEW_BILL, [], draftParams),
    [draftParams]
  );

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateCalculatorConfig(formData);
      if ("ok" in result && result.ok) {
        toast.success("บันทึกตัวเลขการคำนวณแล้ว");
        router.refresh();
      } else if ("conflict" in result && result.conflict) {
        toast.error("มีคนแก้ก่อนคุณ — รีเฟรชแล้วลองใหม่");
        router.refresh();
      } else {
        toast.error("error" in result ? result.error : "บันทึกไม่สำเร็จ");
      }
    });
  }

  function onReset() {
    if (
      !window.confirm(
        "คืนค่าตัวเลขทั้งหมดเป็นค่าเริ่มต้นจาก Excel ใช่หรือไม่?"
      )
    ) {
      return;
    }
    startResetTransition(async () => {
      const result = await resetCalculatorConfigToDefaults();
      if ("ok" in result && result.ok) {
        toast.success("คืนค่าเริ่มต้นแล้ว");
        router.refresh();
      } else {
        toast.error("error" in result ? result.error : "คืนค่าไม่สำเร็จ");
      }
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">ตัวเลขการคำนวณ</h2>
          <p className="text-sm text-muted-foreground">
            ปรับสมมติฐานธุรกิจ — ช่วงบิลและเกณฑ์ kW ยังอยู่ในค่าเริ่มต้น (Phase B)
          </p>
        </div>
        <a
          href="/th/calculator"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          เปิดหน้าจริง
          <ExternalLink className="size-3.5" />
        </a>
      </div>

      <form onSubmit={onSubmit} noValidate className="space-y-6">
        <input type="hidden" name="version" value={data.version} />

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="calc-sun-hours">ชั่วโมงแดด/วัน</Label>
            <Input
              id="calc-sun-hours"
              name="sunHoursPerDay"
              type="number"
              min={1}
              max={12}
              step={0.5}
              required
              value={sunHoursPerDay}
              onChange={(e) => setSunHoursPerDay(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              ค่าเริ่มต้น {CALCULATOR_DEFAULTS.sunHoursPerDay}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="calc-price-kwh">ราคาไฟ (บาท/kWh)</Label>
            <Input
              id="calc-price-kwh"
              name="pricePerKwhThb"
              type="number"
              min={0.01}
              max={50}
              step={0.1}
              required
              value={pricePerKwhThb}
              onChange={(e) => setPricePerKwhThb(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              ค่าเริ่มต้น {CALCULATOR_DEFAULTS.pricePerKwhThb}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="calc-annual-mult">ตัวคูณรายปี (เดือน)</Label>
            <Input
              id="calc-annual-mult"
              name="annualSavingMonthsMultiplier"
              type="number"
              min={1}
              max={12}
              step={1}
              required
              value={annualSavingMonthsMultiplier}
              onChange={(e) => setAnnualSavingMonthsMultiplier(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              ค่าเริ่มต้น {CALCULATOR_DEFAULTS.annualSavingMonthsMultiplier} (ไม่ใช่ 12)
            </p>
          </div>
        </div>

        <fieldset className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
          <legend className="px-1 text-sm font-semibold">
            ตัวอย่างผลคำนวณ (บิล ฿{Number(PREVIEW_BILL).toLocaleString("th-TH")})
          </legend>
          {preview ? (
            <dl className="grid gap-2 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">ระบบที่แนะนำ</dt>
                <dd className="font-semibold">{preview.systemKey.replace("system", "")} kW</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">ประหยัด/เดือน</dt>
                <dd className="font-semibold">
                  ฿{preview.monthlySaving.toLocaleString("th-TH")}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">บิลหลังติดตั้ง</dt>
                <dd className="font-semibold">
                  ฿{preview.afterBill.toLocaleString("th-TH")}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">กรอกตัวเลขให้ถูกต้องเพื่อดูตัวอย่าง</p>
          )}
        </fieldset>

        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={pending || resetPending}
            onClick={onReset}
          >
            <RotateCcw className="size-4" />
            คืนค่าเริ่มต้น
          </Button>
          <Button type="submit" id="calc-config-submit" disabled={pending || resetPending}>
            {pending ? "กำลังบันทึก…" : "บันทึกตัวเลข"}
          </Button>
        </div>
      </form>
    </div>
  );
}
