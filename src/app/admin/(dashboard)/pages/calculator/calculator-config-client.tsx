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
  recommendSystemSizeKw,
  type CalculatorParams,
} from "@/lib/calculator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PREVIEW_BILL = "3500";

function billToPercent(bill: number, minBill: number, maxBill: number) {
  return ((bill - minBill) / (maxBill - minBill)) * 100;
}

export type CalculatorConfigFormData = {
  version: number;
  sunHoursPerDay: number;
  pricePerKwhThb: number;
  annualSavingMonthsMultiplier: number;
  params: CalculatorParams;
};

function numField(value: string, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function CalculatorConfigClient({ data }: { data: CalculatorConfigFormData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [resetPending, startResetTransition] = useTransition();
  const [sunHoursPerDay, setSunHoursPerDay] = useState(String(data.sunHoursPerDay));
  const [pricePerKwhThb, setPricePerKwhThb] = useState(String(data.pricePerKwhThb));
  const [annualSavingMonthsMultiplier, setAnnualSavingMonthsMultiplier] = useState(
    String(data.annualSavingMonthsMultiplier)
  );
  const [minBill, setMinBill] = useState(String(data.params.minBill));
  const [maxBill, setMaxBill] = useState(String(data.params.maxBill));
  const [stepBill, setStepBill] = useState(String(data.params.stepBill));
  const [billThreshold3To5Kw, setBillThreshold3To5Kw] = useState(
    String(data.params.billThreshold3To5Kw)
  );
  const [billThreshold5To10Kw, setBillThreshold5To10Kw] = useState(
    String(data.params.billThreshold5To10Kw)
  );
  const [previewBill, setPreviewBill] = useState(PREVIEW_BILL);

  const draftParams = useMemo((): CalculatorParams => {
    return {
      ...data.params,
      sunHoursPerDay: numField(sunHoursPerDay, data.params.sunHoursPerDay),
      pricePerKwhThb: numField(pricePerKwhThb, data.params.pricePerKwhThb),
      annualSavingMonthsMultiplier: numField(
        annualSavingMonthsMultiplier,
        data.params.annualSavingMonthsMultiplier
      ),
      minBill: numField(minBill, data.params.minBill),
      maxBill: numField(maxBill, data.params.maxBill),
      stepBill: numField(stepBill, data.params.stepBill),
      billThreshold3To5Kw: numField(billThreshold3To5Kw, data.params.billThreshold3To5Kw),
      billThreshold5To10Kw: numField(billThreshold5To10Kw, data.params.billThreshold5To10Kw),
    };
  }, [
    annualSavingMonthsMultiplier,
    billThreshold3To5Kw,
    billThreshold5To10Kw,
    data.params,
    maxBill,
    minBill,
    pricePerKwhThb,
    stepBill,
    sunHoursPerDay,
  ]);

  const boundsValid =
    draftParams.minBill < draftParams.maxBill &&
    draftParams.billThreshold3To5Kw > draftParams.minBill &&
    draftParams.billThreshold3To5Kw < draftParams.maxBill &&
    draftParams.billThreshold5To10Kw > draftParams.billThreshold3To5Kw &&
    draftParams.billThreshold5To10Kw <= draftParams.maxBill;

  const previewBillNum = numField(previewBill, draftParams.minBill);
  const clampedPreviewBill = boundsValid
    ? Math.min(draftParams.maxBill, Math.max(draftParams.minBill, previewBillNum))
    : previewBillNum;

  const preview = useMemo(
    () => (boundsValid ? calculateSavings(String(clampedPreviewBill), [], draftParams) : null),
    [boundsValid, clampedPreviewBill, draftParams]
  );

  const previewKw = boundsValid ? recommendSystemSizeKw(clampedPreviewBill, draftParams) : null;

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
            ปรับสมมติฐานธุรกิจและช่วงสไลด์บิล — หน้าจริงอัปเดตหลังบันทึก
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

      <form onSubmit={onSubmit} noValidate className="space-y-8">
        <input type="hidden" name="version" value={data.version} />

        <section className="space-y-4">
          <h3 className="text-sm font-semibold">สมมติฐานธุรกิจ (Phase A)</h3>
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
                ค่าเริ่มต้น {CALCULATOR_DEFAULTS.annualSavingMonthsMultiplier}
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-sm font-semibold">ช่วงบิลและเกณฑ์ kW</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="calc-min-bill">บิลขั้นต่ำ (฿)</Label>
              <Input
                id="calc-min-bill"
                name="minBill"
                type="number"
                min={100}
                step={100}
                required
                value={minBill}
                onChange={(e) => setMinBill(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="calc-max-bill">บิลสูงสุด (฿)</Label>
              <Input
                id="calc-max-bill"
                name="maxBill"
                type="number"
                min={100}
                step={100}
                required
                value={maxBill}
                onChange={(e) => setMaxBill(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="calc-step-bill">ขั้นสไลด์ (฿)</Label>
              <Input
                id="calc-step-bill"
                name="stepBill"
                type="number"
                min={50}
                step={50}
                required
                value={stepBill}
                onChange={(e) => setStepBill(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="calc-thresh-35">เกณฑ์ 3 → 5 kW (฿)</Label>
              <Input
                id="calc-thresh-35"
                name="billThreshold3To5Kw"
                type="number"
                min={100}
                step={100}
                required
                value={billThreshold3To5Kw}
                onChange={(e) => setBillThreshold3To5Kw(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="calc-thresh-510">เกณฑ์ 5 → 10 kW (฿)</Label>
              <Input
                id="calc-thresh-510"
                name="billThreshold5To10Kw"
                type="number"
                min={100}
                step={100}
                required
                value={billThreshold5To10Kw}
                onChange={(e) => setBillThreshold5To10Kw(e.target.value)}
              />
            </div>
          </div>

          {!boundsValid && (
            <p className="text-sm text-destructive">
              ตรวจลำดับ: ขั้นต่ำ &lt; เกณฑ์ 3→5 &lt; เกณฑ์ 5→10 ≤ สูงสุด
            </p>
          )}

          {boundsValid && (
            <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
              <Label htmlFor="calc-preview-slider">ตัวอย่างสไลด์</Label>
              <div className="relative pt-2">
                <input
                  id="calc-preview-slider"
                  type="range"
                  min={draftParams.minBill}
                  max={draftParams.maxBill}
                  step={draftParams.stepBill}
                  value={clampedPreviewBill}
                  onChange={(e) => setPreviewBill(e.target.value)}
                  className="w-full accent-brand-orange"
                />
                <span
                  className="pointer-events-none absolute top-0 h-3 w-0.5 -translate-x-1/2 bg-brand-orange/70"
                  style={{
                    left: `${billToPercent(draftParams.billThreshold3To5Kw, draftParams.minBill, draftParams.maxBill)}%`,
                  }}
                />
                <span
                  className="pointer-events-none absolute top-0 h-3 w-0.5 -translate-x-1/2 bg-brand-orange/70"
                  style={{
                    left: `${billToPercent(draftParams.billThreshold5To10Kw, draftParams.minBill, draftParams.maxBill)}%`,
                  }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                บิล ฿{clampedPreviewBill.toLocaleString("th-TH")} → แนะนำ{" "}
                <span className="font-semibold text-foreground">{previewKw} kW</span>
              </p>
            </div>
          )}
        </section>

        <fieldset className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
          <legend className="px-1 text-sm font-semibold">
            ตัวอย่างผลคำนวณ (บิล ฿{clampedPreviewBill.toLocaleString("th-TH")})
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
          <Button
            type="submit"
            id="calc-config-submit"
            disabled={pending || resetPending || !boundsValid}
          >
            {pending ? "กำลังบันทึก…" : "บันทึกตัวเลข"}
          </Button>
        </div>
      </form>
    </div>
  );
}
