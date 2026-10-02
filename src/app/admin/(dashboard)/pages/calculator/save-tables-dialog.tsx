"use client";

// Confirm-with-diff dialog shown before a hand-edited table goes live
// (R1-S6, design-162 §7, #163 D5). The diff is computed client-side with the
// same `diffSizeTables` the Excel preview uses, so the sample-bill table, the
// per-field changes and the whole-table warnings (Package first, then slider)
// read identically to the import flow. Not an AlertDialog: nothing is deleted.
import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  diffSizeTables,
  type CalcPackageForDiff,
  type DiffFieldChange,
} from "@/lib/calculator-import/diff";
import type { SizeRow } from "@/lib/calculator-size-table";
import {
  FIELD_LABELS,
  formatFieldValue,
  outcomeText,
  phaseText,
  sampleChanged,
} from "./calculator-table-format";

const th = (n: number) => n.toLocaleString("th-TH");
const MAX_ITEMS = 10;

export type ServerIssueView = { message: string; key: string; field: string };

type DiffItem =
  | { kind: "changed"; kw: number; changes: DiffFieldChange[] }
  | { kind: "removed"; kw: number }
  | { kind: "added"; row: SizeRow };

export function SaveTablesDialog({
  before,
  after,
  packages,
  sliderMaxBill,
  saving,
  conflictSummary,
  serverIssues,
  onBack,
  onSave,
  onReload,
  onGoTo,
}: {
  before: SizeRow[];
  after: SizeRow[];
  packages: CalcPackageForDiff[];
  sliderMaxBill: number;
  saving: boolean;
  /** Set when the server reported a version conflict: what the owner had edited. */
  conflictSummary: string | null;
  /** Set when the server's validator found something the client did not. */
  serverIssues: ServerIssueView[] | null;
  onBack: () => void;
  onSave: () => void;
  onReload: () => void;
  onGoTo: (issue: ServerIssueView) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const diff = useMemo(
    () => diffSizeTables(before, after, packages, sliderMaxBill),
    [before, after, packages, sliderMaxBill]
  );

  const items: DiffItem[] = [
    ...diff.changed.map((c) => ({ kind: "changed" as const, kw: c.kw, changes: c.changedFields })),
    ...diff.removed.map((r) => ({ kind: "removed" as const, kw: r.kw })),
    ...diff.added.map((row) => ({ kind: "added" as const, row })),
  ];
  const shown = showAll ? items : items.slice(0, MAX_ITEMS);

  const counts = [
    diff.changed.length ? `เปลี่ยน ${diff.changed.length}` : null,
    diff.added.length ? `เพิ่ม ${diff.added.length}` : null,
    diff.removed.length ? `ลบ ${diff.removed.length}` : null,
  ].filter(Boolean);
  const description = [
    `On-grid: ${counts.join(" · ") || "ไม่มีการเปลี่ยนแปลง"}`,
    diff.warnings.length ? `คำเตือน ${diff.warnings.length} ข้อ` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const blocked = saving || conflictSummary !== null || serverIssues !== null;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !saving) onBack();
      }}
    >
      <DialogContent
        id="calc-tables-confirm"
        showCloseButton={false}
        className="max-h-[90vh] w-full overflow-y-auto sm:max-w-2xl max-sm:h-dvh max-sm:max-h-dvh max-sm:max-w-none max-sm:rounded-none"
      >
        <DialogHeader>
          <DialogTitle>ตรวจก่อนบันทึกและใช้บนหน้าเว็บ</DialogTitle>
          <DialogDescription className="text-xs">{description}</DialogDescription>
        </DialogHeader>

        <div className="min-w-0 space-y-4">
          {conflictSummary !== null && (
            <div
              id="calc-tables-conflict"
              role="alert"
              className="space-y-2 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3"
            >
              <p className="font-semibold text-destructive">มีคนแก้ตารางก่อนคุณ</p>
              <p>
                ยังไม่มีอะไรถูกบันทึก กด &quot;โหลดข้อมูลล่าสุด&quot; แล้วแก้ใหม่ สิ่งที่คุณแก้ไว้:{" "}
                {conflictSummary}
              </p>
              <Button type="button" id="calc-tables-conflict-reload" variant="outline" onClick={onReload}>
                โหลดข้อมูลล่าสุด
              </Button>
            </div>
          )}

          {serverIssues !== null && (
            <div
              id="calc-tables-server-reject"
              role="alert"
              className="space-y-1 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3"
            >
              <p className="font-semibold text-destructive">
                เซิร์ฟเวอร์ตรวจพบ {serverIssues.length} จุดที่ต้องแก้ — ยังไม่มีอะไรถูกบันทึก
              </p>
              <ul className="list-disc pl-5">
                {serverIssues.map((issue, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      className="text-left text-primary underline-offset-2 hover:underline"
                      onClick={() => onGoTo(issue)}
                    >
                      {issue.message}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <section className="space-y-2">
            <h4 className="text-sm font-semibold">ผลต่อบิลตัวอย่าง</h4>
            <div className="overflow-x-auto rounded-md border">
              <Table className="text-xs sm:text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead>บิล/เดือน</TableHead>
                    <TableHead>On-grid ตอนนี้</TableHead>
                    <TableHead>หลังบันทึก</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {diff.sampleBills.map((sample) => {
                    const changed = sampleChanged(sample);
                    return (
                      <TableRow key={sample.bill} className={changed ? "bg-amber-50" : undefined}>
                        <TableCell>฿{th(sample.bill)}</TableCell>
                        <TableCell>{outcomeText(sample.before)}</TableCell>
                        <TableCell className={changed ? "font-semibold" : undefined}>
                          {changed && <span className="sr-only">เปลี่ยน: </span>}
                          {outcomeText(sample.after)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </section>

          <section className="space-y-2">
            <h4 className="text-sm font-semibold">สิ่งที่เปลี่ยน</h4>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">ไม่มีการเปลี่ยนแปลง</p>
            ) : (
              <>
                <ul id="calc-tables-diff-list" className="divide-y rounded-md border">
                  {shown.map((item) => (
                    <li
                      key={`${item.kind}-${item.kind === "added" ? item.row.kw : item.kw}`}
                      className="px-3 py-2 text-sm"
                    >
                      {item.kind === "changed" && (
                        <>
                          <p className="flex items-center gap-2">
                            <Badge variant="outline">เปลี่ยน</Badge>
                            <span>On-grid {th(item.kw)} kW</span>
                          </p>
                          {item.changes.map((change) => (
                            <p key={change.field} className="mt-0.5 pl-1 text-xs">
                              {FIELD_LABELS[change.field]} <span className="sr-only">เดิม</span>
                              <s className="text-muted-foreground">
                                {formatFieldValue(change.field, change.current)}
                              </s>{" "}
                              → <span className="sr-only">ใหม่</span>
                              <mark className="rounded bg-amber-50 px-1 font-semibold text-foreground">
                                {formatFieldValue(change.field, change.next)}
                              </mark>
                            </p>
                          ))}
                        </>
                      )}
                      {item.kind === "removed" && (
                        <p className="flex flex-wrap items-center gap-2">
                          <Badge variant="destructive">ลบ</Badge>
                          <span>On-grid {th(item.kw)} kW — ขนาดนี้จะไม่ถูกแนะนำอีก</span>
                        </p>
                      )}
                      {item.kind === "added" && (
                        <p className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">เพิ่ม</Badge>
                          <span>
                            On-grid {th(item.row.kw)} kW · {phaseText(item.row.phases)} ·{" "}
                            {th(item.row.billMin)}–{th(item.row.billMax)} ฿ · {item.row.panels} แผง
                          </span>
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
                {items.length > MAX_ITEMS && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-expanded={showAll}
                    aria-controls="calc-tables-diff-list"
                    onClick={() => setShowAll((v) => !v)}
                  >
                    {showAll ? "ย่อรายการ" : `แสดงทั้งหมด (${items.length})`}
                  </Button>
                )}
              </>
            )}
          </section>

          {diff.warnings.length > 0 && (
            <div
              id="calc-tables-warnings"
              role="group"
              aria-labelledby="calc-tables-warnings-heading"
              className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800"
            >
              <p id="calc-tables-warnings-heading" className="flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="size-4" />
                คำเตือน {diff.warnings.length} ข้อ — บันทึกได้ แต่โปรดตรวจ
              </p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {diff.warnings.map((w, i) => (
                  <li key={i}>{w.message}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-auto text-xs text-muted-foreground">
            ลูกค้าเห็นทันทีหลังบันทึก ย้อนกลับได้จากประวัติ
          </span>
          <Button type="button" id="calc-tables-confirm-back" variant="outline" disabled={saving} onClick={onBack}>
            กลับไปแก้
          </Button>
          <Button
            type="button"
            id="calc-tables-confirm-save"
            disabled={blocked}
            onClick={onSave}
            autoFocus
          >
            {saving ? "กำลังบันทึก…" : "ยืนยัน บันทึกและใช้ทันที"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
