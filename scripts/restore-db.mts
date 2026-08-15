/**
 * restore-db.mts — restores a snapshot produced by scripts/backup-db.mts.
 *
 * This is destructive: the dump starts each table with a `DELETE FROM`, so a
 * restore replaces current data rather than merging into it. That is why the
 * script is dry-run by default and only writes when passed `--confirm`.
 *
 * Usage:
 *   npx tsx scripts/restore-db.mts                          # dry-run, latest snapshot
 *   npx tsx scripts/restore-db.mts backups/2026-08-12T03-00-00
 *   npx tsx scripts/restore-db.mts <snapshot> --confirm      # restore the database
 *   npx tsx scripts/restore-db.mts <snapshot> --confirm --with-storage
 *
 * `--with-storage` additionally overwrites `${STORAGE_ROOT}/private` with the
 * snapshot's copy. It is opt-in because payment slips on disk are often
 * newer than the snapshot even when the database needs rolling back, and
 * silently clobbering them would destroy the only copy of real customer
 * payment proof.
 *
 * Where no shell is available (DirectAdmin shared hosting), import the
 * snapshot's `database.sql` through phpMyAdmin instead — the file is plain
 * data-only SQL and expects the schema to already exist.
 */

import "dotenv/config";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { cpSync, rmSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { SNAPSHOT_DIR_PATTERN } from "./lib/backup-format.mjs";

function fail(message: string): never {
  console.error(`✗ restore-db: ${message}`);
  process.exit(1);
}

const args = process.argv.slice(2);
const confirm = args.includes("--confirm");
const withStorage = args.includes("--with-storage");
const positional = args.filter((a) => !a.startsWith("--"));

const databaseUrl = process.env.DATABASE_URL;
const storageRoot = process.env.STORAGE_ROOT ?? "./storage";
const backupRoot = path.resolve(process.cwd(), process.env.BACKUP_ROOT ?? "./backups");

if (!databaseUrl) {
  fail("DATABASE_URL is not set (expected a mysql:// connection string — check .env)");
}
if (!databaseUrl.startsWith("mysql://")) {
  fail(`DATABASE_URL must be a mysql:// connection string, got: ${databaseUrl.split("://")[0]}://`);
}

/** Newest snapshot directory under BACKUP_ROOT — names are ISO timestamps, so lexical sort is chronological. */
function latestSnapshot(): string {
  if (!existsSync(backupRoot)) {
    fail(`no backup root at ${backupRoot} — run scripts/backup-db.mts first`);
  }
  // Hand-made backup directories live here too and would otherwise sort
  // above the timestamps ("pre-..." > "2026-..."), so match the pattern.
  const dirs = readdirSync(backupRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory() && SNAPSHOT_DIR_PATTERN.test(e.name))
    .map((e) => e.name)
    .sort();
  if (dirs.length === 0) fail(`no snapshots found under ${backupRoot}`);
  return path.join(backupRoot, dirs[dirs.length - 1]);
}

const snapshotDir = positional[0] ? path.resolve(process.cwd(), positional[0]) : latestSnapshot();
const sqlPath = path.join(snapshotDir, "database.sql");
const snapshotPrivatePath = path.join(snapshotDir, "private");
const livePrivatePath = path.resolve(process.cwd(), storageRoot, "private");

if (!existsSync(sqlPath)) {
  fail(`no database.sql in ${snapshotDir} (is that a snapshot directory?)`);
}

/**
 * Splits the dump back into statements. backup-db.mts guarantees one
 * statement per line — every newline inside a value is escaped — so this
 * needs no SQL parsing.
 */
function readStatements(): string[] {
  return readFileSync(sqlPath, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("--"))
    .map((line) => (line.endsWith(";") ? line.slice(0, -1) : line));
}

function summarize(statements: string[]): void {
  const target = databaseUrl!.replace(/(:\/\/[^:]*:)[^@]*@/, "$1***@");
  console.log(`Snapshot:  ${snapshotDir}`);
  console.log(`Target DB: ${target}`);
  console.log(`Dump size: ${(statSync(sqlPath).size / 1024).toFixed(1)} KB, ${statements.length} statement(s)`);
  console.log("");

  // Row counts come from the per-table comment backup-db.mts writes, so the
  // dry-run reports what will land without having to parse the INSERTs.
  for (const line of readFileSync(sqlPath, "utf8").split("\n")) {
    const match = line.match(/^-- (\w+) \((\d+) row\(s\)\)$/);
    if (match) console.log(`  ${match[1]}: ${match[2]} row(s)`);
  }
  console.log("");
  console.log(
    existsSync(snapshotPrivatePath)
      ? `  storage/private in snapshot: yes -> ${withStorage ? "WILL overwrite" : "will be left alone (pass --with-storage to restore)"} ${livePrivatePath}`
      : "  storage/private in snapshot: none"
  );
}

async function main() {
  const statements = readStatements();
  summarize(statements);

  if (!confirm) {
    console.log("");
    console.log("Dry run — nothing was changed. Re-run with --confirm to apply.");
    return;
  }

  console.log("");
  console.log("⚠ Restoring — every table in the dump is emptied before its rows are reinserted.");

  const prisma = new PrismaClient({ adapter: new PrismaMariaDb(databaseUrl!) });
  try {
    // One interactive transaction so that SET FOREIGN_KEY_CHECKS=0 and the
    // writes it protects run on the same connection — with a pool they
    // could otherwise land on different ones, and the DELETEs would fail
    // against live foreign keys.
    await prisma.$transaction(
      async (tx) => {
        for (const statement of statements) {
          await tx.$executeRawUnsafe(statement);
        }
      },
      { timeout: 120_000, maxWait: 10_000 }
    );
    console.log(`✓ restore-db: applied ${statements.length} statement(s) to the database`);
  } catch (err) {
    fail(`database restore failed (transaction rolled back): ${(err as Error).message}`);
  } finally {
    await prisma.$disconnect();
  }

  if (withStorage) {
    if (!existsSync(snapshotPrivatePath)) {
      console.warn("⚠ restore-db: --with-storage given but the snapshot has no private/ directory — skipped");
    } else {
      try {
        rmSync(livePrivatePath, { recursive: true, force: true });
        cpSync(snapshotPrivatePath, livePrivatePath, { recursive: true });
        console.log(`✓ restore-db: storage/private restored to ${livePrivatePath}`);
      } catch (err) {
        fail(`failed to restore storage/private: ${(err as Error).message}`);
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
