# KKD PROPERTY — Production Cutover: SQLite → MySQL

Wayfinder map: [Migrate kkd_prop database from SQLite to MySQL](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/1) (#1). This doc resolves [Design the production cutover runbook](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/8) (#8); [Execute the production MySQL cutover](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/9) (#9) runs it against the real `kkdproperty.co.th`. Designed via a grilling session with the user, 2026-08-09.

**Status when this was written**: all code/infra work is done and verified — `prisma/schema.prisma` targets MySQL, `scripts/migrate-sqlite-to-mysql.mts` is tested and idempotent, the deploy pipeline (Docker build) produces a verified-correct artifact. What remains is entirely the live production cutover.

## Decisions locked in for this cutover

| Decision | Answer |
|---|---|
| Database name | `kkdprop1_kkdproperty` |
| Database user | `kkdprop1_app` |
| Charset/collation | `utf8mb4_unicode_ci` (matches local dev; required for the app's Thai-language content) |
| Import method | Run `scripts/migrate-sqlite-to-mysql.mts` for real against production — not a raw `.sql` dump via phpMyAdmin. Already tested end-to-end (12/12 tables exact match against a real `dev.db` copy), handles SQLite→MySQL type conversion, and MySQL reserved-word quoting (`Lead`, `before`) via Prisma rather than hand-written SQL. |
| Production DB user privileges | Narrow: `ALL PRIVILEGES` scoped to `kkdprop1_kkdproperty.*` only, no `WITH GRANT OPTION`. Production only ever runs `prisma migrate deploy` (no shadow database needed — that's a `migrate dev`-only mechanism used in local dev). |
| Rollback trigger | Any of: homepage not `200`; `/admin` (unauthenticated) not redirecting to `/admin/login`; `/files/...` (unauthenticated) not `401`; the migration script erroring or reporting a row-count mismatch; a feature-specific check (calculator tier markers, booking referrer field) not rendering. |
| `production.db` (SQLite) after cutover | Keep on the server, untouched, as a safety net. Don't delete until confidence is high (manual cleanup later, not part of this runbook). |
| Downtime target | ≤15–30 minutes, per the map's own Notes. |

## Pre-flight (no live panel interaction)

- [ ] Confirm `deploy/dist.zip` is fresh (rebuild via `npx tsx scripts/build-shared-hosting-deploy.mts` if any code changed since the last build) — verify locally it contains no `.env`/`storage`/`backups`, and that `sharp`'s Linux binary is present.
- [ ] Confirm local `docker-compose` MySQL is **not** what gets used for anything below — every step here targets the real production panel via `.env.hosting-panel` credentials.
- [ ] Generate a fresh `AUTH_SECRET` for production if the existing one predates this doc (`openssl rand -base64 33`) — only if not already set from the original Sprint 3 cutover; if it's already set and working, leave it alone (rotating it invalidates all current admin sessions for no benefit here).

## Task breakdown — each step is its own authorization checkpoint

Matches the pattern used for the original Sprint 3 cutover and the most recent SQLite-schema redeploy: **a fresh, scoped authorization from the user before every live-mutating panel action** — no blanket approval. All production-bound `curl`/FTP commands run by the **user** via `!` prefix, not the agent directly (see the map's Notes — both a classifier block and a real transfer-reliability difference were observed doing this any other way).

| # | Step | Live/mutating? | Authorization checkpoint? |
|---|---|---|---|
| 1 | Backup: FTP-download current `production.db`, verify integrity (`PRAGMA integrity_check`) and row counts | Read-only | No — safe |
| 2 | Create MySQL database + user on the panel (`kkdprop1_kkdproperty` / `kkdprop1_app`, `utf8mb4_unicode_ci`, scoped privileges) | Live, but new/isolated (doesn't touch the running app) | **Yes** |
| 3 | Run `scripts/migrate-sqlite-to-mysql.mts` against production: `DATABASE_URL` pointed at the new MySQL, `SOURCE_SQLITE_PATH` pointed at the step-1 backup copy (never the live file) | Live write, but to a database the app isn't using yet | **Yes** |
| 4 | Verify migration: row counts per table match the SQLite source exactly (same check used in ticket #6's test); spot-check a few records including Thai-language content via Prisma (not the `mysql` CLI directly — see the map's Notes gotcha) | Read-only | No |
| 5 | Upload the deploy artifact (`deploy/dist.zip`) to the Application Root, extract (same File Manager `?action=extract` mechanism used for the last redeploy) | Live — touches app code, but app isn't restarted yet | **Yes** |
| 6 | Set/update production env vars via the panel's Node.js Selector UI: new `DATABASE_URL` (`mysql://kkdprop1_app:<password>@localhost:3306/kkdprop1_kkdproperty` — confirm the correct MySQL host string for this panel, likely `localhost` since it's the same physical server) | Live | **Yes — this is the actual cutover moment** |
| 7 | Restart: touch `tmp/restart.txt` inside the Application Root (edit-and-resave, since the file already exists from initial app creation) | Live — this is when the new code + new DB actually go live | **Yes, confirm immediately before** |
| 8 | Smoke test on the real domain: homepage `200` with real content, `/admin` unauthenticated → redirect, `/files/...` unauthenticated → `401`, calculator tier markers render, booking referrer field renders | Read-only | No |
| 9 | If any smoke test fails → **rollback immediately** (see below), do not debug live | — | Confirm before rolling back too |
| 10 | If all smoke tests pass → done. Leave `production.db` in place (untouched safety net). Update the wayfinder map's Decisions-so-far and this repo's `kkd-shared-hosting-deploy` memory note with the real outcome. | — | No |

## Rollback plan

Trigger: any condition in the table's row 9.

1. Revert `DATABASE_URL` env var (panel UI) back to the SQLite path the app used before this cutover.
2. Touch `tmp/restart.txt` again to reload the app under the old config.
3. Re-verify the same smoke-test set passes against the reverted state.
4. The new MySQL database (`kkdprop1_kkdproperty`) can stay — it's isolated and does no harm sitting unused; don't rush to delete it under pressure. Investigate the failure calmly afterward, then re-attempt.

## Explicitly not in scope for this cutover

- Deleting `production.db` — separate manual cleanup, later, once confidence is high (per the locked-in decision above).
- Enabling `RESEND_API_KEY`/LINE notification tokens if not already set — unrelated to the database migration, no reason to bundle it in.
- Any change to the hosting panel/provider itself — out of scope for the whole wayfinder map (#1).
