# PLAN — ISSUE_063_home_cms_h3_cutover

> Dual SoT with GitHub `#63`.

## Meta

| Field | Value |
|---|---|
| GitHub | https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/63 |
| Opened | 2026-08-27 |
| Status | done — committed; production cutover in progress |
| Labels | `wayfinder:task` |
| Type | wayfinder execution |

## Goal

- Public `/th` `/en` read `HomePageContent` + dynamic FAQ
- Hero from managed key with static `/marketing/hero-solar.jpg` fallback
- Contact from Home UI = SiteSettings (site-wide warning)
- Registry `home` content rollout → `pages` (SEO stays Settings)

## Out of scope

- Production deploy without explicit owner approval (sign-off Q4)
- Featured Portfolio, other pages
- H4 live-verify pack

## Task table

| # | Work | Owner | Status |
|---:|---|---|---|
| 1 | Public readers + FAQ + hero fallback | `nextjs-dev` / parent | done |
| 2 | Registry flip + revalidate paths | same | done |
| 3 | Contact UX warning + hero upload/integrity | same | done |
| 4 | e2e script `scripts/e2e-home-cms.mts` | same | done |
| 5 | Reviewers | pending after commit | pending |

## DoD

- [x] Registry `contentRollout: "pages"`; missing row → whole messages fallback
- [x] Hero managed key + static fallback + admin `heroBlobMissing` warning
- [x] Contact site-wide warning on Home admin
- [x] `npm run build` clean; local `/th` serves `/files/public/.../hero/...`
- [ ] Commit + owner-approved production deploy
- [ ] H4 matrix pack

## Rollback

Set `PAGE_REGISTRY.home.contentRollout` back to `"legacy"` and redeploy prior build; DB rows retained.
