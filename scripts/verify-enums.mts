// Guards the single home for schema enums (src/lib/enums.ts) and their Thai
// display strings (src/lib/enum-labels.ts). TypeScript already enforces the
// important half — a label map typed Record<Enum, string> fails to compile if
// the schema gains a value — so this covers the two things types can't see:
// labels that exist but are blank, and new copies of these maps appearing
// elsewhere. No test runner in this repo (see AGENTS.md); no server or DB
// needed.
// Usage: npx tsx scripts/verify-enums.mts
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import {
  AUDIT_ENTITY_LABELS,
  BOOKING_STATUS_LABELS,
  BUILDING_TYPE_LABELS,
  INTERESTED_SYSTEM_LABELS,
  LEAD_STATUS_LABELS,
  LEAD_TYPE_LABELS,
  PAYMENT_STATUS_LABELS,
  TIME_SLOT_LABELS,
  TIME_SLOT_RANGE_LABELS,
} from "../src/lib/enum-labels";
import {
  BOOKING_STATUSES,
  BUILDING_TYPES,
  LEAD_STATUSES,
  LEAD_TYPES,
  PAYMENT_STATUSES,
  TIME_SLOTS,
} from "../src/lib/enums";

let failed = false;

function assert(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? `: ${detail}` : ""}`);
  if (!ok) failed = true;
}

console.log("=== every schema enum value has a non-blank label ===");
const COVERAGE: [string, readonly string[], Record<string, string>][] = [
  ["LeadStatus", LEAD_STATUSES, LEAD_STATUS_LABELS],
  ["LeadType", LEAD_TYPES, LEAD_TYPE_LABELS],
  ["BookingStatus", BOOKING_STATUSES, BOOKING_STATUS_LABELS],
  ["PaymentStatus", PAYMENT_STATUSES, PAYMENT_STATUS_LABELS],
  ["TimeSlot", TIME_SLOTS, TIME_SLOT_LABELS],
  ["TimeSlot (with hours)", TIME_SLOTS, TIME_SLOT_RANGE_LABELS],
  ["BuildingType", BUILDING_TYPES, BUILDING_TYPE_LABELS],
];
for (const [name, values, labels] of COVERAGE) {
  const blank = values.filter((v) => !labels[v] || labels[v].trim() === "");
  assert(
    `${name} (${values.length} values)`,
    blank.length === 0,
    blank.length ? `blank: ${blank.join(", ")}` : ""
  );
}

const looseMaps: [string, Record<string, string>][] = [
  ["AuditEntityType", AUDIT_ENTITY_LABELS],
  ["interestedSystems", INTERESTED_SYSTEM_LABELS],
];
for (const [name, labels] of looseMaps) {
  const blank = Object.entries(labels).filter(([, v]) => !v || v.trim() === "");
  assert(`${name} labels are non-blank`, blank.length === 0);
}

console.log("\n=== values are derived from the schema, not transcribed ===");
// The arrays come from Object.values() on the generated enums, so this really
// checks that the generated client is in sync with schema.prisma — a stale
// `npx prisma generate` shows up here rather than as a runtime surprise.
const schema = readFileSync("prisma/schema.prisma", "utf8");
function schemaEnumValues(name: string): string[] {
  const match = schema.match(new RegExp(`enum ${name} \\{([^}]*)\\}`));
  return match ? match[1].trim().split(/\s+/) : [];
}
for (const [name, values] of [
  ["LeadStatus", LEAD_STATUSES],
  ["BookingStatus", BOOKING_STATUSES],
  ["PaymentStatus", PAYMENT_STATUSES],
  ["TimeSlot", TIME_SLOTS],
  ["BuildingType", BUILDING_TYPES],
] as [string, readonly string[]][]) {
  const fromSchema = schemaEnumValues(name);
  assert(
    `${name} matches schema.prisma, in order`,
    JSON.stringify(fromSchema) === JSON.stringify([...values]),
    JSON.stringify(fromSchema) === JSON.stringify([...values])
      ? ""
      : `schema ${JSON.stringify(fromSchema)} vs module ${JSON.stringify(values)}`
  );
}

console.log("\n=== no page re-declares these maps or arrays locally ===");
// How the four copies of LEAD_STATUS_LABELS appeared in the first place: it is
// quicker to type a small map next to the component than to find the shared
// one. Anything matching here has started that again.
const ALLOWED = ["src/lib/enum-labels.ts", "src/lib/enums.ts"];
// Deliberate exceptions, each a different wording rather than a stale copy:
// portfolio categories are a curated 3-of-4 subset with their own shorter
// labels, and the report export writes system names in English for the
// spreadsheet.
const EXCEPTIONS = [
  "src/app/admin/(dashboard)/portfolio/portfolio-client.tsx",
  "src/lib/reports/export-rows.ts",
  "src/lib/notifications/format.ts",
  // Semantic subsets ("which statuses count as closed"), not copies of an
  // enum's full value list — they are domain rules that belong with the
  // reporting logic that applies them.
  "src/lib/reports/aggregate.ts",
];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const LABEL_MAP = /const [A-Z_]*LABELS[A-Z_]*\s*:\s*Record<[^>]*>\s*=\s*\{/;
const STATUS_ARRAY = /const [A-Z_]*(STATUSES|TYPES|SLOTS|ROLES|KINDS)\s*:\s*\w+\[\]\s*=\s*\[/;

const offenders: string[] = [];
for (const file of walk("src")) {
  if (!/\.tsx?$/.test(file)) continue;
  if (ALLOWED.includes(file) || EXCEPTIONS.includes(file)) continue;
  if (file.startsWith("src/generated/")) continue;
  const source = readFileSync(file, "utf8");
  if (LABEL_MAP.test(source)) offenders.push(`${file} (label map)`);
  if (STATUS_ARRAY.test(source)) offenders.push(`${file} (enum value array)`);
}
assert(
  "enum labels and value lists live only in their module",
  offenders.length === 0,
  offenders.join(" · ")
);

console.log(failed ? "\nFAILED — see ✗ above" : "\nAll assertions passed ✓");
process.exit(failed ? 1 : 0);
