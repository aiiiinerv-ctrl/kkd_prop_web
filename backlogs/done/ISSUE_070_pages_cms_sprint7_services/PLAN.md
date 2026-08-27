# PLAN — ISSUE_070_pages_cms_sprint7_services

> Dual SoT with GitHub `#70`.

## Meta

| Field | Value |
|---|---|
| GitHub | https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/70 |
| Opened | 2026-08-28 |
| Status | **complete** 2026-08-28 |
| Labels | `enhancement` (closed) |

## Goal

- Services admin at `/admin/pages/services` (Page Content + Service items + Properties)
- Temporary redirect from `/admin/services`
- Services PageSeo out of Settings; `contentRollout: pages`
- Group visibility + empty-group hide; preserve EDITOR publish/delete rules

## Locked

| ID | Decision |
|---|---|
| S7-A | No DDL; no Service row copy |
| S7-B | Published order by `sortOrder`; empty groups hide; Page Content retained |
| S7-C | Settings rejects `services` |
| S7-D | Preserve EDITOR publish/delete restrictions |
| S7-E | Prod redeploy owner OK only |

## Tasks

| # | Work | Status |
|---:|---|---|
| 1 | Registry services enabled + pages rollout | done |
| 2 | `/admin/pages/services` + redirect old route + sidebar | done |
| 3 | Versioned ServicesPageContent action + visibility | done |
| 4 | Properties tab; Settings partition | done |
| 5 | Public services reader + CTA/group visibility | done |
| 6 | e2e + evidence `s07-services/` + close | done |

Evidence: `docs/plans/assets/pages-cms-result/s07-services/`

## Out

- Prod redeploy until owner OK
- Packages / Portfolio / Calculator cutovers
