# PLAN — ISSUE_051_pages_cms_gate_b_c

## Meta

| Field | Value |
|---|---|
| GitHub | https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/51 |
| Opened | 2026-08-27 |
| Status (disk) | active |
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
- **Unknown**: Exact Bangkok end-of-window timestamp for `Retry-After` — **blocked on owner**.
- **Safe assumptions**: LiteSpeed honors the reviewed RewriteCond exclusions once rehearsed on the live host.

## Task table

| # | Work | Owner | Depends on | Parallel? | Status |
|---:|---|---|---|---|---|
| 1 | Owner supplies maintenance end time (Bangkok) | User | — | — | **blocked** |
| 2 | Pre-flight: site healthy + `download-production-htaccess.mts` markers OK | `hosting-deploy-specialist` | 1 | — | pending |
| 3 | Gate B activate + prove 503 (except maintenance page + backup path) | `hosting-deploy-specialist` | 2 | — | pending |
| 4 | Enable 3 env vars, re-check htaccess, restart, POST backup once | `hosting-deploy-specialist` | 3 | — | pending |
| 5 | Download snapshot off-host; dry `restore-db.mts` (no `--confirm`) | `hosting-deploy-specialist` | 4 | — | pending |
| 6 | Disable env, remove maintenance, smoke + manifest evidence | `hosting-deploy-specialist` | 5 | — | pending |

## Definition of Done

- [ ] Gate B proven (writes blocked; counts unchanged on blocked POST)
- [ ] Gate C snapshot off-host with matching hashes; dry restore validation pass
- [ ] Route back to JSON 404; site smoke green; `.htaccess` CloudLinux + canonical intact
- [ ] Manifest updated; Gate D explicitly still unauthorized
- [ ] GitHub #51 closed; folder moved to `backlogs/done/`; INDEX updated

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
