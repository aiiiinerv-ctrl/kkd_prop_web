/**
 * Destructive only to a validated loopback database ending in `test` or
 * `rehearsal`. Builds a schema-shaped MyISAM fixture without copying live rows,
 * proves the verifier is red, converts it to InnoDB, adds the intended foreign
 * keys, then proves the verifier is green twice.
 */
import "dotenv/config";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import mariadb from "mariadb";
import {
  APPLICATION_TABLES,
  FOREIGN_KEY_CONTRACTS,
  assertDisposableLocalDatabase,
  quoteIdentifier,
} from "./lib/storage-engine-contract.mjs";
import { SCHEMA_METADATA_FILENAME, type SnapshotSchemaMetadata } from "./lib/backup-format.mjs";
import { sha256, stableSha256 } from "./lib/schema-metadata.mjs";

const adminUrl = process.env.REHEARSAL_ADMIN_DATABASE_URL;
const sourceDatabase = process.env.REHEARSAL_SOURCE_DATABASE ?? "kkd_prop_dev";
const targetDatabase = process.env.REHEARSAL_DATABASE_NAME ?? "kkd_prop_engine_rehearsal_test";

if (!adminUrl) throw new Error("REHEARSAL_ADMIN_DATABASE_URL is required");
const requiredAdminUrl = adminUrl;
if (!/^kkd_prop_[a-z0-9_]*$/.test(sourceDatabase)) throw new Error("unsafe source database name");

const targetUrl = new URL(requiredAdminUrl);
targetUrl.pathname = `/${targetDatabase}`;
assertDisposableLocalDatabase(targetUrl.toString());

function runVerifier(expectedStatus: number): string {
  const result = spawnSync(
    "npx",
    ["tsx", "scripts/verify-storage-engine.mts", "--fault-injection"],
    {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: targetUrl.toString() },
      encoding: "utf8",
    }
  );
  if (result.status !== expectedStatus) {
    throw new Error(
      `verifier returned ${result.status}; expected ${expectedStatus}\n${result.stdout}\n${result.stderr}`
    );
  }
  return `${result.stdout}${result.stderr}`.replaceAll(targetUrl.password, "***");
}

function runScript(args: string[], env: Record<string, string>, expectedStatus: number): string {
  const result = spawnSync("npx", ["tsx", ...args], {
    cwd: process.cwd(),
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
  if (result.status !== expectedStatus) {
    const safeOutput = `${result.stdout}\n${result.stderr}`.replaceAll(targetUrl.password, "***");
    throw new Error(`${args[0]} returned ${result.status}; expected ${expectedStatus}\n${safeOutput}`);
  }
  return `${result.stdout}${result.stderr}`;
}

function directorySize(directory: string): number {
  return readdirSync(directory, { withFileTypes: true }).reduce((total, entry) => {
    const entryPath = path.join(directory, entry.name);
    return total + (entry.isDirectory() ? directorySize(entryPath) : statSync(entryPath).size);
  }, 0);
}

function rowHash(rows: unknown): string {
  return createHash("sha256").update(JSON.stringify(rows)).digest("hex");
}

async function schemaShape(connection: mariadb.PoolConnection) {
  const columns = await connection.query(
    "SELECT TABLE_NAME AS tableName, COLUMN_NAME AS columnName, COLUMN_TYPE AS columnType, IS_NULLABLE AS isNullable, COLUMN_DEFAULT AS columnDefault, EXTRA AS extra FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME, ORDINAL_POSITION"
  );
  const indexes = await connection.query(
    "SELECT TABLE_NAME AS tableName, INDEX_NAME AS indexName, NON_UNIQUE AS nonUnique, SEQ_IN_INDEX AS sequenceNumber, COLUMN_NAME AS columnName, SUB_PART AS subPart FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX"
  );
  const indexSignatures: string[] = indexes.map((row: Record<string, unknown>) =>
    ["tableName", "indexName", "nonUnique", "sequenceNumber", "columnName", "subPart"]
      .map((key) => String(row[key] ?? ""))
      .join(":")
  );
  return { columnHash: stableSha256(columns), indexSignatures };
}

async function main() {
  const parsedAdminUrl = new URL(requiredAdminUrl);
  const admin = mariadb.createPool({
    host: parsedAdminUrl.hostname,
    port: parsedAdminUrl.port ? Number(parsedAdminUrl.port) : 3306,
    user: decodeURIComponent(parsedAdminUrl.username),
    password: decodeURIComponent(parsedAdminUrl.password),
    database: parsedAdminUrl.pathname.slice(1),
    allowPublicKeyRetrieval: true,
    connectionLimit: 1,
  });
  let connection: mariadb.PoolConnection | undefined;
  let rehearsalRoot: string | undefined;
  let storageRoot: string | undefined;
  let backupRoot: string | undefined;
  try {
    connection = await admin.getConnection();
    await connection.query(`DROP DATABASE IF EXISTS \`${targetDatabase}\``);
    await connection.query(
      `CREATE DATABASE \`${targetDatabase}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await connection.query(`USE \`${targetDatabase}\``);

    for (const table of APPLICATION_TABLES) {
      const rows = (await connection.query(
        `SHOW CREATE TABLE \`${sourceDatabase}\`.${quoteIdentifier(table)}`
      )) as Array<Record<string, string>>;
      const createSql = rows[0]?.["Create Table"];
      if (!createSql) throw new Error(`missing source table shape for ${table}`);
      const myisamSql = createSql.replace(/ENGINE=\w+/i, "ENGINE=MyISAM");
      await connection.query(myisamSql);
    }

    await connection.query(
      "INSERT INTO `AdminUser` (`id`,`email`,`passwordHash`,`name`,`role`,`isActive`,`createdAt`,`updatedAt`) VALUES ('rehearsal-admin','rehearsal@example.invalid','synthetic-not-a-secret','Rehearsal Admin','ADMIN',1,NOW(3),NOW(3))"
    );
    await connection.query(
      "INSERT INTO `AuditLog` (`id`,`actorId`,`action`,`entityType`,`entityId`,`after`,`createdAt`) VALUES ('rehearsal-audit','rehearsal-admin','CREATE','Rehearsal','rehearsal-entity','{}',NOW(3))"
    );

    const redOutput = runVerifier(1);
    if (!redOutput.includes("ENGINE_GATE=RED")) throw new Error("MyISAM fixture did not report a red gate");
    if (!redOutput.includes("TRANSACTION_ROLLBACK=FAIL")) {
      throw new Error("MyISAM fixture did not prove the transaction rollback fault");
    }

    rehearsalRoot = mkdtempSync(path.join(tmpdir(), "kkd-prop-engine-rehearsal-"));
    storageRoot = path.join(rehearsalRoot, "storage-rehearsal-test");
    backupRoot = path.join(rehearsalRoot, "backups-rehearsal-test");
    mkdirSync(path.join(storageRoot, "private"), { recursive: true });
    mkdirSync(backupRoot, { recursive: true });
    const unsafeBackupOutput = runScript(
      ["scripts/backup-db.mts"],
      { DATABASE_URL: targetUrl.toString(), STORAGE_ROOT: storageRoot, BACKUP_ROOT: backupRoot },
      1
    );
    if (!unsafeBackupOutput.includes("quiesce all writes")) {
      throw new Error("MyISAM backup did not require explicit write quiescence");
    }

    const beforeConversionShape = await schemaShape(connection);
    const conversionStartedAt = Date.now();
    for (const table of APPLICATION_TABLES) {
      await connection.query(`ALTER TABLE ${quoteIdentifier(table)} ENGINE=InnoDB`);
    }
    for (const fk of FOREIGN_KEY_CONTRACTS) {
      await connection.query(
        `ALTER TABLE ${quoteIdentifier(fk.table)} ADD CONSTRAINT ${quoteIdentifier(fk.name)} ` +
          `FOREIGN KEY (${quoteIdentifier(fk.column)}) REFERENCES ${quoteIdentifier(fk.referencedTable)} (${quoteIdentifier(fk.referencedColumn)}) ` +
          `ON DELETE ${fk.deleteRule} ON UPDATE ${fk.updateRule}`
      );
    }
    const conversionDurationMs = Date.now() - conversionStartedAt;
    const afterConversionShape = await schemaShape(connection);
    if (beforeConversionShape.columnHash !== afterConversionShape.columnHash) {
      throw new Error("column/data-type metadata changed during engine conversion");
    }
    if (
      beforeConversionShape.indexSignatures.some(
        (index) => !afterConversionShape.indexSignatures.includes(index)
      )
    ) {
      throw new Error("an existing index was lost during engine conversion");
    }

    await connection.query("CREATE TABLE `UnexpectedTable` (`id` INT PRIMARY KEY) ENGINE=InnoDB");
    const unknownTableOutput = runVerifier(1);
    if (!unknownTableOutput.includes("unrecognized tables: UnexpectedTable")) {
      throw new Error("verifier did not reject an unrecognized table");
    }
    await connection.query("DROP TABLE `UnexpectedTable`");

    const firstGreen = runVerifier(0);
    const secondGreen = runVerifier(0);
    const signature = (output: string) => output.match(/VERIFICATION_SIGNATURE=([a-f0-9]+)/)?.[1];
    if (!signature(firstGreen) || signature(firstGreen) !== signature(secondGreen)) {
      throw new Error("verifier output was not deterministic");
    }

    runScript(
      ["scripts/backup-db.mts"],
      {
        DATABASE_URL: targetUrl.toString(),
        STORAGE_ROOT: storageRoot!,
        BACKUP_ROOT: backupRoot!,
        BACKUP_WRITES_QUIESCED: "true",
      },
      0
    );
    const snapshots = readdirSync(backupRoot).sort();
    if (snapshots.length !== 1) throw new Error("backup did not create exactly one rehearsal snapshot");
    const snapshot = path.join(backupRoot, snapshots[0]);
    const metadataPath = path.join(snapshot, SCHEMA_METADATA_FILENAME);
    const metadata = JSON.parse(readFileSync(metadataPath, "utf8")) as SnapshotSchemaMetadata;
    if (!metadata.sourceTransactional || metadata.tables.length !== APPLICATION_TABLES.length) {
      throw new Error("backup metadata did not record the transactional application schema");
    }

    const beforeSchemaMismatchRestore = await connection.query(
      "SELECT `id`,`name` FROM `AdminUser` ORDER BY `id`"
    );
    await connection.query(
      "ALTER TABLE `AdminUser` ADD COLUMN `rehearsalUnexpectedColumn` VARCHAR(10) NULL"
    );
    const schemaMismatchOutput = runScript(
      ["scripts/restore-db.mts", snapshot, "--confirm"],
      { DATABASE_URL: targetUrl.toString(), STORAGE_ROOT: storageRoot!, BACKUP_ROOT: backupRoot! },
      1
    );
    if (!schemaMismatchOutput.includes("RESTORE_COLUMN_MISMATCH")) {
      throw new Error("restore did not reject a mismatched target schema");
    }
    await connection.query("ALTER TABLE `AdminUser` DROP COLUMN `rehearsalUnexpectedColumn`");
    const afterSchemaMismatchRestore = await connection.query(
      "SELECT `id`,`name` FROM `AdminUser` ORDER BY `id`"
    );
    if (rowHash(beforeSchemaMismatchRestore) !== rowHash(afterSchemaMismatchRestore)) {
      throw new Error("schema-mismatch restore changed data before rejection");
    }

    const brokenSnapshot = path.join(rehearsalRoot, "broken-restore-rehearsal-test");
    cpSync(snapshot, brokenSnapshot, { recursive: true });
    const brokenSqlPath = path.join(brokenSnapshot, "database.sql");
    const brokenSql = `${readFileSync(brokenSqlPath, "utf8").trimEnd()}\nINSERT INTO \`AuditLog\` (\`id\`,\`actorId\`,\`action\`,\`entityType\`,\`entityId\`,\`createdAt\`) VALUES ('rehearsal-audit','rehearsal-admin','CREATE','RestoreFault','restore-fault',NOW(3));\n`;
    writeFileSync(brokenSqlPath, brokenSql, "utf8");
    metadata.databaseSqlSha256 = sha256(brokenSql);
    writeFileSync(
      path.join(brokenSnapshot, SCHEMA_METADATA_FILENAME),
      `${JSON.stringify(metadata, null, 2)}\n`,
      "utf8"
    );

    await connection.query("UPDATE `AdminUser` SET `name`='pre-restore-sentinel' WHERE `id`='rehearsal-admin'");
    const beforeRestore = [
      await connection.query("SELECT `id`,`name` FROM `AdminUser` ORDER BY `id`"),
      await connection.query("SELECT `id`,`actorId`,`action` FROM `AuditLog` ORDER BY `id`"),
    ];
    runScript(
      ["scripts/restore-db.mts", brokenSnapshot, "--confirm"],
      { DATABASE_URL: targetUrl.toString(), STORAGE_ROOT: storageRoot!, BACKUP_ROOT: backupRoot! },
      1
    );
    const afterRestore = [
      await connection.query("SELECT `id`,`name` FROM `AdminUser` ORDER BY `id`"),
      await connection.query("SELECT `id`,`actorId`,`action` FROM `AuditLog` ORDER BY `id`"),
    ];
    if (rowHash(beforeRestore) !== rowHash(afterRestore)) {
      throw new Error("failed restore changed the pre-restore clone");
    }

    console.log("MYISAM_GATE=RED");
    console.log("INNODB_GATE=GREEN");
    console.log("RESTORE_ROLLBACK=PASS");
    console.log("NONTRANSACTIONAL_BACKUP_GUARD=PASS");
    console.log("UNKNOWN_TABLE_GUARD=PASS");
    console.log("COLUMN_INDEX_PRESERVATION=PASS");
    console.log("RESTORE_SCHEMA_GUARD=PASS");
    console.log(`VERIFICATION_SIGNATURE=${signature(firstGreen)}`);
    console.log(`TABLE_COUNT=${APPLICATION_TABLES.length}`);
    console.log(`FOREIGN_KEY_COUNT=${FOREIGN_KEY_CONTRACTS.length}`);
    console.log(`CONVERSION_DURATION_MS=${conversionDurationMs}`);
    console.log(`SNAPSHOT_SIZE_BYTES=${directorySize(snapshot)}`);
  } finally {
    if (connection && process.env.REHEARSAL_KEEP_TARGET !== "true") {
      await connection.query(`DROP DATABASE IF EXISTS \`${targetDatabase}\``);
    }
    connection?.release();
    await admin.end();
    if (rehearsalRoot && process.env.REHEARSAL_KEEP_TARGET !== "true") {
      rmSync(rehearsalRoot, { recursive: true, force: true });
    }
  }
}

main().catch((error) => {
  console.error(`REHEARSAL_FAILED: ${(error as Error).message}`);
  process.exitCode = 1;
});
