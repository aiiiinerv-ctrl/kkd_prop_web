# PLAN — ISSUE_122_ga_tracking_scripts_execution

> Dual SoT with GitHub `#122`. Follows from wayfinder map `#116` (closed).

## Meta

| Field | Value |
|---|---|
| GitHub | https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/122 |
| Opened | 2026-08-29 |
| Status (disk) | active — live triage status is GitHub labels |
| Triage labels | `ready-for-agent` |
| Type | enhancement (execution of wayfinder map #116) |

## Goal

Ship the admin-editable Google Analytics / Tracking Scripts config: `/admin/settings` tab + storage + audited server action + consent-gated public-page injection.

## Scope

- **In-scope**: `SiteSettings` schema addition, `updateAnalyticsSettings` action, new admin tab, `[locale]/layout.tsx` header/body injection, e2e + live-verify.
- **Out-of-scope**: structured GTM/Pixel fields, enable/disable toggle, `/admin/*` injection, auto-rewriting pasted HTML to inject `data-cookieyes` (admin adds it themselves).

## Checkpoint: Known / Unknown / Assumption

- **Known** (from map #116, tickets #117–#121): CookieYes attribute contract, body placement, rendering approach (`dangerouslySetInnerHTML`, no `next/script`), data model shape, admin UI design (live-verified prototype).
- **Unknown**: none — map fully charted before this issue opened.
- **Safe assumptions**: existing `SITE_REVALIDATE` array in `src/actions/site-settings.ts` needs no changes (already revalidates both locale layouts in full).

## Task table

| # | Work | Owner (agent / human) | Depends on | Parallel? | Status |
|---:|---|---|---|---|---|
| 1 | E1 — schema + action | `nextjs-dev` | — | — | done |
| 2 | E2 — admin UI tab | `nextjs-dev` | 1 | — | done |
| 3 | E3 — public injection | `nextjs-dev` | 1 | can run parallel with 2 | pending |
| 4 | E4 — verify (build/e2e/live-verify) | `nextjs-dev` | 2, 3 | — | pending |
| 5 | Independent review (audit gate) | `audit-compliance-reviewer` | 4 | — | pending |
| 6 | Owner accept + close GitHub + move folder to `backlogs/done/` | User | 5 | — | pending |

## Definition of Done

- [ ] Behavior matches Goal
- [ ] Verify skill evidence attached (build + e2e + live-verify pre/post-consent)
- [ ] No secrets in PLAN, INDEX, or GitHub comments
- [ ] `audit-compliance-reviewer` finds no gaps
- [ ] GitHub issue #122 commented with outcome and closed
- [ ] This folder moved to `backlogs/done/` when closed
- [ ] `backlogs/INDEX.md` updated (link + one-line status)

## Evidence

### 1) Research

- Scope: fully covered by wayfinder map #116 (tickets #117–#121) — see `docs/plans/ga-tracking-scripts-implementation-sprints.md` for the consolidated decisions.

### 2) Fix / diagnosis

- Not started.

### 3) Quality

- Not started.

### 4) Risk / follow-up

- Residual risk: raw script injection is a site-wide code-execution surface; mitigated by ADMIN-only access + audit trail (locked decisions #3, #4).
