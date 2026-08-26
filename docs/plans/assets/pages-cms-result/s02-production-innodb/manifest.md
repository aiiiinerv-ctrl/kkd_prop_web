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

Pending. This section will contain sanitized aggregate findings, the Gate A
decision, and the exact next owner checkpoint after the read-only run.
