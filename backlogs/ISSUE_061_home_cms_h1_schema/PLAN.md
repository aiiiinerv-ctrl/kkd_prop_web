# PLAN — ISSUE_061_home_cms_h1_schema

> Dual SoT with GitHub `#61`.

## Meta

| Field | Value |
|---|---|
| GitHub | https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/61 |
| Opened | 2026-08-27 |
| Status | done |
| Labels | `wayfinder:task` |
| Type | wayfinder execution |

## Goal

- Add `HomePageContent` + `HomeFaqItem` (InnoDB, FK, version)
- Backfill TH/EN from `messages` home + faq (5 items)
- Copy/re-encode static hero to managed `public/pages/home/hero/` key
- Public site **unchanged** (no reader cutover)

## Out of scope

- `HomeFeaturedPortfolioProject`, other page singletons, SEO/Properties
- Admin UI / audit aggregate seam (H2)
- Public cutover (H3)

## Task table

| # | Work | Owner | Status |
|---:|---|---|---|
| 1 | Prisma schema + local migrate | `nextjs-dev` | done |
| 2 | phpMyAdmin-safe additive SQL for production | `nextjs-dev` | done |
| 3 | Backfill script/seed idempotent | `nextjs-dev` | done |
| 4 | Hero blob backfill + key on row | `nextjs-dev` | done |
| 5 | Verify: digests 2×, public unchanged, `/files` hero | `nextjs-dev` | done |

## DoD

- [x] Matches sprint H1 in `docs/plans/home-cms-slice-implementation-sprints.md`
- [x] Before/after summaries on #61
- [x] No public home-content.tsx cutover

## Result (2026-08-27)

- Schema: `HomePageContent` (canonical `key="home"`) + `HomeFaqItem` (owned
  child, FK `ON DELETE CASCADE`, unique `(homePageContentId, sortOrder)`).
  Both InnoDB locally; production hand SQL has explicit `ENGINE=InnoDB`.
- Migration: `prisma/migrations/20260827070722_add_home_cms_h1_schema/`.
- Production DDL: `docs/plans/assets/home-cms-h1/production-additive-sql.md`
  (3 phpMyAdmin statements + verification queries; not yet applied —
  awaiting a named owner DDL checkpoint per H0/Phase 0-1).
- Backfill: `src/lib/backfill/home-content.ts` (shared logic) +
  `scripts/backfill-home-content.mts` (local CLI) +
  gated `POST /api/operations/home-cms-backfill` (production, disabled by
  default via `ENABLE_HOME_CMS_BACKFILL_ROUTE`).
- Ran locally against docker MySQL twice: 1 `HomePageContent` row, exactly 5
  `HomeFaqItem` rows both times, identical `contentDigest`
  (`e801a982dc56ab...4cffd2`) and identical `heroImageSha256` on both runs —
  proves idempotency (no duplicate rows, no drift).
- Hero: static `public/marketing/hero-solar.jpg` re-encoded and stored at
  `public/pages/home/hero/sia31bcyue3116waurv403eg.jpg` (local); confirmed
  `GET /files/public/pages/home/hero/...` → `200 image/jpeg`.
- Public verify: `npm run build` clean; `/th` and `/en` still render from
  `messages/*.json` (kicker/FAQ text present, `<img>` still points at
  `/marketing/hero-solar.jpg`) — no reader cutover.
- Deferred to H2/H3 (owner-locked, per sprint doc): `HomeFeaturedPortfolioProject`,
  admin UI (`/admin/pages/home`), aggregate audit seam, page registry, public
  cutover of `home-content.tsx` / `FaqSection`.

## Production rollout status (2026-08-27, `hosting-deploy-specialist`)

Full status: `docs/plans/assets/home-cms-h1/production-rollout-manifest.md`.

**DDL, redeploy, and backfill are all done and verified in production.**
Owner ran the 3 DDL statements (verified InnoDB + FK + 0 rows). Redeploy hit
one real bug, found and fixed this session: the backfill route reads
`src/messages/*.json` via a dynamic runtime `fs.readFile`, which
`build-shared-hosting-deploy.mts`'s artifact allowlist never copied — fixed
by adding `src/messages/` to that script (deploy tooling, not app code) plus
a precondition check. Redeployed clean (`BUILD_ID=X9cGREQEwFfHYOk-xKPdm`).
Backfill ran twice: `contentDigest` identical both times
(`e801a982dc56ab...4cffd2`, matching the local test-run digest above exactly),
`faqRowCount=5` both times, hero blob `200`. DB verified independently via
read-only query: `home_rows=1`, `faq_rows=5`. Public `/th`/`/en` still 100%
message-owned (no cutover) — confirmed post-backfill.

**Teardown complete — H1 production rollout is DONE.** Owner ran one Node.js
Selector Save deleting all 5 keys (the 2 backfill vars plus the 3 resurfaced
Gate B/C vars). Verified independently: `.htaccess` no longer contains any
of the 5 keys, Passenger + canonical redirect blocks intact, Passenger
restarted, `/th`/`/en` 200, both gated routes (`home-cms-backfill`,
`pages-cms-backup`) back to `404`, DB rows retained (`home_rows=1`,
`faq_rows=5`, unchanged from backfill). Full evidence:
`docs/plans/assets/home-cms-h1/production-rollout-manifest.md`.

H2 (#62 — admin UI, aggregate audit seam, page registry) intentionally not
started this session.
