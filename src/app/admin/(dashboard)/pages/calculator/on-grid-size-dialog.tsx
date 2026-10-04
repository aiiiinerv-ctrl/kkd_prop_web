"use client";

// Edit / add one On-grid size (R1-S6, design-162 §5, variant B). The dialog
// edits a local copy; "ตกลง" hands it to the tab's working copy (nothing is
// saved until the confirm dialog). kW of an existing size is read-only (Q3) —
// delete and add a new one instead.
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { sizeRowKwhPerMonth, sizeRowMonthlySavingThb } from "@/lib/calculator";
import {
  FIELD_DOM_ID,
  FIELD_LABEL,
  validateDraft,
  type DraftField,
  type DraftRow,
  type DraftValues,
} from "@/hooks/admin/use-table-draft";
import { cn } from "@/lib/utils";
import { NumInput } from "./calculator-num-input";

const th = (n: number) => n.toLocaleString("th-TH");
const PANEL_KW = 0.63;
const ON_GRID_PANEL_FACTOR = 1.15;

const fmtKw = (n: number) => n.toLocaleString("th-TH", { maximumFractionDigits: 2 });
const isNum = (v: number | null): v is number => typeof v === "number" && Number.isFinite(v);

function focusField(id: string) {
  const el = document.getElementById(id);
  el?.scrollIntoView({ block: "center" });
  el?.focus();
}

function Field({
  label,
  field,
  errors,
  helper,
  children,
}: {
  label: string;
  field: DraftField;
  errors: string[];
  helper?: ReactNode;
  children: ReactNode;
}) {
  const id = FIELD_DOM_ID[field];
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
      {helper ? <p className="text-xs whitespace-normal text-muted-foreground">{helper}</p> : null}
    </div>
  );
}

export function OnGridSizeDialog({
  row,
  others,
  focusFieldName,
  onCommit,
  onDelete,
  onClose,
}: {
  /** null = adding a new size. */
  row: DraftRow | null;
  /** Every other draft row (for cross-row rules and the bill hint). */
  others: DraftRow[];
  /** Field to focus on open (from the save bar's "ไปที่จุดแรก"). */
  focusFieldName?: DraftField | null;
  onCommit: (values: DraftValues) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const isNew = row === null;
  const kwLocked = row?.original != null;

  const [initial] = useState<DraftValues>(() => {
    if (row) return row.current;
    const last = others
      .filter((r) => !r.deleted && isNum(r.current.kw))
      .sort((a, b) => (a.current.kw as number) - (b.current.kw as number))
      .pop();
    return {
      kw: null,
      phases: [1, 3],
      sunHours: last?.current.sunHours ?? 5,
      days: last?.current.days ?? 30,
      pricePerKwh: last?.current.pricePerKwh ?? 4.5,
      panels: null,
      roofM2: null,
      billMin: isNum(last?.current.billMax ?? null) ? (last!.current.billMax as number) : 0,
      billMax: null,
    };
  });
  const [values, setValues] = useState<DraftValues>(initial);
  const [touched, setTouched] = useState<Set<DraftField>>(new Set());
  // Editing a size that already has problems opens with those problems visible (M1).
  const [forceAll, setForceAll] = useState(
    () =>
      !!focusFieldName ||
      (row !== null &&
        validateDraft([...others, { key: "__dialog__", original: row.original, current: initial, deleted: false }]).issues.some(
          (i) => i.key === "__dialog__" && i.field !== "table"
        ))
  );
  const [discarding, setDiscarding] = useState(false);

  const changed = JSON.stringify(values) !== JSON.stringify(initial);
  const set = (patch: Partial<DraftValues>) => setValues((v) => ({ ...v, ...patch }));
  const touch = (f: DraftField) => setTouched((s) => new Set(s).add(f));
  const visible = (f: DraftField) => forceAll || touched.has(f);

  // Validate the whole table with this size's pending values swapped in, so
  // cross-row rules (billMax increasing, duplicate kW) point at the right field.
  const issues = useMemo(() => {
    const me: DraftRow = {
      key: "__dialog__",
      original: row?.original ?? null,
      current: values,
      deleted: false,
    };
    return validateDraft([...others, me]).issues.filter((i) => i.key === "__dialog__");
  }, [values, others, row]);
  const visibleErrors = issues.filter((i) => i.field !== "table" && visible(i.field));
  const errorsFor = (f: DraftField) => visibleErrors.filter((i) => i.field === f).map((i) => i.message);

  const prev = useMemo(() => {
    const kw = isNum(values.kw) ? values.kw : Number.POSITIVE_INFINITY;
    return others
      .filter((r) => !r.deleted && isNum(r.current.kw) && isNum(r.current.billMax) && (r.current.kw as number) < kw)
      .sort((a, b) => (a.current.kw as number) - (b.current.kw as number))
      .pop();
  }, [others, values.kw]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (focusFieldName) focusField(FIELD_DOM_ID[focusFieldName]);
      else {
        (
          document.querySelector(
            "#calc-size-dialog input:not([readonly]):not([type=checkbox])"
          ) as HTMLElement | null
        )?.focus();
      }
    }, 60);
    return () => clearTimeout(t);
  }, [focusFieldName]);

  function attemptClose() {
    if (changed) setDiscarding(true);
    else onClose();
  }

  function numField(key: Exclude<keyof DraftValues, "phases">, field: DraftField, extra?: { readOnly?: boolean; placeholder?: string }) {
    const id = FIELD_DOM_ID[field];
    const err = errorsFor(field).length > 0;
    return (
      <NumInput
        id={id}
        value={values[key]}
        onValue={(v) => set({ [key]: v } as Partial<DraftValues>)}
        onBlurValue={() => touch(field)}
        error={err}
        readOnly={extra?.readOnly}
        placeholder={extra?.placeholder}
        describedBy={err ? `${id}-error` : undefined}
      />
    );
  }

  const kw = isNum(values.kw) && values.kw > 0 ? values.kw : null;
  const calc =
    kw !== null && isNum(values.sunHours) && isNum(values.days) && isNum(values.pricePerKwh)
      ? {
          kwh: sizeRowKwhPerMonth({ kw, sunHours: values.sunHours, days: values.days }),
          saving: sizeRowMonthlySavingThb({
            kw,
            sunHours: values.sunHours,
            days: values.days,
            pricePerKwh: values.pricePerKwh,
          }),
        }
      : null;
  const panelsByFormula = kw !== null ? Math.ceil((kw * ON_GRID_PANEL_FACTOR) / PANEL_KW) : null;

  const title = isNew
    ? "เพิ่มขนาดใหม่ · On-grid"
    : `แก้ขนาด ${fmtKw(isNum(values.kw) ? values.kw : (row.original?.kw ?? 0))} kW · On-grid`;

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
        className="max-h-[90vh] w-full overflow-y-auto sm:max-w-3xl max-sm:h-dvh max-sm:max-h-dvh max-sm:max-w-none max-sm:rounded-none"
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            ค่าจะยังไม่ขึ้นหน้าเว็บจนกว่าจะกด &quot;ตรวจและบันทึก&quot; ที่แถบด้านล่างหน้า
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 space-y-4">
          {visibleErrors.length > 0 && (
            <div
              id="calc-size-dialog-errors"
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3"
            >
              <p className="font-semibold text-destructive">ต้องแก้ {visibleErrors.length} จุดก่อนบันทึก</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {visibleErrors.map((issue, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      className="text-left text-primary underline-offset-2 hover:underline"
                      onClick={() => focusField(FIELD_DOM_ID[issue.field as DraftField])}
                    >
                      {issue.message}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field
              label={FIELD_LABEL.kw}
              field="kw"
              errors={errorsFor("kw")}
              helper={kwLocked ? "เปลี่ยนขนาดไม่ได้ ต้องลบแล้วเพิ่มขนาดใหม่" : undefined}
            >
              {numField("kw", "kw", { readOnly: kwLocked })}
            </Field>

            <fieldset className="min-w-0 space-y-1">
              <legend className="text-xs font-medium">เฟส</legend>
              <div className="flex h-9 items-center gap-4">
                {([1, 3] as const).map((p) => (
                  <label key={p} className="flex items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      id={`og-phase-${p}`}
                      checked={values.phases.includes(p)}
                      onChange={(event) => {
                        const next = event.target.checked
                          ? [...new Set([...values.phases, p])]
                          : values.phases.filter((x) => x !== p);
                        set({ phases: next.sort() as (1 | 3)[] });
                        touch("phases");
                      }}
                      className="size-4 accent-[var(--primary)]"
                    />
                    {p} เฟส
                  </label>
                ))}
              </div>
              {errorsFor("phases").map((message, i) => (
                <p key={i} className="mt-1 text-xs text-destructive">
                  {message}
                </p>
              ))}
            </fieldset>

            <Field label={FIELD_LABEL.sunHours} field="sunHours" errors={errorsFor("sunHours")}>
              {numField("sunHours", "sunHours")}
            </Field>
            <Field label={FIELD_LABEL.days} field="days" errors={errorsFor("days")}>
              {numField("days", "days")}
            </Field>
            <Field label={FIELD_LABEL.pricePerKwh} field="pricePerKwh" errors={errorsFor("pricePerKwh")}>
              {numField("pricePerKwh", "pricePerKwh")}
            </Field>
            <Field label={FIELD_LABEL.panels} field="panels" errors={errorsFor("panels")}>
              {numField("panels", "panels")}
            </Field>
            <Field
              label={FIELD_LABEL.roofM2}
              field="roofM2"
              errors={errorsFor("roofM2")}
              helper="ว่างได้ ระบบจะใช้ แผง × 2.7"
            >
              {numField("roofM2", "roofM2")}
            </Field>
            <Field label={FIELD_LABEL.billMin} field="billMin" errors={errorsFor("billMin")}>
              {numField("billMin", "billMin")}
            </Field>
            <Field
              label={FIELD_LABEL.billMax}
              field="billMax"
              errors={errorsFor("billMax")}
              helper={
                prev
                  ? `ต้องมากกว่าค่าไฟสูงสุดของขนาดที่เล็กกว่า (${fmtKw(prev.current.kw as number)} kW: ${th(prev.current.billMax as number)} ฿)`
                  : "ขนาดแรกของตาราง"
              }
            >
              {numField("billMax", "billMax")}
            </Field>
          </div>

          <dl
            aria-live="off"
            className="grid gap-2 rounded-lg border border-border bg-muted/20 p-4 text-sm sm:grid-cols-3"
          >
            <div>
              <dt className="text-xs text-muted-foreground">ผลิตต่อเดือน</dt>
              <dd className="tabular-nums">{calc ? `${th(Math.round(calc.kwh))} kWh` : "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">ประหยัดต่อเดือน</dt>
              <dd className="tabular-nums">{calc ? `฿${th(Math.round(calc.saving))}` : "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">แผงตามสูตร</dt>
              <dd className="tabular-nums">{panelsByFormula !== null ? `≈${panelsByFormula}` : "—"}</dd>
            </div>
          </dl>
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
            {row ? (
              <Button
                type="button"
                id="calc-size-dialog-delete"
                variant="ghost"
                className={cn("mr-auto text-destructive")}
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
