# ADR: Dual backlog SoT (GitHub + local PLAN)

## Status

Accepted (2026-08-27)

## Context

The team wanted the local `backlogs/ISSUE_*/PLAN.md` workflow from
`sdb_workspace` (DoD, evidence, task table) while `kkd_prop` already uses
GitHub Issues + triage labels + Wayfinder as the agent issue tracker.

Alternatives considered:

1. GitHub only + optional PLAN docs (weaker execution record)
2. Local `backlogs/` as sole SoT (breaks existing `gh` / Wayfinder skills)
3. Dual SoT — every in-scope item has both

## Decision

Use **dual source of truth**: GitHub for live triage; matching
`backlogs/ISSUE_XXX_*/PLAN.md` (same number as `#XXX`) for execution plans when
the item is `ready-for-agent` / `ready-for-human` / in progress, wayfinder, or
diagnosing-bugs. `INDEX.md` is a TOC only. No `.war-room/`. Active plans stay
under `backlogs/`; closed work moves to `backlogs/done/`.

## Consequences

- Agents must create/update PLAN + INDEX when promoting work; closing requires
  moving the folder.
- Slightly more ceremony than GitHub-only; avoids two competing status boards.
- Pages CMS Sprint 3–12 stay in `docs/plans/` until Sprint 2 unlocks them.
