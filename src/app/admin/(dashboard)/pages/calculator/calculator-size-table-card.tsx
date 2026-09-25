"use client";

// "ตารางขนาดระบบ (Excel)" card — S6. Layout/copy/states follow
// docs/plans/calculator-excel-import-admin-ui-spec.md §2-§7 exactly; keep
// this file in sync with that spec if either changes. Local UI state
// (upload/preview/apply) is never mirrored into a `key`-remounted form —
// after a successful apply/rollback we clear it explicitly and call
// `router.refresh()`, so the surrounding Tabs never remounts (spec §9.3).
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Download, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  applyCalculatorImport,
  previewCalculatorImport,
  type ChangedRow,
  type DiffFieldChange,
  type DiffFieldName,
  type PreviewResult,
  type SampleBillDiff,
  type SampleBillOutcome,
} from "@/actions/calculator-import";
import type { SizeRow } from "@/lib/calculator-size-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;
const MAX_LIST_ITEMS = 10;
const MAX_KW_LIST = 12;

export type SizeTableHistoryItem = {
  id: string;
  fileName: string;
  createdAt: string;
  uploadedByName: string;
  rowCount: number;
  warnings: string[];
};

export type CalculatorSizeTableCardData = {
  source: "default" | "import";
  /** The table currently live on the public calculator (see page.tsx). */
  activeTable: SizeRow[];
  activeImportId: string | null;
  activeFileName: string | null;
  activeUploadedByName: string | null;
  configVersion: number;
  configUpdatedAt: string;
  history: SizeTableHistoryItem[];
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

function phaseText(phases: number[]): string {
  const has1 = phases.includes(1);
  const has3 = phases.includes(3);
  if (has1 && has3) return "1 หรือ 3 เฟส";
  if (has3) return "3 เฟส";
  return "1 เฟส";
}

function formatKwList(kws: number[], max = MAX_KW_LIST): string {
  const sorted = [...kws].sort((a, b) => a - b);
  if (sorted.length <= max) {
    return sorted.map((k) => k.toLocaleString("th-TH")).join(", ");
  }
  const shown = sorted.slice(0, max).map((k) => k.toLocaleString("th-TH"));
  return `${shown.join(", ")} … และอีก ${sorted.length - max} ขนาด`;
}

const FIELD_LABELS: Record<DiffFieldName, string> = {
  phases: "เฟส",
  billRange: "ช่วงค่าไฟ (฿)",
  panels: "แผง",
  roofM2: "หลังคา (ตร.ม.)",
  sunHours: "ชม.แดด/วัน",
  days: "วัน/เดือน",
  pricePerKwh: "ค่าไฟ/หน่วย (฿)",
};

function formatFieldValue(field: DiffFieldName, value: unknown): string {
  switch (field) {
    case "phases":
      return phaseText(value as number[]);
    case "billRange": {
      const v = value as { billMin: number; billMax: number };
      return `${v.billMin.toLocaleString("th-TH")}–${v.billMax.toLocaleString("th-TH")}`;
    }
    case "roofM2":
      return (value as number).toFixed(1);
    case "pricePerKwh":
      return (value as number).toFixed(2);
    default:
      return String(value);
  }
}

function outcomeText(o: SampleBillOutcome): string {
  if (o.status === "tooLarge") return "เกินตาราง";
  if (o.status === "empty" || o.kw === null) return "—";
  const kw = o.kw.toLocaleString("th-TH");
  return o.status === "belowFirstRow" ? `${kw} kW (ต่ำกว่าช่วง)` : `${kw} kW`;
}

function sampleChanged(sample: SampleBillDiff): boolean {
  return sample.before.kw !== sample.after.kw || sample.before.status !== sample.after.status;
}

type Screen =
  | { kind: "idle" }
  | { kind: "reject"; fileName: string; heading: string; messages: string[] }
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

export function CalculatorSizeTableCard({
  data,
  onBusyChange,
}: {
  data: CalculatorSizeTableCardData;
  onBusyChange: (busy: boolean) => void;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewHeadingRef = useRef<HTMLHeadingElement>(null);
  const rejectHeadingRef = useRef<HTMLHeadingElement>(null);
  const cardHeadingRef = useRef<HTMLHeadingElement>(null);

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

  const [rollbackConfirmId, setRollbackConfirmId] = useState<string | null>(null);
  const [rollbackConflictId, setRollbackConflictId] = useState<string | null>(null);
  const [rollbackWarningsOpenId, setRollbackWarningsOpenId] = useState<string | null>(null);
  const [rollbackPending, startRollbackTransition] = useTransition();

  const busy = uploading || applying || rollbackPending;
  useEffect(() => {
    if (rollbackConfirmId) document.getElementById(`calc-import-use-confirm-${rollbackConfirmId}`)?.focus();
  }, [rollbackConfirmId]);

  function cancelRollback() {
    const id = rollbackConfirmId;
    setRollbackConfirmId(null);
    requestAnimationFrame(() => document.getElementById(`calc-import-use-${id}`)?.focus());
  }
  useEffect(() => {
    onBusyChange(busy);
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
        cardHeadingRef.current?.focus();
      } else if ("conflict" in result && result.conflict) {
        toast.error("มีคนแก้ก่อนคุณ — รีเฟรชแล้วลองใหม่");
        setConflict(true);
      } else {
        toast.error("error" in result ? result.error : "ใช้ตารางไม่สำเร็จ");
      }
    });
  }

  function handleRollback(item: SizeTableHistoryItem) {
    startRollbackTransition(async () => {
      const result = await applyCalculatorImport({
        importId: item.id,
        version: data.configVersion,
      });
      if ("ok" in result && result.ok) {
        toast.success(`กลับไปใช้ชุด ${item.fileName} แล้ว`);
        setRollbackConfirmId(null);
        setRollbackConflictId(null);
        router.refresh();
      } else if ("conflict" in result && result.conflict) {
        toast.error("มีคนแก้ก่อนคุณ — รีเฟรชแล้วลองใหม่");
        setRollbackConflictId(item.id);
      } else {
        toast.error("error" in result ? result.error : "ใช้ตารางไม่สำเร็จ");
      }
    });
  }

  const kwValues = data.activeTable.map((r) => r.kw);
  const minKw = kwValues.length ? Math.min(...kwValues) : null;
  const maxKw = kwValues.length ? Math.max(...kwValues) : null;

  return (
    <fieldset disabled={busy} className="min-w-0" onKeyDown={(event) => {
      if (event.key === "Escape" && rollbackConfirmId && !busy) {
        event.stopPropagation();
        cancelRollback();
      }
    }}>
    <section
      aria-labelledby="calc-size-table-heading"
      aria-busy={busy}
      className="rounded-xl border border-border/70 bg-card p-6 space-y-5"
    >
      <div>
        <h2
          id="calc-size-table-heading"
          ref={cardHeadingRef}
          tabIndex={-1}
          className="mb-1 font-semibold outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          ตารางขนาดระบบ (Excel)
        </h2>
        <p className="text-sm text-muted-foreground">
          ใช้แนะนำขนาดระบบในหน้าเครื่องคำนวณ — อัปโหลดไฟล์ Excel ของฝ่ายขาย ตรวจผลก่อน
          แล้วกดยืนยันเพื่อใช้บนหน้าเว็บ
        </p>
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {uploading
          ? "กำลังอ่านและตรวจไฟล์…"
          : screen.kind === "preview"
            ? `ตรวจไฟล์เสร็จ: ${screen.result.rows.length} ขนาด คำเตือน ${allWarnings(screen.result).length} ข้อ`
            : screen.kind === "reject"
              ? `${screen.heading}`
              : ""}
      </p>

      {/* (b) summary */}
      <div
        id="calc-size-table-summary"
        className="rounded-lg border border-border/70 bg-muted/30 p-4 text-sm"
      >
        {data.source === "default" ? (
          <>
            <p className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">ค่าเริ่มต้น</Badge>
              <span>ตารางเริ่มต้น 3 ขนาด (3, 5, 10 kW)</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {data.history.length ? "กำลังใช้ตารางเริ่มต้น — เลือกไฟล์เดิมจากประวัติได้" : "ยังไม่มีไฟล์ในระบบ — ใช้ไฟล์ Excel ของฝ่ายขาย"}
            </p>
          </>
        ) : (
          <>
            <p className="flex flex-wrap items-center gap-2">
              <Badge>ใช้อยู่</Badge>
              <span className="min-w-0 truncate" title={data.activeFileName ?? ""}>
                {data.activeFileName} · {data.activeTable.length} ขนาด ({minKw?.toLocaleString("th-TH")} –{" "}
                {maxKw?.toLocaleString("th-TH")} kW)
              </span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              ยืนยันใช้เมื่อ {formatDateTime(data.configUpdatedAt)} · อัปโหลดโดย {data.activeUploadedByName}
            </p>
            {data.activeImportId && (
              <a
                href={`/files/private/calculator-imports/${data.activeImportId}.xlsx`}
                className="mt-1 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <Download className="size-3.5" />
                ดาวน์โหลดต้นฉบับ
              </a>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              ต้องการกลับไปตารางเริ่มต้น? ใช้ &quot;คืนค่าเริ่มต้น&quot; ท้ายหน้านี้
            </p>
          </>
        )}
      </div>

      {/* (c) explanation box */}
      <div className="rounded-md border border-border/70 bg-muted/50 px-4 py-3 text-sm space-y-2">
        <p className="font-semibold">ระบบอ่านอะไรจากไฟล์</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>อ่านเฉพาะ sheet On-grid — sheet อื่น (เช่น Hybrid) ระบบข้าม</li>
          <li>อ่านตารางแรกใต้หัวตาราง &quot;ผลิตพลังงานต่อวัน&quot; ลงไปจนถึงแถวแรกที่ช่องขนาดว่าง</li>
          <li>
            ไม่อ่านราคา ยี่ห้อ เงินประหยัด และระยะคืนทุนในไฟล์ — ระยะคืนทุนบนหน้าเว็บคำนวณจากราคา Package
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
          {showColumns ? "ซ่อนคอลัมน์" : "ดูคอลัมน์ที่ระบบอ่าน (9)"}
        </Button>
        {showColumns && (
          <ul id="calc-import-columns" className="list-disc space-y-1 pl-5 text-xs">
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
          <p className="mt-0.5 text-xs text-muted-foreground">{screen.fileName} · ไม่มีอะไรถูกบันทึก</p>
          {screen.messages.length > 0 && (
            <ol className="mt-2 list-disc space-y-1 pl-5 text-sm text-foreground">
              {(showAllRejects ? screen.messages : screen.messages.slice(0, MAX_LIST_ITEMS)).map(
                (msg, i) => {
                  const [main, action] = msg.split("\n→ ");
                  return (
                    <li key={i}>
                      <div>{main}</div>
                      {action && <div className="text-muted-foreground">→ {action}</div>}
                    </li>
                  );
                }
              )}
            </ol>
          )}
          {screen.messages.length > MAX_LIST_ITEMS && (
            <div className="mt-2 flex items-center gap-2 text-xs">
              {!showAllRejects && (
                <span>และอีก {screen.messages.length - MAX_LIST_ITEMS} ข้อ</span>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-expanded={showAllRejects}
                onClick={() => setShowAllRejects((v) => !v)}
              >
                {showAllRejects ? "แสดงน้อยลง" : "แสดงทั้งหมด"}
              </Button>
            </div>
          )}
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

      {/* (f) history */}
      <Separator />
      <div>
        <h3 className="mb-2 text-sm font-semibold">ประวัติไฟล์ (20 รายการล่าสุด)</h3>
        {data.history.length === 0 ? (
          <p className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
            ยังไม่มีไฟล์ในระบบ — ใช้ไฟล์ Excel ของฝ่ายขาย
          </p>
        ) : (
          <ul id="calc-import-history" className="divide-y rounded-md border border-border/70">
            {data.history.map((item) => {
              const isActive = item.id === data.activeImportId;
              return (
                <li key={item.id} className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="min-w-0 truncate font-medium" title={item.fileName}>
                        {item.fileName}
                      </span>
                      {isActive && <Badge>ใช้อยู่</Badge>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(item.createdAt)} · {item.uploadedByName} · {item.rowCount} ขนาด ·{" "}
                      {item.warnings.length === 0 ? (
                        "ไม่มีคำเตือน"
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 text-xs underline"
                          aria-expanded={rollbackWarningsOpenId === item.id}
                          onClick={() =>
                            setRollbackWarningsOpenId((cur) => (cur === item.id ? null : item.id))
                          }
                        >
                          คำเตือน {item.warnings.length}
                        </Button>
                      )}
                    </p>
                    {rollbackWarningsOpenId === item.id && (
                      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-amber-800">
                        {item.warnings.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    )}
                    {rollbackConflictId === item.id && (
                      <div
                        role="alert"
                        className="mt-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs"
                      >
                        มีคนแก้ตัวเลขการคำนวณก่อนคุณ — กด &quot;โหลดข้อมูลล่าสุด&quot; แล้วลองใหม่
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="ml-2 h-7"
                          onClick={() => {
                            setRollbackConflictId(null);
                            setRollbackConfirmId(null);
                            router.refresh();
                          }}
                        >
                          โหลดข้อมูลล่าสุด
                        </Button>
                      </div>
                    )}
                    {rollbackConfirmId === item.id && (
                      <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
                        <span>
                          ใช้ชุด &quot;{item.fileName}&quot; ({item.rowCount} ขนาด, อัปโหลด{" "}
                          {formatDateTime(item.createdAt)}) บนหน้าเว็บจริงแทนชุดปัจจุบัน? ลูกค้าเห็นทันที
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-8"
                          disabled={rollbackPending}
                          onClick={cancelRollback}
                        >
                          ยกเลิก
                        </Button>
                        <Button
                          id={`calc-import-use-confirm-${item.id}`}
                          type="button"
                          className="h-8"
                          disabled={rollbackPending}
                          onClick={() => handleRollback(item)}
                        >
                          {rollbackPending ? "กำลังใช้ตาราง…" : "ยืนยัน ใช้ชุดนี้"}
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!isActive && rollbackConfirmId !== item.id && (
                      <Button
                        id={`calc-import-use-${item.id}`}
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => setRollbackConfirmId(item.id)}
                      >
                        ใช้ชุดนี้
                      </Button>
                    )}
                    <a
                      href={`/files/private/calculator-imports/${item.id}.xlsx`}
                      aria-label={`ดาวน์โหลดต้นฉบับ ${item.fileName}`}
                      className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                    >
                      <Download className="size-3.5" />
                      ดาวน์โหลดต้นฉบับ
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
    </fieldset>
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
        <p className="text-xs text-muted-foreground">
          {result.rows.length} ขนาด ({minKw?.toLocaleString("th-TH")} – {maxKw?.toLocaleString("th-TH")} kW)
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

      <div>
        <h4 className="text-sm font-semibold">ผลต่อบิลตัวอย่าง</h4>
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
        <h4 className="text-sm font-semibold">
          เทียบกับตารางที่ใช้อยู่{" "}
          <span className="text-xs font-normal text-muted-foreground">
            เพิ่ม {result.diff.added.length} · ลบ {result.diff.removed.length} · เปลี่ยน{" "}
            {result.diff.changed.length} · เหมือนเดิม {result.diff.unchangedCount}
          </span>
        </h4>
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
        <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
          <p>
            {changedSamples === 0
              ? "ยืนยันใช้ตารางนี้บนหน้าเว็บจริง? บิลตัวอย่างได้ขนาดเดิมทั้งหมด — ลูกค้าเห็นทันที"
              : `ยืนยันใช้ตารางนี้บนหน้าเว็บจริง? ขนาดที่แนะนำจะเปลี่ยนใน ${changedSamples} จาก ${totalSamples} บิลตัวอย่าง — ลูกค้าเห็นทันที`}
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
              className="h-8"
              disabled={applying}
              onClick={onApply}
            >
              {applying ? "กำลังใช้ตาราง…" : "ยืนยัน ใช้ตารางนี้"}
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
