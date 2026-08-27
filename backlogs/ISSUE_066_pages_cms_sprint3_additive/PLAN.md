# PLAN — ISSUE_066_pages_cms_sprint3_additive

> Dual source of truth with GitHub `#66`.

## Meta

| Field | Value |
|---|---|
| GitHub | https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/66 |
| Opened | 2026-08-27 |
| Status (disk) | active — unlocked after Gate B–E; waiting owner DDL/backfill schedule |
| Triage labels | `enhancement`, `needs-info` (promote to `ready-for-agent` only after checkpoints scheduled) |
| Type | enhancement (Pages CMS Sprint 3 execution) |

## Goal

- Additive Pages CMS schema + recovery coverage for **remaining** page models (Home pilot already live).
- Idempotent backfill with digest parity; old app remains sole reader/writer for non-Home surfaces.
- Production-safe hand SQL + evidence under `docs/plans/assets/pages-cms-result/s03-additive-data/`.

## Scope

- **In-scope**
  - Mother plan Sprint 3 (`docs/plans/pages-cms-implementation-sprints.md` § Sprint 3), adjusted for Home H1:
    - **Already done (skip / do not recreate):** `HomePageContent`, `HomeFaqItem`, managed home hero key + Home FAQ backfill (#61)
    - **Still to add:** `PageSeo` extensions; `AboutFeaturedTestimonial`; `ServicesPageContent`; `PackagesPageContent`; `PortfolioPageContent`; `CalculatorPageContent`; `AboutContent` / `SiteSettings` extensions per `pages-cms-data-model-migration-decision.md`
    - **Owner decide:** `HomeFeaturedPortfolioProject` (deferred in #60) — include in this sprint or keep deferred
  - Backup model order + `public/seo/og/` and `public/pages/` namespaces
  - Idempotent backfill scripts; secret-gated HTTP route only if host still cannot run `tsx`
  - Production additive SQL (host has no `_prisma_migrations` ledger)
- **Out-of-scope**
  - Admin Pages shell (Sprint 4+)
  - Per-page public/admin cutover (Sprint 5–10)
  - Dual writers / flipping non-Home readers
  - Down migrations; generic Page/JSON/Media Asset models

## Checkpoint: Known / Unknown / Assumption

- **Known:** Gate A–E green (#51/#65); Home CMS H0–H4 closed (#52/#61–#64); prep file `pages-cms-sprint3-prep.md`; data-model decision locked.
- **Unknown:** Owner schedule for DDL / gated backfill / cleanup redeploy; whether to include `HomeFeaturedPortfolioProject` now; whether HTTP backfill route is still required vs panel/ops path.
- **Safe assumptions:** Additive columns/tables ignored by current production build for non-Home pages; Home rows already present must remain untouched by new backfills except intentional extensions.

## Task table

| # | Work | Owner | Depends on | Parallel? | Status |
|---:|---|---|---|---|---|
| 1 | Owner: schedule DDL + backfill + cleanup checkpoints; decide Featured Portfolio model | User | — | — | **blocked** (`needs-info`) |
| 2 | Pre-flight checklist ticks in `pages-cms-sprint3-prep.md` | `pm-expert` / `nextjs-dev` | — | ✅ w/ hygiene | in progress |
| 3 | Schema + local migrate + phpMyAdmin-safe additive SQL | `nextjs-dev` | 1 | — | pending |
| 4 | Backup order / storage namespace coverage | `nextjs-dev` | 3 | — | pending |
| 5 | Idempotent backfill + digests (2×); optional gated HTTP route | `nextjs-dev` | 3 | — | pending |
| 6 | Production DDL on host | `hosting-deploy-specialist` | 1, 3 | — | pending |
| 7 | Production gated backfill + teardown secret/route | `hosting-deploy-specialist` | 1, 5, 6 | — | pending |
| 8 | Evidence `s03-additive-data/` + verify skill | `nextjs-dev` + specialist | 7 | — | pending |
| 9 | Close #66; move PLAN → `backlogs/done/` | User / agent | 8 | — | pending |

## Parallel lanes

- P1: Owner checkpoint scheduling + Featured Portfolio decision (#66)
- P2: Repo hygiene track (`docs/plans/repo-hygiene-docs-system-tasks.md`) — no code/schema

## Sequential chain

1. Owner answers `needs-info` → label `ready-for-agent`
2. Local schema + SQL + backfill harness
3. Production DDL → backfill → cleanup redeploy
4. Evidence + close

## Definition of Done

- [ ] Remaining Sprint 3 models present locally + production (additive, InnoDB, named FKs)
- [ ] Backfill twice with matching digests; Home pilot rows not duplicated/corrupted
- [ ] Old build against expanded DB: non-Home public/admin visually unchanged
- [ ] Backup → restore reproduces new tables + bounded CMS images
- [ ] Temp backfill route/secret removed if used
- [ ] Evidence under `s03-additive-data/`; GitHub closed; PLAN moved to `done/`; INDEX updated
- [ ] No secrets in PLAN / issue comments

## Evidence

### 1) Research

- Scope: Pages CMS Sprint 3 post–Home pilot
- Files: mother sprints, data-model decision, sprint3-prep, Home H1 schema migration
- Current state: unlocked; issue opened; implementation blocked on owner schedule
- Constraints: no dual writer; no down migration; hand SQL on host

### 2) Fix / diagnosis

- Change summary: dual-SoT opened only (no schema yet)
- Why: prep forbids `ready-for-agent` until checkpoints scheduled
- Alternatives: start coding before schedule — rejected (owner checkpoint rule)
- Affected files: this PLAN, INDEX, sprint3-prep, issue #66

### 3) Quality

- Commands run: `gh issue create` → #66
- Observed: Gate E evidence exists at `s02-gate-d-e/manifest.md`
- Locales: N/A until schema/backfill

### 4) Risk / follow-up

- Residual risk: mother Sprint 3 text still lists Home models — implementers must use this PLAN’s “already done” carve-out
- Follow-up: Sprint 4 issue only after #66 closed with evidence
