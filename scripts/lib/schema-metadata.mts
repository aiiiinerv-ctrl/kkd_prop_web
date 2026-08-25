import { createHash } from "node:crypto";
import { APPLICATION_TABLES, FOREIGN_KEY_CONTRACTS, INFRASTRUCTURE_TABLES, quoteIdentifier } from "./storage-engine-contract.mjs";
import { SCHEMA_METADATA_VERSION, type SnapshotForeignKeyMetadata, type SnapshotSchemaMetadata } from "./backup-format.mjs";
import { OperationalError } from "./operational-output.mjs";

export type SchemaRow = Record<string, unknown>;
type SqlClient = { $queryRawUnsafe(query: string): Promise<unknown> };
export type SchemaInventory = { server: SchemaRow[]; engines: SchemaRow[]; tables: SchemaRow[]; columns: SchemaRow[]; indexes: SchemaRow[]; foreignKeys: SchemaRow[] };

const INVENTORY_QUERIES = {
  server: "SELECT VERSION() AS serverVersion, @@default_storage_engine AS defaultEngine",
  engines: "SHOW ENGINES",
  tables: "SELECT TABLE_NAME AS tableName, ENGINE AS engine FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME",
  columns: "SELECT TABLE_NAME AS tableName, COLUMN_NAME AS columnName, COLUMN_TYPE AS columnType, IS_NULLABLE AS isNullable, COLUMN_DEFAULT AS columnDefault, EXTRA AS extra FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME, ORDINAL_POSITION",
  indexes: "SELECT TABLE_NAME AS tableName, INDEX_NAME AS indexName, NON_UNIQUE AS nonUnique, SEQ_IN_INDEX AS sequenceNumber, COLUMN_NAME AS columnName, SUB_PART AS subPart FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX",
  foreignKeys: "SELECT rc.CONSTRAINT_NAME AS name, rc.TABLE_NAME AS tableName, kcu.COLUMN_NAME AS columnName, rc.REFERENCED_TABLE_NAME AS referencedTableName, kcu.REFERENCED_COLUMN_NAME AS referencedColumnName, rc.DELETE_RULE AS deleteRule, rc.UPDATE_RULE AS updateRule FROM information_schema.REFERENTIAL_CONSTRAINTS rc JOIN information_schema.KEY_COLUMN_USAGE kcu ON kcu.CONSTRAINT_SCHEMA = rc.CONSTRAINT_SCHEMA AND kcu.CONSTRAINT_NAME = rc.CONSTRAINT_NAME AND kcu.TABLE_NAME = rc.TABLE_NAME WHERE rc.CONSTRAINT_SCHEMA = DATABASE() ORDER BY rc.CONSTRAINT_NAME, kcu.ORDINAL_POSITION",
} as const;

export function sha256(value: string | Buffer): string { return createHash("sha256").update(value).digest("hex"); }
export function stableSha256(value: unknown): string { return sha256(JSON.stringify(value, (_key, item) => typeof item === "bigint" ? item.toString() : item)); }
export function rowValue(row: SchemaRow, key: string): string { const value = row[key]; return value === null || value === undefined ? "" : String(value); }
async function rows(client: SqlClient, query: string): Promise<SchemaRow[]> { return await client.$queryRawUnsafe(query) as SchemaRow[]; }

export async function collectSchemaInventory(client: SqlClient): Promise<SchemaInventory> {
  const [server, engines, tables, columns, indexes, foreignKeys] = await Promise.all(Object.values(INVENTORY_QUERIES).map((query) => rows(client, query)));
  return { server, engines, tables, columns, indexes, foreignKeys };
}

function indexSignature(row: SchemaRow): string {
  return ["indexName", "nonUnique", "sequenceNumber", "columnName", "subPart"].map((key) => rowValue(row, key)).join(":");
}

function foreignKeyMetadata(row: SchemaRow): SnapshotForeignKeyMetadata {
  return { name: rowValue(row, "name"), table: rowValue(row, "tableName"), column: rowValue(row, "columnName"), referencedTable: rowValue(row, "referencedTableName"), referencedColumn: rowValue(row, "referencedColumnName"), deleteRule: rowValue(row, "deleteRule"), updateRule: rowValue(row, "updateRule") };
}

function expectedForeignKeys(): SnapshotForeignKeyMetadata[] {
  return FOREIGN_KEY_CONTRACTS.map((fk) => ({ name: fk.name, table: fk.table, column: fk.column, referencedTable: fk.referencedTable, referencedColumn: fk.referencedColumn, deleteRule: fk.deleteRule, updateRule: fk.updateRule })).sort((a, b) => a.name.localeCompare(b.name));
}

export async function inspectSchema(client: SqlClient, exactRowCounts?: Readonly<Record<string, number>>): Promise<Omit<SnapshotSchemaMetadata, "formatVersion" | "createdAt" | "writesQuiesced" | "databaseSqlSha256">> {
  const inventory = await collectSchemaInventory(client);
  const allowed = new Set<string>([...APPLICATION_TABLES, ...INFRASTRUCTURE_TABLES]);
  const actualNames = inventory.tables.map((row) => rowValue(row, "tableName"));
  const unknown = actualNames.filter((name) => !allowed.has(name));
  const missing = APPLICATION_TABLES.filter((name) => !actualNames.includes(name));
  if (unknown.length) throw new Error(`unrecognized application tables: ${unknown.join(",")}`);
  if (missing.length) throw new Error(`missing application tables: ${missing.join(",")}`);

  const tableMetadata = [];
  for (const table of APPLICATION_TABLES) {
    const tableRow = inventory.tables.find((row) => rowValue(row, "tableName") === table)!;
    const rowCount = exactRowCounts?.[table] ?? Number(rowValue((await rows(client, `SELECT COUNT(*) AS rowCount FROM ${quoteIdentifier(table)}`))[0], "rowCount"));
    const tableColumns = inventory.columns.filter((row) => rowValue(row, "tableName") === table);
    const tableIndexes = inventory.indexes.filter((row) => rowValue(row, "tableName") === table);
    tableMetadata.push({ table, engine: rowValue(tableRow, "engine"), rowCount, columnHash: stableSha256(tableColumns), indexHash: stableSha256(tableIndexes), indexes: tableIndexes.map(indexSignature) });
  }

  const orphanCounts: Record<string, number> = {};
  for (const fk of FOREIGN_KEY_CONTRACTS) {
    const result = await rows(client, `SELECT COUNT(*) AS orphanCount FROM ${quoteIdentifier(fk.table)} child LEFT JOIN ${quoteIdentifier(fk.referencedTable)} parent ON child.${quoteIdentifier(fk.column)} = parent.${quoteIdentifier(fk.referencedColumn)} WHERE child.${quoteIdentifier(fk.column)} IS NOT NULL AND parent.${quoteIdentifier(fk.referencedColumn)} IS NULL`);
    orphanCounts[fk.name] = Number(rowValue(result[0], "orphanCount"));
  }

  const foreignKeys = inventory.foreignKeys.map(foreignKeyMetadata).sort((a, b) => a.name.localeCompare(b.name));
  const sourceTransactional = tableMetadata.every((table) => table.engine === "InnoDB");
  const schemaShape = tableMetadata.map(({ table, columnHash, indexHash, indexes }) => ({ table, columnHash, indexHash, indexes }));
  return {
    serverVersion: rowValue(inventory.server[0], "serverVersion"),
    defaultEngine: rowValue(inventory.server[0], "defaultEngine"),
    innoDbSupported: inventory.engines.some((row) => rowValue(row, "Engine") === "InnoDB" && ["YES", "DEFAULT"].includes(rowValue(row, "Support"))),
    sourceTransactional,
    schemaSha256: stableSha256(schemaShape),
    tables: tableMetadata,
    foreignKeys,
    orphanCounts,
  };
}

export function buildSnapshotMetadata(inspected: Awaited<ReturnType<typeof inspectSchema>>, options: { createdAt: string; writesQuiesced: boolean; databaseSqlSha256: string }): SnapshotSchemaMetadata {
  if (!inspected.innoDbSupported) throw new Error("InnoDB is not supported by the source server");
  if (!inspected.sourceTransactional && !options.writesQuiesced) throw new Error("non-transactional source requires BACKUP_WRITES_QUIESCED=true");
  const orphanTotal = Object.values(inspected.orphanCounts).reduce((sum, count) => sum + count, 0);
  if (orphanTotal !== 0) throw new Error(`source contains ${orphanTotal} orphan relationship(s)`);
  return { formatVersion: SCHEMA_METADATA_VERSION, ...options, ...inspected };
}

export function parseSnapshotMetadata(raw: string): SnapshotSchemaMetadata {
  const metadata = JSON.parse(raw) as SnapshotSchemaMetadata;
  if (metadata.formatVersion !== SCHEMA_METADATA_VERSION) throw new Error(`unsupported schema metadata version: ${metadata.formatVersion}`);
  const names = metadata.tables.map((table) => table.table);
  if (names.length !== APPLICATION_TABLES.length || APPLICATION_TABLES.some((table) => !names.includes(table))) throw new Error("snapshot metadata does not contain the exact application-table inventory");
  if (names.some((name) => !APPLICATION_TABLES.includes(name as never))) throw new Error("snapshot metadata contains an unrecognized table");
  if (metadata.tables.some((table) => !Array.isArray(table.indexes))) throw new Error("snapshot metadata is missing index definitions");
  if (!metadata.sourceTransactional && !metadata.writesQuiesced) throw new Error("snapshot came from a non-transactional source without confirmed write quiescence");
  if (FOREIGN_KEY_CONTRACTS.some((fk) => typeof metadata.orphanCounts?.[fk.name] !== "number") || Object.values(metadata.orphanCounts).some((count) => count !== 0)) throw new Error("snapshot metadata has missing or non-zero orphan counts");
  const schemaShape = metadata.tables.map(({ table, columnHash, indexHash, indexes }) => ({ table, columnHash, indexHash, indexes }));
  if (stableSha256(schemaShape) !== metadata.schemaSha256) throw new Error("snapshot schema metadata hash is inconsistent");
  return metadata;
}

export function validateDumpStatements(statements: readonly string[]): void {
  const seenDeletes = new Set<string>();
  for (const statement of statements) {
    if (/^SET FOREIGN_KEY_CHECKS=[01]$/i.test(statement)) continue;
    const match = statement.match(/^(?:DELETE FROM|INSERT INTO) `([^`]+)`/i);
    if (!match || !APPLICATION_TABLES.includes(match[1] as never)) throw new Error("snapshot contains an unrecognized SQL statement or table");
    if (/^DELETE FROM/i.test(statement)) seenDeletes.add(match[1]);
  }
  if (APPLICATION_TABLES.some((table) => !seenDeletes.has(table))) throw new Error("snapshot is missing one or more application tables");
}

export async function assertTransactionalRestoreTarget(client: SqlClient, snapshot: SnapshotSchemaMetadata): Promise<void> {
  const target = await inspectSchema(client);
  const nonTransactional = target.tables.filter((table) => table.engine !== "InnoDB");
  if (nonTransactional.length) throw new Error(`restore target is not fully transactional: ${nonTransactional.map((table) => table.table).join(",")}`);
  for (const snapshotTable of snapshot.tables) {
    const targetTable = target.tables.find((table) => table.table === snapshotTable.table)!;
    if (targetTable.columnHash !== snapshotTable.columnHash) throw new OperationalError("RESTORE_COLUMN_MISMATCH");
    if (snapshotTable.indexes.some((index) => !targetTable.indexes.includes(index))) throw new Error(`restore target is missing a source index: ${snapshotTable.table}`);
  }
  if (JSON.stringify(target.foreignKeys) !== JSON.stringify(expectedForeignKeys())) throw new Error("restore target does not have the exact eleven foreign-key definitions");
  if (Object.values(target.orphanCounts).some((count) => count !== 0)) throw new Error("restore target contains orphan relationships");
}
