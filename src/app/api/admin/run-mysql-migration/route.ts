import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";

// TEMPORARY — one-off production cutover route (wayfinder map #1, ticket #9).
// Production's MySQL has no external network access, so the tested
// scripts/migrate-sqlite-to-mysql.mts can't run from outside; this route
// lets the already-deployed app (which can reach MySQL on localhost) do the
// write instead, reading a JSON dump produced locally by
// scripts/dump-sqlite-to-json.mts and uploaded to the app root (never
// web-served — see the shared-hosting deploy guide's §7 finding that
// anything inside the Node.js Selector Application Root is safe from
// Apache's static docroot serving).
//
// Auth is a shared secret (MIGRATION_SECRET), not session-based ADMIN auth
// like every other admin route in this codebase — deliberately, because the
// very first time this runs, the target MySQL has no AdminUser rows yet
// (that's part of what this migrates in), so there is no account to log in
// with. A secret set only via the panel's env-var UI, checked before any DB
// query, sidesteps that chicken-and-egg problem entirely.
//
// Gated by ENABLE_MIGRATION_ROUTE so it's inert by default even though the
// code ships in every build; remove this file entirely once the cutover is
// confirmed working and the next deploy goes out.
export async function POST(req: NextRequest) {
  if (process.env.ENABLE_MIGRATION_ROUTE !== "true") {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const secret = process.env.MIGRATION_SECRET;
  if (!secret || req.headers.get("x-migration-secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    // Apply the schema before writing data — the production database is
    // freshly created and has no tables yet. No SSH/external MySQL access on
    // this host means `prisma migrate deploy` can't run from a local
    // machine either, and the `prisma` CLI package itself isn't in this
    // traced standalone deploy artifact (it's a build-time devDependency,
    // never `require()`d at runtime, so Next's output tracer correctly
    // excludes it) — so this executes each migration's raw SQL directly
    // through the same DB connection the app already has, instead of
    // shelling out to a CLI that isn't there.
    const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
    const migrationFolders = readdirSync(migrationsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();

    const schemaLog: string[] = [];
    for (const folder of migrationFolders) {
      const sqlPath = path.join(migrationsDir, folder, "migration.sql");
      const sql = readFileSync(sqlPath, "utf-8");
      const statements = sql
        .split(";")
        .map((s) =>
          s
            .split("\n")
            .filter((line) => !line.trim().startsWith("--"))
            .join("\n")
            .trim()
        )
        .filter((s) => s.length > 0);
      for (const statement of statements) {
        try {
          await prisma.$executeRawUnsafe(statement);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          // Tolerate re-running against a database this already applied to
          // — this route is meant to be safely retriable. MySQL phrases
          // "already applied" differently depending on the object kind
          // (tables: "already exists"; constraints/indexes: "Duplicate ...
          // constraint/key name").
          if (!/already exists|duplicate.*(constraint|key) name/i.test(message)) throw err;
        }
      }
      schemaLog.push(folder);
    }

    const dumpPath = path.join(process.cwd(), "migration-data.json");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dump: Record<string, any[]> = JSON.parse(readFileSync(dumpPath, "utf-8"));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async function upsertAll(rows: any[], upsertOne: (row: any) => Promise<unknown>) {
      for (const row of rows) {
        await upsertOne(row);
      }
      return rows.length;
    }

    const counts: Record<string, number> = {};

    // Insertion order respects foreign keys, same as migrate-sqlite-to-mysql.mts.
    counts.promoChannels = await upsertAll(dump.promoChannels, (row) =>
      prisma.promoChannel.upsert({ where: { id: row.id }, create: row, update: row })
    );
    counts.channelExecutives = await upsertAll(dump.channelExecutives, (row) =>
      prisma.channelExecutive.upsert({ where: { id: row.id }, create: row, update: row })
    );
    counts.adminUsers = await upsertAll(dump.adminUsers, (row) =>
      prisma.adminUser.upsert({ where: { id: row.id }, create: row, update: row })
    );
    counts.leads = await upsertAll(dump.leads, (row) =>
      prisma.lead.upsert({ where: { id: row.id }, create: row, update: row })
    );
    counts.surveyBookings = await upsertAll(dump.surveyBookings, (row) =>
      prisma.surveyBooking.upsert({ where: { id: row.id }, create: row, update: row })
    );
    counts.bookingCapacitySettings = await upsertAll(dump.bookingCapacitySettings, (row) =>
      prisma.bookingCapacitySetting.upsert({ where: { id: row.id }, create: row, update: row })
    );
    counts.paymentSettings = await upsertAll(dump.paymentSettings, (row) =>
      prisma.paymentSettings.upsert({ where: { id: row.id }, create: row, update: row })
    );
    counts.services = await upsertAll(dump.services, (row) =>
      prisma.service.upsert({ where: { id: row.id }, create: row, update: row })
    );
    counts.packages = await upsertAll(dump.packages, (row) =>
      prisma.package.upsert({ where: { id: row.id }, create: row, update: row })
    );
    counts.portfolioProjects = await upsertAll(dump.portfolioProjects, (row) =>
      prisma.portfolioProject.upsert({ where: { id: row.id }, create: row, update: row })
    );
    counts.testimonials = await upsertAll(dump.testimonials, (row) =>
      prisma.testimonial.upsert({ where: { id: row.id }, create: row, update: row })
    );
    counts.auditLogs = await upsertAll(dump.auditLogs, (row) =>
      prisma.auditLog.upsert({ where: { id: row.id }, create: row, update: row })
    );

    return NextResponse.json({ ok: true, schemaLog, counts });
  } catch (err) {
    // Surface the real error in the response — this route is temporary,
    // internal-only, and secret-gated, so returning stack details here is
    // acceptable and much faster to debug than digging through the
    // Passenger log file each time.
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
