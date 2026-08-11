// Invariant check for the audited-mutation module (src/lib/audit.ts) against
// whatever the AuditLog table currently holds — run it after the e2e suites so
// it sees rows those runs just wrote. No test runner in this repo — see
// AGENTS.md — so this is a standalone assertion script. Needs the DB only, no
// server: server actions can't be invoked from node (they need a request
// context for auth()), so the module is verified through its DB output.
// Usage: npx tsx scripts/verify-audit-module.mts
import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client.js";
import type { AuditEntityType } from "../src/lib/audit";

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(process.env.DATABASE_URL!),
});

let failed = false;

function assert(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? `: ${detail}` : ""}`);
  if (!ok) failed = true;
}

// Mirrors the AuditEntityType union — kept as a value here so the check can
// run at runtime; the `satisfies` ties it back to the type.
const KNOWN_ENTITY_TYPES = [
  "AdminUser",
  "BookingCapacitySetting",
  "ChannelExecutive",
  "Lead",
  "Package",
  "PaymentSettings",
  "PortfolioProject",
  "PromoChannel",
  "Service",
  "SurveyBooking",
  "Testimonial",
] as const satisfies readonly AuditEntityType[];

const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" } });
console.log(`=== AuditLog rows inspected: ${logs.length} ===`);
assert("table is not empty (run the e2e suites first)", logs.length > 0);

const unknownEntity = logs.filter(
  (l) => !(KNOWN_ENTITY_TYPES as readonly string[]).includes(l.entityType)
);
assert(
  "every entityType is one the module declares",
  unknownEntity.length === 0,
  unknownEntity.length ? `unknown: ${[...new Set(unknownEntity.map((l) => l.entityType))].join(", ")}` : ""
);

const missingEntityId = logs.filter((l) => !l.entityId);
assert("every row points at an entityId", missingEntityId.length === 0);

const missingActor = logs.filter((l) => !l.actorId);
assert("every row records an actor", missingActor.length === 0);

console.log("\n=== snapshot shape per action ===");
const creates = logs.filter((l) => l.action === "CREATE");
const updates = logs.filter((l) => l.action === "UPDATE");
const deletes = logs.filter((l) => l.action === "DELETE");
const logins = logs.filter((l) => l.action === "LOGIN");
console.log(
  `CREATE ${creates.length} · UPDATE ${updates.length} · DELETE ${deletes.length} · LOGIN ${logins.length}`
);

assert(
  "CREATE rows carry an after snapshot and no before",
  creates.every((l) => l.after != null && l.before == null)
);
assert(
  "UPDATE rows carry both before and after snapshots",
  updates.every((l) => l.before != null && l.after != null)
);
assert(
  "DELETE rows carry a before snapshot and no after",
  deletes.every((l) => l.before != null && l.after == null)
);
assert(
  "LOGIN rows carry no snapshots",
  logins.every((l) => l.before == null && l.after == null)
);

console.log("\n=== secrets must never reach a snapshot (AGENTS.md) ===");
// Scans the raw JSON of every snapshot in the table, not just AdminUser rows —
// a secret leaking through some other entity's relation would be just as bad.
const SECRET_KEYS = ["passwordHash", "password", "sessionToken", "apiKey", "secret"];
for (const key of SECRET_KEYS) {
  const hits = logs.filter((l) => {
    const blob = `${JSON.stringify(l.before ?? null)}${JSON.stringify(l.after ?? null)}`;
    return blob.toLowerCase().includes(key.toLowerCase());
  });
  assert(
    `no snapshot contains "${key}"`,
    hits.length === 0,
    hits.length ? `${hits.length} row(s), e.g. ${hits[0].entityType}/${hits[0].id}` : ""
  );
}

console.log("\n=== AdminUser snapshots keep the declared projection ===");
const userSnapshots = logs.filter((l) => l.entityType === "AdminUser" && l.after != null);
const EXPECTED_USER_FIELDS = [
  "id",
  "email",
  "name",
  "role",
  "isActive",
  "linkedChannelExecutiveId",
];
const wrongShape = userSnapshots.filter((l) => {
  const keys = Object.keys(l.after as Record<string, unknown>).sort();
  return JSON.stringify(keys) !== JSON.stringify([...EXPECTED_USER_FIELDS].sort());
});
assert(
  "AdminUser after-snapshots contain exactly the projected fields",
  wrongShape.length === 0,
  wrongShape.length
    ? `e.g. ${JSON.stringify(Object.keys(wrongShape[0].after as object))}`
    : `${userSnapshots.length} checked`
);

console.log(failed ? "\nFAILED — see ✗ above" : "\nAll assertions passed ✓");
await prisma.$disconnect();
process.exit(failed ? 1 : 0);
