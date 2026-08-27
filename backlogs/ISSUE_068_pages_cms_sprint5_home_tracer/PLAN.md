# PLAN — ISSUE_068_pages_cms_sprint5_home_tracer

> Dual source of truth with GitHub `#68`.

## Meta

| Field | Value |
|---|---|
| GitHub | https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/68 |
| Opened | 2026-08-28 |
| Status (disk) | **done** — local green 2026-08-28 |
| Triage labels | `enhancement`, `ready-for-agent` |
| Type | enhancement (Pages CMS Sprint 5 — Home tracer) |

## Locked decisions

| ID | Decision |
|---|---|
| S5-A | Skip already-shipped Home Content cutover (H1–H3) |
| S5-B | Defer Featured Portfolio |
| S5-C | No DDL |
| S5-D | Settings rejects `home` SEO |
| S5-E | Properties writes only when `propertiesAdminEnabled` (home) |
| S5-F | Prod redeploy only with owner OK |

## Task table

| # | Work | Status |
|---:|---|---|
| 1–6 | Registry, Properties, UI, Settings, seo.ts, Shared CTA | **done** |
| 7 | Verify + evidence | **done** |
| 8 | Close #68 → `done/` | **done** |

## DoD

- [x] Home Properties save → version + AuditLog; TH title e2e
- [x] Settings cannot mutate `home` PageSeo
- [x] Shared CTA SiteSettings + CtaBanner fallback path
- [x] Evidence `s05-home/`; #68 closed

Evidence: `docs/plans/assets/pages-cms-result/s05-home/manifest.md`
