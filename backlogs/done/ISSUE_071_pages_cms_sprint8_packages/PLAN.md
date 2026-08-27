# PLAN — ISSUE_071_pages_cms_sprint8_packages

> Dual SoT with GitHub `#71`.

## Meta

| Field | Value |
|---|---|
| GitHub | https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/71 |
| Opened | 2026-08-28 |
| Status | **complete** 2026-08-28 |
| Labels | `enhancement` (closed) |

## Goal

- Packages admin at `/admin/pages/packages` (Page Content + Package items + Properties)
- Temporary redirect from `/admin/packages`
- Packages PageSeo out of Settings; `contentRollout: pages`
- Seasonal/Payback/CTA/empty visibility; single popular Package

## Locked

| ID | Decision |
|---|---|
| S8-A | No DDL; no Package field duplication |
| S8-B | At most one popular; published order; Seasonal from `sizeKw` |
| S8-C | Settings rejects `packages` |
| S8-D | EDITOR publish/delete preserved; price/size/features on items |
| S8-E | Prod redeploy owner OK only |

## Tasks

| # | Work | Status |
|---:|---|---|
| 1 | Registry packages enabled + pages rollout | done |
| 2 | `/admin/pages/packages` + redirect + sidebar | done |
| 3 | Versioned PackagesPageContent action | done |
| 4 | Properties; Settings partition | done |
| 5 | Public list + detail chrome; popular clear | done |
| 6 | e2e + evidence `s08-packages/` + close | done |

Evidence: `docs/plans/assets/pages-cms-result/s08-packages/`

## Out

- Prod redeploy until owner OK
- Portfolio / Calculator cutovers
