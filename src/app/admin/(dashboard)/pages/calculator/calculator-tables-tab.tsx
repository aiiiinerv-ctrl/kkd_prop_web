"use client";

// Root of the "ตารางขนาดระบบ" tab (R1-S5, design-162 §2.3 / §10): heading, the
// "in use" summary with export + import buttons, the collapsible Excel import
// panel, the On-grid / Hybrid sub-tabs (R2-S6) each with its list and edit
// dialog, the sticky save bar + confirm dialog (R1-S6) and the version history.
//
// The edit state is a client-side working copy of BOTH tables
// (use-table-draft.ts): nothing reaches the server until the owner confirms
// the diff dialog, which saves them together through saveCalculatorTables.
//
// Width: PageShell is `max-w-3xl` and must stay that way for the other tabs
// (it is not touched), so this tab breaks out of it with an explicit width —
// at most `max-w-5xl` (64rem), capped to the space the admin layout leaves
// (viewport − sidebar `w-60` − `main` padding `p-6` on md+, − padding below).
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { saveCalculatorTables } from "@/actions/calculator-import";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  hybridIssueText,
  hybridSizeStatus,
  toHybridField,
  type HybridField,
} from "@/hooks/admin/hybrid-draft";
import {
  issueText,
  resolveRow,
  rowStatus,
  toDraftField,
  useTableDraft,
  type DraftField,
} from "@/hooks/admin/use-table-draft";
import type { CalcPackageForDiff } from "@/lib/calculator-import/diff";
import type { SizeRow } from "@/lib/calculator-size-table";
import { CalculatorImportPanel } from "./calculator-import-panel";
import { HybridList, OnGridList } from "./calculator-table-list";
import { formatDateTime } from "./calculator-table-format";
import { HybridSizeDialog, type HybridDialogFocus } from "./hybrid-size-dialog";
import { OnGridSizeDialog } from "./on-grid-size-dialog";
import type { HybridRow } from "@/lib/calculator-hybrid";
import { SaveTablesDialog, type ServerIssueView } from "./save-tables-dialog";
import {
  CalculatorVersionHistory,
  SourceBadge,
  type SizeTableHistoryItem,
} from "./calculator-version-history";

export type CalculatorTablesTabData = {
  configVersion: number;
  configUpdatedAt: string;
  /** Annual saving multiplier of the live config (Hybrid payback in the editor). */
  multiplier: number;
  active: {
    source: "default" | "EXCEL" | "MANUAL";
    versionId: string | null;
    fileName: string | null;
    savedByName: string | null;
    hasSourceFile: boolean;
  };
  onGrid: SizeRow[];
  /** Live Hybrid table (null = none). ADMIN-only data: carries brand prices. */
  hybrid: HybridRow[] | null;
  /** Brand names of the live Hybrid table, in column order ([] when none). */
  brands: string[];
  /** For the whole-table warnings in the save-confirm dialog. */
  packages: CalcPackageForDiff[];
  sliderMaxBill: number;
  history: SizeTableHistoryItem[];
};

type DialogState =
  | { table: "onGrid"; key: string | null; focus: DraftField | null; nonce: number }
  | { table: "hybrid"; key: string | null; focus: HybridDialogFocus | null; nonce: number };

const kwList = (kws: number[]) => kws.map((k) => k.toLocaleString("th-TH")).join(", ");
const kwDomId = (kw: number) => String(kw).replace(".", "_");
const isNum = (v: number | null): v is number => typeof v === "number" && Number.isFinite(v);

export function CalculatorTablesTab({ data }: { data: CalculatorTablesTabData }) {
  const router = useRouter();
  const [importOpen, setImportOpen] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [historyBusy, setHistoryBusy] = useState(false);
  const busy = importBusy || historyBusy;
  const onImportBusy = useCallback((v: boolean) => setImportBusy(v), []);
  const onHistoryBusy = useCallback((v: boolean) => setHistoryBusy(v), []);

  const draft = useTableDraft({
    onGrid: data.onGrid,
    hybrid: data.hybrid,
    brands: data.brands,
    configVersion: data.configVersion,
  });
  const [subTab, setSubTab] = useState<"on-grid" | "hybrid">("on-grid");
  const [dlg, setDlg] = useState<DialogState | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [conflictSummary, setConflictSummary] = useState<string | null>(null);
  const [serverIssues, setServerIssues] = useState<ServerIssueView[] | null>(null);
  const [discarding, setDiscarding] = useState(false);
  const [live, setLive] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);

  const { active, onGrid } = data;
  const { dirty, issues, hybridIssues, rows, hybridSizes } = draft;
  const errorCount = issues.length + hybridIssues.length;
  const liveOnGridCount = rows.filter((r) => !r.deleted).length;
  const liveHybridCount = hybridSizes ? hybridSizes.filter((s) => !s.deleted).length : 0;
  const hybridSizeCount = data.hybrid ? new Set(data.hybrid.map((r) => r.kw)).size : 0;
  const kws = onGrid.map((r) => r.kw);
  const minKw = kws.length ? Math.min(...kws) : null;
  const maxKw = kws.length ? Math.max(...kws) : null;

  // Editing and importing/applying a set are mutually exclusive: an import or
  // "ใช้ชุดนี้" would replace the table under unsaved edits, and edits made
  // while the import preview is open would be replaced by "ใช้ตารางนี้".
  const editLocked = busy || importOpen;
  const lockReason = busy
    ? null
    : importOpen
      ? 'กด "ปิดการนำเข้า" ด้านบน เพื่อแก้ตารางในหน้านี้'
      : null;

  // `beforeunload`: leaving with unsaved edits asks for confirmation.
  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // Screen-reader status (design-162 §13.2): derived while editing, the saved
  // note afterwards.
  const liveText = dirty
    ? `แก้ไว้ ${draft.changedCount} ขนาด ยังไม่บันทึก${errorCount > 0 ? ` · มีข้อผิดพลาด ${errorCount} จุด` : ""}`
    : live;

  const dlgRow = dlg?.table === "onGrid" && dlg.key ? (rows.find((r) => r.key === dlg.key) ?? null) : null;
  const dlgSize =
    dlg?.table === "hybrid" && dlg.key ? (hybridSizes?.find((s) => s.key === dlg.key) ?? null) : null;

  // First problem to jump to: On-grid first, then Hybrid (whole-table issues have no row).
  const firstOnGrid = issues.find((i) => i.key !== "");
  const firstHybrid = hybridIssues.find((i) => i.key !== "");
  const firstIssue = firstOnGrid
    ? { table: "onGrid" as const, issue: firstOnGrid }
    : firstHybrid
      ? { table: "hybrid" as const, issue: firstHybrid }
      : null;
  const wholeTableIssue = [...issues, ...hybridIssues].find((i) => i.key === "");

  function focusAfter(id: string) {
    setTimeout(() => document.getElementById(id)?.focus(), 80);
  }
  const editButtonId = (table: "onGrid" | "hybrid", kw: number | null) => {
    const name = table === "onGrid" ? "on-grid" : "hybrid";
    return kw !== null && Number.isFinite(kw) ? `calc-edit-${name}-${kwDomId(kw)}` : `calc-add-${name}`;
  };

  function openDialog(key: string | null, focus: DraftField | null = null) {
    setConfirmOpen(false);
    setDlg({ table: "onGrid", key, focus, nonce: Date.now() });
  }
  function openHybridDialog(key: string | null, focus: HybridDialogFocus | null = null) {
    setConfirmOpen(false);
    setDlg({ table: "hybrid", key, focus, nonce: Date.now() });
  }

  function changedNames(): string {
    const names = rows.filter((r) => rowStatus(r) !== "same").flatMap((r) => (r.current.kw ? [r.current.kw] : []));
    const hybridNames = (hybridSizes ?? [])
      .filter((s) => hybridSizeStatus(s, draft.brands) !== "same")
      .flatMap((s) => (isNum(s.current.kw) ? [s.current.kw] : []));
    const parts = [
      names.length ? `On-grid ${kwList(names)} kW` : null,
      hybridNames.length ? `Hybrid ${kwList(hybridNames)} kW` : null,
    ].filter(Boolean);
    return parts.length ? parts.join(" · ") : "—";
  }

  function openConfirm() {
    setConflictSummary(null);
    setServerIssues(null);
    setConfirmOpen(true);
  }

  function closeConfirm() {
    setConfirmOpen(false);
    setConflictSummary(null);
    setServerIssues(null);
  }

  async function doSave() {
    const sent = draft.table;
    if (!sent) return;
    // Hybrid goes along only when it was edited; otherwise the server keeps the
    // live table (Default #11) and the new MANUAL version carries it over.
    const sentHybrid = draft.hybridSizes && draft.hybridDirty ? draft.hybridTable : null;
    setSaving(true);
    try {
      const result = await saveCalculatorTables({
        onGrid: sent,
        ...(sentHybrid ? { hybrid: sentHybrid } : {}),
        version: draft.baseVersion,
      });
      if ("ok" in result && result.ok) {
        draft.rebase(sent, sentHybrid ?? data.hybrid, result.version);
        closeConfirm();
        setLive("บันทึกแล้ว — หน้าเครื่องคำนวณอัปเดตแล้ว");
        toast.success("บันทึกแล้ว — หน้าเครื่องคำนวณอัปเดตแล้ว");
        router.refresh();
        setTimeout(() => headingRef.current?.focus(), 80);
      } else if ("conflict" in result && result.conflict) {
        toast.error('มีคนแก้ก่อนคุณ — กด "โหลดข้อมูลล่าสุด" แล้วลองใหม่');
        setConflictSummary(changedNames());
      } else if ("issues" in result) {
        // Server found something the client validator did not (T-7): point at
        // the same fields. rowIndex indexes the payload we just sent.
        setServerIssues(
          result.issues.map((issue): ServerIssueView => {
            if (issue.table === "hybrid") {
              const kw = sentHybrid?.[issue.rowIndex]?.kw;
              const size = hybridSizes?.find((s) => !s.deleted && s.current.kw === kw);
              return {
                message: issue.message,
                table: "hybrid",
                key: size?.key ?? "",
                field: toHybridField(issue.field),
              };
            }
            const kw = sent[issue.rowIndex]?.kw;
            const row = rows.find((r) => {
              const resolved = resolveRow(r.current);
              return !r.deleted && resolved?.kw === kw;
            });
            return { message: issue.message, table: "onGrid", key: row?.key ?? "", field: toDraftField(issue.field) };
          })
        );
      } else {
        toast.error("error" in result ? result.error : "บันทึกไม่สำเร็จ");
      }
    } catch {
      toast.error("บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  function reloadLatest() {
    draft.discard();
    closeConfirm();
    router.refresh();
  }

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
              ref={headingRef}
              tabIndex={-1}
              className="mb-1 font-semibold outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              ตารางขนาดระบบ
            </h2>
            <p className="text-sm text-muted-foreground">
              ใช้แนะนำขนาดระบบในหน้าเครื่องคำนวณ — แก้ในหน้านี้ หรือดาวน์โหลดเป็น Excel เพื่อแก้
              แล้วนำเข้ากลับ ตรวจผลก่อนแล้วกดยืนยันเพื่อใช้บนหน้าเว็บ
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
                      <span>ตารางเริ่มต้น 3 ขนาด (3, 5, 10 kW) · ไม่มี Hybrid</span>
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
                        {maxKw?.toLocaleString("th-TH")} kW) ·{" "}
                        {data.hybrid
                          ? `Hybrid ${hybridSizeCount} ขนาด (${data.hybrid.length} แถว)`
                          : "ไม่มี Hybrid"}
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
                {/* Plain <a>: route handler returns an xlsx attachment, not a page — <Link> would try client navigation. */}
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
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
                  disabled={dirty}
                  onClick={() => setImportOpen((v) => !v)}
                >
                  <Upload className="size-4" />
                  {importOpen ? "ปิดการนำเข้า" : "นำเข้าไฟล์ Excel"}
                </Button>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {data.hybrid
                ? "ไฟล์ที่ดาวน์โหลดมี 2 ชีต (On-grid, Hybrid) ตามแบบไฟล์เดิม แก้แล้วนำเข้ากลับได้"
                : "ไฟล์ที่ดาวน์โหลดมีชีต On-grid ตามแบบไฟล์เดิม แก้แล้วนำเข้ากลับได้"}
              {dirty ? " · ไม่รวมการแก้ที่ยังไม่บันทึก" : ""}
            </p>
            {dirty && (
              <p id="calc-import-lock-hint" className="mt-1 text-xs text-muted-foreground">
                บันทึกหรือยกเลิกการแก้ก่อนนำเข้าไฟล์
              </p>
            )}
          </div>

          {importOpen && (
            <CalculatorImportPanel
              data={{ activeImportId: active.versionId, configVersion: data.configVersion }}
              onBusyChange={onImportBusy}
              onApplied={() => setImportOpen(false)}
            />
          )}

          <Tabs value={subTab} onValueChange={(value) => setSubTab(value as "on-grid" | "hybrid")}>
            <TabsList variant="line" aria-label="ตารางขนาดระบบ" className="w-full justify-start border-b border-border/70 pb-[7px]">
              <TabsTrigger value="on-grid" id="calc-tables-tab-on-grid">
                On-grid <span className="text-muted-foreground">({liveOnGridCount})</span>
                {issues.length > 0 && <Badge variant="destructive">ผิด {issues.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="hybrid" id="calc-tables-tab-hybrid">
                Hybrid{" "}
                <span className="text-muted-foreground">
                  {hybridSizes === null ? "(ไม่มี)" : `(${liveHybridCount} ขนาด)`}
                </span>
                {hybridIssues.length > 0 && <Badge variant="destructive">ผิด {hybridIssues.length}</Badge>}
              </TabsTrigger>
            </TabsList>
            {/* keepMounted on both panels: unsaved edits and dialogs must survive switching sub-tabs (AGENTS.md). */}
            <TabsContent value="on-grid" keepMounted className="pt-3">
              <OnGridList
                rows={rows}
                issues={issues}
                editLocked={editLocked}
                lockReason={lockReason}
                onAdd={() => openDialog(null)}
                onEdit={(key) => openDialog(key)}
                onRestore={draft.restore}
              />
            </TabsContent>
            <TabsContent value="hybrid" keepMounted className="pt-3">
              <HybridList
                sizes={hybridSizes}
                brands={draft.brands}
                multiplier={data.multiplier}
                issues={hybridIssues}
                editLocked={editLocked}
                lockReason={lockReason}
                onAdd={() => openHybridDialog(null)}
                onEdit={(key) => openHybridDialog(key)}
                onRestore={draft.restoreHybrid}
              />
            </TabsContent>
          </Tabs>

          {dirty && (
            <div
              id="calc-tables-savebar"
              role="region"
              aria-label="การแก้ที่ยังไม่บันทึก"
              className="sticky bottom-0 z-10 mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary bg-card px-3 py-2 shadow-sm"
            >
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm">
                  <strong>แก้ไว้ {draft.changedCount} ขนาด</strong> (On-grid {draft.onGridChangedCount} · Hybrid{" "}
                  {draft.hybridChangedCount}) — ยังไม่บันทึก
                </p>
                {errorCount > 0 && (
                  <p id="calc-tables-errline" className="text-xs text-destructive">
                    มีข้อผิดพลาด {errorCount} จุด ต้องแก้ก่อนบันทึก
                    {firstIssue ? (
                      <>
                        {" · "}
                        <button
                          type="button"
                          id="calc-tables-goto-error"
                          className="underline-offset-2 hover:underline"
                          onClick={() => {
                            if (firstIssue.table === "hybrid") {
                              const { issue } = firstIssue;
                              setSubTab("hybrid");
                              openHybridDialog(issue.key, issue.field === "table" ? null : { field: issue.field, rowKey: issue.rowKey });
                            } else {
                              const { issue } = firstIssue;
                              setSubTab("on-grid");
                              openDialog(issue.key, issue.field === "table" ? null : issue.field);
                            }
                          }}
                        >
                          ไปที่จุดแรก (
                          {(firstIssue.table === "hybrid"
                            ? hybridIssueText(firstIssue.issue, hybridSizes ?? [])
                            : issueText(firstIssue.issue, rows)
                          ).split(":")[0]}
                          )
                        </button>
                      </>
                    ) : wholeTableIssue ? (
                      <> · {wholeTableIssue.message}</>
                    ) : null}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {discarding ? (
                  <span className="flex flex-wrap items-center gap-2 text-sm">
                    ทิ้งการแก้ทั้งหมด {draft.changedCount} ขนาด?
                    <Button type="button" size="sm" variant="outline" className="h-8" onClick={() => setDiscarding(false)}>
                      ไม่ทิ้ง
                    </Button>
                    <Button
                      type="button"
                      id="calc-tables-discard-confirm"
                      size="sm"
                      variant="destructive"
                      className="h-8"
                      onClick={() => {
                        draft.discard();
                        setDiscarding(false);
                      }}
                    >
                      ทิ้งการแก้
                    </Button>
                  </span>
                ) : (
                  <Button type="button" id="calc-tables-discard" size="sm" variant="ghost" onClick={() => setDiscarding(true)}>
                    ยกเลิกการแก้ทั้งหมด
                  </Button>
                )}
                <Button
                  type="button"
                  id="calc-tables-save"
                  size="sm"
                  disabled={errorCount > 0}
                  aria-describedby={errorCount > 0 ? "calc-tables-errline" : undefined}
                  onClick={openConfirm}
                >
                  ตรวจและบันทึก…
                </Button>
              </div>
            </div>
          )}
        </section>
      </fieldset>

      <fieldset disabled={busy} className="min-w-0">
        <section
          aria-label="ประวัติตาราง"
          className="rounded-xl border border-border/70 bg-card p-4 sm:p-6"
        >
          <CalculatorVersionHistory
            history={data.history}
            activeHasHybrid={data.hybrid !== null}
            activeImportId={active.versionId}
            configVersion={data.configVersion}
            locked={dirty}
            onBusyChange={onHistoryBusy}
          />
        </section>
      </fieldset>

      <p role="status" aria-live="polite" className="sr-only">
        {liveText}
      </p>

      {dlg?.table === "onGrid" && (
        <OnGridSizeDialog
          key={dlg.nonce}
          row={dlgRow}
          others={rows.filter((r) => r.key !== dlg.key)}
          focusFieldName={dlg.focus}
          onClose={() => {
            const kw = dlgRow?.current.kw ?? null;
            setDlg(null);
            focusAfter(editButtonId("onGrid", kw));
          }}
          onCommit={(values) => {
            draft.commit(dlg.key, values);
            setDlg(null);
            focusAfter(editButtonId("onGrid", values.kw));
          }}
          onDelete={() => {
            if (dlg.key && dlgRow) {
              const kw = dlgRow.current.kw;
              draft.markDelete(dlg.key);
              const label = kw ? `${kw.toLocaleString("th-TH")} kW` : "ขนาดใหม่";
              toast(
                dlgRow.original
                  ? `ทำเครื่องหมายลบ ${label} แล้ว — กด "คืนขนาดนี้" ได้ถ้าเปลี่ยนใจ`
                  : `เอาขนาด ${label} ที่เพิ่มไว้ออกแล้ว`
              );
            }
            setDlg(null);
            focusAfter("calc-add-on-grid");
          }}
        />
      )}

      {dlg?.table === "hybrid" && hybridSizes && (
        <HybridSizeDialog
          key={dlg.nonce}
          size={dlgSize}
          others={hybridSizes.filter((s) => s.key !== dlg.key)}
          brands={draft.brands}
          multiplier={data.multiplier}
          focus={dlg.focus}
          onClose={() => {
            const kw = dlgSize?.current.kw ?? null;
            setDlg(null);
            focusAfter(editButtonId("hybrid", kw));
          }}
          onCommit={(values) => {
            draft.commitHybrid(dlg.key, values);
            setDlg(null);
            focusAfter(editButtonId("hybrid", values.kw));
          }}
          onDelete={() => {
            if (dlg.key && dlgSize) {
              const kw = dlgSize.current.kw;
              draft.markDeleteHybrid(dlg.key);
              const label = isNum(kw) ? `${kw.toLocaleString("th-TH")} kW` : "ขนาดใหม่";
              toast(
                dlgSize.original
                  ? `ทำเครื่องหมายลบ ${label} (Hybrid) แล้ว — กด "คืนขนาดนี้" ได้ถ้าเปลี่ยนใจ`
                  : `เอาขนาด ${label} (Hybrid) ที่เพิ่มไว้ออกแล้ว`
              );
            }
            setDlg(null);
            focusAfter("calc-add-hybrid");
          }}
        />
      )}

      {confirmOpen && draft.table && (hybridSizes === null || draft.hybridTable) && (
        <SaveTablesDialog
          before={rows.flatMap((r) => (r.original ? [r.original] : [])).sort((a, b) => a.kw - b.kw)}
          after={draft.table}
          hybridBefore={data.hybrid}
          hybridAfter={draft.hybridTable}
          multiplier={data.multiplier}
          packages={data.packages}
          sliderMaxBill={data.sliderMaxBill}
          saving={saving}
          conflictSummary={conflictSummary}
          serverIssues={serverIssues}
          onBack={closeConfirm}
          onSave={doSave}
          onReload={reloadLatest}
          onGoTo={(issue) => {
            if (!issue.key) return closeConfirm();
            setServerIssues(null);
            if (issue.table === "hybrid") {
              setSubTab("hybrid");
              openHybridDialog(issue.key, { field: issue.field as HybridField, rowKey: issue.rowKey });
            } else {
              setSubTab("on-grid");
              openDialog(issue.key, issue.field as DraftField);
            }
          }}
        />
      )}
    </div>
  );
}
