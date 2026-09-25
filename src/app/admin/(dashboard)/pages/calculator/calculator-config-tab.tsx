"use client";

// Composes the three pieces of the "ตัวเลขการคำนวณ" tab (S6): the trimmed
// multiplier/slider form, the Excel size-table card, and the shared reset
// section — see docs/plans/calculator-excel-import-admin-ui-spec.md §1/§8.
// `CalculatorConfigClient` is keyed on `configData.version` here (not on the
// surrounding shell) so a save/apply/rollback/reset only re-inits *this*
// form's local state — the Tabs in calculator-admin-shell.tsx never remount,
// so the admin stays on this tab afterwards (spec §9.3).
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { resetCalculatorConfigToDefaults } from "@/actions/calculator-config";
import { Button } from "@/components/ui/button";
import {
  CalculatorConfigClient,
  type CalculatorConfigFormData,
} from "./calculator-config-client";
import {
  CalculatorSizeTableCard,
  type CalculatorSizeTableCardData,
} from "./calculator-size-table-card";

export function CalculatorConfigTab({
  configData,
  sizeTableData,
}: {
  configData: CalculatorConfigFormData;
  sizeTableData: CalculatorSizeTableCardData;
}) {
  const router = useRouter();
  const [importBusy, setImportBusy] = useState(false);
  const [configBusy, setConfigBusy] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [resetPending, startResetTransition] = useTransition();

  useEffect(() => {
    if (confirmingReset) document.getElementById("calc-reset-confirm")?.focus();
  }, [confirmingReset]);
  function cancelReset() {
    setConfirmingReset(false);
    requestAnimationFrame(() => document.getElementById("calc-reset")?.focus());
  }

  function onReset() {
    startResetTransition(async () => {
      const result = await resetCalculatorConfigToDefaults();
      if ("ok" in result && result.ok) {
        toast.success("คืนค่าเริ่มต้นแล้ว");
        setConfirmingReset(false);
        router.refresh();
      } else if ("conflict" in result && result.conflict) {
        toast.error("มีคนแก้ก่อนคุณ — รีเฟรชแล้วลองใหม่");
        router.refresh();
      } else {
        toast.error("error" in result ? result.error : "คืนค่าไม่สำเร็จ");
      }
    });
  }

  return (
    <fieldset disabled={resetPending} className="mx-auto min-w-0 max-w-3xl space-y-8" onKeyDown={(event) => {
      if (event.key === "Escape" && confirmingReset && !resetPending) cancelReset();
    }}>
      <fieldset disabled={importBusy} className="min-w-0">
      <CalculatorConfigClient key={configData.version} data={configData} onBusyChange={setConfigBusy} />
      </fieldset>
      <fieldset disabled={configBusy} className="min-w-0">
        <CalculatorSizeTableCard data={sizeTableData} onBusyChange={setImportBusy} />
      </fieldset>

      <div className="space-y-3 border-t border-border/70 pt-6">
        <h3 className="text-sm font-semibold">คืนค่าเริ่มต้น</h3>
        <p className="text-sm text-muted-foreground">
          คืนตัวคูณรายปีเป็น 10, สไลด์บิล 500–8,000 ฿ ทีละ 100 และกลับไปใช้ตารางเริ่มต้น 3 ขนาด (3, 5,
          10 kW) — ไฟล์ในประวัติยังอยู่ เลือก &quot;ใช้ชุดนี้&quot; ได้ภายหลัง
        </p>
        {!confirmingReset ? (
          <Button
            type="button"
            id="calc-reset"
            variant="outline"
            disabled={configBusy || importBusy || resetPending}
            onClick={() => setConfirmingReset(true)}
          >
            <RotateCcw className="size-4" />
            คืนค่าเริ่มต้น
          </Button>
        ) : (
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
            <span>ยืนยันคืนค่าเริ่มต้นทั้งหมด? หน้าเครื่องคำนวณจะกลับไปใช้ตารางเริ่มต้น 3 ขนาดทันที</span>
            <Button
              type="button"
              variant="outline"
              className="h-8"
              disabled={configBusy || importBusy || resetPending}
              onClick={cancelReset}
            >
              ยกเลิก
            </Button>
            <Button
              type="button"
              id="calc-reset-confirm"
              variant="destructive"
              className="h-8"
              disabled={configBusy || importBusy || resetPending}
              onClick={onReset}
            >
              {resetPending ? "กำลังคืนค่า…" : "ยืนยันคืนค่า"}
            </Button>
          </div>
        )}
      </div>
    </fieldset>
  );
}
