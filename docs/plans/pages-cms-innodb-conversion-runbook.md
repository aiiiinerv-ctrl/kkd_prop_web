# Pages CMS — InnoDB conversion and recovery runbook

Status: Sprint 1 rehearsal complete; **not authorized for production execution**.

This is the single operational source for converting the existing KKD Property
application tables from MyISAM to InnoDB. Every production phase below has an
explicit owner gate. Never paste database rows, credentials, raw Audit Log
snapshots, customer contact details, or private storage paths into evidence.

## Safety boundary

- Sprint 1 runs only against a loopback database whose name starts with
  `kkd_prop_` and ends with `test` or `rehearsal`.
- Production inventory is read-only and needs separate approval.
- Maintenance activation, backup, DDL, restore, application restart, and
  maintenance removal are separate production mutations. Approval for one does
  not imply approval for the next.
- Stop on an unknown table, a non-zero orphan count, missing InnoDB support,
  an incomplete backup, a changed schema hash, or any unexpected response.
- Do not improvise SQL in phpMyAdmin. Amend and review this runbook first.

## Sprint 1 local rehearsal

The harness creates a schema-shaped fixture with synthetic rows only. It never
copies local or production business data. It proves MyISAM rollback is red,
converts all 16 tables, installs the 11 declared Foreign Keys, proves atomic
rollback twice, creates a versioned backup, then proves an intentionally failed
restore leaves the pre-restore clone unchanged. Temporary database and storage
are deleted only after their names pass the disposal guard.

```bash
docker compose up -d mysql
REHEARSAL_ADMIN_DATABASE_URL='mysql://<local-admin>@127.0.0.1:3306/mysql' \
  npx tsx scripts/rehearse-storage-engine.mts
```

Expected terminal markers:

```text
MYISAM_GATE=RED
INNODB_GATE=GREEN
RESTORE_ROLLBACK=PASS
TABLE_COUNT=16
FOREIGN_KEY_COUNT=11
```

## Gate A — owner-approved read-only production inventory

Run `scripts/verify-storage-engine.mts` only where the host can execute the
bundled tooling, without `--fault-injection`. On the current SSH-less host, run
the equivalent read-only statements through phpMyAdmin and save only aggregate
output. Required inventory is documented in
`docs/plans/myisam-innodb-atomicity-investigation.md` under Gate A.

Record server version, default engine, InnoDB support, exact application table
names, engines, aggregate row counts/sizes, index definitions, the 11 constraint
names, and 11 orphan counts. The owner reviews this evidence before a maintenance
window is scheduled. Gate A does not authorize any `ALTER`, backup route,
restart, upload, or content write.

## Gate B — host-level maintenance/read-only state

The application has public Lead/Booking writes and authenticated admin writes,
so stopping only admin navigation is insufficient. Use the LiteSpeed/Apache
layer to intercept every method before Passenger. The versioned page is
`deploy/maintenance/pages-cms-maintenance.html`; it contains no form, external
asset, analytics call, or writable endpoint and explains the outage in TH/EN.

Gate C uses the temporary secret-gated backup route, so the maintenance rewrite
must **exclude** `/api/operations/pages-cms-backup` or the snapshot POST never
reaches Passenger. Every other path (public forms, admin, other `/api`, `/files`)
must still return 503.

### Pre-flight (required before any production `.htaccess` mutation)

1. Site healthy: `/th` 200, `/api/admin/leads` 401, backup POST → JSON
   `404 {"error":"not_found"}` while the route is deployed but disabled.
2. Download `.htaccess` with the GET-only helper (never `action=edit`):

```bash
npx tsx scripts/download-production-htaccess.mts
```

   Expect `OK` for CloudLinux Passenger + env markers and the canonical
   www→bare redirect. The raw file lands under `$TMPDIR/kkd-htaccess/` — do not
   commit or paste it.
3. Owner supplies an **exact** Bangkok end-of-window timestamp for
   `Retry-After` (do not invent one from “ตอนนี้”).

### Activation steps

1. Upload the HTML as `pages-cms-maintenance.html` under the domain document
   root. This is a human FTP action under the redeploy runbook's non-negotiable
   rule.
2. Re-run `download-production-htaccess.mts` and keep that baseline outside the
   repo; it contains secrets and must never be committed or pasted into logs.
3. Append the block below after the CloudLinux-managed blocks. Replace the
   `Retry-After` timestamp with the owner-approved end of the window (GMT).

```apache
<IfModule mod_headers.c>
Header always set Retry-After "Wed, 26 Aug 2026 17:00:00 GMT"
</IfModule>
ErrorDocument 503 /pages-cms-maintenance.html

<IfModule mod_rewrite.c>
RewriteEngine On
RewriteCond %{REQUEST_URI} !^/pages-cms-maintenance\.html$ [NC]
RewriteCond %{REQUEST_URI} !^/api/operations/pages-cms-backup$ [NC]
RewriteRule ^ - [R=503,L]
</IfModule>
```

4. Re-download with the GET-only helper and diff locally against the intended
   append. Confirm CloudLinux blocks are still present. Do not publish either
   copy.
5. Verify desktop/mobile TH and EN; verify `GET`, public form `POST`, admin
   mutation `POST`, other `/api`, and `/files`. Every intercepted request must
   return 503 and must not reach Passenger. A rendered maintenance page with a
   200 POST is a failure because it could falsely imply a save. The backup path
   alone may reach the app (404 while disabled, or authenticated success during
   Gate C).
6. Check database aggregate counts and newest timestamps before/after a blocked
   test POST. They must not change. Only then mark writes quiesced.

The exact `.htaccess` behavior remains a host-level unknown until rehearsed on
the real LiteSpeed configuration. Do not add a broad application feature flag
unless this gate demonstrably cannot block every write before Passenger.

## Gate C — quiesced backup

MyISAM cannot provide a consistent cross-table transaction. Keep maintenance
active for the entire backup and explicitly attest quiescence:

```bash
BACKUP_WRITES_QUIESCED=true npx tsx scripts/backup-db.mts
```

The produced snapshot must contain `database.sql`, `schema-metadata.json`, and
the private storage copy when present. Verify the recorded dump SHA-256, exact
16-table inventory, per-table counts, source engines, and schema hash. Download
the complete snapshot off-server before DDL. The current host cannot run `tsx`
directly, so Sprint 2 must select and separately review either a temporary
secret-gated backup route or a panel-native export that produces equivalent
metadata. Do not claim this gate is executable on production until that path is
proved.

## Gate D — conversion SQL

Keep maintenance active. Run one statement at a time in phpMyAdmin and record
duration plus aggregate sizes only. Table names are the checked application
inventory; do not include `_prisma_migrations` or an unrecognized table.

```sql
ALTER TABLE `PromoChannel` ENGINE=InnoDB;
ALTER TABLE `PromoLandingPath` ENGINE=InnoDB;
ALTER TABLE `ChannelExecutive` ENGINE=InnoDB;
ALTER TABLE `AdminUser` ENGINE=InnoDB;
ALTER TABLE `Lead` ENGINE=InnoDB;
ALTER TABLE `SurveyBooking` ENGINE=InnoDB;
ALTER TABLE `BookingCapacitySetting` ENGINE=InnoDB;
ALTER TABLE `PaymentSettings` ENGINE=InnoDB;
ALTER TABLE `SiteSettings` ENGINE=InnoDB;
ALTER TABLE `PageSeo` ENGINE=InnoDB;
ALTER TABLE `AboutContent` ENGINE=InnoDB;
ALTER TABLE `Service` ENGINE=InnoDB;
ALTER TABLE `Package` ENGINE=InnoDB;
ALTER TABLE `PortfolioProject` ENGINE=InnoDB;
ALTER TABLE `Testimonial` ENGINE=InnoDB;
ALTER TABLE `AuditLog` ENGINE=InnoDB;
```

Do not add Foreign Keys until all 11 orphan counts are zero. Then use the exact
constraint statements in the initial migration,
`prisma/migrations/20260809100858_init_mysql/migration.sql`, lines 223–253.
That file is the reviewed source for names, columns, references, and delete/
update rules; copying a second mutable set here would create drift.

## Gate E — post-conversion verification

Run the verifier without fault injection against production and require
`ENGINE_GATE=GREEN`. Fault injection is intentionally impossible on a normal
database name. Re-run table counts/hashes and the 11 orphan checks, then perform
a reviewed admin test mutation and verify its Audit Log in the secured admin UI.
Verify a public synthetic Lead/Booking only if the owner explicitly authorizes
that data mutation and its cleanup.

Keep maintenance active until all checks pass. A partial conversion is not a
reason to resume writes.

## Recovery and rollback

- Before DDL: remove only the appended maintenance block after the owner cancels
  the window; no database rollback is needed.
- During conversion: stop on first failure. Do not convert successful tables
  back to MyISAM. Diagnose, retain maintenance, and use the off-server snapshot
  only after an owner recovery decision.
- Restore is allowed only into a target where all 16 tables are InnoDB and all
  11 Foreign Keys exist. `restore-db.mts` verifies metadata, dump hash, allowed
  statements, engine state, and constraints before mutation; its data changes
  run in one transaction.
- `--with-storage` remains a distinct destructive approval because it replaces
  private payment slips. Never infer it from database restore approval.
- Remove maintenance only after TH/EN public GETs, a read-only admin check,
  health checks, counts/hashes, and audit behavior are green. Re-download
  `.htaccess` afterward to ensure the canonical-host and CloudLinux blocks were
  preserved.
