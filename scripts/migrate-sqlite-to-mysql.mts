/**
 * migrate-sqlite-to-mysql.mts — one-shot data migration from a SQLite
 * dev.db/production.db into the MySQL schema (wayfinder map #1, ticket #6).
 *
 * Reads every row directly via better-sqlite3 (no Prisma on the read side —
 * the app's Prisma client is now wired to MySQL only, so there is no
 * "SQLite Prisma client" left to read through) and writes it through the
 * MySQL-wired Prisma Client, converting SQLite's on-disk representations
 * (0/1 for booleans, JSON-as-TEXT, date strings) into the JS types Prisma
 * expects.
 *
 * Idempotent via upsert-by-id: every row is written with the exact same
 * cuid it had in the source, so re-running this script against a target
 * that already has some/all of these rows updates them in place instead of
 * duplicating or erroring. Safe to re-run after a partial failure.
 *
 * Usage: SOURCE_SQLITE_PATH=./prisma/dev.db npx tsx scripts/migrate-sqlite-to-mysql.mts
 * (DATABASE_URL, read from .env as usual, is the MySQL target.)
 */
import "dotenv/config";
import Database from "better-sqlite3";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client.js";

const SOURCE_SQLITE_PATH = process.env.SOURCE_SQLITE_PATH ?? "./prisma/dev.db";

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(process.env.DATABASE_URL!),
});
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
      else if (kind === "date") out[column] = new Date(value);
    }
    return out;
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function upsertAll(label: string, rows: any[], upsertOne: (row: any) => Promise<unknown>) {
  for (const row of rows) {
    await upsertOne(row);
  }
  console.log(`${label}: ${rows.length} row(s) upserted`);
}

async function migrate() {
  console.log(`Source: ${SOURCE_SQLITE_PATH}`);

  // Insertion order respects foreign keys: a row is only written once
  // everything it references already exists in the target.
  const promoChannels = readTable("PromoChannel", { isActive: "bool", createdAt: "date" });
  const channelExecutives = readTable("ChannelExecutive", { createdAt: "date" });
  const adminUsers = readTable("AdminUser", {
    isActive: "bool",
    createdAt: "date",
    updatedAt: "date",
  });
  const leads = readTable("Lead", {
    interestedSystems: "json",
    lastFollowUpAt: "date",
    closedAt: "date",
    createdAt: "date",
    updatedAt: "date",
  });
  const surveyBookings = readTable("SurveyBooking", { preferredDate: "date", giftSent: "bool" });
  const bookingCapacitySettings = readTable("BookingCapacitySetting", { updatedAt: "date" });
  const paymentSettings = readTable("PaymentSettings", { updatedAt: "date" });
  const services = readTable("Service", {
    featuresTh: "json",
    featuresEn: "json",
    isPublished: "bool",
    createdAt: "date",
    updatedAt: "date",
  });
  const packages = readTable("Package", {
    featuresTh: "json",
    featuresEn: "json",
    seasonalProduction: "json",
    isPopular: "bool",
    isPublished: "bool",
    createdAt: "date",
    updatedAt: "date",
  });
  const portfolioProjects = readTable("PortfolioProject", {
    imageKeys: "json",
    completedAt: "date",
    isPublished: "bool",
    createdAt: "date",
    updatedAt: "date",
  });
  const testimonials = readTable("Testimonial", {
    isPublished: "bool",
    createdAt: "date",
    updatedAt: "date",
  });
  const auditLogs = readTable("AuditLog", { before: "json", after: "json", createdAt: "date" });

  await upsertAll("PromoChannel", promoChannels, (row) =>
    prisma.promoChannel.upsert({ where: { id: row.id }, create: row, update: row })
  );
  await upsertAll("ChannelExecutive", channelExecutives, (row) =>
    prisma.channelExecutive.upsert({ where: { id: row.id }, create: row, update: row })
  );
  await upsertAll("AdminUser", adminUsers, (row) =>
    prisma.adminUser.upsert({ where: { id: row.id }, create: row, update: row })
  );
  await upsertAll("Lead", leads, (row) =>
    prisma.lead.upsert({ where: { id: row.id }, create: row, update: row })
  );
  await upsertAll("SurveyBooking", surveyBookings, (row) =>
    prisma.surveyBooking.upsert({ where: { id: row.id }, create: row, update: row })
  );
  await upsertAll("BookingCapacitySetting", bookingCapacitySettings, (row) =>
    prisma.bookingCapacitySetting.upsert({ where: { id: row.id }, create: row, update: row })
  );
  await upsertAll("PaymentSettings", paymentSettings, (row) =>
    prisma.paymentSettings.upsert({ where: { id: row.id }, create: row, update: row })
  );
  await upsertAll("Service", services, (row) =>
    prisma.service.upsert({ where: { id: row.id }, create: row, update: row })
  );
  await upsertAll("Package", packages, (row) =>
    prisma.package.upsert({ where: { id: row.id }, create: row, update: row })
  );
  await upsertAll("PortfolioProject", portfolioProjects, (row) =>
    prisma.portfolioProject.upsert({ where: { id: row.id }, create: row, update: row })
  );
  await upsertAll("Testimonial", testimonials, (row) =>
    prisma.testimonial.upsert({ where: { id: row.id }, create: row, update: row })
  );
  await upsertAll("AuditLog", auditLogs, (row) =>
    prisma.auditLog.upsert({ where: { id: row.id }, create: row, update: row })
  );
}

migrate()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    sqlite.close();
    await prisma.$disconnect();
  });
