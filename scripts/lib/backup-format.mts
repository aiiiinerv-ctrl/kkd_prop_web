/**
 * backup-format.mts — the dump format shared by scripts/backup-db.mts and
 * scripts/restore-db.mts.
 *
 * Kept in one place because the two scripts have to agree exactly: backup
 * writes one SQL statement per line (relying on `sqlLiteral` to escape any
 * newline inside a value), and restore splits the file back into statements
 * by line on that basis. Change the escaping here and both sides move
 * together.
 */
import { APPLICATION_TABLE_CONTRACTS } from "./storage-engine-contract.mjs";

/**
 * Directory name of a snapshot this tooling created, e.g. "2026-08-12T03-13-18".
 *
 * Both scripts filter `backups/` through this rather than treating every
 * subdirectory as a snapshot: operators also park hand-made backups there
 * (`pre-cutover-public_html-2026-08-08`, `pre-referrer-migration-20260809`).
 * Those must never be picked as "the latest snapshot", and — more
 * importantly — must never be caught by retention pruning, which would
 * silently delete the one copy of a pre-migration database.
 */
export const SNAPSHOT_DIR_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/;

/**
 * Every model, in foreign-key-safe insertion order — a table only appears
 * once everything it references already has. Mirrors the order proven by
 * scripts/migrate-sqlite-to-mysql.mts during the MySQL cutover.
 *
 * `table` is also the Prisma model name: this schema declares no `@map`, so
 * field and model names match their columns and tables one-to-one.
 */
export const BACKUP_MODELS = APPLICATION_TABLE_CONTRACTS;

export const SCHEMA_METADATA_FILENAME = "schema-metadata.json";
export const SCHEMA_METADATA_VERSION = 1;

/** Returns a path/value-free identifier suitable for operational evidence. */
export function operationalErrorCode(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = String((error as { code: unknown }).code);
    if (/^[A-Z0-9_]+$/.test(code)) return code;
  }
  return error instanceof Error ? error.name : "UnknownError";
}

export type SnapshotTableMetadata = {
  table: string;
  engine: string;
  rowCount: number;
  columnHash: string;
  indexHash: string;
  indexes: string[];
};

export type SnapshotForeignKeyMetadata = {
  name: string;
  table: string;
  column: string;
  referencedTable: string;
  referencedColumn: string;
  deleteRule: string;
  updateRule: string;
};

export type SnapshotSchemaMetadata = {
  formatVersion: number;
  createdAt: string;
  serverVersion: string;
  defaultEngine: string;
  innoDbSupported: boolean;
  sourceTransactional: boolean;
  writesQuiesced: boolean;
  databaseSqlSha256: string;
  schemaSha256: string;
  tables: SnapshotTableMetadata[];
  foreignKeys: SnapshotForeignKeyMetadata[];
  orphanCounts: Record<string, number>;
};

/**
 * MySQL string escaping. Note that `\n`, `\r` and `\0` become their escape
 * sequences rather than literal control characters — that is what keeps
 * every generated statement on a single line.
 */
function escapeString(value: string): string {
  return value.replace(/[\0\b\t\n\r\x1a\\'"]/g, (char) => {
    switch (char) {
      case "\0":
        return "\\0";
      case "\b":
        return "\\b";
      case "\t":
        return "\\t";
      case "\n":
        return "\\n";
      case "\r":
        return "\\r";
      case "\x1a":
        return "\\Z";
      case "\\":
        return "\\\\";
      case "'":
        return "\\'";
      default:
        return `\\${char}`;
    }
  });
}

/** Formats a Date as a MySQL DATETIME(3) literal in UTC, matching how Prisma stores it. */
function dateLiteral(value: Date): string {
  // "2026-08-12T04:05:06.789Z" -> "2026-08-12 04:05:06.789"
  return `'${value.toISOString().replace("T", " ").replace("Z", "")}'`;
}

/**
 * Renders one JS value as a SQL literal. Dispatching on the runtime type is
 * safe here because Prisma hands back real JS types (Date, boolean, plain
 * objects for Json columns) and this schema uses no Decimal/BigInt/Bytes
 * columns, which would need their own handling.
 */
export function sqlLiteral(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (value instanceof Date) return dateLiteral(value);
  if (typeof value === "boolean") return value ? "1" : "0";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "object") return `'${escapeString(JSON.stringify(value))}'`;
  return `'${escapeString(String(value))}'`;
}
