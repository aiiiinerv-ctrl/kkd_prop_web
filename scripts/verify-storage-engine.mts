/**
 * Read-only InnoDB/FK release gate by default. `--fault-injection` additionally
 * proves entity + AuditLog rollback and is refused unless DATABASE_URL points
 * at a validated loopback rehearsal database.
 */
import "dotenv/config";
import process from "node:process";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client.js";
import {
  APPLICATION_TABLES,
  FOREIGN_KEY_CONTRACTS,
  INFRASTRUCTURE_TABLES,
  assertDisposableLocalDatabase,
  quoteIdentifier,
} from "./lib/storage-engine-contract.mjs";
import { collectSchemaInventory, rowValue, stableSha256, type SchemaRow } from "./lib/schema-metadata.mjs";

type Row = SchemaRow;

const databaseUrl = process.env.DATABASE_URL;
const faultInjection = process.argv.includes("--fault-injection");

if (!databaseUrl?.startsWith("mysql://")) {
  console.error("ENGINE_GATE=RED");
  console.error("ISSUE=DATABASE_URL must be a mysql:// connection string");
  process.exit(1);
}
if (faultInjection) {
  try {
    assertDisposableLocalDatabase(databaseUrl);
  } catch (error) {
    console.error("ENGINE_GATE=RED");
    console.error(`ISSUE=${(error as Error).message}`);
    process.exit(1);
  }
}

const prisma = new PrismaClient({ adapter: new PrismaMariaDb(databaseUrl) });

function value(row: Row, ...names: string[]): string {
  for (const name of names) {
    if (row[name] !== undefined && row[name] !== null) return rowValue(row, name);
  }
  return "";
}

async function query(sql: string): Promise<Row[]> {
  return (await prisma.$queryRawUnsafe(sql)) as Row[];
}

async function runFaultInjection(): Promise<boolean> {
  const probeAdminId = "engine-rehearsal-rollback-probe";
  await prisma.$executeRawUnsafe(
    `DELETE FROM ${quoteIdentifier("AdminUser")} WHERE ${quoteIdentifier("id")} = ?`,
    probeAdminId
  );
  try {
    await prisma.$transaction(
      async (tx) => {
        await tx.$executeRawUnsafe(
          "INSERT INTO `AdminUser` (`id`,`email`,`passwordHash`,`name`,`role`,`isActive`,`createdAt`,`updatedAt`) VALUES (?,?,?,?, 'ADMIN',1,NOW(3),NOW(3))",
          probeAdminId,
          "rollback-probe@example.invalid",
          "synthetic-not-a-secret",
          "Rollback Probe"
        );
        await tx.$executeRawUnsafe(
          "INSERT INTO `AuditLog` (`id`,`actorId`,`action`,`entityType`,`entityId`,`createdAt`) VALUES ('rehearsal-audit',?,'CREATE','Probe','probe',NOW(3))",
          probeAdminId
        );
      },
      { timeout: 30_000, maxWait: 5_000 }
    );
    return false;
  } catch {
    const rows = await query(
      `SELECT COUNT(*) AS count FROM ${quoteIdentifier("AdminUser")} WHERE ${quoteIdentifier("id")} = 'engine-rehearsal-rollback-probe'`
    );
    const rolledBack = value(rows[0], "count") === "0";
    if (!rolledBack) {
      await prisma.$executeRawUnsafe(
        `DELETE FROM ${quoteIdentifier("AdminUser")} WHERE ${quoteIdentifier("id")} = ?`,
        probeAdminId
      );
    }
    return rolledBack;
  }
}

async function main() {
  const issues: string[] = [];
  const inventory = await collectSchemaInventory(prisma);
  const { server: serverRows, engines: engineRows, tables: tableRows, foreignKeys: fkRows, indexes: indexRows, columns: columnRows } = inventory;

  const supportedInnoDb = engineRows.some(
    (row) => value(row, "Engine", "ENGINE") === "InnoDB" && ["YES", "DEFAULT"].includes(value(row, "Support", "SUPPORT"))
  );
  if (!supportedInnoDb) issues.push("InnoDB is not supported by this server");

  const allowedTables = new Set<string>([...APPLICATION_TABLES, ...INFRASTRUCTURE_TABLES]);
  const actualTables = tableRows.map((row) => value(row, "tableName"));
  const unknownTables = actualTables.filter((table) => !allowedTables.has(table));
  const missingTables = APPLICATION_TABLES.filter((table) => !actualTables.includes(table));
  if (unknownTables.length) issues.push(`unrecognized tables: ${unknownTables.join(",")}`);
  if (missingTables.length) issues.push(`missing tables: ${missingTables.join(",")}`);

  const engines: Record<string, string> = {};
  for (const table of APPLICATION_TABLES) {
    const tableRow = tableRows.find((row) => value(row, "tableName") === table);
    engines[table] = tableRow ? value(tableRow, "engine") : "MISSING";
    if (engines[table] !== "InnoDB") issues.push(`${table} engine is ${engines[table]}`);
  }

  const actualFkByName = new Map(fkRows.map((row) => [value(row, "name"), row]));
  for (const expected of FOREIGN_KEY_CONTRACTS) {
    const actual = actualFkByName.get(expected.name);
    if (
      !actual ||
      value(actual, "tableName") !== expected.table ||
      value(actual, "columnName") !== expected.column ||
      value(actual, "referencedTableName") !== expected.referencedTable ||
      value(actual, "referencedColumnName") !== expected.referencedColumn ||
      value(actual, "deleteRule") !== expected.deleteRule ||
      value(actual, "updateRule") !== expected.updateRule
    ) {
      issues.push(`foreign key mismatch: ${expected.name}`);
    }
  }
  const unknownForeignKeys = [...actualFkByName.keys()].filter(
    (name) => !FOREIGN_KEY_CONTRACTS.some((expected) => expected.name === name)
  );
  if (unknownForeignKeys.length) issues.push(`unrecognized foreign keys: ${unknownForeignKeys.join(",")}`);

  const orphanCounts: Record<string, number> = {};
  for (const fk of FOREIGN_KEY_CONTRACTS) {
    const rows = await query(
      `SELECT COUNT(*) AS count FROM ${quoteIdentifier(fk.table)} child LEFT JOIN ${quoteIdentifier(fk.referencedTable)} parent ON child.${quoteIdentifier(fk.column)} = parent.${quoteIdentifier(fk.referencedColumn)} WHERE child.${quoteIdentifier(fk.column)} IS NOT NULL AND parent.${quoteIdentifier(fk.referencedColumn)} IS NULL`
    );
    const count = Number(value(rows[0], "count"));
    orphanCounts[fk.name] = count;
    if (count !== 0) issues.push(`${fk.name} has ${count} orphan row(s)`);
  }

  const rowCounts: Record<string, number> = {};
  for (const table of APPLICATION_TABLES) {
    if (!actualTables.includes(table)) continue;
    const rows = await query(`SELECT COUNT(*) AS count FROM ${quoteIdentifier(table)}`);
    rowCounts[table] = Number(value(rows[0], "count"));
  }

  let rollbackPassed: boolean | null = null;
  if (faultInjection && missingTables.length === 0) {
    rollbackPassed = await runFaultInjection();
    if (!rollbackPassed) issues.push("entity row survived failed AuditLog insert");
  }

  const applicationIndexes = indexRows.filter((row) => APPLICATION_TABLES.includes(value(row, "tableName") as never));
  const applicationColumns = columnRows.filter((row) => APPLICATION_TABLES.includes(value(row, "tableName") as never));
  const signature = stableSha256({
    serverVersion: value(serverRows[0], "serverVersion"),
    defaultEngine: value(serverRows[0], "defaultEngine"),
    engines,
    foreignKeys: fkRows,
    orphanCounts,
    rowCounts,
    indexes: applicationIndexes,
    columns: applicationColumns,
    rollbackPassed,
  });

  console.log(`SERVER_VERSION=${value(serverRows[0], "serverVersion")}`);
  console.log(`DEFAULT_ENGINE=${value(serverRows[0], "defaultEngine")}`);
  console.log(`INNODB_SUPPORTED=${supportedInnoDb}`);
  console.log(`TABLE_COUNT=${Object.keys(rowCounts).length}`);
  console.log(`FOREIGN_KEY_COUNT=${fkRows.length}`);
  console.log(`ORPHAN_COUNT=${Object.values(orphanCounts).reduce((sum, count) => sum + count, 0)}`);
  console.log(`INDEX_ENTRY_COUNT=${applicationIndexes.length}`);
  console.log(`COLUMN_COUNT=${applicationColumns.length}`);
  console.log(`ROW_COUNT=${Object.values(rowCounts).reduce((sum, count) => sum + count, 0)}`);
  if (rollbackPassed !== null) console.log(`TRANSACTION_ROLLBACK=${rollbackPassed ? "PASS" : "FAIL"}`);
  console.log(`VERIFICATION_SIGNATURE=${signature}`);
  for (const issue of issues) console.error(`ISSUE=${issue}`);
  console.log(`ENGINE_GATE=${issues.length === 0 ? "GREEN" : "RED"}`);
  if (issues.length) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error("ENGINE_GATE=RED");
    console.error(`ISSUE=${(error as Error).message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
