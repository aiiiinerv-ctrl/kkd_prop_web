# PLAN — ISSUE_038_cookieyes_banner_locale_en

## Meta

| Field | Value |
|---|---|
| GitHub | https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/38 |
| Opened | 2026-08-15 |
| Status (disk) | active |
| Triage labels | `bug`, `ready-for-human` |
| Type | bug (vendor plan limitation) |

## Goal

- Resolve Thai-only CookieYes banner on `/en` via an owner decision (upgrade plan vs accept Free limitation vs change default language).

## Scope

- **In-scope**: CookieYes dashboard / plan decision; optional paid-plan `documentLang` wiring if owner upgrades
- **Out-of-scope**: Homegrown consent banner replacement; breaking sprint-3 `kkd_ref` consent gating

## Checkpoint: Known / Unknown / Assumption

- **Known**: Free plan = one language only (documented on #38 comment 2026-08-26). Site already sets `<html lang>` correctly.
- **Unknown**: Owner budget for CookieYes Basic+.
- **Safe assumptions**: No Free-plan code workaround will switch locale by path.

## Task table

| # | Work | Owner | Depends on | Parallel? | Status |
|---:|---|---|---|---|---|
| 1 | Choose option (upgrade / accept / default-lang swap) | User | — | — | **blocked** |
| 2 | If upgrade: configure Languages + optional `documentLang` | User + `nextjs-dev` | 1 | — | pending |
| 3 | Verify `/en` banner language | User / agent | 2 | — | pending |
| 4 | Close #38; move to done; INDEX | User / agent | 3 | — | pending |

## Definition of Done

- [ ] Owner decision recorded on #38
- [ ] If upgrade path: `/en` shows English banner; `/th` Thai
- [ ] If accept limitation: issue closed as wontfix or documented accepted risk
- [ ] Folder + INDEX updated

## Evidence

### 1) Research
- #38 comment with CookieYes Free limitation sources (2026-08-26)

### 2–4)
- (fill when executed)
