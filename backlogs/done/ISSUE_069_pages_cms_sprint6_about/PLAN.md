# PLAN — ISSUE_069_pages_cms_sprint6_about

> Dual SoT with GitHub `#69`.

## Meta

| Field | Value |
|---|---|
| GitHub | https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/69 |
| Opened | 2026-08-28 |
| Status | **complete** 2026-08-28 |
| Labels | `enhancement` (closed) |

## Goal

- About admin at `/admin/pages/about` (Content + Properties)
- 307 from `/admin/content/about`
- About PageSeo out of Settings; `contentRollout: pages`
- Visibility + featured testimonials (max 3)

## Locked

| ID | Decision |
|---|---|
| S6-A | No DDL; keep AboutContent.id |
| S6-B | Empty featured → public falls back to all published (baseline); after explicit selection, curated only |
| S6-C | Settings rejects `about` |
| S6-D | Prod redeploy owner OK only |

## Tasks

| # | Work | Status |
|---:|---|---|
| 1 | Registry about enabled + pages rollout | done |
| 2 | `/admin/pages/about` + 307 old route + sidebar | done |
| 3 | Versioned about action + visibility + featured | done |
| 4 | Properties tab; Settings partition | done |
| 5 | Public about reader + CTA/stats visibility | done |
| 6 | e2e + evidence `s06-about/` + close | done |

Evidence: `docs/plans/assets/pages-cms-result/s06-about/`

## Out

- Prod redeploy until owner OK
- Featured Portfolio; axe chore
