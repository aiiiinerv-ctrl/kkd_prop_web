# PLAN — ISSUE_068_pages_cms_sprint5_home_tracer

> Dual source of truth with GitHub `#68`.

## Meta

| Field | Value |
|---|---|
| GitHub | https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/68 |
| Opened | 2026-08-28 |
| Status (disk) | active — implementing |
| Triage labels | `enhancement`, `ready-for-agent` |
| Type | enhancement (Pages CMS Sprint 5 — Home tracer) |

## Goal

- Home Properties live on `/admin/pages/home` (not Settings).
- Public metadata honors PageSeo robots/canonical/OG for Home.
- Shared CTA banner reads SiteSettings CTA columns with message fallback.

## Locked decisions

| ID | Decision |
|---|---|
| S5-A | Skip already-shipped Home Content cutover (H1–H3); this issue is Properties + Shared CTA tracer only |
| S5-B | **Defer** Featured Portfolio (same as #66 A2) |
| S5-C | No DDL; use Sprint 3 columns |
| S5-D | Settings SEO rejects `home` server-side; UI hides Home |
| S5-E | Properties writes only when `propertiesAdminEnabled` (home); other keys stay `not_enabled` |
| S5-F | Prod redeploy only after local green + owner OK |

## Scope

- **In:** Home Properties action/UI; Settings partition; seo.ts; Shared CTA read/write + CtaBanner; evidence `s05-home/`
- **Out:** Featured Portfolio; Sprint 6+ pages; axe chore

## Task table

| # | Work | Owner | Status |
|---:|---|---|---|
| 1 | Registry `propertiesAdminEnabled` + fresh-role helper | `nextjs-dev` | pending |
| 2 | `updatePageProperties` Home writes (version/OG/high-risk/audit) | `nextjs-dev` | pending |
| 3 | Home Properties tab UI | `nextjs-dev` | pending |
| 4 | Settings SEO partition + `updatePageSeo` reject home | `nextjs-dev` | pending |
| 5 | `pageMetadata` + PageSeoView for robots/canonical/OG | `nextjs-dev` | pending |
| 6 | Shared CTA SiteSettings mutate + CtaBanner consumer | `nextjs-dev` | pending |
| 7 | Verify build/e2e + evidence; audit review | `nextjs-dev` | pending |
| 8 | Close #68 → `done/` | agent | pending |

## DoD

- [ ] Home Properties save → one version bump + one AuditLog; TH/EN head update
- [ ] Settings cannot mutate `home` PageSeo
- [ ] Shared CTA save refreshes CTA consumers; banner falls back to messages when empty
- [ ] Evidence `s05-home/`; #68 closed

Tasks file: `docs/plans/pages-cms-sprint5-home-tracer-tasks.md`
