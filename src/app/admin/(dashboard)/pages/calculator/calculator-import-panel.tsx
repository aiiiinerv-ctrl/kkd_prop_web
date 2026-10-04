"use client";

// Excel import panel (upload -> reject/preview -> apply) of the "ตารางขนาดระบบ"
// tab — R1-S5; was the whole card in S6. R2-S7: one workbook, two sheets
// (On-grid required, Hybrid optional) — the preview shows both tables one after
// the other (no sub-tabs: a hidden sheet would get overlooked), warns loudly
// when the file would remove the live Hybrid table, and a reject groups the
// issues per sheet. Layout/copy/states follow
// docs/plans/calculator-excel-import-admin-ui-spec.md §2-§7 and
// backlogs/done/ISSUE_153_calculator_hybrid_toggle_map/design-162 §8. Summary
// box + version history now live in calculator-tables-tab.tsx /
// calculator-version-history.tsx. Local UI state (upload/preview/apply) is
// never mirrored into a `key`-remounted form — after a successful apply we
// clear it explicitly and call `router.refresh()`, so the surrounding Tabs
// never remounts (spec §9.3).
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  applyCalculatorImport,
  previewCalculatorImport,
  type ChangedRow,
  type DiffFieldChange,
  type PreviewResult,
} from "@/actions/calculator-import";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  buildHybridDiffGroups,
  HybridDiffItem,
  HybridPriceTableReadonly,
  hybridOutcomeText,
  hybridPaybackText,
  hybridSampleChanged,
} from "./calculator-hybrid-diff-view";
import {
  FIELD_LABELS,
  formatDateTime,
  formatFieldValue,
  formatKwList,
  outcomeText,
  phaseText,
  sampleChanged,
} from "./calculator-table-format";

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;
const MAX_LIST_ITEMS = 10;

export type CalculatorImportPanelData = {
  activeImportId: string | null;
  configVersion: number;
};

type Screen =
  | { kind: "idle" }
  | {
      kind: "reject";
      fileName: string;
      heading: string;
      messages: string[];
      /** Messages split per sheet (D4: any issue on either sheet rejects the whole file). */
      groups?: { onGrid: string[]; hybrid: string[] };
    }
  | { kind: "preview"; result: Extract<PreviewResult, { ok: true }> };

/** All warnings shown in the preview warning box: `diff.warnings` (Package /
 * slider — customer-facing, shown first per spec §4.2.2) followed by the
 * parser's file/cell-level warnings (`result.warnings`, e.g. hidden rows,
 * roof area filled in). Two different sources on the `PreviewResult` because
 * `diffSizeTables` (S2) needs the *current* table + packages to compute its
 * warnings, while the parser's warnings are about the file alone. */
function allWarnings(result: Extract<PreviewResult, { ok: true }>): string[] {
  return [...result.diff.warnings.map((w) => w.message), ...result.warnings];
}

const hybridSizes = (rows: { kw: number }[] | null) => (rows ? new Set(rows.map((r) => r.kw)).size : 0);

export function CalculatorImportPanel({
  data,
  onBusyChange,
  onApplied,
}: {
  data: CalculatorImportPanelData;
  onBusyChange: (busy: boolean) => void;
  /** Called after an import was applied successfully (the host closes the panel). */
  onApplied?: () => void;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewHeadingRef = useRef<HTMLHeadingElement>(null);
  const rejectHeadingRef = useRef<HTMLHeadingElement>(null);

  const [screen, setScreen] = useState<Screen>({ kind: "idle" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploading, startUploadTransition] = useTransition();
  const [applying, startApplyTransition] = useTransition();
  const [confirmingApply, setConfirmingApply] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [showAllRejects, setShowAllRejects] = useState(false);
  const [showAllTable, setShowAllTable] = useState(false);
  const [showColumns, setShowColumns] = useState(false);

  const busy = uploading || applying;
  useEffect(() => {
    onBusyChange(busy);
    // The host may close the panel right after an apply: never leave it "busy".
    return () => onBusyChange(false);
  }, [busy, onBusyChange]);

  useEffect(() => {
    if (screen.kind === "preview") previewHeadingRef.current?.focus();
    if (screen.kind === "reject") rejectHeadingRef.current?.focus();
  }, [screen.kind]);

  function resetUploadUi() {
    setSelectedFile(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setFileError(null);
    setScreen({ kind: "idle" });
    setConfirmingApply(false);
    setConflict(false);
    if (!file) {
      setSelectedFile(null);
      return;
    }
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setFileError("รองรับเฉพาะไฟล์ .xlsx");
      e.target.value = "";
      setSelectedFile(null);
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFileError("ไฟล์ใหญ่เกิน 2 MB");
      e.target.value = "";
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  }

  function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedFile) return;
    const formData = new FormData();
    formData.set("file", selectedFile);
    const fileName = selectedFile.name;
    startUploadTransition(async () => {
      try {
        const result = await previewCalculatorImport(formData);
        if (result.ok) {
          setConflict(false);
          setConfirmingApply(false);
          setScreen({ kind: "preview", result });
          setShowAllTable(false);
        } else {
          setScreen({
            kind: "reject",
            fileName,
            heading: result.error,
            messages: result.messages,
            groups: result.groups,
          });
          setShowAllRejects(false);
        }
      } catch {
        toast.error("อัปโหลดไม่สำเร็จ — ลองใหม่อีกครั้ง");
      }
    });
  }

  function handleCancelPreview() {
    setScreen({ kind: "idle" });
    setConfirmingApply(false);
    setConflict(false);
    resetUploadUi();
    fileInputRef.current?.focus();
  }

  function handleApply() {
    if (screen.kind !== "preview") return;
    const { importId, configVersion } = screen.result;
    startApplyTransition(async () => {
      const result = await applyCalculatorImport({ importId, version: configVersion });
      if ("ok" in result && result.ok) {
        toast.success("ใช้ตารางใหม่แล้ว — หน้าเครื่องคำนวณอัปเดตแล้ว");
        setScreen({ kind: "idle" });
        setConfirmingApply(false);
        setConflict(false);
        resetUploadUi();
        router.refresh();
        onApplied?.();
      } else if ("conflict" in result && result.conflict) {
        toast.error("มีคนแก้ก่อนคุณ — รีเฟรชแล้วลองใหม่");
        setConflict(true);
      } else {
        toast.error("error" in result ? result.error : "ใช้ตารางไม่สำเร็จ");
      }
    });
  }

  return (
    <fieldset disabled={busy} className="min-w-0">
    <section
      id="calc-import-panel"
      aria-label="นำเข้าไฟล์ Excel"
      aria-busy={busy}
      className="space-y-4 rounded-lg border border-border p-4"
    >
      <p role="status" aria-live="polite" className="sr-only">
        {uploading
          ? "กำลังอ่านและตรวจไฟล์…"
          : screen.kind === "preview"
            ? `ตรวจไฟล์เสร็จ: On-grid ${screen.result.rows.length} ขนาด ${
                screen.result.hasHybridSheet ? `Hybrid ${hybridSizes(screen.result.hybridRows)} ขนาด` : "ไม่มีชีต Hybrid"
              } คำเตือน ${allWarnings(screen.result).length} ข้อ`
            : screen.kind === "reject"
              ? `${screen.heading}`
              : ""}
      </p>

      {/* (c) explanation box */}
      <div className="rounded-md border border-border/70 bg-muted/50 px-4 py-3 text-sm space-y-2">
        <p className="font-semibold">ระบบอ่านอะไรจากไฟล์</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>อ่าน sheet On-grid (ต้องมี) และ Hybrid (ถ้ามี) — sheet อื่นข้าม</li>
          <li>นำเข้าแล้วจะแทนที่ตารางทั้ง 2 ชุด รวมถึงค่าที่แก้ในหลังบ้าน</li>
          <li>ถ้าไม่มี sheet Hybrid ตาราง Hybrid จะถูกลบ และตัวเลือก Hybrid บนหน้าเว็บจะถูกซ่อน</li>
          <li>ชีต On-grid: อ่านตารางแรกใต้หัวตาราง &quot;ผลิตพลังงานต่อวัน&quot; ลงไปจนถึงแถวแรกที่ช่องขนาดว่าง</li>
          <li>
            ชีต Hybrid: อ่านตารางแรกถึงแถวว่างแรก (บล็อกราคาแบตด้านล่างไม่ได้อ่าน) ราคาแต่ละยี่ห้ออ่านจากกลุ่มคอลัมน์
            &quot;ยี่ห้อ&quot;
          </li>
          <li>
            ชีต On-grid ไม่อ่านราคา ยี่ห้อ เงินประหยัด และระยะคืนทุนในไฟล์ — ระยะคืนทุนของ On-grid
            บนหน้าเว็บคำนวณจากราคา Package
          </li>
          <li>
            ไม่ต้องใช้แบบฟอร์มพิเศษ แก้ไฟล์ Excel ของฝ่ายขายแล้วอัปโหลดได้เลย — ห้ามแก้หัวตาราง 2 แถวบน
            (ระบบหาคอลัมน์จากชื่อหัวตาราง)
          </li>
          <li>
            บันทึกไฟล์จาก Microsoft Excel เป็น .xlsx (ไม่ใส่รหัสผ่าน ไม่มี macro) — ไฟล์จาก Google
            Sheets อาจไม่มีค่าที่คำนวณจากสูตร
          </li>
        </ul>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-expanded={showColumns}
          aria-controls="calc-import-columns"
          onClick={() => setShowColumns((v) => !v)}
        >
          {showColumns ? "ซ่อนคอลัมน์" : "ดูคอลัมน์ที่ระบบอ่าน"}
        </Button>
        {showColumns && (
          <div id="calc-import-columns" className="space-y-2 text-xs">
          <p className="font-semibold">ชีต On-grid (9)</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>ขนาดกำลังผลิต + หน่วย (kW / MW) — ขนาดระบบ (MW แปลงเป็น kW)</li>
            <li>Phase — 1 เฟส / 3 เฟส (ขนาดเดียวกันที่ค่าตรงกันรวมเป็นแถวเดียว)</li>
            <li>ผลิตพลังงานต่อวัน › จำนวนชั่วโมง… — ชั่วโมงแดดต่อวัน</li>
            <li>ผลิตพลังงานต่อเดือน › จำนวนวัน — จำนวนวันต่อเดือน</li>
            <li>แผงโซล่าเซลล์ › จำนวนติดตั้ง — จำนวนแผง</li>
            <li>
              แผงโซล่าเซลล์ › พื้นที่หลังคา… — พื้นที่หลังคา (ถ้าว่าง ใช้ จำนวนแผง × 2.7 ตร.ม.)
            </li>
            <li>ค่าไฟ › ประมาณ (ต่ำสุด–สูงสุด) — ช่วงค่าไฟที่เหมาะกับขนาดนี้ (ค่าไฟสูงสุดต้องเพิ่มขึ้นตามขนาด)</li>
            <li>ค่าไฟ › ค่าไฟ/หน่วย — ราคาค่าไฟต่อหน่วย (รายแถว)</li>
            <li>ประเภท — ไม่บังคับ ไม่นำไปแสดง</li>
            <li className="pt-1 text-muted-foreground">
              กติกาแนะนำ: เลือกขนาดเล็กที่สุดที่ค่าไฟสูงสุดมากกว่าบิลของลูกค้า
            </li>
          </ul>
          <p className="font-semibold">ชีต Hybrid (11)</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>ขนาดกำลังผลิต › ขนาด + หน่วย (kW / MW)</li>
            <li>ขนาดกำลังผลิต › Phase — 1 เฟส / 3 เฟส</li>
            <li>ขนาดกำลังผลิต › ขนาดแบตเตอรี่ (kWh) — 0 = ชุดไม่มีแบต ต้องมีทุกขนาดและเฟส</li>
            <li>ผลิตพลังงานต่อวัน › จำนวนชั่วโมง… — ชั่วโมงแดดต่อวัน</li>
            <li>ผลิตพลังงานต่อเดือน › จำนวนวัน — จำนวนวันต่อเดือน</li>
            <li>แผงโซล่าเซลล์ › จำนวนติดตั้ง — จำนวนแผง</li>
            <li>แผงโซล่าเซลล์ › พื้นที่หลังคา… — พื้นที่หลังคา (ถ้าว่าง ใช้ จำนวนแผง × 2.7 ตร.ม.)</li>
            <li>ค่าไฟ › ประมาณ (ต่ำสุด–สูงสุด) — ช่วงค่าไฟที่เหมาะกับขนาดนี้</li>
            <li>ค่าไฟ › ค่าไฟ/หน่วย — ราคาค่าไฟต่อหน่วย</li>
            <li>ยี่ห้อ › ชื่อยี่ห้อ — ราคาอุปกรณ์ของแต่ละยี่ห้อ (ว่างหรือ 0 = ไม่มีราคา)</li>
          </ul>
          </div>
        )}
      </div>

      {/* (d) upload */}
      <form onSubmit={handleUpload} noValidate className="space-y-1.5">
        <Label htmlFor="calc-import-file">ไฟล์ Excel (.xlsx)</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            ref={fileInputRef}
            id="calc-import-file"
            name="file"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            aria-describedby="calc-import-file-hint calc-import-file-error"
            className="sm:flex-1"
            disabled={busy}
            onChange={handleFileChange}
          />
          <Button
            id="calc-import-upload"
            type="submit"
            disabled={!selectedFile || busy}
          >
            <Upload className="size-4" />
            {uploading ? "กำลังตรวจไฟล์…" : "อัปโหลดและตรวจไฟล์"}
          </Button>
        </div>
        <p id="calc-import-file-hint" className="text-xs text-muted-foreground">
          .xlsx ไม่เกิน 2 MB · อัปโหลดแล้วยังไม่มีผลกับหน้าเว็บจนกว่าจะกดยืนยัน
        </p>
        {fileError && (
          <p id="calc-import-file-error" className="text-xs text-destructive">
            {fileError}
          </p>
        )}
      </form>

      {uploading && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          กำลังอ่านและตรวจไฟล์…
        </p>
      )}

      {/* (e) reject */}
      {screen.kind === "reject" && (
        <div
          id="calc-import-reject"
          role="group"
          aria-labelledby="calc-import-reject-heading"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3"
        >
          <h3
            id="calc-import-reject-heading"
            ref={rejectHeadingRef}
            tabIndex={-1}
            className="font-semibold text-destructive outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {screen.heading}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {screen.fileName} · ไม่มีอะไรถูกบันทึก
            {screen.groups && screen.groups.hybrid.length > 0 && screen.groups.onGrid.length === 0
              ? " · ทั้งไฟล์ไม่ผ่าน แม้ชีต On-grid จะถูกต้อง"
              : ""}
          </p>
          <RejectList
            messages={screen.messages}
            groups={screen.groups}
            showAll={showAllRejects}
            onToggleAll={() => setShowAllRejects((v) => !v)}
          />
          <p className="mt-2 text-xs text-muted-foreground">แก้ไฟล์ใน Excel แล้วอัปโหลดใหม่</p>
        </div>
      )}

      {/* (e) preview */}
      {screen.kind === "preview" && (
        <PreviewPanel
          result={screen.result}
          activeImportId={data.activeImportId}
          previewHeadingRef={previewHeadingRef}
          showAllTable={showAllTable}
          setShowAllTable={setShowAllTable}
          confirmingApply={confirmingApply}
          setConfirmingApply={setConfirmingApply}
          conflict={conflict}
          applying={applying}
          onApply={handleApply}
          onCancel={handleCancelPreview}
          onReloadLatest={() => {
            handleCancelPreview();
            router.refresh();
          }}
        />
      )}
    </section>
    </fieldset>
  );
}

/** Issue list of a rejected file. Issues on the Hybrid sheet get their own group (design-162 §8.4);
 * a file that fails on On-grid only keeps the flat list. */
function RejectList({
  messages,
  groups,
  showAll,
  onToggleAll,
}: {
  messages: string[];
  groups?: { onGrid: string[]; hybrid: string[] };
  showAll: boolean;
  onToggleAll: () => void;
}) {
  if (messages.length === 0) return null;
  const grouped = groups && groups.hybrid.length > 0;
  const sections: { title: string | null; items: string[] }[] = grouped
    ? [
        ...(groups.onGrid.length > 0 ? [{ title: `ชีต On-grid (${groups.onGrid.length} ข้อ)`, items: groups.onGrid }] : []),
        { title: `ชีต Hybrid (${groups.hybrid.length} ข้อ)`, items: groups.hybrid },
      ]
    : [{ title: null, items: messages }];
  const total = sections.reduce((n, sec) => n + sec.items.length, 0);

  return (
    <>
      {sections.map((section, si) => (
        <div key={si} className="mt-2" data-reject-group={section.title ?? "all"}>
          {section.title && <p className="text-sm font-semibold">{section.title}</p>}
          <ol className="mt-1 list-disc space-y-1 pl-5 text-sm text-foreground">
            {(showAll ? section.items : section.items.slice(0, MAX_LIST_ITEMS)).map((msg, i) => {
              const [main, action] = msg.split("\n→ ");
              return (
                <li key={i}>
                  <div>{main}</div>
                  {action && <div className="text-muted-foreground">→ {action}</div>}
                </li>
              );
            })}
          </ol>
        </div>
      ))}
      {sections.some((sec) => sec.items.length > MAX_LIST_ITEMS) && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          {!showAll && (
            <span>
              และอีก {sections.reduce((n, sec) => n + Math.max(0, sec.items.length - MAX_LIST_ITEMS), 0)} ข้อ
            </span>
          )}
          <Button type="button" variant="ghost" size="sm" aria-expanded={showAll} onClick={onToggleAll}>
            {showAll ? "แสดงน้อยลง" : "แสดงทั้งหมด"}
          </Button>
        </div>
      )}
      <span className="sr-only">{total} ข้อ</span>
    </>
  );
}

function PreviewPanel({
  result,
  activeImportId,
  previewHeadingRef,
  showAllTable,
  setShowAllTable,
  confirmingApply,
  setConfirmingApply,
  conflict,
  applying,
  onApply,
  onCancel,
  onReloadLatest,
}: {
  result: Extract<PreviewResult, { ok: true }>;
  activeImportId: string | null;
  previewHeadingRef: React.RefObject<HTMLHeadingElement | null>;
  showAllTable: boolean;
  setShowAllTable: (v: (prev: boolean) => boolean) => void;
  confirmingApply: boolean;
  setConfirmingApply: (v: boolean) => void;
  conflict: boolean;
  applying: boolean;
  onApply: () => void;
  onCancel: () => void;
  onReloadLatest: () => void;
}) {
  const [showAllWarnings, setShowAllWarnings] = useState(false);
  const [showHybridTable, setShowHybridTable] = useState(false);
  useEffect(() => {
    if (confirmingApply) document.getElementById("calc-import-apply-confirm")?.focus();
  }, [confirmingApply]);
  function cancelApplyConfirm() {
    setConfirmingApply(false);
    requestAnimationFrame(() => document.getElementById("calc-import-apply")?.focus());
  }
  const kwValues = result.rows.map((r) => r.kw);
  const minKw = kwValues.length ? Math.min(...kwValues) : null;
  const maxKw = kwValues.length ? Math.max(...kwValues) : null;
  const isActiveSet = result.duplicate && result.importId === activeImportId;

  const changedSamples = result.diff.sampleBills.filter(sampleChanged).length;
  const totalSamples = result.diff.sampleBills.length;
  const warnings = allWarnings(result);

  // Hybrid (R2-S7).
  const hybridRows = result.hybridRows;
  const hybridSizeCount = hybridSizes(hybridRows);
  const active = result.activeHybridCounts;
  const removesHybrid = !result.hasHybridSheet && active.sizes > 0 && !isActiveSet;
  const hybridDiff = result.hybridDiff;
  const hybridGroups = result.hasHybridSheet ? buildHybridDiffGroups(hybridDiff) : [];
  const changedHybridSamples = hybridDiff.sampleBills.filter(hybridSampleChanged).length;
  const totalHybridSamples = hybridDiff.sampleBills.length;

  const missingPackageKws = Array.from(
    new Set(
      result.diff.sampleBills
        .filter((s) => !s.after.hasPackage && s.after.kw !== null)
        .map((s) => s.after.kw as number)
    )
  );

  return (
    <section
      id="calc-import-preview"
      onKeyDown={(event) => {
        if (event.key === "Escape" && confirmingApply && !applying) {
          event.stopPropagation();
          cancelApplyConfirm();
        }
      }}
      aria-labelledby="calc-import-preview-heading"
      className="space-y-4 rounded-lg border border-border p-4"
    >
      <div>
        <h3
          id="calc-import-preview-heading"
          ref={previewHeadingRef}
          tabIndex={-1}
          className="font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          ตรวจก่อนใช้: {result.fileName}
        </h3>
        <p id="calc-import-meta" className="text-xs text-muted-foreground">
          On-grid {result.rows.length} ขนาด ({minKw?.toLocaleString("th-TH")} – {maxKw?.toLocaleString("th-TH")} kW)
          {" · "}
          {result.hasHybridSheet
            ? `Hybrid ${hybridSizeCount} ขนาด (${hybridRows?.length ?? 0} แถว)`
            : "ไม่มีชีต Hybrid"}
          {warnings.length > 0 && ` · คำเตือน ${warnings.length} ข้อ`}
          {result.rowsRead > 0 && ` · อ่านถึงแถว ${result.rowsRead}`}
          {result.skippedSheets.length > 0 && ` · ข้าม sheet: ${result.skippedSheets.join(", ")}`}
        </p>
      </div>

      {result.duplicate && (
        <div className="rounded-md border border-border/70 bg-muted/50 px-4 py-3 text-sm">
          {isActiveSet
            ? "ไฟล์นี้เคย upload แล้ว และเป็นชุดที่ใช้อยู่ตอนนี้ — ไม่ต้องยืนยันซ้ำ"
            : `ไฟล์นี้เคย upload แล้ว เมื่อ ${formatDateTime(result.duplicate.createdAt.toString())} โดย ${result.duplicate.uploadedByName} — แสดงผลจากชุดเดิม ไม่ได้บันทึกซ้ำ`}
        </div>
      )}

      {result.activeSource === "MANUAL" && !isActiveSet && (
        <div
          id="calc-import-overwrite"
          role="group"
          aria-labelledby="calc-import-overwrite-heading"
          className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800"
        >
          <p id="calc-import-overwrite-heading" className="flex items-center gap-1.5 font-semibold">
            <AlertTriangle className="size-4" />
            ไฟล์นี้จะแทนที่ตารางทั้ง 2 ชุด
          </p>
          <p className="mt-1">
            ชุดที่ใช้อยู่แก้ในหลังบ้านเมื่อ{" "}
            {result.activeSavedAt ? formatDateTime(new Date(result.activeSavedAt).toISOString()) : "—"} โดย{" "}
            {result.activeSavedByName ?? "—"}{" "}
            ค่าที่แก้ไว้จะถูกแทนด้วยค่าในไฟล์ ถ้าต้องการเก็บไว้ ให้กด
            &quot;ดาวน์โหลดเป็น Excel&quot; ก่อน (เวอร์ชันเดิมยังอยู่ในประวัติ กด &quot;ใช้ชุดนี้&quot;
            เพื่อย้อนกลับได้)
          </p>
        </div>
      )}

      {removesHybrid && (
        <div
          id="calc-import-hybrid-removed"
          role="group"
          aria-labelledby="calc-import-hybrid-removed-heading"
          className="rounded-md border-2 border-destructive bg-destructive/10 px-4 py-3"
        >
          <p
            id="calc-import-hybrid-removed-heading"
            className="flex items-center gap-1.5 font-bold text-destructive"
          >
            <AlertTriangle className="size-4" />
            ไฟล์นี้ไม่มีชีต Hybrid — ตาราง Hybrid จะถูกลบ
          </p>
          <p className="mt-1 text-sm text-foreground">
            ตาราง Hybrid ที่ใช้อยู่ ({active.sizes} ขนาด · {active.rows} แถว) จะถูกลบเมื่อยืนยัน
            และหน้าเครื่องคำนวณจะซ่อนตัวเลือก Hybrid ถ้าไม่ได้ตั้งใจ ให้ใช้ไฟล์ที่มีชีต Hybrid หรือกด
            &quot;ดาวน์โหลดเป็น Excel&quot; เพื่อให้ได้ไฟล์ที่มีครบ 2 ชีต
          </p>
        </div>
      )}

      {warnings.length > 0 && (
        <div
          role="group"
          aria-labelledby="calc-import-warnings-heading"
          className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800"
        >
          <p id="calc-import-warnings-heading" className="flex items-center gap-1.5 font-semibold">
            <AlertTriangle className="size-4" />
            คำเตือน {warnings.length} ข้อ — ยืนยันได้ แต่โปรดตรวจ
          </p>
          <ul id="calc-import-warning-list" className="mt-1 list-disc space-y-1 pl-5">
            {(showAllWarnings ? warnings : warnings.slice(0, MAX_LIST_ITEMS)).map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
          {warnings.length > MAX_LIST_ITEMS && (
            <Button type="button" variant="ghost" size="sm" aria-expanded={showAllWarnings}
              aria-controls="calc-import-warning-list" onClick={() => setShowAllWarnings((value) => !value)}>
              {showAllWarnings ? "แสดงน้อยลง" : `แสดงทั้งหมด (อีก ${warnings.length - MAX_LIST_ITEMS} ข้อ)`}
            </Button>
          )}
        </div>
      )}

      <section id="calc-import-on-grid" aria-labelledby="calc-import-on-grid-heading" className="space-y-4">
      <h4 id="calc-import-on-grid-heading" className="border-b pb-1 text-sm font-semibold">
        ชีต On-grid{" "}
        <span className="text-xs font-normal text-muted-foreground">
          เพิ่ม {result.diff.added.length} · ลบ {result.diff.removed.length} · เปลี่ยน{" "}
          {result.diff.changed.length} · เหมือนเดิม {result.diff.unchangedCount}
        </span>
      </h4>
      <div>
        <h5 className="text-sm font-semibold">ผลต่อบิลตัวอย่าง</h5>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>บิล/เดือน</TableHead>
                <TableHead>ตอนนี้</TableHead>
                <TableHead>หลังยืนยัน</TableHead>
                <TableHead>คืนทุนบนหน้าเว็บ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.diff.sampleBills.map((sample) => {
                const changed = sampleChanged(sample);
                return (
                  <TableRow key={sample.bill} className={changed ? "bg-amber-50" : undefined}>
                    <TableCell>฿{sample.bill.toLocaleString("th-TH")}</TableCell>
                    <TableCell>{outcomeText(sample.before)}</TableCell>
                    <TableCell className={changed ? "font-semibold" : undefined}>
                      {changed && <span className="sr-only">เปลี่ยน: </span>}
                      {outcomeText(sample.after)}
                    </TableCell>
                    <TableCell>
                      {sample.after.status === "tooLarge" ? "ไม่แสดง (เกินตาราง)" : sample.after.status === "empty" ? "ไม่แสดง" : sample.after.hasPackage ? "แสดง" : "ไม่แสดง (ไม่มี Package)"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        {missingPackageKws.length > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            ขนาดที่ไม่มี Package (ไม่แสดงระยะคืนทุน): {formatKwList(missingPackageKws)} kW
          </p>
        )}
      </div>

      <div>
        <h5 className="text-sm font-semibold">เทียบกับตารางที่ใช้อยู่</h5>
        {result.diff.added.length === 0 &&
        result.diff.removed.length === 0 &&
        result.diff.changed.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">ตารางนี้เหมือนกับที่ใช้อยู่ทุกแถว</p>
        ) : (
          <ul className="mt-2 divide-y rounded-md border">
            {result.diff.changed.map((row: ChangedRow) => (
              <li key={`changed-${row.kw}`} className="px-3 py-2 text-sm">
                <p className="flex items-center gap-2">
                  <Badge variant="outline">เปลี่ยน</Badge>
                  <span>{row.kw.toLocaleString("th-TH")} kW</span>
                </p>
                {row.changedFields.map((change: DiffFieldChange) => (
                  <p key={change.field} className="mt-0.5 pl-1 text-xs">
                    {FIELD_LABELS[change.field]}{" "}
                    <span className="sr-only">เดิม</span>
                    <s className="text-muted-foreground">
                      {formatFieldValue(change.field, change.current)}
                    </s>{" "}
                    →{" "}
                    <span className="sr-only">ใหม่</span>
                    <mark className="rounded bg-amber-50 px-1 font-semibold text-foreground">
                      {formatFieldValue(change.field, change.next)}
                    </mark>
                  </p>
                ))}
              </li>
            ))}
            {result.diff.removed.map((row) => (
              <li key={`removed-${row.kw}`} className="px-3 py-2 text-sm">
                <Badge variant="destructive">ลบ</Badge> {row.kw.toLocaleString("th-TH")} kW —
                ขนาดนี้จะไม่ถูกแนะนำอีก
              </li>
            ))}
            {result.diff.added.length > 0 && (
              <li className="px-3 py-2 text-sm">
                <Badge variant="secondary">เพิ่ม</Badge> {result.diff.added.length} ขนาด:{" "}
                {formatKwList(result.diff.added.map((r) => r.kw))} kW
              </li>
            )}
          </ul>
        )}
      </div>

      <div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-expanded={showAllTable}
          aria-controls="calc-import-all-rows"
          onClick={() => setShowAllTable((v) => !v)}
        >
          {showAllTable ? "ซ่อนตาราง" : `ดูตารางทั้งหมด (${result.rows.length} ขนาด)`}
        </Button>
        {showAllTable && (
          <div id="calc-import-all-rows" className="mt-2 overflow-x-auto rounded-md border text-xs">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-card">ขนาด (kW)</TableHead>
                  <TableHead>เฟส</TableHead>
                  <TableHead className="text-right tabular-nums">ช่วงค่าไฟ (฿)</TableHead>
                  <TableHead className="text-right tabular-nums">แผง</TableHead>
                  <TableHead className="text-right tabular-nums">หลังคา (ตร.ม.)</TableHead>
                  <TableHead className="text-right tabular-nums">ชม.แดด/วัน</TableHead>
                  <TableHead className="text-right tabular-nums">วัน/เดือน</TableHead>
                  <TableHead className="text-right tabular-nums">ค่าไฟ/หน่วย (฿)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.rows.map((row) => (
                  <TableRow key={row.kw}>
                    <TableCell className="sticky left-0 bg-card">{row.kw.toLocaleString("th-TH")}</TableCell>
                    <TableCell>{phaseText(row.phases)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.billMin.toLocaleString("th-TH")}–{row.billMax.toLocaleString("th-TH")}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.panels}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.roofM2.toFixed(1)}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.sunHours}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.days}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.pricePerKwh.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
      </section>

      <section id="calc-import-hybrid" aria-labelledby="calc-import-hybrid-heading" className="space-y-4">
        <h4 id="calc-import-hybrid-heading" className="border-b pb-1 text-sm font-semibold">
          ชีต Hybrid{" "}
          {result.hasHybridSheet && !hybridDiff.currentEmpty && (
            <span className="text-xs font-normal text-muted-foreground">
              เพิ่ม {hybridGroups.filter((g) => g.kind === "added").length} · ลบ{" "}
              {hybridGroups.filter((g) => g.kind === "removed").length} · เปลี่ยน{" "}
              {hybridGroups.filter((g) => g.kind === "changed").length} ขนาด
            </span>
          )}
        </h4>

        {!result.hasHybridSheet ? (
          <p className="text-sm text-muted-foreground">
            ไฟล์นี้ไม่มีชีต Hybrid
            {active.sizes > 0 ? " — ตาราง Hybrid ที่ใช้อยู่จะถูกลบ (ดูกล่องเตือนด้านบน)" : " และตอนนี้ยังไม่มีตาราง Hybrid"}
          </p>
        ) : (
          <>
            {hybridDiff.currentEmpty ? (
              <p id="calc-import-hybrid-new" className="text-sm">
                เพิ่มใหม่ทั้งตาราง {hybridSizeCount} ขนาด — หน้าเครื่องคำนวณจะเริ่มแสดงตัวเลือก Hybrid
              </p>
            ) : (
              <>
                <div>
                  <h5 className="text-sm font-semibold">ผลต่อบิลตัวอย่าง</h5>
                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>บิล/เดือน</TableHead>
                          <TableHead>ตอนนี้</TableHead>
                          <TableHead>หลังยืนยัน</TableHead>
                          <TableHead>คืนทุนบนหน้าเว็บ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {hybridDiff.sampleBills.map((sample) => {
                          const changed = hybridSampleChanged(sample);
                          return (
                            <TableRow key={sample.bill} className={changed ? "bg-amber-50" : undefined}>
                              <TableCell>฿{sample.bill.toLocaleString("th-TH")}</TableCell>
                              <TableCell>{hybridOutcomeText(sample.before)}</TableCell>
                              <TableCell className={changed ? "font-semibold" : undefined}>
                                {changed && <span className="sr-only">เปลี่ยน: </span>}
                                {hybridOutcomeText(sample.after)}
                              </TableCell>
                              <TableCell>{hybridPaybackText(sample)}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div>
                  <h5 className="text-sm font-semibold">เทียบกับตารางที่ใช้อยู่</h5>
                  {hybridGroups.length === 0 ? (
                    <p className="mt-2 text-sm text-muted-foreground">ตาราง Hybrid นี้เหมือนกับที่ใช้อยู่ทุกแถว</p>
                  ) : (
                    <ul id="calc-import-hybrid-diff" className="mt-2 divide-y rounded-md border">
                      {hybridGroups.map((group) => (
                        <HybridDiffItem key={`${group.kind}-${group.kw}`} group={group} />
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}

            {hybridRows && (
              <div>
                <Button
                  type="button"
                  id="calc-import-hybrid-toggle"
                  variant="ghost"
                  size="sm"
                  aria-expanded={showHybridTable}
                  aria-controls="calc-import-hybrid-rows"
                  onClick={() => setShowHybridTable((v) => !v)}
                >
                  {showHybridTable ? "ซ่อนตาราง" : `ดูตารางทั้งหมด (${hybridRows.length} แถว)`}
                </Button>
                {showHybridTable && (
                  <div className="mt-2">
                    <HybridPriceTableReadonly id="calc-import-hybrid-rows" rows={hybridRows} />
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </section>

      {conflict && (
        <div role="alert" id="calc-import-conflict" className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
          มีคนแก้ตัวเลขการคำนวณก่อนคุณ — ผลเทียบด้านบนอาจไม่ตรงกับตารางล่าสุดแล้ว กด &quot;โหลดข้อมูลล่าสุด&quot;
          แล้วอัปโหลดไฟล์เดิมอีกครั้งเพื่อดูผลเทียบใหม่ (ไฟล์นี้เก็บในประวัติแล้ว ไม่ต้องกังวลว่าจะหาย)
          <div className="mt-2">
            <Button type="button" variant="outline" size="sm" onClick={onReloadLatest}>
              โหลดข้อมูลล่าสุด
            </Button>
          </div>
        </div>
      )}

      {!conflict && isActiveSet ? (
        <div className="flex flex-wrap justify-end gap-2">
          <span className="text-sm text-muted-foreground">ชุดนี้ใช้อยู่แล้ว</span>
          <Button type="button" variant="outline" onClick={onCancel}>
            ปิด
          </Button>
        </div>
      ) : !conflict && !confirmingApply ? (
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            ยกเลิก
          </Button>
          <Button id="calc-import-apply" type="button" onClick={() => setConfirmingApply(true)}>
            ใช้ตารางนี้บนหน้าเว็บ
          </Button>
        </div>
      ) : !conflict && confirmingApply ? (
        <div
          id="calc-import-apply-box"
          className={cn(
            "rounded-md border bg-muted/40 px-3 py-2 text-sm",
            removesHybrid ? "border-destructive" : "border-border"
          )}
        >
          <p>
            {removesHybrid ? "ยืนยันใช้ไฟล์นี้? ตาราง Hybrid จะถูกลบ และตัวเลือก Hybrid จะหายจากหน้าเว็บ · " : "ยืนยันใช้ไฟล์นี้บนหน้าเว็บจริง? "}
            {changedSamples === 0
              ? "On-grid: บิลตัวอย่างได้ขนาดเดิมทั้งหมด"
              : `On-grid: ขนาดที่แนะนำจะเปลี่ยนใน ${changedSamples} จาก ${totalSamples} บิลตัวอย่าง`}
            {result.hasHybridSheet &&
              (hybridDiff.currentEmpty
                ? " · Hybrid: เพิ่มใหม่ทั้งตาราง"
                : changedHybridSamples === 0
                  ? " · Hybrid: บิลตัวอย่างได้ขนาดเดิมทั้งหมด"
                  : ` · Hybrid: ${changedHybridSamples} จาก ${totalHybridSamples}`)}
            {" — ลูกค้าเห็นทันที"}
          </p>
          <div className="mt-2 flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-8"
              disabled={applying}
              onClick={cancelApplyConfirm}
            >
              ยกเลิก
            </Button>
            <Button
              id="calc-import-apply-confirm"
              type="button"
              variant={removesHybrid ? "destructive" : "default"}
              className="h-8"
              disabled={applying}
              onClick={onApply}
            >
              {applying
                ? "กำลังใช้ตาราง…"
                : removesHybrid
                  ? "ยืนยัน ใช้ไฟล์นี้และลบ Hybrid"
                  : "ยืนยัน ใช้ตารางนี้"}
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
