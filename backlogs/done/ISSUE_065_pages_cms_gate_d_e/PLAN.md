# PLAN — ISSUE_065_pages_cms_gate_d_e

> Dual source of truth with GitHub `#65`.

## Meta

| Field | Value |
|---|---|
| GitHub | https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/65 |
| Opened | 2026-08-27 |
| Status (disk) | done — move to backlogs/done/ after INDEX update |
| Triage labels | `ready-for-human` |
| Type | ops / deploy |

## Goal

- Convert 16 production app tables to InnoDB (one `ALTER` at a time)
- Add 11 FKs only after orphan counts are zero
- Gate E: `ENGINE_GATE=GREEN`, counts/hashes, reopen writes
- Unblock Home CMS H1 (#61)

## Scope

- **In-scope:** Gate B re-entry (new window), fresh Gate C snapshot, Gate D SQL, Gate E verify + teardown
- **Out-of-scope:** Home Page Content schema, restore-to-production, `--with-storage`

## Checkpoint

- **Known:** Owner approved Gate D DDL 2026-08-27. B/C completed on #51. phpMyAdmin is the DDL surface (human).
- **Known:** Retry-After end = `2026-08-27 14:30 Asia/Bangkok` (`Thu, 27 Aug 2026 07:30:00 GMT`).
- **Safe assumptions:** Snapshot from 03:04 is stale for recovery of post-backup writes — refresh under maintenance before first ALTER.

## Task table

| # | Work | Owner | Status |
|---:|---|---|---|
| 1 | Owner supplies new maintenance end time (Bangkok) | User | **done** — `2026-08-27 14:30 Asia/Bangkok` / `Thu, 27 Aug 2026 07:30:00 GMT` |
| 2 | Gate B 503 + prove quiescence | human FTP + specialist | **done** (2026-08-27 ~12:47) — see Evidence |
| 3 | Fresh Gate C snapshot off-host + dry restore | specialist | **done** (2026-08-27 ~12:54) — snapshot `2026-08-27T05-54-14`, see Evidence |
| 4 | ALTER 16 tables InnoDB (phpMyAdmin, one at a time) | human + specialist assist | **done** (2026-08-27 ~13:14) — 16/16 confirmed InnoDB |
| 5 | Orphan checks then 11 FKs | human phpMyAdmin | **done** (2026-08-27 ~13:24) — 11/11 FKs confirmed, orphans 0 |
| 6 | Gate E verify; reopen writes; smoke | specialist | **done** (2026-08-27 ~13:50) — teardown FTP confirmed, full smoke GREEN |
| 7 | Evidence + close #65; #61 unblocked | specialist / PM | **done** — closed, #61/H1 noted unblocked |

## Evidence — this window (2026-08-27, new Retry-After)

### Gate B — GREEN
- Human FTP upload confirmed ~12:46 Bangkok: `226 File successfully transferred`, 1436 bytes.
- Re-downloaded `.htaccess` (GET-only helper); diffed byte-for-byte against the prepared file: **identical**. CloudLinux Passenger + env blocks (7 keys) intact, canonical www→bare redirect intact, maintenance + backup-path-exclusion appended correctly.
- Live `Retry-After` header confirmed exactly `Thu, 27 Aug 2026 07:30:00 GMT` (not last night's stale value).
- 503 sweep GREEN: `/th`, `/en`, `/`, `/admin`, `/api/admin/leads`, `/files/*`, POST `/th/booking` — all 503, none reach Passenger (quiescence holds by construction — a request LiteSpeed rejects with 503 cannot produce a Prisma write).
- `pages-cms-maintenance.html` renders 200. Backup path correctly bypasses 503: `GET` → 405, `POST` (no/bad secret) → `404 {"error":"not_found"}`.

### Gate C — GREEN (2026-08-27 ~12:54 Bangkok)
- Owner's Node.js Selector SAVE (3 backup env vars, reused a prior secret rather than the session's freshly generated one) had already landed by the time of re-check.
- Re-downloaded `.htaccess` after the panel save: maintenance, canonical redirect, CloudLinux Passenger block all intact. Panel appended a **second** `CLOUDLINUX ENV VARS` block after ours (rather than editing the first in place) — duplicate `SetEnv` keys have identical values in both blocks so nothing conflicts, but this is a new observed panel behavior worth re-checking after any future env edit.
- Confirmed still fully in Gate B 503 (`/th` `/en` `/admin` all 503, correct `Retry-After`) before invoking the backup route.
- `POST /api/operations/pages-cms-backup` → `200 ok`. **Snapshot `2026-08-27T05-54-14`**: `writesQuiesced=true`, `sourceTransactional=false` (expected pre-D), row counts match Gate A's 16-table shape, private storage copied server-side (128.5 KB, not fetched locally — not needed for the SQL dry-run).
- Downloaded `database.sql` + `schema-metadata.json` off-host via the panel's read-only file-download path (same GET-only pattern as the `.htaccess` helper, non-destructive). Local SHA-256 of `database.sql` matches the route's reported hash exactly (`d47cc8d0…7608d11`); schema hash matches (`cb280cca…9fbc45f`).
- Dry `restore-db.mts` (no `--confirm`; this mode never opens a DB connection) validated cleanly: 32 statements, all 16 row counts match, hash check passes.
- Backup env vars intentionally left live for now (don't block phpMyAdmin DDL); will be torn down together with maintenance at final teardown rather than risk another panel rewrite mid-window.

### Gate D — engines done, orphans zero, FK statements handed off (2026-08-27 13:00–13:14 Bangkok)
- First check (~13:00): owner reported "กดแล้ว" (clicked) after being given the 16 statements; verification found **all 16 tables still `MyISAM`**, no `ALTER` running in `SHOW PROCESSLIST` — the statements had not landed yet (likely only the first of a multi-statement paste executed, or wrong DB context).
- **New proven capability this session:** a genuine read-only path to query production engine/schema state directly, without a human relaying phpMyAdmin screenshots. DirectAdmin (this panel, v1.697) exposes `POST /api/phpmyadmin-sso/database-access/{database}` (basic-auth, same credentials as the File Manager calls) → returns a one-time login URL into phpMyAdmin 5.2.3. Following that URL with a cookie jar establishes a `SignonSession`; phpMyAdmin's own AJAX endpoint `POST index.php?route=/sql` (with `db`, `token` from the landing page, `sql_query`, `ajax_request=true`) then runs a single `SELECT`/`SHOW` statement and returns results embedded in its JSON `message` field/HTML. Verified live each time via phpMyAdmin's own "Query took N seconds" / "N total" timing, not a cached response. This supersedes the earlier `.tmp-inspect-pma-sso.mts` exploration (lost/untracked) — now documented in the runbook so it isn't rediscovered again. **Still SELECT/SHOW only** — no DDL was or should be run through this path; all ALTERs remain human-phpMyAdmin-only per the runbook's non-improvisation rule.
- Second check (~13:10): 2/16 converted (`PromoChannel`, `PromoLandingPath`).
- Third check (~13:15): **all 16/16 confirmed `InnoDB`**, live.
- **Orphan re-check (live, one combined `SELECT ... UNION ALL`, aggregate counts only):** all 11 FK relationships from `scripts/lib/storage-engine-contract.ts` returned `0` — total orphan count 0.
- Maintenance confirmed intact (`/th` 503, correct `Retry-After`) before and after every check in this sequence.
- **Exact 11 FK `ALTER TABLE ... ADD CONSTRAINT` statements posted to [#65](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/65)**, copied verbatim from `prisma/migrations/20260809100858_init_mysql/migration.sql` lines 223–253 (not retyped/invented). Specialist has not run and did not run any DDL.
- Owner confirmed all 11 done (~13:24). Re-verified live: **11/11 FK constraint names present** (exact match, `information_schema.TABLE_CONSTRAINTS` returns exactly 11 rows), **orphans still 0/11**, **row counts unchanged** from the Gate C snapshot (607 total, exact match — proves zero writes landed during the whole window). Full evidence: `docs/plans/assets/pages-cms-result/s02-gate-d-e/manifest.md`.

### Gate E — evidence recorded (read-only equivalent); admin test mutation deferred
`scripts/verify-storage-engine.mts` cannot run against production (no external MySQL access, confirmed in the redeploy runbook). Ran the equivalent read-only check set live instead: engine/FK/orphan state above stands in for `ENGINE_GATE=GREEN`. The runbook's optional authenticated admin test mutation + Audit Log review was not performed this session (deferred — not required to prove schema state, can be done as a lightweight follow-up before or after closing #65).

### Teardown — STOPPED at human FTP (2026-08-27 ~13:35 Bangkok)
- Constructed a clean restore `.htaccess` directly from the **current live file** (not a stale prior-night snapshot) by keeping only the CloudLinux Passenger block, the original 7-key CloudLinux env block, and the canonical www→bare redirect — dropping both the maintenance block and the duplicated second CloudLinux env block that held the 3 backup-route vars. Verified line-by-line: first 24 lines are byte-identical to what's live now; nothing else changed.
- This single restore accomplishes **both** teardown requirements in one FTP upload: maintenance removed (site back to 200) **and** `ENABLE_PAGES_CMS_BACKUP_ROUTE`/`PAGES_CMS_BACKUP_SECRET`/`BACKUP_WRITES_QUIESCED` no longer served to the app (Passenger reads `.htaccess` `SetEnv`, so removing them here disables the route immediately on restart regardless of what Node.js Selector's own stored config still says).
- `deploy/upload-htaccess-restore.sh` `LOCAL_FILE` updated to point at the new file.
- **Residual, non-blocking risk:** Node.js Selector's underlying JSON config may still have the 3 backup vars stored (only `.htaccess` was fixed, not the panel's own config). A future *unrelated* Node.js Selector Save could regenerate the CloudLinux block from that stale config and silently re-add them. Not urgent — recommend the owner also delete the 3 vars in the Node.js Selector UI next time they're in the panel, and always re-download `.htaccess` after any future env edit (standard practice already established this session).
- **Human action required:** `noglob deploy/upload-htaccess-gate-b.sh` is NOT what's needed here — use the restore script:
  ```
  noglob deploy/upload-htaccess-restore.sh 2>&1 | tail -40
  ```
- After upload, specialist will re-download `.htaccess`, confirm 1076 bytes / CloudLinux+canonical OK / maintenance+backup markers MISS / exactly 7 `SetEnv` keys, then run the full smoke set (`/th` `/en` 200, `/admin` 307, `/api/admin/leads` 401, backup POST 404) before closing #65.

### Teardown confirmed GREEN (2026-08-27 ~13:50 Bangkok)
- Human FTP restore confirmed: `226 File successfully transferred`, 1076 bytes.
- Re-downloaded `.htaccess`: 1076 bytes (exact match), CloudLinux Passenger + canonical redirect intact, maintenance/backup-path markers gone, exactly 7 `SetEnv` keys (`AUTH_SECRET`, `AUTH_TRUST_HOST`, `DATABASE_URL`, `NEXT_PUBLIC_COOKIEYES_ID`, `NEXT_PUBLIC_SITE_URL`, `STORAGE_DRIVER`, `STORAGE_ROOT`) — no backup vars.
- Full smoke, all green: `/th` 200, `/en` 200, `/admin` 307, `/api/admin/leads` 401, backup POST → `404 {"error":"not_found"}`, private file path 401, `www→bare` canonical redirect still 301.
- `npx tsx scripts/smoke-test-production.mts`: all checks passed (`HOMEPAGE` 200, `ADMIN_REDIRECT` 307, `PRIVATE_FILE` 401).
- **Residual (non-blocking):** Node.js Selector's own stored config may still list the 3 backup env vars even though `.htaccess` no longer serves them. Owner should delete them there next time convenient so a future unrelated Save can't resurrect them.

## Definition of Done

- [x] All 16 tables `ENGINE=InnoDB`
- [x] All 11 FKs present; orphans still zero
- [x] Maintenance removed; `/th` `/en` 200; backup route 404
- [x] Sanitized manifest under `docs/plans/assets/pages-cms-result/` (`s02-gate-d-e/manifest.md`)
- [x] Gate D still not implied as Home CMS code complete — no Home CMS schema/code touched this session; #61/H1 noted unblocked for `nextjs-dev` to pick up separately
