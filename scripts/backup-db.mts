/**
 * backup-db.mts — standalone SQLite + private-storage backup snapshot.
 *
 * Copies:
 *   1. the SQLite database file resolved from DATABASE_URL
 *   2. the entire `${STORAGE_ROOT}/private` directory (payment slips etc.)
 * into a single timestamped directory under `backups/`.
 *
 * `${STORAGE_ROOT}/public` is intentionally skipped — those assets are
 * reproducible from the seed/CMS uploads and re-seedable, unlike private
 * slips which are the only copy of real customer payment proof.
 *
 * Usage:
 *   npx tsx scripts/backup-db.mts
 *
 * Env vars (all optional, fall back to .env.example defaults):
 *   DATABASE_URL              e.g. "file:./prisma/dev.db"
 *   STORAGE_ROOT              e.g. "./storage"
 *   BACKUP_ROOT               where snapshots are written (default "./backups")
 *   BACKUP_RETENTION_DAYS     opt-in: if set, snapshots older than N days
 *                             under BACKUP_ROOT are deleted after a
 *                             successful run. Unset = keep everything
 *                             forever (operator manages retention manually).
 *
 * --- Wiring this up on a production VPS -------------------------------
 * This script does NOT install its own cron job — there is no automated
 * access to the deploy host. Once the app is deployed on the VPS, add a
 * crontab entry by hand (`crontab -e`) such as:
 *
 *   0 3 * * * cd /path/to/app && npx tsx scripts/backup-db.mts >> /var/log/kkd-backup.log 2>&1
 *
 * (Runs daily at 03:00 server time; adjust the schedule/log path to taste.)
 * For off-server durability, periodically sync `backups/` to remote storage
 * (e.g. `rclone`/`rsync` to S3 or another host) — this script only creates
 * local snapshots. If disk space becomes a concern, set
 * BACKUP_RETENTION_DAYS to auto-prune old local snapshots, or prune
 * manually.
 * ------------------------------------------------------------------------
 */

import { existsSync, mkdirSync, copyFileSync, statSync, readdirSync, rmSync } from "node:fs";
import { cpSync } from "node:fs";
import path from "node:path";
import process from "node:process";

function fail(message: string): never {
  console.error(`✗ backup-db: ${message}`);
  process.exit(1);
}

function resolveSqlitePathFromUrl(databaseUrl: string): string {
  // Prisma "file:" URLs are relative to the prisma/ directory by convention
  // in this project (see prisma.config.ts / .env.example: "file:./prisma/dev.db").
  const prefix = "file:";
  if (!databaseUrl.startsWith(prefix)) {
    fail(`DATABASE_URL must start with "file:" for SQLite backups, got: ${databaseUrl}`);
  }
  const rawPath = databaseUrl.slice(prefix.length);
  return path.resolve(process.cwd(), rawPath);
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

const databaseUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const storageRoot = process.env.STORAGE_ROOT ?? "./storage";
const backupRoot = path.resolve(process.cwd(), process.env.BACKUP_ROOT ?? "./backups");
const retentionDaysEnv = process.env.BACKUP_RETENTION_DAYS;

const sqlitePath = resolveSqlitePathFromUrl(databaseUrl);
const privateStoragePath = path.resolve(process.cwd(), storageRoot, "private");

if (!existsSync(sqlitePath)) {
  fail(`SQLite database not found at ${sqlitePath} (from DATABASE_URL=${databaseUrl})`);
}

const hasPrivateStorage = existsSync(privateStoragePath);
if (!hasPrivateStorage) {
  console.warn(
    `⚠ backup-db: ${privateStoragePath} does not exist — skipping storage/private copy (DB backup will still proceed)`
  );
}

const snapshotDir = path.join(backupRoot, timestampForFolder(new Date()));
mkdirSync(snapshotDir, { recursive: true });

// 1. Copy the SQLite file.
const dbDestPath = path.join(snapshotDir, path.basename(sqlitePath));
try {
  copyFileSync(sqlitePath, dbDestPath);
} catch (err) {
  fail(`failed to copy SQLite file: ${(err as Error).message}`);
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

console.log(`✓ backup-db: snapshot created at ${snapshotDir}`);
console.log(`  - database: ${dbDestPath} (${formatBytes(dbSize)})`);
if (privateDestPath) {
  console.log(`  - storage/private: ${privateDestPath} (${formatBytes(privateSize)})`);
} else {
  console.log(`  - storage/private: skipped (source not found)`);
}
console.log(`  - total snapshot size: ${formatBytes(totalSize)}`);
if (retentionDaysEnv) {
  console.log(`  - retention: pruned ${prunedCount} snapshot(s) older than ${retentionDaysEnv} day(s)`);
}
