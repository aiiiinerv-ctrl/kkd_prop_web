# PLAN — ISSUE_XXX_<short_slug>

> Dual source of truth with GitHub `#XXX`. Folder name must use the same number:
> `backlogs/ISSUE_XXX_<short_slug>/PLAN.md`

## Meta

| Field | Value |
|---|---|
| GitHub | https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/XXX |
| Opened | YYYY-MM-DD |
| Status (disk) | active — live triage status is GitHub labels |
| Triage labels | `needs-triage` / `needs-info` / `ready-for-agent` / `ready-for-human` / … |
| Type | bug / enhancement / wayfinder / diagnosing-bugs |

## Goal

- 1–3 outcome bullets (what “done” looks like for the user/site)

## Scope

- **In-scope**
  - …
- **Out-of-scope**
  - …

## Checkpoint: Known / Unknown / Assumption

- **Known** (code/docs): …
- **Unknown** (need owner/raw data — stop and ask): …
- **Safe assumptions** (tests will catch): …

## Task table

| # | Work | Owner (agent / human) | Depends on | Parallel? | Status |
|---:|---|---|---|---|---|
| 1 | Clarify / grill remaining unknowns | `pm-expert` | — | — | pending |
| 2 | Design / copy / UX if needed | `ux-ui-expert` | 1 | — | pending |
| 3 | Implement | `nextjs-dev` | 1–2 | — | pending |
| 4 | Verify per `.claude/skills/verify/SKILL.md` | `nextjs-dev` | 3 | — | pending |
| 5 | Independent review if mutations/deploy | `audit-compliance-reviewer` / `deploy-verify` / code-review | 4 | — | pending |
| 6 | Owner accept + close GitHub + move folder to `backlogs/done/` | User | 5 | — | pending |

Adjust rows for wayfinder (`research` / `grilling` / `prototype` / `task`) or diagnosing-bugs phases; do not invent Flutter agents.

## Parallel lanes

- P1: …
- P2: …

## Sequential chain

1. …
2. …
3. …

## Definition of Done

- [ ] Behavior matches Goal (incl. TH/EN parity when UI/copy changes)
- [ ] Verify skill evidence attached (build and/or listed e2e / focused scripts)
- [ ] No secrets in PLAN, INDEX, or GitHub comments
- [ ] GitHub issue commented with outcome and closed (or labeled if blocked)
- [ ] This folder moved to `backlogs/done/` when closed
- [ ] `backlogs/INDEX.md` updated (link + one-line status)

## Evidence

### 1) Research

- Scope:
- Files explored:
- Current state:
- Constraints:

### 2) Fix / diagnosis

- Change summary:
- Why this approach:
- Alternatives considered:
- Affected files:

### 3) Quality

- Commands run:
- Observed ✓ / fail lines:
- Locales checked (`/th`, `/en`) if public UI:

### 4) Risk / follow-up

- Residual risk:
- Follow-up issues:
