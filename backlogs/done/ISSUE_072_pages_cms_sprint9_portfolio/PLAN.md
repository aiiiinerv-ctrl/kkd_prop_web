# PLAN — ISSUE_072_pages_cms_sprint9_portfolio

> Dual SoT with GitHub `#72`.

## Meta

| Field | Value |
|---|---|
| GitHub | https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/72 |
| Opened | 2026-08-28 |
| Status | **complete** 2026-08-28 |
| Labels | `enhancement` (closed) |

## Goal

- Portfolio admin at `/admin/pages/portfolio` (Page Content + Project items + Properties)
- Temporary redirect from `/admin/portfolio`
- Safe image reorder (first key = cover); Settings rejects `portfolio`
- Delete blocked when Home references project (model deferred → hook ready)

## Locked

| ID | Decision |
|---|---|
| S9-A | No DDL; `imageKeys` order authoritative |
| S9-B | Reorder only permutation of stored keys |
| S9-C | Delete blocked on Home reference (when table exists) |
| S9-D | Settings rejects `portfolio` |
| S9-E | Prod redeploy owner OK only |

## Tasks

| # | Work | Status |
|---:|---|---|
| 1 | Registry portfolio pages + flags | done |
| 2 | `/admin/pages/portfolio` + redirect + sidebar | done |
| 3 | PortfolioPageContent action + visibility | done |
| 4 | Properties; Settings partition | done |
| 5 | Image reorder + delete Home-ref guard | done |
| 6 | Public reader + e2e + evidence + close | done |

Evidence: `docs/plans/assets/pages-cms-result/s09-portfolio/`

## Out

- Prod redeploy until owner OK
- Calculator cutover; Featured Portfolio
