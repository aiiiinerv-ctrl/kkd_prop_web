// Shared display formatters for the size-table tab (list, history, import panel).

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
