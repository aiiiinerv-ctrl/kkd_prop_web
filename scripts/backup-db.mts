/**
 * Creates a data-only MySQL snapshot plus storage/private under BACKUP_ROOT.
 * The reusable engine also powers the temporary shared-hosting backup route.
 *
 * Usage: npx tsx scripts/backup-db.mts
 */
import "dotenv/config";
import process from "node:process";
import { BACKUP_MODELS, SCHEMA_METADATA_FILENAME } from "./lib/backup-format.js";
import { createBackupSnapshot } from "./lib/create-backup.js";
import { operationalErrorCode } from "./lib/operational-output.js";

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

async function main(): Promise<void> {
  const result = await createBackupSnapshot({
    environment: process.env,
    retentionEnabled: true,
    onWarning: (message) => console.warn(`⚠ backup-db: ${message}`),
  });
  const totalRows = Object.values(result.rowCounts).reduce((sum, count) => sum + count, 0);

  console.log(`✓ backup-db: snapshot ${result.snapshot} created`);
  console.log(`  - database.sql: ${formatBytes(result.databaseBytes)}, ${totalRows} row(s)`);
  console.log(`  - schema metadata: ${SCHEMA_METADATA_FILENAME} (${result.schemaSha256})`);
  console.log(`  - source transactional: ${result.sourceTransactional}`);
  console.log(`  - writes quiesced: ${result.writesQuiesced}`);
  for (const { table } of BACKUP_MODELS) {
    console.log(`      ${table}: ${result.rowCounts[table]}`);
  }
  console.log(
    result.privateStorageCopied
      ? `  - storage/private: copied (${formatBytes(result.privateStorageBytes)})`
      : "  - storage/private: skipped (source not found)"
  );
  console.log(`  - total snapshot size: ${formatBytes(result.totalBytes)}`);
  if (process.env.BACKUP_RETENTION_DAYS) {
    console.log(
      `  - retention: pruned ${result.prunedCount} snapshot(s) older than ${process.env.BACKUP_RETENTION_DAYS} day(s)`
    );
  }
}

main().catch((error) => {
  const code = operationalErrorCode(error);
  if (code === "BACKUP_WRITES_NOT_QUIESCED") {
    console.error(
      "✗ backup-db: source includes non-transactional tables; quiesce all writes and set BACKUP_WRITES_QUIESCED=true"
    );
  } else if (code === "DATABASE_URL_MISSING") {
    console.error("✗ backup-db: DATABASE_URL is not set (check .env)");
  } else {
    console.error(`✗ backup-db: failed (${code})`);
  }
  process.exitCode = 1;
});
