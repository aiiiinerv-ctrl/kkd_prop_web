"use client";

// Edit / add one Hybrid size (R2-S6, design-162 §5.4). A Hybrid size is every
// phase x battery row of one kW: the shared values (sun hours, days, panels,
// bill range, ...) apply to all of them, the prices are per brand. The dialog
// edits a local copy; "ตกลง" hands it to the tab's working copy (nothing is
// saved until the confirm dialog). Brand names are read-only here — they come
// from the Excel file (Default #11).
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Lock, LockKeyhole, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  HYBRID_FIELD_DOM_ID,
  HYBRID_FIELD_LABEL,
  hybridBatteryInputId,
  hybridPriceId,
  hybridRowPaybacks,
  isIgnoredBatteryPrice,
  liveRows,
  livePhases,
  panelsFormulaGap,
  resolveHybridSize,
  validateHybridDraft,
  type DraftHybridSize,
  type HybridBatteryDraft,
  type HybridField,
  type HybridIssue,
  type HybridSharedField,
  type HybridSizeValues,
} from "@/hooks/admin/hybrid-draft";
import { cn } from "@/lib/utils";
import { expectedPanels } from "@/lib/calculator-import/validate-hybrid";
import { NumInput } from "./calculator-num-input";

const th = (n: number) => n.toLocaleString("th-TH");
const fmtKw = (n: number) => n.toLocaleString("th-TH", { maximumFractionDigits: 2 });
const isNum = (v: number | null): v is number => typeof v === "number" && Number.isFinite(v);

export type HybridDialogFocus = { field: HybridField; rowKey?: string };

function focusId(id: string) {
  const el = document.getElementById(id);
  el?.scrollIntoView({ block: "center" });
  el?.focus();
}

function Field({
  label,
  id,
  errors,
  warning,
  helper,
  children,
}: {
  label: string;
  id: string;
  errors: string[];
  warning?: string | null;
  helper?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-1">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      {children}
      {errors.map((message, i) => (
        <p key={i} id={`${id}-error`} className="mt-1 text-xs whitespace-normal text-destructive">
          {message}
        </p>
      ))}
      {warning && errors.length === 0 ? (
        <p id={`${id}-warning`} className="mt-1 text-xs whitespace-normal text-amber-800">
          {warning}
        </p>
      ) : null}
      {helper ? <p className="text-xs whitespace-normal text-muted-foreground">{helper}</p> : null}
    </div>
  );
}

const rowOrder = (a: HybridBatteryDraft, b: HybridBatteryDraft) =>
  a.phase - b.phase ||
  (isNum(a.batteryKwh) ? a.batteryKwh : Number.POSITIVE_INFINITY) -
    (isNum(b.batteryKwh) ? b.batteryKwh : Number.POSITIVE_INFINITY);

export function HybridSizeDialog({
  size,
  others,
  brands,
  multiplier,
  focus,
  onCommit,
  onDelete,
  onClose,
}: {
  /** null = adding a new size. */
  size: DraftHybridSize | null;
  /** Every other draft size (for cross-size rules and the bill hint). */
  others: DraftHybridSize[];
  brands: string[];
  /** Annual multiplier of the live config (payback column). */
  multiplier: number;
  /** Field to focus on open (from the save bar's "ไปที่จุดแรก"). */
  focus?: HybridDialogFocus | null;
  onCommit: (values: HybridSizeValues) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const isNew = size === null;
  const kwLocked = size?.original != null;
  const seq = useRef(0);
  const nextKey = () => `new-${++seq.current}`;
  const blankPrices = () => brands.map(() => null as number | null);

  const [initial] = useState<HybridSizeValues>(() => {
    if (size) return size.current;
    const last = others
      .filter((s) => !s.deleted && isNum(s.current.kw))
      .sort((a, b) => (a.current.kw as number) - (b.current.kw as number))
      .pop();
    return {
      kw: null,
      sunHours: last?.current.sunHours ?? 5,
      days: last?.current.days ?? 30,
      pricePerKwh: last?.current.pricePerKwh ?? 4.5,
      panels: null,
      roofM2: null,
      billMin: isNum(last?.current.billMax ?? null) ? (last!.current.billMax as number) : 0,
      billMax: null,
      rows: [
        {
          key: `new-${++seq.current}`,
          phase: 3,
          batteryKwh: 0,
          prices: blankPrices(),
          isNew: true,
          deleted: false,
        },
      ],
    };
  });
  const [values, setValues] = useState<HybridSizeValues>(initial);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  // Editing a size that already has problems opens with those problems visible (M1).
  const [forceAll, setForceAll] = useState(
    () =>
      !!focus ||
      (size !== null &&
        validateHybridDraft(
          [...others, { key: "__dialog__", original: size.original, current: initial, deleted: false }],
          brands
        ).issues.some((i) => i.key === "__dialog__" && i.field !== "table"))
  );
  const [discarding, setDiscarding] = useState(false);
  const [removePhase, setRemovePhase] = useState<1 | 3 | null>(null);
  // Remount a price input after it was cleared by "0 = no price" (NumInput keeps its typed text).
  const [clearNonce, setClearNonce] = useState<Record<string, number>>({});

  const changed = JSON.stringify(values) !== JSON.stringify(initial);
  const set = (patch: Partial<HybridSizeValues>) => setValues((v) => ({ ...v, ...patch }));
  const touch = (name: string) => setTouched((s) => new Set(s).add(name));
  const setRows = (fn: (rows: HybridBatteryDraft[]) => HybridBatteryDraft[]) =>
    setValues((v) => ({ ...v, rows: fn(v.rows) }));
  const patchRow = (key: string, patch: Partial<HybridBatteryDraft>) =>
    setRows((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  // Validate the whole table with this size's pending values swapped in, so
  // cross-size rules (billMax increasing) point at the right field.
  const issues = useMemo<HybridIssue[]>(() => {
    const me: DraftHybridSize = {
      key: "__dialog__",
      original: size?.original ?? null,
      current: values,
      deleted: false,
    };
    return validateHybridDraft([...others, me], brands).issues.filter((i) => i.key === "__dialog__");
  }, [values, others, brands, size]);
  const isRowField = (i: HybridIssue) => i.field === "batteryKwh" || i.field === "prices";
  const issueVisible = (i: HybridIssue) =>
    forceAll || touched.has(isRowField(i) && i.rowKey ? `row:${i.rowKey}` : i.field);
  const visibleErrors = issues.filter((i) => i.field !== "table" && issueVisible(i));
  // Only battery / price problems belong to one row; every other field is shared by all rows of the
  // size, so the validator reports it once per row — show it once, under its own field.
  const issueKey = (i: HybridIssue) => `${i.field}|${i.message}|${isRowField(i) ? (i.rowKey ?? "") : ""}`;
  const summaryErrors = visibleErrors.filter((i, idx, all) => all.findIndex((o) => issueKey(o) === issueKey(i)) === idx);
  const errorsFor = (field: HybridField) =>
    summaryErrors.filter((i) => i.field === field && !isRowField(i)).map((i) => i.message);
  const rowErrors = (rowKey: string) => visibleErrors.filter((i) => i.rowKey === rowKey && isRowField(i));

  const prev = useMemo(() => {
    const kw = isNum(values.kw) ? values.kw : Number.POSITIVE_INFINITY;
    return others
      .filter((s) => !s.deleted && isNum(s.current.kw) && isNum(s.current.billMax) && (s.current.kw as number) < kw)
      .sort((a, b) => (a.current.kw as number) - (b.current.kw as number))
      .pop();
  }, [others, values.kw]);

  const phases = livePhases(values);
  const sortedRows = useMemo(() => [...values.rows].sort(rowOrder), [values.rows]);

  function idForIssue(issue: HybridIssue): string {
    if (issue.rowKey) {
      const row = values.rows.find((r) => r.key === issue.rowKey);
      if (row) {
        if (issue.field === "batteryKwh" && row.isNew) return hybridBatteryInputId(row);
        return hybridPriceId(0, row);
      }
    }
    return HYBRID_FIELD_DOM_ID[issue.field as keyof typeof HYBRID_FIELD_DOM_ID] ?? "hy-kw";
  }

  useEffect(() => {
    const t = setTimeout(() => {
      if (focus) {
        const row = focus.rowKey ? values.rows.find((r) => r.key === focus.rowKey) : null;
        if (row && focus.field === "batteryKwh" && row.isNew) focusId(hybridBatteryInputId(row));
        else if (row) focusId(hybridPriceId(0, row));
        else focusId(HYBRID_FIELD_DOM_ID[focus.field as keyof typeof HYBRID_FIELD_DOM_ID] ?? "hy-kw");
      } else {
        (
          document.querySelector(
            "#calc-size-dialog input:not([readonly]):not([type=checkbox])"
          ) as HTMLElement | null
        )?.focus();
      }
    }, 60);
    return () => clearTimeout(t);
    // Mount-only: later edits of `values` must not steal focus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function attemptClose() {
    if (changed) setDiscarding(true);
    else onClose();
  }

  function togglePhase(p: 1 | 3, checked: boolean) {
    touch("phases");
    if (!checked) {
      if (phases.filter((x) => x !== p).length === 0) return; // keep at least one phase
      setRemovePhase(p);
      return;
    }
    setRows((rows) => {
      if (rows.some((r) => r.phase === p)) {
        return rows.map((r) => (r.phase === p ? { ...r, deleted: false } : r));
      }
      // New phase: same battery set as an existing phase, prices blank (design-162 §5.4).
      const templatePhase = phases[0];
      const template = rows.filter((r) => r.phase === templatePhase && !r.deleted);
      const copies = (template.length ? template : [{ batteryKwh: 0 } as HybridBatteryDraft]).map((r) => ({
        key: nextKey(),
        phase: p,
        batteryKwh: r.batteryKwh,
        prices: blankPrices(),
        isNew: true,
        deleted: false,
      }));
      return [...rows, ...copies];
    });
  }

  function confirmRemovePhase() {
    const p = removePhase;
    setRemovePhase(null);
    if (p === null) return;
    setRows((rows) =>
      rows.flatMap((r) => (r.phase !== p ? [r] : r.isNew ? [] : [{ ...r, deleted: true }]))
    );
  }

  function addBatteryRow() {
    const phase = phases[0] ?? 3;
    const key = nextKey();
    setRows((rows) => [
      ...rows,
      { key, phase, batteryKwh: null, prices: blankPrices(), isNew: true, deleted: false },
    ]);
    setTimeout(() => focusId(`hy-battery-${key}`), 60);
  }

  function removeRow(row: HybridBatteryDraft) {
    if (row.isNew) setRows((rows) => rows.filter((r) => r.key !== row.key));
    else patchRow(row.key, { deleted: true });
  }

  function sharedInput(field: HybridSharedField | "kw", extra?: { readOnly?: boolean }) {
    const id = HYBRID_FIELD_DOM_ID[field];
    const err = errorsFor(field).length > 0;
    const warn = field === "panels" && !err && panelsFormulaGap(values.kw, values.panels) !== null;
    return (
      <NumInput
        id={id}
        value={values[field]}
        onValue={(v) => set({ [field]: v } as Partial<HybridSizeValues>)}
        onBlurValue={() => touch(field)}
        error={err}
        warn={warn}
        readOnly={extra?.readOnly}
        describedBy={err ? `${id}-error` : warn ? `${id}-warning` : undefined}
      />
    );
  }

  const kw = isNum(values.kw) && values.kw > 0 ? values.kw : null;
  const formulaPanels = kw !== null ? Math.ceil(expectedPanels(kw)) : null;
  const gap = panelsFormulaGap(values.kw, values.panels);

  // Saving / payback per row (design-162 §5.4) — only while the size is complete enough to resolve.
  const resolved = useMemo(() => resolveHybridSize(values, brands), [values, brands]);
  const paybackByKey = useMemo(() => {
    const out = new Map<string, ReturnType<typeof hybridRowPaybacks>[number]>();
    if (!resolved) return out;
    const paybacks = hybridRowPaybacks(resolved, multiplier);
    const keyed = [...liveRows(values)].sort(
      (a, b) => a.phase - b.phase || (a.batteryKwh as number) - (b.batteryKwh as number)
    );
    keyed.forEach((r, i) => out.set(r.key, paybacks[i]));
    return out;
  }, [resolved, values, multiplier]);

  const title = isNew
    ? "เพิ่มขนาดใหม่ · Hybrid"
    : `แก้ขนาด ${fmtKw(isNum(values.kw) ? values.kw : (size.original?.[0]?.kw ?? 0))} kW · Hybrid`;
  const kwLabel = kw !== null ? `${fmtKw(kw)} kW` : "ขนาดใหม่";
  const removeCount = removePhase === null ? 0 : values.rows.filter((r) => r.phase === removePhase && !r.deleted).length;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) attemptClose();
      }}
    >
      <DialogContent
        id="calc-size-dialog"
        showCloseButton={false}
        className="max-h-[90vh] w-full overflow-y-auto sm:max-w-4xl max-sm:h-dvh max-sm:max-h-dvh max-sm:max-w-none max-sm:rounded-none"
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            ค่าจะยังไม่ขึ้นหน้าเว็บจนกว่าจะกด &quot;ตรวจและบันทึก&quot; ที่แถบด้านล่างหน้า
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 space-y-5">
          {summaryErrors.length > 0 && (
            <div
              id="calc-size-dialog-errors"
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3"
            >
              <p className="font-semibold text-destructive">ต้องแก้ {summaryErrors.length} จุดก่อนบันทึก</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {summaryErrors.map((issue, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      className="text-left text-primary underline-offset-2 hover:underline"
                      onClick={() => focusId(idForIssue(issue))}
                    >
                      {issue.message}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <fieldset className="min-w-0 space-y-3">
            <legend className="text-sm font-semibold">
              ค่าที่ใช้ทั้งขนาด {kwLabel} (ทุกเฟส ทุกแบต)
            </legend>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field
                label={HYBRID_FIELD_LABEL.kw}
                id={HYBRID_FIELD_DOM_ID.kw}
                errors={errorsFor("kw")}
                helper={kwLocked ? "เปลี่ยนขนาดไม่ได้ ต้องลบแล้วเพิ่มขนาดใหม่" : undefined}
              >
                {sharedInput("kw", { readOnly: kwLocked })}
              </Field>

              <fieldset className="min-w-0 space-y-1">
                <legend className="text-xs font-medium">เฟสที่มี</legend>
                <div className="flex h-9 items-center gap-4">
                  {([1, 3] as const).map((p) => {
                    const on = phases.includes(p);
                    return (
                      <label key={p} className="flex items-center gap-1.5 text-sm">
                        <input
                          type="checkbox"
                          id={`hy-phase-${p}`}
                          checked={on}
                          disabled={on && phases.length === 1}
                          aria-describedby={on && phases.length === 1 ? "hy-phase-only-hint" : undefined}
                          onChange={(event) => togglePhase(p, event.target.checked)}
                          className="size-4 accent-[var(--primary)]"
                        />
                        {p} เฟส
                      </label>
                    );
                  })}
                </div>
                {phases.length === 1 && (
                  <p id="hy-phase-only-hint" className="text-xs text-muted-foreground">
                    ต้องมีอย่างน้อย 1 เฟส
                  </p>
                )}
                {errorsFor("phases").map((message, i) => (
                  <p key={i} className="mt-1 text-xs text-destructive">
                    {message}
                  </p>
                ))}
                {removePhase !== null && (
                  <div
                    id="hy-phase-remove-confirm"
                    className="flex flex-wrap items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1.5 text-xs"
                  >
                    <span>
                      ลบแถว {removePhase} เฟส ทั้ง {removeCount} แถว?
                    </span>
                    <Button type="button" size="sm" variant="outline" className="h-7" onClick={() => setRemovePhase(null)}>
                      ยกเลิก
                    </Button>
                    <Button
                      type="button"
                      id="hy-phase-remove-ok"
                      size="sm"
                      variant="destructive"
                      className="h-7"
                      onClick={confirmRemovePhase}
                    >
                      ลบแถว
                    </Button>
                  </div>
                )}
              </fieldset>

              <Field label={HYBRID_FIELD_LABEL.sunHours} id={HYBRID_FIELD_DOM_ID.sunHours} errors={errorsFor("sunHours")}>
                {sharedInput("sunHours")}
              </Field>
              <Field label={HYBRID_FIELD_LABEL.days} id={HYBRID_FIELD_DOM_ID.days} errors={errorsFor("days")}>
                {sharedInput("days")}
              </Field>
              <Field
                label={HYBRID_FIELD_LABEL.pricePerKwh}
                id={HYBRID_FIELD_DOM_ID.pricePerKwh}
                errors={errorsFor("pricePerKwh")}
              >
                {sharedInput("pricePerKwh")}
              </Field>
              <Field
                label={HYBRID_FIELD_LABEL.panels}
                id={HYBRID_FIELD_DOM_ID.panels}
                errors={errorsFor("panels")}
                warning={gap ? `ต่างจากสูตร (≈${gap.expected}) เกิน 20%` : null}
                helper={formulaPanels !== null ? `สูตร ≈${formulaPanels}` : undefined}
              >
                {sharedInput("panels")}
              </Field>
              <Field
                label={HYBRID_FIELD_LABEL.roofM2}
                id={HYBRID_FIELD_DOM_ID.roofM2}
                errors={errorsFor("roofM2")}
                helper="ว่างได้ ระบบจะใช้ แผง × 2.7"
              >
                {sharedInput("roofM2")}
              </Field>
              <Field label={HYBRID_FIELD_LABEL.billMin} id={HYBRID_FIELD_DOM_ID.billMin} errors={errorsFor("billMin")}>
                {sharedInput("billMin")}
              </Field>
              <Field
                label={HYBRID_FIELD_LABEL.billMax}
                id={HYBRID_FIELD_DOM_ID.billMax}
                errors={errorsFor("billMax")}
                helper={
                  prev
                    ? `ต้องมากกว่าค่าไฟสูงสุดของขนาดที่เล็กกว่า (${fmtKw(prev.current.kw as number)} kW: ${th(prev.current.billMax as number)} ฿)`
                    : "ขนาดแรกของตาราง"
                }
              >
                {sharedInput("billMax")}
              </Field>
            </div>
          </fieldset>

          <section className="min-w-0 space-y-2" aria-labelledby="hy-price-heading">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 id="hy-price-heading" className="text-sm font-semibold">
                ราคาต่อยี่ห้อ (฿) แยกตามเฟสและแบต
              </h4>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Lock className="size-3.5" aria-hidden />
                ชื่อยี่ห้อมาจากไฟล์ Excel เปลี่ยนชื่อได้ทาง Excel เท่านั้น
              </p>
            </div>

            <div className="overflow-x-auto rounded-md border">
              <Table id="hy-price-table" className="text-xs sm:text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 z-[1] bg-card whitespace-nowrap">เฟส · แบต</TableHead>
                    {brands.map((brand) => (
                      <TableHead key={brand} className="min-w-[5.5rem] text-right whitespace-normal break-words">
                        {brand}
                      </TableHead>
                    ))}
                    <TableHead className="text-right whitespace-normal">ประหยัด/ด.*</TableHead>
                    <TableHead className="text-right whitespace-normal">คืนทุน (ปี)*</TableHead>
                    <TableHead className="sticky right-0 z-[1] w-10 bg-card" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedRows.map((row) => {
                    const errs = rowErrors(row.key);
                    const payback = paybackByKey.get(row.key);
                    const isBase = row.batteryKwh === 0;
                    const label = isNum(row.batteryKwh) ? `${row.phase}φ · ${th(row.batteryKwh)}` : `${row.phase}φ ·`;
                    return (
                      <TableRow key={row.key} data-deleted={row.deleted || undefined}>
                        <TableCell
                          className={cn(
                            "sticky left-0 z-[1] bg-card font-medium whitespace-nowrap",
                            row.deleted && "text-muted-foreground line-through",
                            errs.length > 0 && "shadow-[inset_3px_0_0_var(--destructive)]"
                          )}
                        >
                          {row.isNew ? (
                            <span className="flex items-center gap-1.5">
                              {phases.length > 1 && !row.deleted ? (
                                <select
                                  aria-label="เฟสของแถวใหม่"
                                  value={row.phase}
                                  onChange={(event) => patchRow(row.key, { phase: Number(event.target.value) as 1 | 3 })}
                                  className="h-9 rounded-md border border-input bg-transparent px-1.5 text-sm"
                                >
                                  {phases.map((p) => (
                                    <option key={p} value={p}>
                                      {p}φ
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span>{row.phase}φ</span>
                              )}
                              <span aria-hidden>·</span>
                              <span className="w-16">
                                <NumInput
                                  id={hybridBatteryInputId(row)}
                                  value={row.batteryKwh}
                                  onValue={(v) => patchRow(row.key, { batteryKwh: v })}
                                  onBlurValue={() => touch(`row:${row.key}`)}
                                  error={errs.some((e) => e.field === "batteryKwh")}
                                  ariaLabel={`ขนาดแบตของแถวใหม่ ${row.phase} เฟส (kWh)`}
                                />
                              </span>
                            </span>
                          ) : (
                            <>
                              {label}
                              {isBase && (
                                <>
                                  {" "}
                                  <span className="text-xs font-normal text-muted-foreground">(ไม่มีแบต)</span>
                                </>
                              )}
                            </>
                          )}
                        </TableCell>

                        {brands.map((brand, bi) => {
                          const id = hybridPriceId(bi, row);
                          const ignored = !row.deleted && isIgnoredBatteryPrice(values, row, bi);
                          const priceErr = errs.some((e) => e.field === "prices");
                          const nonce = clearNonce[id] ?? 0;
                          return (
                            <TableCell key={brand} className={cn("align-top", row.deleted && "opacity-50")}>
                              <NumInput
                                key={`${id}-${nonce}`}
                                id={id}
                                value={row.prices[bi] ?? null}
                                placeholder="ไม่มีราคา"
                                ariaLabel={`ราคา ${brand} ${row.phase} เฟส แบต ${isNum(row.batteryKwh) ? row.batteryKwh : "ใหม่"} kWh`}
                                error={priceErr}
                                warn={ignored}
                                readOnly={row.deleted}
                                describedBy={ignored ? `${id}-ignored` : undefined}
                                onValue={(v) =>
                                  patchRow(row.key, {
                                    prices: row.prices.map((p, i) => (i === bi ? v : p)),
                                  })
                                }
                                onBlurValue={() => {
                                  touch(`row:${row.key}`);
                                  // 0 means "no price" (#155): clear it quietly on blur.
                                  if (row.prices[bi] === 0) {
                                    patchRow(row.key, { prices: row.prices.map((p, i) => (i === bi ? null : p)) });
                                    setClearNonce((n) => ({ ...n, [id]: (n[id] ?? 0) + 1 }));
                                  }
                                }}
                              />
                              {ignored && (
                                <p
                                  id={`${id}-ignored`}
                                  title="ยี่ห้อนี้ไม่มีราคาชุดไม่มีแบต ราคานี้จึงไม่นำมาคิดคืนทุน"
                                  className="mt-1 text-xs whitespace-nowrap text-amber-800"
                                >
                                  ไม่นำมาคิด
                                  <span className="sr-only">
                                    {" "}
                                    ยี่ห้อนี้ไม่มีราคาชุดไม่มีแบต ราคานี้จึงไม่นำมาคิดคืนทุน
                                  </span>
                                </p>
                              )}
                            </TableCell>
                          );
                        })}

                        <TableCell className={cn("bg-muted/40 text-right tabular-nums text-muted-foreground", row.deleted && "line-through")}>
                          {payback && !row.deleted ? `฿${th(Math.round(payback.saving))}` : "—"}
                        </TableCell>
                        <TableCell className={cn("bg-muted/40 text-right tabular-nums text-muted-foreground", row.deleted && "line-through")}>
                          {payback && !row.deleted && payback.paybackYears !== null ? (
                            <>
                              {payback.paybackYears.toFixed(2)}
                              <span className="block text-xs">{payback.minBrand}</span>
                            </>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="sticky right-0 z-[1] bg-card text-right shadow-[inset_1px_0_0_var(--border)]">
                          {row.deleted ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => patchRow(row.key, { deleted: false })}
                            >
                              คืน
                            </Button>
                          ) : (
                            isBase ? (
                              <span
                                className="inline-flex size-8 items-center justify-center text-muted-foreground"
                                role="img"
                                aria-label="ลบแถวไม่มีแบตไม่ได้ ถ้าไม่ใช้ขนาดนี้ ให้ลบทั้งขนาด"
                                title="ลบแถวไม่มีแบตไม่ได้ ถ้าไม่ใช้ขนาดนี้ ให้ลบทั้งขนาด"
                              >
                                <LockKeyhole className="size-4" aria-hidden />
                              </span>
                            ) : (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`ลบแถว ${row.phase} เฟส แบต ${isNum(row.batteryKwh) ? row.batteryKwh : "ใหม่"} kWh`}
                              onClick={() => removeRow(row)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                            )
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" id="hy-add-battery" variant="outline" size="sm" onClick={addBatteryRow}>
                <Plus className="size-4" />
                เพิ่มแถวแบต
              </Button>
              <p className="min-w-0 text-xs text-muted-foreground">
                <LockKeyhole className="mr-1 inline size-3.5 align-text-bottom" aria-hidden />
                แถวไม่มีแบต (0 kWh) ลบไม่ได้ ถ้าไม่ใช้ขนาดนี้ ให้ลบทั้งขนาด · ช่องว่างหรือ 0 หมายถึงยี่ห้อนี้ไม่มีราคา · * คืนทุน = ราคาต่ำสุดที่ใช้ได้ ÷ (ประหยัด/เดือน × {multiplier})
              </p>
            </div>
          </section>
        </div>

        {discarding ? (
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2">
            <span className="mr-auto">ทิ้งค่าที่แก้ในหน้าต่างนี้?</span>
            <Button type="button" variant="outline" onClick={() => setDiscarding(false)}>
              แก้ต่อ
            </Button>
            <Button type="button" id="calc-size-dialog-discard" variant="destructive" onClick={onClose}>
              ทิ้ง
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {size ? (
              <Button
                type="button"
                id="calc-size-dialog-delete"
                variant="ghost"
                className="mr-auto text-destructive"
                onClick={onDelete}
              >
                ลบขนาดนี้
              </Button>
            ) : (
              <span className="mr-auto" />
            )}
            <Button type="button" id="calc-size-dialog-cancel" variant="outline" onClick={attemptClose}>
              ยกเลิก
            </Button>
            <Button
              type="button"
              id="calc-size-dialog-ok"
              onClick={() => {
                setForceAll(true);
                onCommit(values);
              }}
            >
              ตกลง
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
