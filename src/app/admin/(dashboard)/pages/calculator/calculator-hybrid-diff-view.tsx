"use client";

// Shared Hybrid diff presentation (R2-S6 save-confirm dialog + R2-S7 import
// preview, design-162 §7.1 item 3 / §8.3 item 7): the per-kW change list, the
// sample-bill outcome text and a read-only price table. The diff itself is
// `diffHybridTables` (client-safe import from diff.ts) — brand names / prices
// are fine here because this is the ADMIN back office only.
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { HybridRow } from "@/lib/calculator-hybrid";
import { hybridRowPaybacks } from "@/hooks/admin/hybrid-draft";
import type { HybridSampleOutcome, HybridTableDiff } from "@/lib/calculator-import/diff";
import type { DiffFieldName } from "@/lib/calculator-import/diff";
import { FIELD_LABELS, formatFieldValue } from "./calculator-table-format";

const th = (n: number) => n.toLocaleString("th-TH");

export type HybridDiffLine =
  | { kind: "change"; label: string; before: string; after: string }
  | { kind: "text"; text: string };

export type HybridDiffGroup =
  | { kw: number; kind: "changed"; lines: HybridDiffLine[] }
  | { kw: number; kind: "added"; summary: string }
  | { kw: number; kind: "removed"; summary: string };

const priceText = (p: number | null) => (p === null ? "ไม่มีราคา" : `฿${th(p)}`);

/** Groups a Hybrid diff by kW: a size that did not exist / no longer exists is one
 * line; a size that stays lists its shared-value changes, price changes and
 * added / removed battery rows (design-162 §7.1 item 3). */
export function buildHybridDiffGroups(diff: HybridTableDiff): HybridDiffGroup[] {
  const kwsBefore = new Set(diff.currentKws);
  const kwsAfter = new Set(diff.nextKws);
  const allKws = [
    ...new Set([...diff.added, ...diff.removed, ...diff.changed].map((r) => r.kw)),
  ].sort((a, b) => a - b);

  return allKws.map((kw): HybridDiffGroup => {
    const added = diff.added.filter((r) => r.kw === kw);
    const removed = diff.removed.filter((r) => r.kw === kw);
    const changed = diff.changed.filter((r) => r.kw === kw);

    if (!kwsBefore.has(kw)) {
      const phases = [...new Set(added.map((r) => r.phase))].sort().join(", ");
      const batteries = [...new Set(added.map((r) => r.batteryKwh))].sort((a, b) => a - b).map(th).join(" · ");
      return { kw, kind: "added", summary: `Hybrid ${th(kw)} kW · ${phases} เฟส · แบต ${batteries}` };
    }
    if (!kwsAfter.has(kw)) {
      return {
        kw,
        kind: "removed",
        summary: `Hybrid ${th(kw)} kW (${removed.length} แถว) — ขนาดนี้จะไม่ถูกแนะนำอีก`,
      };
    }

    const lines: HybridDiffLine[] = [];
    // Shared values: identical on every row of a kW, so the first changed row says it all.
    const seenFields = new Set<string>();
    for (const row of changed) {
      for (const change of row.changedFields) {
        if (change.field === "brandPrices" || seenFields.has(change.field)) continue;
        seenFields.add(change.field);
        const field = change.field as DiffFieldName;
        lines.push({
          kind: "change",
          label: FIELD_LABELS[field],
          before: formatFieldValue(field, change.current),
          after: formatFieldValue(field, change.next),
        });
      }
    }
    // Per-brand prices (and brand renames, possible through an Excel import).
    const renamed = new Set<string>();
    for (const row of changed) {
      const cur = row.current.brandPrices;
      const next = row.next.brandPrices;
      next.forEach((np, i) => {
        const cp = cur[i];
        if (!cp) return;
        if (cp.brand !== np.brand && !renamed.has(`${i}`)) {
          renamed.add(`${i}`);
          lines.push({ kind: "change", label: "ชื่อยี่ห้อ", before: cp.brand, after: np.brand });
        }
        if (cp.priceThb !== np.priceThb) {
          lines.push({
            kind: "change",
            label: `ราคา ${np.brand} · ${row.phase} เฟส · แบต ${th(row.batteryKwh)}`,
            before: priceText(cp.priceThb),
            after: priceText(np.priceThb),
          });
        }
      });
    }
    for (const r of added) lines.push({ kind: "text", text: `เพิ่มแถว ${r.phase} เฟส แบต ${th(r.batteryKwh)}` });
    for (const r of removed) lines.push({ kind: "text", text: `ลบแถว ${r.phase} เฟส แบต ${th(r.batteryKwh)}` });
    return { kw, kind: "changed", lines };
  });
}

/** The same group counts the confirm description uses. */
export function countHybridGroups(groups: HybridDiffGroup[]) {
  return {
    changed: groups.filter((g) => g.kind === "changed").length,
    added: groups.filter((g) => g.kind === "added").length,
    removed: groups.filter((g) => g.kind === "removed").length,
  };
}

/** One list item for a Hybrid group (rendered inside the same `<ul>` as the On-grid items). */
export function HybridDiffItem({ group }: { group: HybridDiffGroup }) {
  return (
    <li className="px-3 py-2 text-sm" data-hybrid-kw={group.kw}>
      {group.kind === "changed" && (
        <>
          <p className="flex items-center gap-2">
            <Badge variant="outline">เปลี่ยน</Badge>
            <span>Hybrid {th(group.kw)} kW</span>
          </p>
          {group.lines.map((line, i) =>
            line.kind === "change" ? (
              <p key={i} className="mt-0.5 pl-1 text-sm">
                {line.label} <span className="sr-only">เดิม</span>
                <s className="text-muted-foreground">{line.before}</s> → <span className="sr-only">ใหม่</span>
                <mark className="rounded bg-amber-50 px-1 font-semibold text-foreground">{line.after}</mark>
              </p>
            ) : (
              <p key={i} className="mt-0.5 pl-1 text-sm">
                {line.text}
              </p>
            )
          )}
        </>
      )}
      {group.kind === "removed" && (
        <p className="flex flex-wrap items-center gap-2">
          <Badge variant="destructive">ลบ</Badge>
          <span>{group.summary}</span>
        </p>
      )}
      {group.kind === "added" && (
        <p className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">เพิ่ม</Badge>
          <span>{group.summary}</span>
        </p>
      )}
    </li>
  );
}

/** "5 kW · แบต 16" / "เกินตาราง" / "—" for a Hybrid sample bill. */
export function hybridOutcomeText(o: HybridSampleOutcome): string {
  if (o.status === "tooLarge") return "เกินตาราง";
  if (o.status === "empty" || o.kw === null) return "—";
  const base = `${th(o.kw)} kW${o.batteryKwh !== null ? ` · แบต ${th(o.batteryKwh)}` : ""}`;
  return o.status === "belowFirstRow" ? `${base} (ต่ำกว่าช่วง)` : base;
}

export function hybridSampleChanged(s: { before: HybridSampleOutcome; after: HybridSampleOutcome }): boolean {
  return (
    s.before.kw !== s.after.kw || s.before.batteryKwh !== s.after.batteryKwh || s.before.status !== s.after.status
  );
}

/** "แสดง (2.7 ปี)" / "แสดง (2.7 → 3.1 ปี)" / "ไม่แสดง (ไม่มีราคา)" — whether payback shows on the public page. */
export function hybridPaybackText(s: { before: HybridSampleOutcome; after: HybridSampleOutcome }): string {
  const { before, after } = s;
  if (after.status === "tooLarge") return "ไม่แสดง (เกินตาราง)";
  if (after.status === "empty") return "ไม่แสดง";
  if (after.paybackYears === null) return "ไม่แสดง (ไม่มีราคา)";
  const next = after.paybackYears.toFixed(1);
  if (before.paybackYears !== null && before.paybackYears.toFixed(1) !== next) {
    return `แสดง (${before.paybackYears.toFixed(1)} → ${next} ปี)`;
  }
  return `แสดง (${next} ปี)`;
}

/** Read-only phase x battery x brand price table (design-162 §8.3 item 7, "ดูตารางทั้งหมด"). */
export function HybridPriceTableReadonly({
  rows,
  id,
  multiplier,
}: {
  rows: HybridRow[];
  id?: string;
  /** Annual multiplier of the live config — adds the saving / payback columns of the editor dialog. */
  multiplier?: number;
}) {
  const brands = rows[0]?.brandPrices.map((b) => b.brand) ?? [];
  const paybacks = multiplier === undefined ? null : hybridRowPaybacks(rows, multiplier);
  return (
    <div id={id} className="overflow-x-auto rounded-md border text-xs">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 bg-card whitespace-nowrap">ขนาด · เฟส · แบต</TableHead>
            <TableHead className="whitespace-nowrap text-right">ช่วงค่าไฟ (฿)</TableHead>
            <TableHead className="whitespace-nowrap text-right">แผง</TableHead>
            {brands.map((b) => (
              <TableHead key={b} className="whitespace-nowrap text-right">
                {b}
              </TableHead>
            ))}
            {paybacks && <TableHead className="whitespace-nowrap text-right">ประหยัด/ด.*</TableHead>}
            {paybacks && <TableHead className="whitespace-nowrap text-right">คืนทุน (ปี)*</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, ri) => (
            <TableRow key={`${r.kw}|${r.phase}|${r.batteryKwh}`}>
              <TableCell className="sticky left-0 bg-card whitespace-nowrap font-medium">
                {th(r.kw)} kW · {r.phase}φ · {th(r.batteryKwh)}
              </TableCell>
              <TableCell className="text-right tabular-nums whitespace-nowrap">
                {th(r.billMin)}–{th(r.billMax)}
              </TableCell>
              <TableCell className="text-right tabular-nums">{r.panels}</TableCell>
              {r.brandPrices.map((bp, i) => (
                <TableCell key={i} className="text-right tabular-nums whitespace-nowrap">
                  {bp.priceThb === null ? "—" : th(bp.priceThb)}
                </TableCell>
              ))}
              {paybacks && (
                <TableCell className="bg-muted/40 text-right tabular-nums text-muted-foreground">
                  ฿{th(Math.round(paybacks[ri].saving))}
                </TableCell>
              )}
              {paybacks && (
                <TableCell className="bg-muted/40 text-right tabular-nums text-muted-foreground">
                  {paybacks[ri].paybackYears === null ? "—" : paybacks[ri].paybackYears!.toFixed(2)}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {paybacks && (
        <p className="border-t px-3 py-2 text-xs text-muted-foreground">
          * คืนทุน = ราคาต่ำสุดที่ใช้ได้ ÷ (ประหยัด/เดือน × {multiplier})
        </p>
      )}
    </div>
  );
}
