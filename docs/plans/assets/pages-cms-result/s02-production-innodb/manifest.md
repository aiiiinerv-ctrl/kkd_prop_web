# Sprint 2 production InnoDB evidence

Status: Gate A read-only inventory in progress on 2026-08-26 (Asia/Bangkok).

## Owner-approved scope

This checkpoint authorizes only aggregate, read-only production inventory for
the existing database. It does not authorize maintenance mode, a backup or
restore, DDL, a deployment or restart, a content mutation, or a canary write.
Each later production phase remains a separate owner checkpoint.

## Before-inventory summary

The inventory will establish the following facts before any production change
is proposed:

- database server version, default storage engine, and InnoDB support;
- exact base-table names, engines, aggregate row counts, and allocated sizes;
- columns, indexes, `SHOW CREATE TABLE` digests, and existing Foreign Keys;
- aggregate database size and hosting account disk/inode headroom;
- aggregate counts for the eleven expected orphan relationships; and
- whether the live schema has drifted from the reviewed 16-table contract.

The only permitted SQL statement classes are `SELECT` and `SHOW`. The runner
must reject any statement outside a fixed reviewed allowlist before it reaches
phpMyAdmin. Raw business rows, customer fields, credentials, cookies, SQL
tokens, audit snapshots, private storage paths, and authenticated screenshots
must not be printed or committed.

Explicitly forbidden in this phase: `ALTER`, `CREATE`, `DROP`, `TRUNCATE`,
`INSERT`, `UPDATE`, `DELETE`, `REPLACE`, `CALL`, `SET`, `GRANT`, `REVOKE`,
`LOCK`, `UNLOCK`, `LOAD`, `IMPORT`, `BACKUP`, and `RESTORE`.

## Read-only access preflight

- DirectAdmin reports one MySQL database: `kkdprop1_kkdproperty`.
- Hosting account quota is 12,000 MB; current account usage is approximately
  1,737.9 MB.
- Hosting account inode quota is 200,000; current usage is approximately
  23,120.
- External MySQL and SSH are unavailable. The proven read-only path is the
  DirectAdmin database-specific phpMyAdmin SSO surface.
- Reaching phpMyAdmin and locating its SQL surface caused no database query or
  production mutation.

Account-level quota is only a preliminary capacity signal. Gate A remains
`NO-GO` until the database allocation, schema definitions, constraint state,
and orphan checks are captured and reviewed. No maintenance window is
scheduled at this checkpoint.

## Expected application-table contract

The reviewed conversion order contains these 16 tables:

1. `PromoChannel`
2. `PromoLandingPath`
3. `ChannelExecutive`
4. `AdminUser`
5. `Lead`
6. `SurveyBooking`
7. `BookingCapacitySetting`
8. `PaymentSettings`
9. `SiteSettings`
10. `PageSeo`
11. `AboutContent`
12. `Service`
13. `Package`
14. `PortfolioProject`
15. `Testimonial`
16. `AuditLog`

Any missing or additional base table is a stop condition until reviewed.

## Inventory result

Gate A decision: **NO-GO — production conversion must not start.**

### Server and capacity

- Server: MariaDB `10.6.24-MariaDB-cll-lve`.
- Default engine: `MyISAM`; all 16 application tables currently use MyISAM.
- InnoDB support: `YES`, including transactions, XA, and savepoints.
- InnoDB page size: 16,384 bytes; SQL mode includes
  `NO_ENGINE_SUBSTITUTION`.
- Exact base-table contract: 16 present, zero missing, zero unknown.
- Exact current application rows: 602 total.
- Allocated database size: 681,692 bytes (approximately 0.65 MiB), comprising
  458,460 data bytes and 223,232 index bytes.
- Account-level free disk is approximately 10.0 GiB and free inode headroom is
  approximately 176,880. This is ample relative to the current database, but
  it is not a substitute for a restorable off-host backup.

### Schema compatibility

- Production exposes 215 application columns and 45 index entries.
- The set of table/column identities matches the reviewed local schema.
- All 45 index entries match the reviewed local schema exactly.
- All 11 enum type lengths and server-side SHA-256 signatures match the
  reviewed local schema exactly.
- Remaining column-metadata differences are the expected MariaDB 10.6 versus
  MySQL 8 representations: `int(11)` versus `int`, JSON-as-LONGTEXT with
  binary collation versus native JSON, quoted defaults, timestamp casing, and
  MySQL's `DEFAULT_GENERATED` marker.
- Existing enforced Foreign Keys: zero, consistent with the current MyISAM
  engine state.
- `SHOW CREATE TABLE` ran for every application table, but this phpMyAdmin
  configuration truncates displayed values after 50 characters. The 16
  displayed snippets are therefore not accepted as full DDL evidence. Before
  any DDL approval, Gate A still needs a full-text schema export or an
  equivalent exact, hashed definition capture.

### Blocking orphan and root cause

Ten relationship checks are zero. One relationship is not:

- `AdminUser_linkedChannelExecutiveId_fkey`: 1 orphan.

The affected aggregate is one active `CHANNEL_EXECUTIVE` account. A matching
audited `ChannelExecutive` delete exists. No identity, email, record ID, or
Audit Log snapshot was exported.

The code path explains the failure: `deleteChannelExecutive()` guards only
automatic Lead references before deleting the executive. It does not guard or
clear linked Admin Users and relies on the intended `ON DELETE SET NULL`
Foreign Key. MyISAM ignored that Foreign Key, so the delete left the active
account's link stale. This is a fail-closed availability problem rather than a
known cross-account disclosure: login resolves no linked channel, while the
lead filter still contains the deleted executive ID and therefore matches no
current executive/channel records.

No orphan was deleted, nulled, remapped, or otherwise changed during this
inventory.

### Live read-only verification

The unchanged production site passed GET-only smoke after the inventory:

- `/th` and `/en`: 200;
- TH/EN About, Services, Packages, Portfolio, and Calculator routes: 200 with
  their expected localized navigation text;
- unauthenticated `/admin`: 307 redirect; and
- unauthenticated private-slip path: 401.

No authenticated screenshot was captured or committed.

## Recommended remediation checkpoint

The owner must choose the business-correct treatment of the one active account
in the secured admin UI. The safe choices are:

1. Relink it to the correct existing Channel Executive if the account should
   remain active in that role (recommended when such a relationship exists).
2. Change its role or deactivate it and clear the stale link if it should no
   longer act as a Channel Executive.
3. Restore the deleted Channel Executive only if the original deletion was a
   business mistake.

Blindly setting the link to `NULL` is not recommended: it would leave an active
Channel Executive account that violates the create/update invariant and sees
no scoped Leads.

Separately, the application should block future Channel Executive deletion
while linked Admin Users exist and tell the admin to relink/change those users
first. That source/test change and the one-time production data remediation are
separate approvals. After the chosen remediation, rerun all eleven orphan
checks and obtain full-text DDL evidence. Only a clean rerun can move Gate A
from `NO-GO` to owner review for maintenance/backup; it still does not authorize
conversion DDL.
