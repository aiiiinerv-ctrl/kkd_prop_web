"use client";

// Root of the "ตารางขนาดระบบ" tab (R1-S5, design-162 §2.3 / §10): heading, the
// "in use" summary with export + import buttons, the collapsible Excel import
// panel, the read-only On-grid list and the version history. R1 has no Hybrid
// sub-tab and no editor yet (R1-S6).
//
// Width: PageShell is `max-w-3xl` and must stay that way for the other tabs
// (it is not touched), so this tab breaks out of it with an explicit width —
// at most `max-w-5xl` (64rem), capped to the space the admin layout leaves
// (viewport − sidebar `w-60` − `main` padding `p-6` on md+, − padding below).
import { useCallback, useState } from "react";
import { Download, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import type { SizeRow } from "@/lib/calculator-size-table";
import { CalculatorImportPanel } from "./calculator-import-panel";
import { OnGridList } from "./calculator-table-list";
import { formatDateTime } from "./calculator-table-format";
import {
  CalculatorVersionHistory,
  SourceBadge,
  type SizeTableHistoryItem,
} from "./calculator-version-history";

export type CalculatorTablesTabData = {
  configVersion: number;
  configUpdatedAt: string;
  active: {
    source: "default" | "EXCEL" | "MANUAL";
    versionId: string | null;
    fileName: string | null;
    savedByName: string | null;
    hasSourceFile: boolean;
  };
  onGrid: SizeRow[];
  history: SizeTableHistoryItem[];
};

export function CalculatorTablesTab({ data }: { data: CalculatorTablesTabData }) {
  const [importOpen, setImportOpen] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [historyBusy, setHistoryBusy] = useState(false);
  const busy = importBusy || historyBusy;
  const onImportBusy = useCallback((v: boolean) => setImportBusy(v), []);
  const onHistoryBusy = useCallback((v: boolean) => setHistoryBusy(v), []);

  const { active, onGrid } = data;
  const kws = onGrid.map((r) => r.kw);
  const minKw = kws.length ? Math.min(...kws) : null;
  const maxKw = kws.length ? Math.max(...kws) : null;

  return (
    <div className="min-w-0 space-y-6 w-[min(64rem,calc(100vw-4rem))] md:w-[min(64rem,calc(100vw-19rem))]">
      <fieldset disabled={busy} className="min-w-0">
        <section
          aria-labelledby="calc-tables-heading"
          aria-busy={busy}
          className="space-y-5 rounded-xl border border-border/70 bg-card p-4 sm:p-6"
        >
          <div>
            <h2
              id="calc-tables-heading"
              tabIndex={-1}
              className="mb-1 font-semibold outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              ตารางขนาดระบบ
            </h2>
            <p className="text-sm text-muted-foreground">
              ใช้แนะนำขนาดระบบในหน้าเครื่องคำนวณ — ดาวน์โหลดเป็น Excel เพื่อแก้ หรืออัปโหลดไฟล์ Excel
              ของฝ่ายขาย ตรวจผลก่อนแล้วกดยืนยันเพื่อใช้บนหน้าเว็บ
            </p>
          </div>

          <div
            id="calc-size-table-summary"
            className="rounded-lg border border-border/70 bg-muted/30 p-4 text-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1 basis-80">
                {active.source === "default" ? (
                  <>
                    <p className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">ค่าเริ่มต้น</Badge>
                      <span>ตารางเริ่มต้น 3 ขนาด (3, 5, 10 kW)</span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {data.history.length
                        ? "กำลังใช้ตารางเริ่มต้น — เลือกเวอร์ชันเดิมจากประวัติได้"
                        : "ยังไม่มีเวอร์ชันในระบบ — แก้ตารางในหน้านี้ หรือใช้ไฟล์ Excel ของฝ่ายขาย"}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="flex min-w-0 flex-wrap items-center gap-2">
                      <Badge>ใช้อยู่</Badge>
                      <SourceBadge source={active.source} fileName={active.fileName} />
                      <span>
                        On-grid {onGrid.length} ขนาด ({minKw?.toLocaleString("th-TH")} –{" "}
                        {maxKw?.toLocaleString("th-TH")} kW)
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {active.source === "MANUAL"
                        ? `บันทึกเมื่อ ${formatDateTime(data.configUpdatedAt)} · โดย ${active.savedByName}`
                        : `ยืนยันใช้เมื่อ ${formatDateTime(data.configUpdatedAt)} · อัปโหลดโดย ${active.savedByName}`}
                    </p>
                    {active.hasSourceFile && active.versionId && (
                      <a
                        href={`/files/private/calculator-imports/${active.versionId}.xlsx`}
                        className="mt-1 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                      >
                        <Download className="size-3.5" />
                        ดาวน์โหลดต้นฉบับ
                      </a>
                    )}
                    <p className="mt-2 text-xs text-muted-foreground">
                      ต้องการกลับไปตารางเริ่มต้น? ใช้ &quot;คืนค่าเริ่มต้น&quot; ในแท็บ &quot;ตัวเลขการคำนวณ&quot;
                    </p>
                  </>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  id="calc-export"
                  href="/api/admin/calculator/export"
                  className={buttonVariants({ variant: "outline" })}
                >
                  <Download className="size-4" />
                  ดาวน์โหลดเป็น Excel
                </a>
                <Button
                  type="button"
                  id="calc-import-toggle"
                  variant="outline"
                  aria-expanded={importOpen}
                  aria-controls="calc-import-panel"
                  onClick={() => setImportOpen((v) => !v)}
                >
                  <Upload className="size-4" />
                  {importOpen ? "ปิดการนำเข้า" : "นำเข้าไฟล์ Excel"}
                </Button>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              ไฟล์ที่ดาวน์โหลดมีชีต On-grid ตามแบบไฟล์เดิม แก้แล้วนำเข้ากลับได้
            </p>
          </div>

          {importOpen && (
            <CalculatorImportPanel
              data={{ activeImportId: active.versionId, configVersion: data.configVersion }}
              onBusyChange={onImportBusy}
            />
          )}

          <OnGridList rows={onGrid} />
        </section>
      </fieldset>

      <fieldset disabled={busy} className="min-w-0">
        <section
          aria-label="ประวัติตาราง"
          className="rounded-xl border border-border/70 bg-card p-4 sm:p-6"
        >
          <CalculatorVersionHistory
            history={data.history}
            activeImportId={active.versionId}
            configVersion={data.configVersion}
            onBusyChange={onHistoryBusy}
          />
        </section>
      </fieldset>
    </div>
  );
}
