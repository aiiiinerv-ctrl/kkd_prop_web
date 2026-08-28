# PLAN — ISSUE_115_html_sitemap

> Dual source of truth with GitHub `#115`. Sprint detail: [`docs/plans/html-sitemap-sprints.md`](../../docs/plans/html-sitemap-sprints.md)

## Meta

| Field | Value |
|---|---|
| GitHub | https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/115 |
| Opened | 2026-08-28 |
| Status (disk) | active — owner locked defaults 2026-08-28 |
| Triage labels | `ready-for-agent` |
| Type | enhancement |

## Goal

- Public HTML sitemap at `/th/sitemap` and `/en/sitemap` (Deestone-style grouped links)
- Footer + admin sidebar link to HTML page; keep `/sitemap.xml` for crawlers
- Admin config (ADMIN + MARKETING): section toggle, reorder, TH/EN label overrides

## Scope

- **In-scope**
  - Shared `buildPublicSitemapTree()` for HTML + XML alignment (S5)
  - `SiteSettings.sitemapConfigJson` + prod DDL
  - Admin preview (read-only for non-marketing roles)
- **Out-of-scope (v1)**
  - Custom external URLs in config
  - Separate quote/survey rows under booking
  - Service sub-items deep-linking to booking tabs

## Locked decisions

| ID | Decision |
|---|---|
| D1 | `/th/sitemap`, `/en/sitemap` |
| D2 | Single `/booking` link |
| D3 | Services → `/services`; packages → `/packages/{slug}` |
| D4 | Mutations: ADMIN + MARKETING |
| D5 | Toggle + reorder + label override; code/DB-driven tree |
| XML | Footer → HTML; `/sitemap.xml` unchanged |

## Task table

| # | Work | Owner | Depends on | Status |
|---:|---|---|---|---|
| 0 | Live-verify mockup (public + admin preview) | `ux-ui-expert` | — | pending |
| 1 | Tree builder + validations | `nextjs-dev` | 0 | pending |
| 2 | Public page + footer fix | `nextjs-dev` | 1 | pending |
| 3 | Admin preview + config UI | `nextjs-dev` | 1 | pending |
| 4 | XML align + robotsIndex | `nextjs-dev` | 1 | pending |
| 5 | Verify + audit + deploy | `nextjs-dev` / reviewers | 2–4 | pending |

## Definition of Done

- [ ] `/th/sitemap` and `/en/sitemap` render grouped links from shared tree
- [ ] Footer「แผนผังเว็บไซต์」→ HTML; `/sitemap.xml` still valid
- [ ] Admin config persisted + audited; role gate per D4
- [ ] TH/EN parity; verify skill evidence
- [ ] Prod DDL applied; issue closed; folder → `backlogs/done/`

## Evidence

(Pending implementation)
