/**
 * dump-sqlite-to-json.mts — converts a SQLite DB into a single portable JSON
 * file, for the one-off production MySQL cutover (wayfinder map #1, ticket
 * #9). Production's MySQL has no external network access (confirmed live,
 * 2026-08-09 — connection refused, no "Remote MySQL" feature on this panel
 * tier), so the tested `migrate-sqlite-to-mysql.mts` script can't run from a
 * local machine against it. This dump runs locally (where better-sqlite3
 * works fine), and a temporary server-side API route
 * (src/app/api/admin/run-mysql-migration/route.ts) reads the resulting JSON
 * and writes it via Prisma from inside the deployed app — which can reach
 * MySQL on localhost. Reuses the exact same column-kind/type-conversion
 * logic as migrate-sqlite-to-mysql.mts, just serializing to JSON instead of
 * writing directly.
 *
 * Usage: SOURCE_SQLITE_PATH=./backups/production.db.pre-mysql-cutover \
 *   npx tsx scripts/dump-sqlite-to-json.mts
 */
import Database from "better-sqlite3";
import { writeFileSync } from "node:fs";

const SOURCE_SQLITE_PATH = process.env.SOURCE_SQLITE_PATH ?? "./prisma/dev.db";
const OUTPUT_PATH = process.env.OUTPUT_PATH ?? "./migration-data.json";

const sqlite = new Database(SOURCE_SQLITE_PATH, { readonly: true });

type ColumnKind = "json" | "bool" | "date";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readTable(table: string, kinds: Record<string, ColumnKind> = {}): any[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = sqlite.prepare(`SELECT * FROM "${table}"`).all() as Record<string, any>[];
  return rows.map((row) => {
    const out = { ...row };
    for (const [column, kind] of Object.entries(kinds)) {
      const value = out[column];
      if (value === null || value === undefined) continue;
      if (kind === "json") out[column] = JSON.parse(value);
      else if (kind === "bool") out[column] = Boolean(value);
      else if (kind === "date") out[column] = new Date(value).toISOString();
    }
    return out;
  });
}

const dump = {
  promoChannels: readTable("PromoChannel", { isActive: "bool", createdAt: "date" }),
  channelExecutives: readTable("ChannelExecutive", { createdAt: "date" }),
  adminUsers: readTable("AdminUser", { isActive: "bool", createdAt: "date", updatedAt: "date" }),
  leads: readTable("Lead", {
    interestedSystems: "json",
    lastFollowUpAt: "date",
    closedAt: "date",
    createdAt: "date",
    updatedAt: "date",
  }),
  surveyBookings: readTable("SurveyBooking", { preferredDate: "date", giftSent: "bool" }),
  bookingCapacitySettings: readTable("BookingCapacitySetting", { updatedAt: "date" }),
  paymentSettings: readTable("PaymentSettings", { updatedAt: "date" }),
  services: readTable("Service", {
    featuresTh: "json",
    featuresEn: "json",
    isPublished: "bool",
    createdAt: "date",
    updatedAt: "date",
  }),
  packages: readTable("Package", {
    featuresTh: "json",
    featuresEn: "json",
    seasonalProduction: "json",
    isPopular: "bool",
    isPublished: "bool",
    createdAt: "date",
    updatedAt: "date",
  }),
  portfolioProjects: readTable("PortfolioProject", {
    imageKeys: "json",
    completedAt: "date",
    isPublished: "bool",
    createdAt: "date",
    updatedAt: "date",
  }),
  testimonials: readTable("Testimonial", { isPublished: "bool", createdAt: "date", updatedAt: "date" }),
  auditLogs: readTable("AuditLog", { before: "json", after: "json", createdAt: "date" }),
};

writeFileSync(OUTPUT_PATH, JSON.stringify(dump));
sqlite.close();

console.log(`Wrote ${OUTPUT_PATH}`);
for (const [key, rows] of Object.entries(dump)) {
  console.log(`  ${key}: ${rows.length} row(s)`);
}
