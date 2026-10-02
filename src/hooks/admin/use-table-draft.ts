"use client";

// Working copy of the On-grid size table for the admin editor (R1-S6,
// design-162 §6.1). Edits live only in this client-side reducer until the
// owner confirms the diff dialog; nothing here talks to the server.
//
// Validation is `validateOnGridTable` (the same function the server re-runs
// on save) plus a thin layer for what that function cannot see: fields the
// owner has left blank / typed as text. CLIENT-SAFE — imports only
// validate-on-grid.ts and messages.ts from the import lib, never its index
// (which pulls in exceljs).
import { useMemo, useReducer } from "react";
import { validateOnGridTable } from "@/lib/calculator-import/validate-on-grid";
import type { SizeRow } from "@/lib/calculator-size-table";

export const MAX_ON_GRID_ROWS = 200; // keep in step with savePayloadSchema
export const ROOF_M2_PER_PANEL = 2.7;

export type DraftField =
  | "kw"
  | "phases"
  | "sunHours"
  | "days"
  | "pricePerKwh"
  | "panels"
  | "roofM2"
  | "billMin"
  | "billMax";

/** Form-shaped row: a number field is `null` (blank) or NaN (unparseable text)
 * while the owner is still typing. `roofM2: null` is legal (falls back to
 * panels × 2.7). */
export type DraftValues = {
  kw: number | null;
  phases: (1 | 3)[];
  sunHours: number | null;
  days: number | null;
  pricePerKwh: number | null;
  panels: number | null;
  roofM2: number | null;
  billMin: number | null;
  billMax: number | null;
};

export type DraftRow = {
  key: string;
  /** null for a row the owner added in this session. */
  original: SizeRow | null;
  current: DraftValues;
  deleted: boolean;
};

export type DraftStatus = "same" | "changed" | "new" | "deleted";

export type DraftIssue = {
  /** Draft row key; "" for a whole-table issue. */
  key: string;
  field: DraftField | "table";
  /** Position-free Thai text (no "On-grid 5 kW:" prefix). */
  message: string;
};

export const FIELD_LABEL: Record<DraftField, string> = {
  kw: "ขนาด (kW)",
  phases: "เฟส",
  sunHours: "ชม.แดด/วัน",
  days: "วัน/เดือน",
  pricePerKwh: "ค่าไฟ/หน่วย (฿)",
  panels: "จำนวนแผง",
  roofM2: "หลังคา (ตร.ม.)",
  billMin: "ค่าไฟต่ำสุด (฿)",
  billMax: "ค่าไฟสูงสุด (฿)",
};

/** DOM id of a field's input inside the dialog (design-162 §5.3). */
export const FIELD_DOM_ID: Record<DraftField, string> = {
  kw: "og-kw",
  phases: "og-phase-1",
  sunHours: "og-sun",
  days: "og-days",
  pricePerKwh: "og-price",
  panels: "og-panels",
  roofM2: "og-roof",
  billMin: "og-bill-min",
  billMax: "og-bill-max",
};

const isNum = (v: number | null): v is number => typeof v === "number" && Number.isFinite(v);
const round2 = (n: number) => Math.round(n * 100) / 100;

export function rowToValues(row: SizeRow): DraftValues {
  return {
    kw: row.kw,
    phases: [...row.phases].sort() as (1 | 3)[],
    sunHours: row.sunHours,
    days: row.days,
    pricePerKwh: row.pricePerKwh,
    panels: row.panels,
    roofM2: row.roofM2,
    billMin: row.billMin,
    billMax: row.billMax,
  };
}

/** Turns form values into a SizeRow, or null while a required field is blank. */
export function resolveRow(v: DraftValues): SizeRow | null {
  if (
    !isNum(v.kw) ||
    v.kw <= 0 ||
    v.phases.length === 0 ||
    !isNum(v.sunHours) ||
    !isNum(v.days) ||
    !isNum(v.pricePerKwh) ||
    !isNum(v.panels) ||
    !isNum(v.billMin) ||
    !isNum(v.billMax)
  ) {
    return null;
  }
  const roof = isNum(v.roofM2) && v.roofM2 > 0 ? v.roofM2 : round2(v.panels * ROOF_M2_PER_PANEL);
  return {
    kw: v.kw,
    phases: [...v.phases].sort() as (1 | 3)[],
    sunHours: v.sunHours,
    days: v.days,
    pricePerKwh: v.pricePerKwh,
    panels: v.panels,
    roofM2: roof,
    billMin: v.billMin,
    billMax: v.billMax,
  };
}

function sameRow(a: SizeRow, b: SizeRow): boolean {
  return (
    a.kw === b.kw &&
    a.sunHours === b.sunHours &&
    a.days === b.days &&
    a.pricePerKwh === b.pricePerKwh &&
    a.panels === b.panels &&
    a.roofM2 === b.roofM2 &&
    a.billMin === b.billMin &&
    a.billMax === b.billMax &&
    a.phases.length === b.phases.length &&
    [...a.phases].sort().every((p, i) => p === [...b.phases].sort()[i])
  );
}

/** "Edited back to the original" counts as unchanged (design-162 §6.1). */
export function rowStatus(row: DraftRow): DraftStatus {
  if (!row.original) return "new";
  if (row.deleted) return "deleted";
  const resolved = resolveRow(row.current);
  return resolved && sameRow(resolved, row.original) ? "same" : "changed";
}

/** Which fields of an edited row differ from the original (for highlighting). */
export function changedFields(row: DraftRow): Set<DraftField> {
  const out = new Set<DraftField>();
  const o = row.original;
  if (!o) return out;
  const c = row.current;
  const resolved = resolveRow(c);
  const cmp: [DraftField, unknown, unknown][] = [
    ["kw", c.kw, o.kw],
    ["sunHours", c.sunHours, o.sunHours],
    ["days", c.days, o.days],
    ["pricePerKwh", c.pricePerKwh, o.pricePerKwh],
    ["panels", c.panels, o.panels],
    ["roofM2", resolved?.roofM2 ?? c.roofM2, o.roofM2],
    ["billMin", c.billMin, o.billMin],
    ["billMax", c.billMax, o.billMax],
  ];
  for (const [field, a, b] of cmp) if (a !== b) out.add(field);
  if ([...c.phases].sort().join() !== [...o.phases].sort().join()) out.add("phases");
  return out;
}

const REQUIRED_NUMBERS = ["sunHours", "days", "pricePerKwh", "panels", "billMin", "billMax"] as const;

function localIssues(v: DraftValues): { field: DraftField; message: string }[] {
  const out: { field: DraftField; message: string }[] = [];
  if (!isNum(v.kw) || v.kw <= 0) {
    out.push({ field: "kw", message: `${FIELD_LABEL.kw}: กรอกตัวเลขมากกว่า 0` });
  }
  if (v.phases.length === 0) {
    out.push({ field: "phases", message: "เฟส: เลือกอย่างน้อย 1 เฟส" });
  }
  for (const field of REQUIRED_NUMBERS) {
    if (!isNum(v[field])) out.push({ field, message: `${FIELD_LABEL[field]}: กรอกตัวเลข` });
  }
  if (isNum(v.billMin) && v.billMin < 0) {
    out.push({ field: "billMin", message: `${FIELD_LABEL.billMin}: ต้องไม่ติดลบ` });
  }
  if (v.roofM2 !== null && (!isNum(v.roofM2) || v.roofM2 <= 0)) {
    out.push({ field: "roofM2", message: `${FIELD_LABEL.roofM2}: ต้องมากกว่า 0 หรือเว้นว่างไว้` });
  }
  return out;
}

const VALIDATOR_FIELD: Record<string, DraftField> = {
  kw: "kw",
  sunHours: "sunHours",
  days: "days",
  pricePerKwh: "pricePerKwh",
  panels: "panels",
  billMin: "billMin",
  billMax: "billMax",
};

/** Maps a validator `field` (client or server TableIssue) to a draft field;
 * unknown / missing falls back to "kw" (the row's identity). */
export function toDraftField(field: string | undefined): DraftField {
  return VALIDATOR_FIELD[field ?? ""] ?? "kw";
}

/** Validates the live (not deleted) rows as a whole table. `table` is the
 * resolved, kW-sorted result when there are no issues. */
export function validateDraft(rows: DraftRow[]): { issues: DraftIssue[]; table: SizeRow[] | null } {
  const live = rows.filter((r) => !r.deleted);
  const issues: DraftIssue[] = [];
  if (live.length === 0) {
    return { issues: [{ key: "", field: "table", message: "ตารางต้องมีอย่างน้อย 1 ขนาด" }], table: null };
  }
  if (live.length > MAX_ON_GRID_ROWS) {
    issues.push({ key: "", field: "table", message: `ตารางมีได้ไม่เกิน ${MAX_ON_GRID_ROWS} ขนาด` });
  }

  const complete: { key: string; row: SizeRow }[] = [];
  for (const r of live) {
    const local = localIssues(r.current);
    if (local.length > 0) {
      issues.push(...local.map((i) => ({ key: r.key, ...i })));
      continue;
    }
    const resolved = resolveRow(r.current);
    if (resolved) complete.push({ key: r.key, row: resolved });
  }

  const validation = validateOnGridTable(complete.map((c) => c.row));
  for (const issue of validation.issues) {
    const target = complete[issue.rowIndex];
    issues.push({
      key: target?.key ?? "",
      field: target ? toDraftField(issue.field) : "table",
      message: issue.message,
    });
  }
  if (issues.length > 0) return { issues, table: null };
  return { issues, table: validation.rows };
}

/** "On-grid 5 kW: …" label for lists that mix several rows (save bar, confirm). */
export function issueText(issue: DraftIssue, rows: DraftRow[]): string {
  const row = rows.find((r) => r.key === issue.key);
  if (!row) return issue.message;
  const kw = isNum(row.current.kw) ? `${row.current.kw.toLocaleString("th-TH")} kW` : "ขนาดใหม่";
  return `On-grid ${kw}: ${issue.message}`;
}

// ---- reducer ----

// `baseVersion` = the config version this draft is based on (the optimistic
// lock sent on save). `propsVersion` = the server version last copied from
// props, so a save's local rebase is not undone by stale props before the
// router refresh lands.
type State = { baseVersion: number; propsVersion: number; rows: DraftRow[]; seq: number };

type Action =
  | { type: "reset"; onGrid: SizeRow[]; version: number }
  | { type: "rebase"; onGrid: SizeRow[]; version: number }
  | { type: "commit"; key: string | null; values: DraftValues }
  | { type: "delete"; key: string }
  | { type: "restore"; key: string };

const originalKey = (kw: number) => `og-${String(kw).replace(".", "_")}`;

function init(onGrid: SizeRow[], baseVersion: number, propsVersion: number): State {
  return {
    baseVersion,
    propsVersion,
    seq: 0,
    rows: onGrid.map((row) => ({
      key: originalKey(row.kw),
      original: row,
      current: rowToValues(row),
      deleted: false,
    })),
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "reset":
      return init(action.onGrid, action.version, action.version);
    case "rebase":
      return init(action.onGrid, action.version, state.propsVersion);
    case "commit": {
      if (action.key === null) {
        const seq = state.seq + 1;
        return {
          ...state,
          seq,
          rows: [...state.rows, { key: `new-${seq}`, original: null, current: action.values, deleted: false }],
        };
      }
      return {
        ...state,
        rows: state.rows.map((r) => (r.key === action.key ? { ...r, current: action.values } : r)),
      };
    }
    case "delete":
      return {
        ...state,
        rows: state.rows.flatMap((r) => {
          if (r.key !== action.key) return [r];
          return r.original ? [{ ...r, deleted: true }] : [];
        }),
      };
    case "restore":
      return { ...state, rows: state.rows.map((r) => (r.key === action.key ? { ...r, deleted: false } : r)) };
  }
}

function sortRows(rows: DraftRow[]): DraftRow[] {
  const kwOf = (r: DraftRow) => (isNum(r.current.kw) ? r.current.kw : Number.POSITIVE_INFINITY);
  return [...rows].sort((a, b) => kwOf(a) - kwOf(b));
}

export function useTableDraft(props: { onGrid: SizeRow[]; configVersion: number }) {
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    init(props.onGrid, props.configVersion, props.configVersion)
  );

  const dirty = useMemo(() => state.rows.some((r) => rowStatus(r) !== "same"), [state.rows]);

  // While nothing is edited the draft simply follows the server data (after
  // router.refresh(), a reset/apply from another tab, ...). Once the owner has
  // started editing, `baseVersion` stays put so a stale save hits the
  // optimistic lock and shows the conflict box (design-162 §2.3, §7.4).
  if (!dirty && state.propsVersion !== props.configVersion) {
    dispatch({ type: "reset", onGrid: props.onGrid, version: props.configVersion });
  }

  const rows = useMemo(() => sortRows(state.rows), [state.rows]);
  const validation = useMemo(() => validateDraft(state.rows), [state.rows]);
  const counts = useMemo(() => {
    const c = { changed: 0, added: 0, removed: 0 };
    for (const r of state.rows) {
      const s = rowStatus(r);
      if (s === "changed") c.changed++;
      else if (s === "new") c.added++;
      else if (s === "deleted") c.removed++;
    }
    return c;
  }, [state.rows]);

  return {
    rows,
    baseVersion: state.baseVersion,
    dirty,
    counts,
    changedCount: counts.changed + counts.added + counts.removed,
    issues: validation.issues,
    /** Resolved table to save; null while any issue is open. */
    table: validation.table,
    commit: (key: string | null, values: DraftValues) => dispatch({ type: "commit", key, values }),
    markDelete: (key: string) => dispatch({ type: "delete", key }),
    restore: (key: string) => dispatch({ type: "restore", key }),
    /** Throw the edits away and re-read the server data. */
    discard: () => dispatch({ type: "reset", onGrid: props.onGrid, version: props.configVersion }),
    /** After a successful save: make `table` the new baseline at `version`. */
    rebase: (table: SizeRow[], version: number) => dispatch({ type: "rebase", onGrid: table, version }),
  };
}
