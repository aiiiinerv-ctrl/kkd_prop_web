# Production MyISAM atomicity investigation and InnoDB release gate

## Decision

Production must move every application table from MyISAM to InnoDB before the
Pages CMS can enable writes. This is a release prerequisite, not an optional
performance improvement.

An application-only retry, compensating Audit Log write, or extra pre-delete
check is not an acceptable substitute. Those approaches cannot restore atomic
rollback, enforce relationships, or make a destructive restore safe.

This investigation is read-only with respect to production. It does **not**
authorize `ALTER TABLE`, a maintenance window, a deployment, or a production
content mutation. Each of those needs a separate, scoped owner approval after
the preflight evidence below is available.

## Outcome at a glance

| Question | Finding |
| --- | --- |
| Why were the original production tables MyISAM? | The production cutover executed Prisma-generated `CREATE TABLE` statements that omitted `ENGINE`. The host supplied its default engine. The observed all-MyISAM result and the host's 1000-byte index limit identify that default as MyISAM with high confidence. |
| Did `migrate-sqlite-to-mysql.mts` choose the engine? | No. It only upserts rows into tables that already exist. The temporary cutover route created the schema first by executing raw migration SQL. |
| Is the current audited-mutation contract atomic on production? | No. If the entity write succeeds and the following Audit Log insert fails, rollback cannot undo the MyISAM entity write. |
| Is the risk limited to Audit Log completeness? | No. Foreign Keys are not enforced, nested writes and restore operations can become partial, table-level locking hurts concurrency, and crash recovery is weaker. |
| Can historic audit completeness be proven from current rows? | No. Existing logs can be validated, but an absent log for a deleted or overwritten row cannot always be reconstructed. Only bounded anomaly checks are possible. |
| Is conversion technically plausible? | Yes. A local data-bearing probe converted the current 17-table schema surface and 2,052 local rows MyISAM → InnoDB successfully. The largest text-bearing index is 764 worst-case utf8mb4 bytes; the previously failing Audit Log composite index is now 360 bytes. Production-shaped rehearsal remains mandatory. |
| Recommendation | Convert all application tables, add the intended Foreign Keys explicitly, verify them, and make engine checks a permanent deploy gate. |

## Evidence and feedback loop

The exact failure mode was reproduced against the isolated Docker MySQL,
without reading or writing production:

```bash
npx tsx .tmp-myisam-rollback-repro.mts
```

Observed output:

```text
MyISAM mutation rows after rollback: 1
InnoDB mutation rows after rollback: 0
DDL without ENGINE under a MyISAM default: MyISAM; enforced foreign keys: 0
Current-schema data conversion: 17 tables/2052 rows passed; largest text index AboutContent.PRIMARY=764 utf8mb4 bytes
REPRO_CONFIRMED: failed audit leaves a MyISAM mutation committed
```

The rollback comparison was run three consecutive times before the wider
schema probe and returned the same 1-versus-0 result every time. The repro:

1. starts a transaction;
2. inserts the entity-side row;
3. forces the audit-side insert to fail with a duplicate key;
4. calls rollback; and
5. counts the entity-side row.

That is the same ordering used by `auditedEntity()` in `src/lib/audit.ts`.
The loop is deterministic, completes in seconds, and distinguishes the exact
contract violation rather than merely checking whether the database responds.

The throwaway repro is intentionally not part of the deliverable. The durable
implementation should replace it with a test-only engine verifier and an
isolated fault-injection check described below.

## Root cause

### Causal chain

1. During the production SQLite-to-MySQL cutover, external database access and
   `prisma migrate deploy` were unavailable.
2. The temporary secret-gated migration route therefore read each repository
   `migration.sql` and executed its statements with
   `prisma.$executeRawUnsafe()`.
3. The initial Prisma MySQL migration creates every table with charset and
   collation but no `ENGINE=...` clause.
4. MySQL/MariaDB uses `@@default_storage_engine` when `ENGINE` is omitted.
5. Production subsequently showed all twelve original tables as MyISAM.
6. The temporary route then ran the data upserts. Neither it nor
   `scripts/migrate-sqlite-to-mysql.mts` altered an already-created table's
   engine.
7. The Foreign Key statements were accepted but ignored because MyISAM does
   not support them.

The local probe repeated the decisive part of that chain: with a session
default of MyISAM, the repository's engine-less DDL shape created a MyISAM
table and registered zero referential constraints.

Official behavior matches the probe:

- [MySQL: omitting `ENGINE` uses the default storage engine](https://dev.mysql.com/doc/refman/8.0/en/storage-engine-setting.html)
- [MySQL: MyISAM does not support transactions or Foreign Keys and has a 1000-byte maximum key length](https://dev.mysql.com/doc/refman/8.0/en/myisam-storage-engine.html)
- [MySQL: Foreign Key specifications are parsed and ignored for engines such as MyISAM](https://dev.mysql.com/doc/refman/8.0/en/ansi-diff-foreign-keys.html)
- [MariaDB: MyISAM does not support transactions or Foreign Keys](https://mariadb.com/docs/server/server-usage/storage-engines/myisam-storage-engine/myisam-overview)

### Correction to the earlier 1071 diagnosis

The cutover history described the production error as an InnoDB key-length
limit. The recorded server message said the maximum was **1000 bytes**. That
number is MyISAM's documented maximum and matches the newly discovered engine.
The stronger interpretation is therefore:

- the engine-less `AuditLog` table was being created as MyISAM;
- its original composite utf8mb4 index cost up to 1,528 bytes;
- shortening `entityType` and `entityId` reduced it to 360 bytes and allowed
  the MyISAM schema creation to continue.

The shortening remains correct and useful for either engine. What changes is
the attribution of the original failure. Because the production server
variables from the cutover were not captured, this is high-confidence forensic
evidence rather than a historical server-variable snapshot.

### Ranked hypotheses resolved

| Rank | Hypothesis | Prediction | Result |
| --- | --- | --- | --- |
| 1 | Engine-less migration DDL inherited a MyISAM host default | Replaying the DDL shape under a MyISAM default creates MyISAM and no Foreign Keys | Confirmed by local probe and production's all-MyISAM observation |
| 2 | SQLite-to-MySQL data migration created MyISAM tables | The script would contain schema DDL or engine selection | Falsified: it contains row reads, conversions, and Prisma upserts only |
| 3 | A later phpMyAdmin import converted InnoDB to MyISAM | The cutover record would show a schema dump/import or conversion step | Falsified for the original tables: the temporary app route executed raw repository migrations directly |
| 4 | The host silently substituted MyISAM even when InnoDB was explicit | Explicit InnoDB DDL would be present and the engine unavailable/substituted | Not supported by the original DDL, which never requested InnoDB. Preflight must still verify `SHOW ENGINES` and `NO_ENGINE_SUBSTITUTION` before conversion |

## Impact analysis

### Audited admin mutations

`auditedEntity()` performs the entity write first and the Audit Log insert
second inside `prisma.$transaction()`. On MyISAM, an audit insert failure can
therefore return an error to the admin while leaving the entity change applied.

The current code path does **not** normally produce the reverse state (an audit
row with no corresponding entity mutation): the audit insert is attempted only
after the entity mutation succeeds. The precise failure is an unaudited create,
update, or delete.

The affected entity families are:

- Admin Users and their Channel Executive links;
- Leads, Survey Bookings, booking capacity, and payment settings;
- Promo Channels and Channel Executives;
- Services, Packages, Portfolio Projects, and Testimonials;
- About Content, shared Site Settings, and Page SEO.

Risk is highest for access-control changes, Lead/Booking/payment workflow
changes, and deletes. Content and SEO changes are less likely to expose private
data but can silently alter the public site without a trustworthy actor trail.

The current `scripts/verify-audit-module.mts` validates the shape and secrecy of
Audit Log rows that exist. It cannot detect an Audit Log row that was never
written.

### Referential integrity

The schema declares eleven Foreign Keys, but the original MyISAM tables cannot
enforce them:

- Admin User → linked Channel Executive;
- Channel Executive → Promo Channel;
- Lead → source Channel, automatic source Channel, automatic source Executive,
  and assigned Sales user;
- Survey Booking → Lead, assigned Engineer, and assigned Sales user;
- Testimonial → Portfolio Project;
- Audit Log → actor Admin User.

Consequences include orphan rows and missing `CASCADE`, `SET NULL`, or
`RESTRICT` behavior. Application guards lower the probability but do not cover
direct maintenance, failed multi-step writes, older code, concurrent changes,
or every future action.

Adding Foreign Keys after conversion will fail if historic orphans already
exist. Preflight must report them by relationship and stop. It must never
silently delete, null, or re-parent business data.

### Public and composite writes

The public Survey flow creates a Lead and nested Survey Booking. Prisma treats
nested relational writes as one logical operation, but MyISAM cannot supply the
transactional rollback beneath it. A booking-side failure can leave a Lead
without its Booking; the already-written private slip can also become orphaned.

`createChannelExecutive()` performs two separately audited operations when it
also links an Admin User. Moving to InnoDB makes each audited operation atomic,
but does not make those two separate transactions one business transaction.
That pre-existing composite-action seam should be tracked independently; it is
not a reason to weaken the engine gate.

### Backup and restore

`scripts/restore-db.mts` deletes and reinserts multiple tables inside
`prisma.$transaction()`. On MyISAM, a failure in the middle can leave a partially
emptied or partially restored production database. Its rollback guarantee is
valid only after every involved table is transactional.

`scripts/backup-db.mts` reads tables sequentially and emits a data-only dump.
While MyISAM writes remain enabled, that snapshot is not guaranteed to
represent one consistent cross-table point in time. The pre-conversion backup
must therefore be taken while application writes are quiesced. A schema/engine
snapshot is also required because the existing backup is data-only.

### Concurrency, availability, and user experience

MyISAM uses table-level locking. Admin writes and public Lead submissions can
block more broadly than they would under InnoDB row-level locking. A failed
request can also have applied its mutation, so a user retry may encounter a
duplicate or overwrite newer state. This is both a correctness problem and a
poor experience: the UI's failure message is no longer trustworthy.

The production conversion itself can copy and lock tables depending on the
host's MariaDB version and supported `ALTER` algorithm. It must be treated as a
maintenance-window operation, not assumed to be online. MariaDB documents that
online behavior varies by operation, algorithm, lock mode, and version:
[MariaDB schema changes](https://mariadb.com/kb/en/innodb-schema-changes/).

### Historic audit-gap assessment

A bounded read-only assessment can identify suspicious live rows, but cannot
certify historic completeness:

- group Audit Logs by entity type, action, and date;
- check current rows with `createdAt`/`updatedAt` against corresponding create
  or update snapshots where the action was expected to be audited;
- find Audit Logs whose actor or current entity no longer exists, distinguishing
  legitimate deletes from orphans;
- report aggregate counts only outside the secured admin environment;
- never export passwords, private slips, contact details, snapshots, session
  data, or raw customer content as investigation evidence.

Deleted rows without a DELETE snapshot and overwritten values without an UPDATE
snapshot are not reconstructable from current state. The migration must preserve
existing logs; it must not invent backdated actors or synthetic compliance
records.

## Conversion feasibility

The local data-bearing probe copied every current local base table, converted
the copy to MyISAM and back to InnoDB, and verified source/destination row
counts. It passed for 17 tables and 2,052 rows.

The largest current text-bearing index has a 764-byte worst-case utf8mb4
component (`VARCHAR(191) * 4`). The Audit Log composite index is 360 bytes.
This is encouraging but not a production guarantee because:

- local is MySQL 8.0.46 with a 16 KiB InnoDB page size;
- production is a shared-host MariaDB instance with an unrecorded version and
  configuration;
- production contains different row counts and may contain orphan data;
- production schema is manually managed and has no `_prisma_migrations` table,
  so repository migration history is not an authoritative live inventory.

The conclusion is **feasible pending production-shaped rehearsal**, not “safe
to run live immediately.”

## Migration plan

### Gate A — read-only production inventory

Run through phpMyAdmin or an equally scoped read-only connection and save
sanitized output:

```sql
SELECT VERSION() AS server_version;
SELECT @@default_storage_engine AS default_storage_engine;
SHOW ENGINES;

SELECT
  TABLE_NAME,
  ENGINE,
  TABLE_ROWS,
  DATA_LENGTH,
  INDEX_LENGTH
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;

SELECT
  CONSTRAINT_NAME,
  TABLE_NAME,
  REFERENCED_TABLE_NAME
FROM information_schema.REFERENTIAL_CONSTRAINTS
WHERE CONSTRAINT_SCHEMA = DATABASE()
ORDER BY TABLE_NAME, CONSTRAINT_NAME;
```

Go only if:

- InnoDB reports supported;
- the exact live table list is understood;
- enough free database/disk quota exists for table copies and backups;
- every table and index definition has been captured with `SHOW CREATE TABLE`;
- all eleven expected relationship checks report zero orphans;
- no unplanned schema drift remains unresolved.

If the host cannot use InnoDB, stop. Pages CMS writes do not ship on that host.

### Gate B — quiesced, restorable backup

1. Put the application into a maintenance/read-only state that blocks public
   Lead submissions and admin mutations.
2. Confirm active writes have drained.
3. Run the database + private-storage backup.
4. Capture schema DDL, engine inventory, row counts, and checksums separately;
   the existing backup is data-only.
5. Download the snapshot off-server; a backup stored only beside the live app
   is not a disaster-recovery copy.
6. Restore it into an isolated production-shaped database and run application
   smoke tests before touching production.

The maintenance page must be friendly in both TH and EN, preserve navigation,
avoid implying a form was submitted, and provide a retry path. Admin must state
that editing is temporarily unavailable rather than letting a save spin or
fail ambiguously.

### Gate C — production-shaped rehearsal

On the restored clone:

1. run every orphan query;
2. convert all application tables with explicit
   `ALTER TABLE ... ENGINE=InnoDB`;
3. verify the engine after each statement;
4. add the eleven named Foreign Keys explicitly after every table is InnoDB;
5. compare row counts and representative hashes before/after;
6. run `CHECK TABLE` and the database verification scripts;
7. inject an audit failure and prove the entity mutation rolls back;
8. inject a restore failure and prove the restore transaction rolls back;
9. run public Lead, admin CRUD, audit, auth/file, and backup/restore suites;
10. record duration, lock behavior, temporary disk use, and the exact SQL that
    passed.

Do not rely on changing `@@default_storage_engine` alone. Existing tables keep
their current engine, and future sessions or tooling may use a different
default. Every conversion and future `CREATE TABLE` must request InnoDB
explicitly.

### Gate D — production conversion

This gate requires fresh owner authorization after Gates A–C pass.

1. Announce and enter the verified maintenance/read-only state.
2. Repeat the final backup and preflight inventory.
3. Execute the rehearsed statements one table at a time, recording start/end
   time and checking `ENGINE=InnoDB` immediately after each.
4. Keep all application writes disabled while engines are mixed.
5. Re-run orphan checks, then add the named Foreign Keys. Stop on the first
   error; do not use `FOREIGN_KEY_CHECKS=0` to force invalid data through.
6. Verify engine inventory, constraint inventory, row counts, indexes, and
   Audit Log readability.
7. Restart the unchanged application if required by the hosting workflow.
8. Run read-only live web verification before reopening writes.
9. Reopen writes only when every acceptance gate is green.
10. Perform one explicitly authorized low-risk canary write only if the owner
    approves it separately; otherwise rely on the clone fault-injection test
    and continue with read-only production smoke.

### Rollback points

| Failure point | Response |
| --- | --- |
| Inventory, quota, InnoDB support, schema drift, or orphan check fails | Stop before DDL; production is unchanged |
| Backup or restore rehearsal fails | Stop; repair backup/restore first |
| One table conversion fails | Keep maintenance enabled. Already converted tables remain valid InnoDB tables; diagnose and retry from the recorded point. Do not reflexively convert them back to MyISAM |
| Foreign Key creation finds invalid data | Stop and produce a row-count-only remediation report. Owner must approve each mapping/null/delete policy; never discard automatically |
| Post-conversion application smoke fails but data checks pass | Keep InnoDB, roll back application code/config only, and continue diagnosis under maintenance |
| Data verification fails | Keep writes blocked and restore into a clean schema/database from the verified off-server snapshot using the rehearsed recovery procedure |

Engine conversion is DDL and is not one cross-table transaction. “Rollback”
therefore means a verified recovery procedure, not `ROLLBACK` after all tables.

## Permanent safeguards to implement later

- Add a standalone engine/FK verifier that fails unless every required table is
  InnoDB and every named Foreign Key exists.
- Run it in production preflight, after schema changes, after restore, and in
  the Pages CMS release orchestrator.
- Patch every future Prisma-generated `CREATE TABLE` migration before commit to
  include `ENGINE=InnoDB`; do not silently trust a server default.
- Enable or verify `NO_ENGINE_SUBSTITUTION` where the host permits it so an
  unavailable requested engine fails loudly.
- Update the MySQL ADR and shared-hosting runbook to remove the old statement
  that MyISAM is “not a deploy blocker” and correct the 1071 attribution.
- Make backup/restore verification state its transactional-engine prerequisite.
- Add a production-schema inventory artifact because live production has no
  Prisma migration ledger.
- Track the two-step Channel Executive + Admin User link as a separate composite
  transaction design issue; do not bury that seam inside this engine migration.

## Acceptance contract

The InnoDB prerequisite is resolved only when all of the following have evidence:

- every live application table reports `ENGINE=InnoDB`;
- every intended Foreign Key exists under its stable name and every orphan
  query returns zero;
- production default engine and engine support are recorded, while DDL still
  specifies InnoDB explicitly;
- row counts and approved non-sensitive checksums match before/after;
- the isolated audit-failure loop leaves zero entity mutations after rollback;
- an isolated restore failure leaves the pre-restore database intact;
- backup plus off-server copy plus isolated restore rehearsal pass;
- existing build, public Lead, admin auth/files, admin CRUD/audit, calculator,
  and backup verification suites pass in production mode;
- live public TH/EN routes and authenticated admin screens render correctly at
  desktop, tablet, and mobile widths;
- production live verification is read-only by default and captures no real
  customer data, credentials, cookies, tokens, private slips, or authenticated
  screenshots in the repository;
- the owner receives a before-conversion summary, a per-table execution record,
  and an after-conversion summary before writes reopen.

## Scope and verification performed in this investigation

Reviewed:

- `src/lib/audit.ts` and every `auditedEntity()` call site;
- public quote/survey writes and the restore/backup paths;
- the Prisma schema, all MySQL migrations, and the deleted temporary production
  cutover route from Git history;
- the original MySQL cutover tickets and shared-hosting runbook;
- the Pages CMS data-model, security, impact, and live-verification decisions;
- official MySQL and MariaDB storage-engine and schema-change documentation.

Executed only against local Docker MySQL:

- deterministic MyISAM versus InnoDB rollback fault injection;
- engine-less DDL under a MyISAM default;
- Foreign Key registration check;
- current-schema data-bearing MyISAM → InnoDB conversion probe;
- index-width inventory.

No production query, schema change, application source change, data mutation,
storage mutation, dependency change, or deployment was performed.
