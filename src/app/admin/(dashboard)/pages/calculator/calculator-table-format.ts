// Shared display formatters for the size-table tab (list, history, import panel,
// save-confirm dialog).
import type { DiffFieldName, SampleBillDiff, SampleBillOutcome } from "@/lib/calculator-import/diff";

const MAX_KW_LIST = 12;

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

/** "1 หรือ 3 เฟส" / "3 เฟส" / "1 เฟส" — long form for sentences. */
export function phaseText(phases: number[]): string {
  const has1 = phases.includes(1);
  const has3 = phases.includes(3);
  if (has1 && has3) return "1 หรือ 3 เฟส";
  if (has3) return "3 เฟส";
  return "1 เฟส";
}

export function formatKwList(kws: number[], max = MAX_KW_LIST): string {
  const sorted = [...kws].sort((a, b) => a - b);
  if (sorted.length <= max) {
    return sorted.map((k) => k.toLocaleString("th-TH")).join(", ");
  }
  const shown = sorted.slice(0, max).map((k) => k.toLocaleString("th-TH"));
  return `${shown.join(", ")} … และอีก ${sorted.length - max} ขนาด`;
}

export const FIELD_LABELS: Record<DiffFieldName, string> = {
  phases: "เฟส",
  billRange: "ช่วงค่าไฟ (฿)",
  panels: "แผง",
  roofM2: "หลังคา (ตร.ม.)",
  sunHours: "ชม.แดด/วัน",
  days: "วัน/เดือน",
  pricePerKwh: "ค่าไฟ/หน่วย (฿)",
};

export function formatFieldValue(field: DiffFieldName, value: unknown): string {
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

export function outcomeText(o: SampleBillOutcome): string {
  if (o.status === "tooLarge") return "เกินตาราง";
  if (o.status === "empty" || o.kw === null) return "—";
  const kw = o.kw.toLocaleString("th-TH");
  return o.status === "belowFirstRow" ? `${kw} kW (ต่ำกว่าช่วง)` : `${kw} kW`;
}

export function sampleChanged(sample: SampleBillDiff): boolean {
  return sample.before.kw !== sample.after.kw || sample.before.status !== sample.after.status;
}

