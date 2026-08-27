# Pages CMS — Sprint 3 prep

Date: 2026-08-27  
Updated: 2026-08-27 (unlocked)  
Status: **unlocked** — Gate B–E green (#51/#65). Dual-SoT opened as
[#66](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/66) /
[`backlogs/ISSUE_066_pages_cms_sprint3_additive/PLAN.md`](../../backlogs/ISSUE_066_pages_cms_sprint3_additive/PLAN.md).  
Implementation still waits on **owner-scheduled** DDL / gated backfill /
cleanup redeploy (`needs-info` on #66). Do not apply `ready-for-agent` until
those checkpoints are on the calendar.

Canonical sprint body: [`pages-cms-implementation-sprints.md`](pages-cms-implementation-sprints.md)
§ Sprint 3. **Carve-out:** Home pilot already shipped `HomePageContent` +
`HomeFaqItem` (#61) — Sprint 3 must not recreate them; see PLAN #66.

## Unlock gate

Sprint 3 **Depends on:** production InnoDB gate complete — Gate B maintenance,
Gate C off-host backup evidence, Gate D conversion + FKs, Gate E verification
and writes reopened.

| Gate | Status | Tracker / evidence |
| --- | --- | --- |
| B/C | GREEN | #51; `assets/pages-cms-result/s02-gate-b-c/` |
| D/E | GREEN | #65; `assets/pages-cms-result/s02-gate-d-e/` |

When unlocked (done):

1. ~~Open a **new** GitHub issue for Sprint 3 (do not reuse closed #50).~~ → #66
2. ~~Create `backlogs/ISSUE_XXX_<slug>/PLAN.md`.~~ → `ISSUE_066_pages_cms_sprint3_additive`
3. ~~Add an INDEX row.~~ Label `ready-for-agent` only after owner DDL/backfill
   checkpoints are scheduled.

## Outcome (from plan mother)

Install and populate the typed hybrid data model while the **old** application
remains the only reader/writer for surfaces not yet cut over. Additive only —
no rename/drop/non-null tightening of legacy columns. Home public/admin already
reads `HomePageContent`; do not regress that path.

## Pre-flight checklist (do before first migration PR)

- [x] Confirm Gate E evidence path under `docs/plans/assets/pages-cms-result/`
  (`s02-gate-d-e/manifest.md`)
- [ ] Re-read data-model decision:
  [`pages-cms-data-model-migration-decision.md`](pages-cms-data-model-migration-decision.md)
- [ ] Confirm production still has **no** `_prisma_migrations` ledger — additive
  SQL for the host must stay hand-applicable and idempotent
- [x] List exact new models/tables from Sprint 3 scope — see #66 PLAN (Home
  models already live; remaining: PageSeo extensions, About/Services/Packages/
  Portfolio/Calculator content, featured refs pending owner decision on
  `HomeFeaturedPortfolioProject`, SiteSettings/AboutContent extensions)
- [ ] Confirm backup model order + storage namespaces `public/seo/og/` and
  `public/pages/` will be covered by the shared backup engine
- [ ] Decide whether the short-lived secret-gated backfill **HTTP** route is
  still required (host still cannot run `tsx`) — reuse Gate C / Home H1 route
  lessons; never leave the secret enabled after use
- [x] Prepare evidence directory name `s03-additive-data/` (placeholder README
  only until sprint executes)

## Known risks to re-state at kickoff

- Dual writer ban: Sprint 3 must not cut **remaining** public/admin reads to new
  tables (Home already on pages rollout — leave alone unless intentionally
  extending).
- Backfill must run twice with matching digests; temporary endpoint returns
  counts/digests only — no secrets/customer rows in logs.
- Rollback = old build ignores additive data for non-cutover surfaces; **no**
  down migration.
- Mother plan still lists Home models in Sprint 3 text — implementers follow
  PLAN #66 carve-out.

## Explicitly out of scope for this prep file

- Any `prisma/schema.prisma` or migration commit before #66 is `ready-for-agent`
- Admin Pages shell (Sprint 4+)
- Per-page cutover (Sprint 5–10)

## Owner checkpoint reminder

Additive production DDL, gated backfill, and cleanup redeploy each need
**separate** approval — opening #66 is not approval to implement.
