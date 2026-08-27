# PLAN — ISSUE_066_pages_cms_sprint3_additive

> Dual source of truth with GitHub `#66`.

## Meta

| Field | Value |
|---|---|
| GitHub | https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/66 |
| Opened | 2026-08-27 |
| Status (disk) | active — owner decisions locked; local implement may start |
| Triage labels | `enhancement`, `ready-for-agent` |
| Type | enhancement (Pages CMS Sprint 3 execution) |

## Goal

- Additive Pages CMS schema + recovery coverage for **remaining** page models (Home pilot already live).
- Idempotent backfill with digest parity; old app remains sole reader/writer for non-Home surfaces.
- Production-safe hand SQL + evidence under `docs/plans/assets/pages-cms-result/s03-additive-data/`.

## Locked decisions (2026-08-27)

| ID | Decision |
|---|---|
| A1 | Production window **Fri 28 Aug 2026 02:00–05:00 Asia/Bangkok** — DDL → gated backfill (2×) → cleanup redeploy |
| A2 | **Defer** `HomeFeaturedPortfolioProject` (same as #60) |
| A3 | **Temporary secret-gated HTTP backfill route** (host cannot run `tsx`); tear down in same window |

## Scope

- **In-scope**
  - Mother plan Sprint 3, adjusted for Home H1:
    - **Skip (already live):** `HomePageContent`, `HomeFaqItem`, managed home hero + FAQ backfill (#61)
    - **Add:** `PageSeo` extensions; `AboutFeaturedTestimonial`; `ServicesPageContent`; `PackagesPageContent`; `PortfolioPageContent`; `CalculatorPageContent`; `AboutContent` / `SiteSettings` extensions per data-model decision
    - **Deferred:** `HomeFeaturedPortfolioProject`
  - Backup model order + `public/seo/og/` and `public/pages/` namespaces
  - Idempotent backfill + secret-gated HTTP route + production additive SQL
- **Out-of-scope**
  - Admin Pages shell (Sprint 4+)
  - Per-page public/admin cutover (Sprint 5–10)
  - Dual writers / flipping non-Home readers
  - Down migrations; `HomeFeaturedPortfolioProject`

## Checkpoint: Known / Unknown / Assumption

- **Known:** Gate A–E green; Home H0–H4 closed; A1–A3 locked above; Home H1 HTTP backfill pattern exists.
- **Unknown:** Exact host dwell time within the 02:00–05:00 window (±1h slip OK).
- **Safe assumptions:** Additive columns ignored by current non-Home production readers; Home rows must not be duplicated/corrupted by new backfills.

## Task table

| # | Work | Owner | Depends on | Parallel? | Status |
|---:|---|---|---|---|---|
| 1 | Owner lock A1–A3 | User | — | — | **done** |
| 2 | Pre-flight checklist in `pages-cms-sprint3-prep.md` | `nextjs-dev` | 1 | ✅ | **done** |
| 3 | Schema + local migrate + phpMyAdmin-safe additive SQL | `nextjs-dev` | 1 | — | **done** (local) |
| 4 | Backup order / storage namespace coverage | `nextjs-dev` | 3 | — | **done** |
| 5 | Idempotent backfill + digests (2×) + gated HTTP route | `nextjs-dev` | 3 | — | **done** (local digest `a52b7c00…4c4d`) |
| 6 | Production DDL in A1 window | `hosting-deploy-specialist` | 3, A1 | — | pending |
| 7 | Production gated backfill + teardown | `hosting-deploy-specialist` | 5, 6, A1 | — | pending |
| 8 | Evidence `s03-additive-data/` + verify | `nextjs-dev` + specialist | 7 | — | local manifest written; prod pending |
| 9 | Close #66; move PLAN → `done/` | User / agent | 8 | — | pending |

## Parallel lanes

- P1: Local schema/SQL/backfill (`nextjs-dev`) — now
- P2: Repo hygiene gitignore skill packs — now
- P3: Production window Fri 02:00 ICT (`hosting-deploy-specialist`)

## Sequential chain

1. Local schema + SQL + backfill harness green
2. Fri window: DDL → backfill 2× → cleanup redeploy
3. Evidence + close

## Definition of Done

- [ ] Remaining Sprint 3 models present locally + production (additive, InnoDB, named FKs)
- [ ] Backfill twice with matching digests; Home pilot rows intact
- [ ] Old build against expanded DB: non-Home public/admin visually unchanged
- [ ] Backup → restore reproduces new tables + bounded CMS images (`public/seo/og/`, `public/pages/`)
- [ ] Temp backfill route/secret removed after window
- [ ] Evidence under `s03-additive-data/`; GitHub closed; PLAN → `done/`; INDEX updated
- [ ] No secrets in PLAN / issue comments

## Evidence

### 1) Research

- Scope: Pages CMS Sprint 3 post–Home pilot
- Decisions: comment on #66 2026-08-27
- Constraints: no dual writer; no down migration; hand SQL on host; Featured Portfolio deferred

### 2) Fix / diagnosis

- Change summary: decisions locked; implementation starting
- Affected files: this PLAN, INDEX, issue #66, hygiene `.gitignore`

### 3) Quality

- Pending local migrate + 2× backfill digests

### 4) Risk / follow-up

- Window slip ±1h OK; do not start DDL outside A1 without new owner note
- Sprint 4 only after #66 closed
