# PLAN — ISSUE_067_pages_cms_sprint4_core

> Dual source of truth with GitHub `#67`.

## Meta

| Field | Value |
|---|---|
| GitHub | https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/67 |
| Opened | 2026-08-28 |
| Status (disk) | **done** — local green + evidence 2026-08-28 |
| Triage labels | `enhancement`, `ready-for-agent` |
| Type | enhancement (Pages CMS Sprint 4 execution) |

## Goal

- One code-owned six-page registry + shared admin shell + validated `actions/pages` seam.
- Keep every **non-Home** production page on legacy ownership; Home pilot stays live.
- Evidence under `docs/plans/assets/pages-cms-result/s04-pages-core/`.

## Locked decisions (2026-08-28)

| ID | Decision |
|---|---|
| S4-A | **Home stays** `contentRollout: "pages"` (post-H3 truth). Mother plan “all six legacy” is superseded by Home pilot. Other five keys register as `legacy`. |
| S4-B | **No new DDL / backfill.** Sprint 3 data already live (#66). |
| S4-C | **Reuse H2 UI patterns** from `pages/home/home-client.tsx`; extract shared shell — no UX redesign sprint. |
| S4-D | **Nav:** keep existing “หน้าแรก (Pages)” link; do **not** add a parent Pages tree listing dormant pages until each page’s cutover sprint. |
| S4-E | **Deploy:** local green; production redeploy optional (owner OK) — not required to close #67. |
| S4-F | **`HomeFeaturedPortfolioProject` still deferred** (same as #66 A2). |
| S4-G | Registry in `src/lib/pages/`; keep `auditedAggregate()` as aggregate seam. |
| S4-H | **Close without full axe pack** — model + e2e + auth 404 smoke sufficient; axe/unsaved/preview deferred to cutover or follow-up. |

## Task table

| # | Work | Owner | Status |
|---:|---|---|---|
| 1 | `src/lib/pages/` registry (6 keys) | `nextjs-dev` | **done** |
| 2 | Validations `page-content/` + Properties | `nextjs-dev` | **done** |
| 3 | Audit seam reuse for Home | `nextjs-dev` | **done** |
| 4 | `src/actions/pages/` fail-closed Properties | `nextjs-dev` | **done** |
| 5 | Shell + `[page]` fail-closed | `nextjs-dev` | **done** |
| 6 | Home adopts `PageShell` | `nextjs-dev` | **done** |
| 7 | Model + e2e + evidence | `nextjs-dev` | **done** (axe deferred S4-H) |
| 8 | Audit compliance | parent (manual; subagent usage limit) | **done** — PASS |
| 9 | i18n | — | skip |
| 10 | Close #67; PLAN → `done/` | agent | **done** |

## Definition of Done

- [x] Six-key registry module; Home `pages`, others `legacy`
- [x] Shared shell + fail-closed dormant admin routes (auth 404)
- [x] Properties action fail-closed; Home still `auditedAggregate`
- [x] Model + e2e recorded under `s04-pages-core/` (axe deferred S4-H)
- [x] Home admin loads with PageShell; public `/th` 200 in e2e window
- [x] Audit review PASS; #67 closed; PLAN → `done/`
- [x] No secrets in PLAN / issue comments

## Evidence

- `docs/plans/assets/pages-cms-result/s04-pages-core/manifest.md`
- `docs/plans/assets/pages-cms-result/s04-pages-core/automated-checks.txt`

### Follow-up

- Sprint 5+ cutover issues when owner opens them
- Optional: add `@axe-core/playwright` + fixture script as chore
- When enabling Properties writes: fresh DB role + `auditedEntity`/`auditedAggregate` required
