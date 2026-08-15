/**
 * backup-db.mts — standalone MySQL + private-storage backup snapshot.
 *
 * Copies:
 *   1. every row of every model, dumped as a data-only `.sql` file
 *   2. the entire `${STORAGE_ROOT}/private` directory (payment slips etc.)
 * into a single timestamped directory under `backups/`.
 *
 * `${STORAGE_ROOT}/public` is intentionally skipped — those assets are
 * reproducible from the seed/CMS uploads and re-seedable, unlike private
 * slips which are the only copy of real customer payment proof.
 *
 * Why a hand-rolled dump instead of `mysqldump`: the production target is
 * DirectAdmin/CloudLinux shared hosting with no SSH and no external MySQL
 * access, so the only place a backup can run is inside the app process
 * itself. Shelling out to a `mysqldump` binary that may not be installed
 * there would leave production with no backup path at all. Reading through
 * Prisma needs nothing the app doesn't already have.
 *
 * The output is plain SQL rather than JSON so it can be restored two ways:
 * `npx tsx scripts/restore-db.mts` where a shell is available, or by
 * importing `database.sql` through phpMyAdmin in the hosting panel where
 * one isn't. This is a **data-only** dump — it assumes the target already
 * has the schema (i.e. migrations have been applied).
 *
 * Usage:
 *   npx tsx scripts/backup-db.mts
 *
 * Env vars (all optional except DATABASE_URL, read from .env as usual):
 *   DATABASE_URL              MySQL connection string
 *   STORAGE_ROOT              e.g. "./storage"
 *   BACKUP_ROOT               where snapshots are written (default "./backups")
 *   BACKUP_RETENTION_DAYS     opt-in: if set, snapshots older than N days
 *                             under BACKUP_ROOT are deleted after a
 *                             successful run. Unset = keep everything
 *                             forever (operator manages retention manually).
 *
 * --- Wiring this up on the deploy host --------------------------------
 * This script does NOT install its own cron job. On DirectAdmin, add a cron
 * entry through the panel (Advanced → Cron Jobs) such as:
 *
 *   0 3 * * * cd /path/to/app && npx tsx scripts/backup-db.mts >> ~/kkd-backup.log 2>&1
 *
 * (Runs daily at 03:00 server time; adjust the schedule/log path to taste.)
 * For off-server durability, periodically download `backups/` off the host —
 * this script only creates local snapshots. If disk space becomes a concern,
 * set BACKUP_RETENTION_DAYS to auto-prune old local snapshots, or prune
 * manually.
 * ------------------------------------------------------------------------
 */

import "dotenv/config";
import { existsSync, mkdirSync, statSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { cpSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { BACKUP_MODELS, SNAPSHOT_DIR_PATTERN, sqlLiteral } from "./lib/backup-format.mjs";

function fail(message: string): never {
  console.error(`✗ backup-db: ${message}`);
  process.exit(1);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

function dirSizeBytes(dirPath: string): number {
  let total = 0;
  for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      total += dirSizeBytes(entryPath);
    } else if (entry.isFile()) {
      total += statSync(entryPath).size;
    }
  }
  return total;
}

function timestampForFolder(date: Date): string {
  // e.g. 2026-07-29T14-05-32
  return date.toISOString().replace(/:/g, "-").split(".")[0];
}

const databaseUrl = process.env.DATABASE_URL;
const storageRoot = process.env.STORAGE_ROOT ?? "./storage";
const backupRoot = path.resolve(process.cwd(), process.env.BACKUP_ROOT ?? "./backups");
const retentionDaysEnv = process.env.BACKUP_RETENTION_DAYS;

if (!databaseUrl) {
  fail("DATABASE_URL is not set (expected a mysql:// connection string — check .env)");
}
if (!databaseUrl.startsWith("mysql://")) {
  fail(
    `DATABASE_URL must be a mysql:// connection string, got: ${databaseUrl.split("://")[0]}:// ` +
      "— this project moved off SQLite (see docs/adr/)"
  );
}

const prisma = new PrismaClient({ adapter: new PrismaMariaDb(databaseUrl) });
const privateStoragePath = path.resolve(process.cwd(), storageRoot, "private");

/**
 * Builds the data-only SQL dump. Every statement is emitted on exactly one
 * line — `sqlLiteral` escapes newlines inside string values — which is what
 * lets restore-db.mts split the file back into statements by line without
 * needing a real SQL parser.
 */
async function buildDumpSql(): Promise<{ sql: string; counts: Record<string, number> }> {
  const counts: Record<string, number> = {};
  const lines: string[] = [
    "-- kkd_prop data-only backup — generated by scripts/backup-db.mts",
    `-- created: ${new Date().toISOString()}`,
    "-- Restore with: npx tsx scripts/restore-db.mts <snapshot-dir> --confirm",
    "-- or import this file through phpMyAdmin (schema must already exist).",
    "SET FOREIGN_KEY_CHECKS=0;",
  ];

  // Tables are emitted in foreign-key-safe order (same order as
  // scripts/migrate-sqlite-to-mysql.mts) so that a restore which re-enables
  // FK checks partway through still lands on a consistent database.
  for (const { table, delegate } of BACKUP_MODELS) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows: Record<string, any>[] = await (prisma as any)[delegate].findMany();
    counts[table] = rows.length;

    lines.push("", `-- ${table} (${rows.length} row(s))`);
    lines.push(`DELETE FROM \`${table}\`;`);
    if (rows.length === 0) continue;

    const columns = Object.keys(rows[0]);
    const columnList = columns.map((c) => `\`${c}\``).join(", ");

    // Chunked multi-row INSERTs keep the file small enough for phpMyAdmin's
    // import size limits without emitting one statement per row.
    const CHUNK = 200;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const values = rows
        .slice(i, i + CHUNK)
        .map((row) => `(${columns.map((c) => sqlLiteral(row[c])).join(", ")})`)
        .join(", ");
      lines.push(`INSERT INTO \`${table}\` (${columnList}) VALUES ${values};`);
    }
  }

  lines.push("", "SET FOREIGN_KEY_CHECKS=1;", "");
  return { sql: lines.join("\n"), counts };
}

async function main() {
  const { sql, counts } = await buildDumpSql();

  const hasPrivateStorage = existsSync(privateStoragePath);
  if (!hasPrivateStorage) {
    console.warn(
      `⚠ backup-db: ${privateStoragePath} does not exist — skipping storage/private copy (DB backup will still proceed)`
    );
  }

  const snapshotDir = path.join(backupRoot, timestampForFolder(new Date()));
  mkdirSync(snapshotDir, { recursive: true });

  // 1. Write the SQL dump.
  const dbDestPath = path.join(snapshotDir, "database.sql");
  try {
    writeFileSync(dbDestPath, sql, "utf8");
  } catch (err) {
    fail(`failed to write SQL dump: ${(err as Error).message}`);
  }

  // 2. Copy storage/private (if present).
  let privateDestPath: string | null = null;
  if (hasPrivateStorage) {
    privateDestPath = path.join(snapshotDir, "private");
    try {
      cpSync(privateStoragePath, privateDestPath, { recursive: true });
    } catch (err) {
      fail(`failed to copy storage/private: ${(err as Error).message}`);
    }
  }

  // 3. Optional retention pruning (opt-in via BACKUP_RETENTION_DAYS).
  let prunedCount = 0;
  if (retentionDaysEnv) {
    const retentionDays = Number(retentionDaysEnv);
    if (!Number.isFinite(retentionDays) || retentionDays <= 0) {
      console.warn(
        `⚠ backup-db: BACKUP_RETENTION_DAYS="${retentionDaysEnv}" is not a positive number — skipping pruning`
      );
    } else {
      const cutoffMs = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
      for (const entry of readdirSync(backupRoot, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        // Only ever prune snapshots this script created — operators keep
        // hand-made backups alongside them, and those are irreplaceable.
        if (!SNAPSHOT_DIR_PATTERN.test(entry.name)) continue;
        const entryPath = path.join(backupRoot, entry.name);
        if (entryPath === snapshotDir) continue; // never prune the snapshot we just made
        const mtimeMs = statSync(entryPath).mtimeMs;
        if (mtimeMs < cutoffMs) {
          rmSync(entryPath, { recursive: true, force: true });
          prunedCount += 1;
        }
      }
    }
  }

  // 4. Summary.
  const dbSize = statSync(dbDestPath).size;
  const privateSize = privateDestPath ? dirSizeBytes(privateDestPath) : 0;
  const totalSize = dbSize + privateSize;
  const totalRows = Object.values(counts).reduce((sum, n) => sum + n, 0);

  console.log(`✓ backup-db: snapshot created at ${snapshotDir}`);
  console.log(`  - database: ${dbDestPath} (${formatBytes(dbSize)}, ${totalRows} row(s))`);
  for (const { table } of BACKUP_MODELS) {
    console.log(`      ${table}: ${counts[table]}`);
  }
  if (privateDestPath) {
    console.log(`  - storage/private: ${privateDestPath} (${formatBytes(privateSize)})`);
  } else {
    console.log(`  - storage/private: skipped (source not found)`);
  }
  console.log(`  - total snapshot size: ${formatBytes(totalSize)}`);
  if (retentionDaysEnv) {
    console.log(`  - retention: pruned ${prunedCount} snapshot(s) older than ${retentionDaysEnv} day(s)`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
