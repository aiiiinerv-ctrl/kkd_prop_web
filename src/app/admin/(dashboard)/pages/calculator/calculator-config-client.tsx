"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { updateCalculatorConfig } from "@/actions/calculator-config";
import { CALCULATOR_DEFAULTS, recommendFromTable } from "@/lib/calculator";
import type { SizeRow } from "@/lib/calculator-size-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PREVIEW_BILL = "3500";

export type CalculatorConfigFormData = {
  version: number;
  annualSavingMonthsMultiplier: number;
  minBill: number;
  maxBill: number;
  stepBill: number;
  /** The size table currently live on the public calculator (imported or
   * the legacy default) — used only to compute the "ตัวอย่างผลคำนวณ" preview,
   * see docs/plans/calculator-excel-import-admin-ui-spec.md §1.2. */
  activeTable: SizeRow[];
};

function numField(value: string, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function phaseText(phases: number[]): string {
  const has1 = phases.includes(1);
  const has3 = phases.includes(3);
  if (has1 && has3) return "1 หรือ 3 เฟส";
  if (has3) return "3 เฟส";
  return "1 เฟส";
}

export function CalculatorConfigClient({ data, onBusyChange }: { data: CalculatorConfigFormData; onBusyChange: (busy: boolean) => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    onBusyChange(pending);
    return () => onBusyChange(false);
  }, [pending, onBusyChange]);
  const [annualSavingMonthsMultiplier, setAnnualSavingMonthsMultiplier] = useState(
    String(data.annualSavingMonthsMultiplier)
  );
  const [minBill, setMinBill] = useState(String(data.minBill));
  const [maxBill, setMaxBill] = useState(String(data.maxBill));
  const [stepBill, setStepBill] = useState(String(data.stepBill));
  const [previewBill, setPreviewBill] = useState(PREVIEW_BILL);

  const multiplierNum = numField(annualSavingMonthsMultiplier, data.annualSavingMonthsMultiplier);
  const minBillNum = numField(minBill, data.minBill);
  const maxBillNum = numField(maxBill, data.maxBill);
  const stepBillNum = numField(stepBill, data.stepBill);

  const boundsValid = minBillNum < maxBillNum && stepBillNum > 0;

  const previewBillNum = numField(previewBill, minBillNum);
  const clampedPreviewBill = boundsValid
    ? Math.min(maxBillNum, Math.max(minBillNum, previewBillNum))
    : previewBillNum;

  const recommendation = useMemo(
    () => recommendFromTable(clampedPreviewBill, data.activeTable, [], multiplierNum),
    [clampedPreviewBill, data.activeTable, multiplierNum]
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

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">ตัวเลขการคำนวณ</h2>
          <p className="text-sm text-muted-foreground">
            ตั้งค่าตัวคูณรายปี ช่วงสไลด์บิล และตารางขนาดระบบจาก Excel — หน้าจริงอัปเดตทันทีหลังบันทึกหรือยืนยัน
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

        <section className="space-y-4">
          <h3 className="text-sm font-semibold">ตัวคูณและช่วงสไลด์บิล</h3>
          <div className="grid gap-4 sm:grid-cols-2">
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
                ใช้คูณเงินประหยัดต่อเดือนเป็นต่อปี · ค่าเริ่มต้น{" "}
                {CALCULATOR_DEFAULTS.annualSavingMonthsMultiplier}
              </p>
            </div>
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
              <p className="text-xs text-muted-foreground">
                ค่าเริ่มต้น {CALCULATOR_DEFAULTS.minBill.toLocaleString("th-TH")}
              </p>
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
              <p className="text-xs text-muted-foreground">
                ค่าเริ่มต้น {CALCULATOR_DEFAULTS.maxBill.toLocaleString("th-TH")} · ลูกค้ายังพิมพ์บิลเกินนี้ได้
              </p>
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
              <p className="text-xs text-muted-foreground">
                ค่าเริ่มต้น {CALCULATOR_DEFAULTS.stepBill}
              </p>
            </div>
          </div>

          {!boundsValid && (
            <p className="text-sm text-destructive">
              {minBillNum >= maxBillNum
                ? "บิลขั้นต่ำต้องน้อยกว่าบิลสูงสุด"
                : "ขั้นสไลด์ต้องมากกว่า 0"}
            </p>
          )}

          {boundsValid && (
            <fieldset className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
              <legend className="px-1 text-sm font-semibold">
                ตัวอย่างผลคำนวณ (ตามตารางที่ใช้อยู่)
              </legend>
              <div className="relative pt-2">
                <input
                  id="calc-preview-slider"
                  type="range"
                  min={minBillNum}
                  max={maxBillNum}
                  step={stepBillNum}
                  value={clampedPreviewBill}
                  onChange={(e) => setPreviewBill(e.target.value)}
                  className="w-full accent-brand-orange"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                บิล ฿{clampedPreviewBill.toLocaleString("th-TH")}
              </p>

              {recommendation.kind === "empty" && (
                <p className="text-sm text-muted-foreground">ยังไม่มีตาราง</p>
              )}
              {recommendation.kind === "tooLarge" && (
                <p className="text-sm font-semibold">
                  เกินตาราง (ใหญ่สุด {recommendation.lastRow.kw.toLocaleString("th-TH")} kW)
                </p>
              )}
              {recommendation.kind === "ok" && (
                <>
                  <dl className="grid gap-2 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-muted-foreground">ระบบที่แนะนำ</dt>
                      <dd className="font-semibold">
                        {recommendation.row.kw.toLocaleString("th-TH")} kW ·{" "}
                        {phaseText(recommendation.row.phases)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">ประหยัด/เดือน</dt>
                      <dd className="font-semibold">
                        ฿{recommendation.monthlySaving.toLocaleString("th-TH")}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">บิลหลังติดตั้ง</dt>
                      <dd className="font-semibold">
                        {recommendation.coversFullBill
                          ? "ครอบคลุมเต็ม 100%"
                          : `฿${recommendation.afterBill.toLocaleString("th-TH")}`}
                      </dd>
                    </div>
                  </dl>
                  {recommendation.belowFirstRow && (
                    <p className="text-xs text-muted-foreground">
                      บิลต่ำกว่าช่วงของขนาดเล็กสุดในตาราง — หน้าเว็บจะแสดงหมายเหตุ
                    </p>
                  )}
                </>
              )}
            </fieldset>
          )}
        </section>

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="submit" id="calc-config-submit" disabled={pending || !boundsValid}>
            {pending ? "กำลังบันทึก…" : "บันทึกตัวเลข"}
          </Button>
        </div>
      </form>
    </div>
  );
}
