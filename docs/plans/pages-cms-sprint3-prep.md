# Pages CMS — Sprint 3 prep (not authorized to implement)

Date: 2026-08-27  
Status: **documentation only**. Do not open a GitHub dual-SoT PLAN or write
schema/code until Sprint 2 (Gate B–E / InnoDB) is green.

Canonical sprint body: [`pages-cms-implementation-sprints.md`](pages-cms-implementation-sprints.md)
§ Sprint 3. This file is a pre-unlock sharpening checklist so implementation
can start without rediscovering prerequisites.

## Unlock gate

Sprint 3 **Depends on:** production InnoDB gate complete — Gate B maintenance,
Gate C off-host backup evidence, Gate D conversion + FKs, Gate E verification
and writes reopened. Tracking: GitHub [#51](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/51)
and `backlogs/ISSUE_051_pages_cms_gate_b_c/PLAN.md`.

When unlocked:

1. Open a **new** GitHub issue for Sprint 3 (do not reuse closed #50).
2. Create `backlogs/ISSUE_XXX_<slug>/PLAN.md` with the same number.
3. Add an INDEX row; label `ready-for-agent` only after owner DDL/backfill
   checkpoints are scheduled.

## Outcome (from plan mother)

Install and populate the typed hybrid data model while the **old** application
remains the only reader/writer. Additive only — no rename/drop/non-null
tightening of legacy columns.

## Pre-flight checklist (do before first migration PR)

- [ ] Confirm Gate E evidence path under `docs/plans/assets/pages-cms-result/`
- [ ] Re-read data-model decision:
  [`pages-cms-data-model-migration-decision.md`](pages-cms-data-model-migration-decision.md)
- [ ] Confirm production still has **no** `_prisma_migrations` ledger — additive
  SQL for the host must stay hand-applicable and idempotent
- [ ] List exact new models/tables from Sprint 3 scope (Home/About/Services/
  Packages/Portfolio/Calculator page content, FAQ, featured refs, PageSeo
  extensions, SiteSettings/AboutContent extensions)
- [ ] Confirm backup model order + storage namespaces `public/seo/og/` and
  `public/pages/` will be covered by the shared backup engine
- [ ] Decide whether the short-lived secret-gated backfill **HTTP** route is
  still required (host still cannot run `tsx`) — reuse Gate C route lessons;
  never leave the secret enabled after use
- [ ] Prepare evidence directory name `s03-additive-data/` (empty until sprint)

## Known risks to re-state at kickoff

- Dual writer ban: Sprint 3 must not cut public/admin reads to new tables.
- Backfill must run twice with matching digests; temporary endpoint returns
  counts/digests only — no secrets/customer rows in logs.
- Rollback = old build ignores additive data; **no** down migration.

## Explicitly out of scope for this prep file

- Any `prisma/schema.prisma` or migration commit
- Admin Pages shell (Sprint 4+)
- Per-page cutover (Sprint 5–10)
- Opening dual-SoT PLAN before unlock

## Owner checkpoint reminder

Additive production DDL, gated backfill, and cleanup redeploy each need
**separate** approval after Sprint 2 is green — approval for prep docs is not
approval to implement.
