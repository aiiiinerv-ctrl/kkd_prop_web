# PLAN — ISSUE_037_portfolio_hero_vs_inventory

## Meta

| Field | Value |
|---|---|
| GitHub | https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/37 |
| Opened | 2026-08-15 |
| Status (disk) | active |
| Triage labels | `needs-triage` (nearby queue backfill) |
| Type | bug / content honesty |

## Goal

- Stop the Portfolio hero from advertising commercial work the published inventory does not support.
- Hide empty filter chips or align copy with the real 住宅/residential case studies until more projects exist.

## Scope

- **In-scope**: public Portfolio page copy / chip visibility; TH+EN messages
- **Out-of-scope**: Pages CMS Sprint 9 refactor; uploading new portfolio assets for the client

## Checkpoint: Known / Unknown / Assumption

- **Known**: Issue documents residential-only inventory vs commercial hero claim.
- **Unknown**: Whether owner prefers softer copy vs hiding chips — UX call.
- **Safe assumptions**: Surgical copy/chip changes won't require schema.

## Task table

| # | Work | Owner | Depends on | Parallel? | Status |
|---:|---|---|---|---|---|
| 1 | Decide copy + chip behavior | `ux-ui-expert` | — | — | pending |
| 2 | Implement TH/EN | `nextjs-dev` | 1 | — | pending |
| 3 | Verify `/th/portfolio` + `/en/portfolio` | `nextjs-dev` | 2 | — | pending |
| 4 | Close #37; move to done; INDEX | User / agent | 3 | — | pending |

## Definition of Done

- [ ] No commercial overclaim vs published inventory
- [ ] TH/EN parity
- [ ] Verify skill evidence for both locales
- [ ] #37 closed; folder in `backlogs/done/`; INDEX updated

## Evidence

### 1) Research
- Issue #37 body; `docs/plans/system-completeness-audit-tasks.md` if referenced

### 2–4)
- (fill when executed)
