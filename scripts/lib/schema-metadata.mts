import { createHash } from "node:crypto";
import {
  APPLICATION_TABLES,
  FOREIGN_KEY_CONTRACTS,
  INFRASTRUCTURE_TABLES,
  quoteIdentifier,
} from "./storage-engine-contract.mjs";
import {
  SCHEMA_METADATA_VERSION,
  type SnapshotSchemaMetadata,
} from "./backup-format.mjs";

type Row = Record<string, unknown>;
type SqlClient = {
  $queryRawUnsafe(query: string): Promise<unknown>;
};

export function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function stableHash(value: unknown): string {
  return sha256(JSON.stringify(value, (_key, item) => (typeof item === "bigint" ? item.toString() : item)));
}

function stringValue(row: Row, key: string): string {
  const value = row[key];
  return value === null || value === undefined ? "" : String(value);
}

async function rows(client: SqlClient, query: string): Promise<Row[]> {
  return (await client.$queryRawUnsafe(query)) as Row[];
}

export async function inspectSchema(
  client: SqlClient,
  exactRowCounts?: Readonly<Record<string, number>>
): Promise<Omit<SnapshotSchemaMetadata, "formatVersion" | "createdAt" | "writesQuiesced" | "databaseSqlSha256">> {
  const [server, engines, tables, columns, indexes, foreignKeys] = await Promise.all([
    rows(client, "SELECT VERSION() AS serverVersion, @@default_storage_engine AS defaultEngine"),
    rows(client, "SHOW ENGINES"),
    rows(client, "SELECT TABLE_NAME AS tableName, ENGINE AS engine FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME"),
    rows(client, "SELECT TABLE_NAME AS tableName, COLUMN_NAME AS columnName, COLUMN_TYPE AS columnType, IS_NULLABLE AS isNullable, COLUMN_DEFAULT AS columnDefault, EXTRA AS extra FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME, ORDINAL_POSITION"),
    rows(client, "SELECT TABLE_NAME AS tableName, INDEX_NAME AS indexName, NON_UNIQUE AS nonUnique, SEQ_IN_INDEX AS sequenceNumber, COLUMN_NAME AS columnName, SUB_PART AS subPart FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX"),
    rows(client, "SELECT CONSTRAINT_NAME AS constraintName FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() ORDER BY CONSTRAINT_NAME"),
  ]);

  const allowed = new Set<string>([...APPLICATION_TABLES, ...INFRASTRUCTURE_TABLES]);
  const actualNames = tables.map((row) => stringValue(row, "tableName"));
  const unknown = actualNames.filter((name) => !allowed.has(name));
  const missing = APPLICATION_TABLES.filter((name) => !actualNames.includes(name));
  if (unknown.length) throw new Error(`unrecognized application tables: ${unknown.join(",")}`);
  if (missing.length) throw new Error(`missing application tables: ${missing.join(",")}`);

  const tableMetadata = [];
  for (const table of APPLICATION_TABLES) {
    const tableRow = tables.find((row) => stringValue(row, "tableName") === table)!;
    const rowCount = exactRowCounts?.[table] ?? Number(
      stringValue((await rows(client, `SELECT COUNT(*) AS rowCount FROM ${quoteIdentifier(table)}`))[0], "rowCount")
    );
    tableMetadata.push({
      table,
      engine: stringValue(tableRow, "engine"),
      rowCount,
      columnHash: stableHash(columns.filter((row) => stringValue(row, "tableName") === table)),
      indexHash: stableHash(indexes.filter((row) => stringValue(row, "tableName") === table)),
    });
  }
  const foreignKeyNames = foreignKeys.map((row) => stringValue(row, "constraintName"));
  const expectedForeignKeys = new Set(FOREIGN_KEY_CONTRACTS.map((fk) => fk.name));
  const sourceTransactional = tableMetadata.every((table) => table.engine === "InnoDB");
  const schemaShape = tableMetadata.map(({ table, columnHash, indexHash }) => ({ table, columnHash, indexHash }));

  return {
    serverVersion: stringValue(server[0], "serverVersion"),
    defaultEngine: stringValue(server[0], "defaultEngine"),
    innoDbSupported: engines.some(
      (row) => stringValue(row, "Engine") === "InnoDB" && ["YES", "DEFAULT"].includes(stringValue(row, "Support"))
    ),
    sourceTransactional,
    schemaSha256: stableHash(schemaShape),
    tables: tableMetadata,
    foreignKeys: foreignKeyNames.filter((name) => expectedForeignKeys.has(name)).sort(),
  };
}

export function buildSnapshotMetadata(
  inspected: Awaited<ReturnType<typeof inspectSchema>>,
  options: { createdAt: string; writesQuiesced: boolean; databaseSqlSha256: string }
): SnapshotSchemaMetadata {
  if (!inspected.innoDbSupported) throw new Error("InnoDB is not supported by the source server");
  if (!inspected.sourceTransactional && !options.writesQuiesced) {
    throw new Error("non-transactional source requires BACKUP_WRITES_QUIESCED=true");
  }
  return {
    formatVersion: SCHEMA_METADATA_VERSION,
    ...options,
    ...inspected,
  };
}

export function parseSnapshotMetadata(raw: string): SnapshotSchemaMetadata {
  const metadata = JSON.parse(raw) as SnapshotSchemaMetadata;
  if (metadata.formatVersion !== SCHEMA_METADATA_VERSION) {
    throw new Error(`unsupported schema metadata version: ${metadata.formatVersion}`);
  }
  const names = metadata.tables.map((table) => table.table);
  if (names.length !== APPLICATION_TABLES.length || APPLICATION_TABLES.some((table) => !names.includes(table))) {
    throw new Error("snapshot metadata does not contain the exact application-table inventory");
  }
  if (names.some((name) => !APPLICATION_TABLES.includes(name as never))) {
    throw new Error("snapshot metadata contains an unrecognized table");
  }
  if (!metadata.sourceTransactional && !metadata.writesQuiesced) {
    throw new Error("snapshot came from a non-transactional source without confirmed write quiescence");
  }
  return metadata;
}

export function validateDumpStatements(statements: readonly string[]): void {
  const seenDeletes = new Set<string>();
  for (const statement of statements) {
    if (/^SET FOREIGN_KEY_CHECKS=[01]$/i.test(statement)) continue;
    const match = statement.match(/^(?:DELETE FROM|INSERT INTO) `([^`]+)`/i);
    if (!match || !APPLICATION_TABLES.includes(match[1] as never)) {
      throw new Error("snapshot contains an unrecognized SQL statement or table");
    }
    if (/^DELETE FROM/i.test(statement)) seenDeletes.add(match[1]);
  }
  if (APPLICATION_TABLES.some((table) => !seenDeletes.has(table))) {
    throw new Error("snapshot is missing one or more application tables");
  }
}

export async function assertTransactionalRestoreTarget(client: SqlClient): Promise<void> {
  const inspected = await inspectSchema(client);
  const nonTransactional = inspected.tables.filter((table) => table.engine !== "InnoDB");
  if (nonTransactional.length) {
    throw new Error(`restore target is not fully transactional: ${nonTransactional.map((table) => table.table).join(",")}`);
  }
  const expected = FOREIGN_KEY_CONTRACTS.map((fk) => fk.name).sort();
  if (JSON.stringify(inspected.foreignKeys) !== JSON.stringify(expected)) {
    throw new Error("restore target does not have the eleven expected foreign keys");
  }
}
