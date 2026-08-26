# Backlogs — kkd_prop

Dual source of truth with **GitHub Issues**. Every work item that meets the
rules below must have both:

1. a GitHub issue (`gh`), and
2. `backlogs/ISSUE_XXX_<short_slug>/PLAN.md` where `XXX` is the **same** number
   as the GitHub issue.

Live triage status is always GitHub labels (`docs/agents/triage-labels.md`).
`INDEX.md` is a table of contents with links — not the live status board.

## When a PLAN is mandatory

Create (or update) a PLAN when any of these is true:

- label `ready-for-agent` or `ready-for-human`, or work is in progress
- the issue is on a **wayfinder** track (`wayfinder:map` / `grilling` / `task` / …)
- the work is a **diagnosing-bugs** session

`needs-triage` / `needs-info` discovery (outside wayfinder / diagnosing-bugs)
may stay GitHub-only until promoted.

## Layout

```
backlogs/
├── README.md                 ← this file
├── INDEX.md                  ← TOC + links to #N and PLAN paths
├── _TEMPLATE/PLAN.md         ← copy for new work
├── ISSUE_XXX_<slug>/PLAN.md  ← active plans
└── done/                     ← closed work (moved here after DoD)
```

Do **not** use `stack/` / `inprogress/` three-way moves. Active plans stay under
`backlogs/`; only completed work moves to `backlogs/done/`.

## New work

1. Create the GitHub issue (`gh issue create` …) if it does not exist.
2. Copy `_TEMPLATE/PLAN.md` → `backlogs/ISSUE_XXX_<slug>/PLAN.md` (pad number
   to three digits, e.g. `#38` → `ISSUE_038_…`).
3. Fill Goal / Scope / Known-Unknown / Task table / DoD.
4. Add a row to `INDEX.md`.
5. Put `Backlog plan: backlogs/ISSUE_XXX_<slug>/PLAN.md` near the top of the
   GitHub issue body or as a comment.

## Closing work

1. Comment outcome on the GitHub issue and close it.
2. Move `backlogs/ISSUE_XXX_<slug>/` → `backlogs/done/`.
3. Update `INDEX.md`.

## Out of scope for this folder

- `.war-room/` cross-tool protocol (not used in this repo)
- Replacing `docs/plans/*.md` sprint plans — those remain the committed
  implementation plans; PLANs link to them
- Pages CMS Sprint 3–12 implementation before Sprint 2 (InnoDB / Gate B–E) is
  green — keep those in `docs/plans/pages-cms-implementation-sprints.md` until
  unlocked

## Related

- `docs/agents/issue-tracker.md`
- `docs/agents/triage-labels.md`
- `.claude/skills/verify/SKILL.md`
