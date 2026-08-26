# PLAN — ISSUE_052_home_cms_slice_map

> Dual source of truth with GitHub `#52`. Folder name must use the same number:
> `backlogs/ISSUE_052_home_cms_slice_map/PLAN.md`

## Meta

| Field | Value |
|---|---|
| GitHub | https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/52 |
| Opened | 2026-08-27 |
| Status (disk) | active — live triage status is GitHub labels |
| Triage labels | `wayfinder:map` |
| Type | wayfinder |

## Goal

- Chart the way for Admin-editable Home content: hero (copy+image), shared contact values, Our service CTA, FAQ CRUD
- Finish when investigation + small-sprint plan + live-verify matrix + owner sign-off exist — **no production code in this map**
- Reuse approved Pages CMS architecture; do not invent a parallel CMS

## Scope

- **In-scope**
  - Wayfinder tickets under #52 (#53–#60)
  - Research (root cause / edge / impact / security)
  - Foundation gate status via #51 → D/E
  - Sprint plan + live-verify matrix + grilling sign-off
- **Out-of-scope**
  - Latest Works / featured portfolio
  - Home SEO/Properties
  - Other page cutovers
  - Code/schema implementation (graduates after #60)
  - Issue #36, repo hygiene

## Checkpoint: Known / Unknown / Assumption

- **Known:** Ownership decisions and mother sprint plan already exist under `docs/plans/pages-cms-*`; Home copy is message-owned; contact from SiteSettings; hero image static; FAQ from messages; Gate B/C open as #51 `ready-for-human`
- **Unknown:** Owner maintenance window for Gate B/C; whether Featured Portfolio tables ship empty with Home migration
- **Safe assumptions:** Charting decisions in map Notes are locked until an explicit grilling reopens them

## Task table

| # | Work | Owner (agent / human) | Depends on | Parallel? | Status |
|---:|---|---|---|---|---|
| 1 | [#53](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/53) Inventory / root cause | agent (`research`) | — | yes | done — `docs/plans/home-cms-slice-inventory-research.md` |
| 2 | [#54](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/54) Edge-case catalog | agent (`research`) | — | yes | done — `docs/plans/home-cms-slice-edge-cases-research.md` |
| 3 | [#55](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/55) Impact analysis | agent (`research`) | — | yes | done — `docs/plans/home-cms-slice-impact-research.md` |
| 4 | [#56](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/56) Security analysis | agent (`research`) | — | yes | done — `docs/plans/home-cms-slice-security-research.md` |
| 5 | [#57](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/57) Foundation gates B/C→D/E | human + agent assist | #51 | yes | done (status) — B–E still red; see `home-cms-slice-foundation-gate-status.md` |
| 6 | [#58](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/58) Small-sprint plan | agent (`task`) | #53–#56 | no | done — `docs/plans/home-cms-slice-implementation-sprints.md` |
| 7 | [#59](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/59) Live-verify matrix | agent (`task`) | #58 | no | done — `docs/plans/home-cms-slice-live-verification-matrix.md` |
| 8 | [#60](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/60) Owner sign-off before code | human (`grilling`) | #57–#59 | no | **done** — plan accepted; execution #61–#64 |
| 9 | [#61](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/61) Execute H1 schema/backfill | `nextjs-dev` | #51 (Gate E) | no | blocked |
| 10 | [#62](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/62) Execute H2 audit+admin | `nextjs-dev` | #61 | no | blocked |
| 11 | [#63](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/63) Execute H3 cutover | `nextjs-dev` | #62 | no | blocked |
| 12 | [#64](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/64) Execute H4 live-verify | `nextjs-dev` | #63 | no | blocked |

## Parallel lanes

- P1: Research #53–#56
- P2: Foundation #57 / #51 (human window)

## Sequential chain

1. Close research tickets → draft sprint plan (#58)
2. Prepare live-verify matrix (#59)
3. Owner sign-off (#60) with foundation status known
4. Only then graduate execution tickets (outside this map’s Destination unless Notes change)

## Definition of Done

- [ ] All child tickets #53–#60 closed with resolution comments
- [ ] Map Decisions-so-far lists each closed ticket gist
- [ ] `docs/plans/` sprint plan + verify matrix linked
- [ ] Owner confirmed before-fix summary
- [ ] No secrets in PLAN / INDEX / GitHub
- [ ] GitHub #52 closed or converted to execution map only after explicit Note override
- [ ] Folder moved to `backlogs/done/` when closed; INDEX updated

## Evidence

### 1) Research

- Scope: Home CMS slice wayfinding
- Files explored: `docs/plans/pages-cms-*`, `src/app/[locale]/home-content.tsx`, map Notes from charting session 2026-08-27
- Current state: map + tickets created; no code changes
- Constraints: plan-don’t-do until Destination clear

### 2) Fix / diagnosis

- N/A (planning map)

### 3) Quality

- N/A until research/verify tickets run

### 4) Risk / follow-up

- Residual risk: foundation gates slip → Home write stays blocked even if plan is ready
- Follow-up: execution tickets after #60; hygiene effort remains separate
