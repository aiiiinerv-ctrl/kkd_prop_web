# PLAN — ISSUE_051_pages_cms_gate_b_c

## Meta

| Field | Value |
|---|---|
| GitHub | https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/51 |
| Opened | 2026-08-27 |
| Status (disk) | done — move to backlogs/done/ after INDEX update |
| Triage labels | `ready-for-human` |
| Type | enhancement (ops / deploy) |

## Goal

- Enter an owner-approved maintenance window, prove Gate B write quiescence, run one Gate C temporary-route backup, download the snapshot off-host, validate without restoring production, then disable the route and restore the site.
- Leave Gate D (InnoDB DDL) unauthorized.

## Scope

- **In-scope**
  - Gate B maintenance HTML + `.htaccess` 503 (with backup-path exclusion)
  - Enable/disable three backup env vars; `.htaccess` re-check via GET-only helper
  - One POST snapshot; off-host download; local `restore-db.mts` dry validation
- **Out-of-scope**
  - Gate D/E DDL
  - Pages CMS Sprint 3+
  - Leaving the backup route enabled after the window

## Checkpoint: Known / Unknown / Assumption

- **Known**: Route deployed disabled; GET-only htaccess helper exists; prior `action=edit` truncate outage documented in redeploy runbook.
- **Known (owner 2026-08-27):** Retry-After end = `2026-08-27 03:30 Asia/Bangkok` (`Wed, 26 Aug 2026 20:30:00 GMT`).
- **Safe assumptions**: LiteSpeed honors the reviewed RewriteCond exclusions once rehearsed on the live host.

## Task table

| # | Work | Owner | Depends on | Parallel? | Status |
|---:|---|---|---|---|---|
| 1 | Owner supplies maintenance end time (Bangkok) | User | — | — | **done** — `2026-08-27 03:30 Asia/Bangkok` / `Wed, 26 Aug 2026 20:30:00 GMT` |
| 2 | Pre-flight: site healthy + `download-production-htaccess.mts` markers OK | `hosting-deploy-specialist` | 1 | — | **done** (2026-08-27) |
| 3 | Gate B activate + prove 503 (except maintenance page + backup path) | `hosting-deploy-specialist` | 2 | — | **done** proof GREEN; **must restore .htaccess before overnight** |
| 4 | Enable 3 env vars, re-check htaccess, restart, POST backup once | `hosting-deploy-specialist` | 3 | — | **done** 2026-08-27 |
| 5 | Download snapshot off-host; dry `restore-db.mts` (no `--confirm`) | `hosting-deploy-specialist` | 4 | — | **done** snapshot `2026-08-26T20-04-40` |
| 6 | Disable env, remove maintenance, smoke + manifest evidence | `hosting-deploy-specialist` | 5 | — | **done** smoke 03:09 Bangkok |

## Definition of Done

- [x] Gate B proven (writes blocked; counts unchanged on blocked POST)
- [x] Gate C snapshot off-host with matching hashes; dry restore validation pass
- [x] Route back to JSON 404; site smoke green; `.htaccess` CloudLinux + canonical intact
- [x] Manifest updated; Gate D explicitly still unauthorized
- [x] GitHub #51 closed; folder moved to `backlogs/done/`; INDEX updated

## Evidence

### 1) Research
- Runbooks: `pages-cms-innodb-conversion-runbook.md`, `pages-cms-sprint2-temporary-backup-route.md`, `kkd-shared-hosting-redeploy-runbook.md`
- Helper: `scripts/download-production-htaccess.mts`

### 2) Fix / diagnosis
- (fill during window)

### 3) Quality
- (fill during window)

### 4) Risk / follow-up
- Residual: first live Gate B on LiteSpeed; abort if CloudLinux blocks vanish
- Follow-up: Gate D approval issue (not created yet)

## Pause note (2026-08-27 ~02:54 Bangkok)

Owner paused until tomorrow. Gate B was proven GREEN. Gate C not started. **Production may still be on maintenance 503 until `deploy/upload-htaccess-restore.sh` is run.** Resume needs a fresh Retry-After end time.
