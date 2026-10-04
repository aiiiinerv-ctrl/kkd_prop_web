"use client";

// Version history of the size table (R1-S5) — moved out of the old size-table
// card. design-162 §9: one list for both sources, a "Excel: <file>" or
// "แก้ในหลังบ้าน" badge per item, original-file download only when a file
// exists. R2-S7 adds the Hybrid counts and the "version has no Hybrid" warning.
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, FileSpreadsheet, PencilLine } from "lucide-react";
import { toast } from "sonner";
import { applyCalculatorImport } from "@/actions/calculator-import";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDateTime } from "./calculator-table-format";

export type SizeTableHistoryItem = {
  id: string;
  source: "EXCEL" | "MANUAL";
  /** null for MANUAL versions (no source file). */
  fileName: string | null;
  /** false when there is no original file to download. */
  hasSourceFile: boolean;
  createdAt: string;
  uploadedByName: string;
  onGridCount: number;
  /** Distinct kW sizes / rows of the version's Hybrid table (0 = version has no Hybrid). */
  hybridSizeCount: number;
  hybridRowCount: number;
  warnings: string[];
};

/** "Excel: <file>" or "แก้ในหลังบ้าน" — text, never colour alone. */
export function SourceBadge({
  source,
  fileName,
}: {
  source: "EXCEL" | "MANUAL";
  fileName?: string | null;
}) {
  if (source === "MANUAL") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-accent px-2 text-xs font-semibold text-accent-foreground">
        <PencilLine className="size-3.5" aria-hidden />
        แก้ในหลังบ้าน
      </span>
    );
  }
  return (
    <span className="inline-flex min-w-0 items-center gap-1 rounded-md border px-2 text-xs font-semibold">
      <FileSpreadsheet className="size-3.5 shrink-0" aria-hidden />
      <span className="shrink-0">Excel:</span>
      <span className="min-w-0 truncate font-medium" title={fileName ?? undefined}>
        {fileName}
      </span>
    </span>
  );
}

const HISTORY_PREVIEW = 5;

export function CalculatorVersionHistory({
  history,
  activeHasHybrid,
  activeImportId,
  configVersion,
  locked,
  onBusyChange,
}: {
  history: SizeTableHistoryItem[];
  /** The live config has a Hybrid table (so applying a version without one removes it). */
  activeHasHybrid: boolean;
  activeImportId: string | null;
  configVersion: number;
  /** Unsaved table edits exist — "ใช้ชุดนี้" must not run underneath them. */
  locked: boolean;
  onBusyChange: (busy: boolean) => void;
}) {
  const router = useRouter();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [conflictId, setConflictId] = useState<string | null>(null);
  const [warningsOpenId, setWarningsOpenId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    onBusyChange(pending);
  }, [pending, onBusyChange]);

  useEffect(() => {
    if (confirmId) document.getElementById(`calc-import-use-confirm-${confirmId}`)?.focus();
  }, [confirmId]);

  function cancelConfirm() {
    const id = confirmId;
    setConfirmId(null);
    requestAnimationFrame(() => document.getElementById(`calc-import-use-${id}`)?.focus());
  }

  function handleUse(item: SizeTableHistoryItem) {
    startTransition(async () => {
      const result = await applyCalculatorImport({ importId: item.id, version: configVersion });
      if ("ok" in result && result.ok) {
        toast.success(
          item.source === "MANUAL"
            ? `กลับไปใช้เวอร์ชันแก้ในหลังบ้าน (${formatDateTime(item.createdAt)}) แล้ว`
            : `กลับไปใช้ชุด ${item.fileName} แล้ว`
        );
        setConfirmId(null);
        setConflictId(null);
        router.refresh();
      } else if ("conflict" in result && result.conflict) {
        toast.error("มีคนแก้ก่อนคุณ — รีเฟรชแล้วลองใหม่");
        setConflictId(item.id);
      } else {
        toast.error("error" in result ? result.error : "ใช้ตารางไม่สำเร็จ");
      }
    });
  }

  return (
    <div
      onKeyDown={(event) => {
        if (event.key === "Escape" && confirmId && !pending) {
          event.stopPropagation();
          cancelConfirm();
        }
      }}
    >
      <h3 className="mb-2 text-sm font-semibold">ประวัติตาราง (20 เวอร์ชันล่าสุด)</h3>
      {locked && history.length > 1 && (
        <p id="calc-history-lock-hint" className="mb-2 text-xs text-muted-foreground">
          ปุ่ม &quot;ใช้ชุดนี้&quot; ใช้ไม่ได้ระหว่างที่มีการแก้ตารางที่ยังไม่บันทึก — บันทึกหรือยกเลิกการแก้ก่อน
        </p>
      )}
      {history.length === 0 ? (
        <p className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
          ยังไม่มีเวอร์ชันในระบบ — แก้ตารางในหน้านี้ หรือนำเข้าไฟล์ Excel ของฝ่ายขาย
        </p>
      ) : (
        <ul id="calc-import-history" className="divide-y rounded-md border border-border/70">
          {(showAll ? history : history.slice(0, HISTORY_PREVIEW)).map((item) => {
            const isActive = item.id === activeImportId;
            const removesHybrid = activeHasHybrid && item.hybridSizeCount === 0;
            return (
              <li
                key={item.id}
                className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2">
                    <SourceBadge source={item.source} fileName={item.fileName} />
                    {isActive && <Badge>ใช้อยู่</Badge>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(item.createdAt)} · {item.uploadedByName} · On-grid {item.onGridCount} ขนาด ·{" "}
                    {item.hybridSizeCount > 0 ? `Hybrid ${item.hybridSizeCount} ขนาด` : "ไม่มี Hybrid"} ·{" "}
                    {item.warnings.length === 0 ? (
                      <span className="whitespace-nowrap shrink-0">ไม่มีคำเตือน</span>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 text-xs underline"
                        aria-expanded={warningsOpenId === item.id}
                        onClick={() => setWarningsOpenId((cur) => (cur === item.id ? null : item.id))}
                      >
                        คำเตือน {item.warnings.length}
                      </Button>
                    )}
                  </p>
                  {warningsOpenId === item.id && (
                    <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-amber-800">
                      {item.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  )}
                  {conflictId === item.id && (
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
                          setConflictId(null);
                          setConfirmId(null);
                          router.refresh();
                        }}
                      >
                        โหลดข้อมูลล่าสุด
                      </Button>
                    </div>
                  )}
                  {confirmId === item.id && (
                    <div
                      className={cn(
                        "mt-2 flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm",
                        removesHybrid ? "border-destructive" : "border-border"
                      )}
                    >
                      <span>
                        {item.source === "MANUAL"
                          ? `ใช้เวอร์ชัน "แก้ในหลังบ้าน" (${formatDateTime(item.createdAt)}) บนหน้าเว็บจริงแทนชุดปัจจุบัน? ทั้ง On-grid และ Hybrid จะเปลี่ยนเป็นของเวอร์ชันนี้ — ลูกค้าเห็นทันที`
                          : `ใช้ชุด "${item.fileName}" (อัปโหลด ${formatDateTime(item.createdAt)}) บนหน้าเว็บจริงแทนชุดปัจจุบัน? ทั้ง On-grid และ Hybrid จะเปลี่ยนเป็นของเวอร์ชันนี้ — ลูกค้าเห็นทันที`}
                        {removesHybrid && (
                          <>
                            {" "}
                            <strong id={`calc-import-use-nohybrid-${item.id}`}>
                              เวอร์ชันนี้ไม่มีตาราง Hybrid ตัวเลือก Hybrid จะหายจากหน้าเว็บ
                            </strong>
                          </>
                        )}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-8"
                        disabled={pending}
                        onClick={cancelConfirm}
                      >
                        ยกเลิก
                      </Button>
                      <Button
                        id={`calc-import-use-confirm-${item.id}`}
                        type="button"
                        className="h-8"
                        disabled={pending}
                        onClick={() => handleUse(item)}
                      >
                        {pending ? "กำลังใช้ตาราง…" : "ยืนยัน ใช้ชุดนี้"}
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {!isActive && confirmId !== item.id && (
                    <Button
                      id={`calc-import-use-${item.id}`}
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={pending || locked}
                      onClick={() => setConfirmId(item.id)}
                    >
                      ใช้ชุดนี้
                    </Button>
                  )}
                  {item.hasSourceFile && (
                    <a
                      href={`/files/private/calculator-imports/${item.id}.xlsx`}
                      aria-label={`ดาวน์โหลดต้นฉบับ ${item.fileName}`}
                      className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-sm text-primary hover:underline"
                    >
                      <Download className="size-3.5" />
                      ดาวน์โหลดต้นฉบับ
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {history.length > HISTORY_PREVIEW && (
        <Button
          type="button"
          id="calc-history-show-all"
          variant="ghost"
          size="sm"
          className="mt-1"
          aria-expanded={showAll}
          aria-controls="calc-import-history"
          onClick={() => setShowAll((v) => !v)}
        >
          {showAll ? "แสดงน้อยลง" : `แสดงทั้งหมด (อีก ${history.length - HISTORY_PREVIEW} เวอร์ชัน)`}
        </Button>
      )}
    </div>
  );
}
