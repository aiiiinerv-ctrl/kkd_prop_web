# HTML Sitemap (แผนผังเว็บไซต์) — sprint plan

Date: 2026-08-28  
GitHub map: [#115 HTML sitemap + admin config](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/115)  
Reference: [Deestone Sitemap.aspx](https://www.deestone.com/Sitemap.aspx)

## Status

**S1–S5 implemented 2026-08-28.** Pending: S6 production deploy + design-business-reviewer pass.

---

## Locked decisions (owner 2026-08-28)

| ID | Decision |
|---|---|
| **D1** | Public HTML sitemap at `/th/sitemap` and `/en/sitemap` (not admin-only) |
| **D2** | Single booking link → `/booking` (no separate quote/survey rows in v1) |
| **D3** | Service sub-items link to `/services` only (no booking deep links in v1); package sub-items → `/packages/{slug}` |
| **D4** | Config mutations: `ADMIN` + `MARKETING`; other roles read-only preview |
| **D5** | v1 config: section toggle + reorder + optional TH/EN label override; hierarchy code/DB-driven (no custom URLs in v1) |
| **XML** | Keep `/sitemap.xml` URL unchanged for Google/crawlers; footer links to HTML page |

---

## 1. Requirement analysis

### 1.1 Owner ask

| Group | Requirement |
|---|---|
| **HTML sitemap** | Human-readable site map like Deestone — grouped headings + nested links |
| **Placement** | Footer「แผนผังเว็บไซต์」(bottom-left today); admin sidebar bottom link + management |
| **XML** | Preserve `/sitemap.xml` for Google Search Console / crawlers |
| **Control** | Admin toggles sections, order, TH/EN labels; dynamic children from DB |

### 1.2 Already exists

- `src/app/sitemap.ts` — XML generation (static paths + package details)
- `src/app/robots.ts` — `sitemap: …/sitemap.xml`
- Footer `siteMap` → `/sitemap.xml` today (poor UX)
- `PAGE_REGISTRY`, public nav, published services/packages/testimonials readers
- Page Properties `robotsIndex` in admin (not yet wired into `sitemap.ts`)

### 1.3 Root cause

1. No public HTML sitemap page
2. Footer points humans at XML
3. No single tree builder shared by HTML + XML
4. No admin surface for sitemap visibility/order/labels

---

## 2. Edge cases

| # | Case | Approach |
|---|---|---|
| E1 | Zero published testimonials | Omit from HTML (matches `sitemap.ts`) |
| E2 | Unpublished package mid-cache | `revalidate=300`; read DB at render |
| E3 | `noindex` pages (cookie-policy, /themes) | Exclude from HTML; exclude from XML |
| E4 | Page Properties `robotsIndex=false` | Exclude from HTML; S5 aligns XML |
| E5 | Missing TH/EN label override | Fallback to `nav.*` / registry labels |
| E6 | Custom external URL in config | v1: not allowed (internal paths only in v2+) |
| E7 | Admin URLs | Never in public tree |
| E8 | XML vs HTML drift | Shared `buildPublicSitemapTree()` |

---

## 3. Impact

### 3.1 Schema (v1)

- `SiteSettings.sitemapConfigJson` (JSON) — section visibility, sort order, optional label overrides TH/EN  
- Idempotent production DDL before deploy (shared-hosting runbook)

### 3.2 New / changed files

| Area | Files |
|---|---|
| Tree builder | `src/lib/sitemap/public-tree.ts` |
| Public page | `src/app/[locale]/sitemap/page.tsx`, `src/components/site/page-sitemap.tsx` |
| Admin | `src/app/admin/(dashboard)/sitemap/`, `admin-sidebar.tsx` |
| Actions | `src/actions/sitemap-settings.ts` + validation |
| Footer | `site-footer.tsx` → `Link /sitemap` |
| Messages | `meta.sitemap*`, `sitemap.*` keys TH/EN |
| Verify | `scripts/verify-sitemap-tree.mts` |
| S5 | Refactor `src/app/sitemap.ts` to shared builder |

### 3.3 Default tree (v1 auto)

```
หน้าแรก
เกี่ยวกับเรา
บริการ
  ├─ {SYSTEM services from DB}
  └─ {MAINTENANCE services from DB}
แพ็กเกจ
  └─ {published package slugs}
ผลงาน
รีวิวลูกค้า (if any published)
เครื่องคำนวณ
ติดต่อเรา
สอบถาม/นัดสำรวจ → /booking
```

Excluded: cookie-policy, /themes, /admin/*

---

## 4. Sprints

### S0 — Live-verify (no prod code)

- `ux-ui-expert`: mockup `/th/sitemap` (Deestone-style columns) + admin preview placement
- `design-business-reviewer`: real-render check after pilot slice
- Exit: approved mockup

### S1 — Shared tree builder

- `buildPublicSitemapTree(locale, config?)`
- `scripts/verify-sitemap-tree.mts` vs current `sitemap.ts` paths
- Exit: tree covers nav + dynamic entities; testimonials conditional

### S2 — Public HTML + footer

- `/[locale]/sitemap` RSC page, `py-16`, breadcrumb, multi-column groups
- Footer link → `/sitemap` (locale-aware via next-intl `Link`)
- `pageMetadata` + TH/EN messages
- Exit: `/th/sitemap` + `/en/sitemap` 200; footer no longer opens XML

### S3 — Admin preview + sidebar

- Sidebar bottom:「แผนผังเว็บไซต์」below「ดูหน้าเว็บไซต์」
- `/admin/sitemap` preview (iframe or inline) + link open public page
- RBAC: all content roles preview; mutations S4 only
- Exit: admin users can preview without XML

### S4 — Admin config + audit

- Prisma: `sitemapConfigJson` on `SiteSettings`
- Form: toggle sections, drag reorder, optional label TH/EN per section
- `updateSitemapSettings()` + `withAudit()` + `revalidatePath` sitemap locales
- Exit: hide section in admin → gone on public page; audit row exists

### S5 — XML alignment (recommended, not blocking v1 launch)

- Refactor `sitemap.ts` to use shared builder
- Respect `robotsIndex` from PageSeo
- Update `scripts/e2e-pages-cms.mts`
- Exit: XML URLs ⊆ indexable public URLs

### S6 — Production deploy

- DDL if migration; deploy runbook; ISR warm for `/th/sitemap`, `/en/sitemap`
- Smoke: footer link, HTML 200, `/sitemap.xml` 200 unchanged

---

## 5. Pre-fix summary (before implementation)

| Will change | Will not change |
|---|---|
| New public `/[locale]/sitemap` | `/sitemap.xml` URL |
| Footer link target | `robots.txt` sitemap line |
| Admin sidebar + config page | Booking/lead flows |
| Shared tree lib | Unrelated admin CRUD |
| SiteSettings JSON column | |

---

## 6. Post-fix summary (template)

| Before | After |
|---|---|
| Footer → raw XML | Footer → readable HTML sitemap |
| No admin sitemap | Sidebar link + config + preview |
| Hardcoded PATHS in `sitemap.ts` only | Shared tree for HTML (+ XML in S5) |
| robotsIndex ignored by XML | Aligned in S5 |

---

## 7. Security & UX notes

- Mutations: `requireRole("ADMIN","MARKETING")` + audit; no secrets in snapshots
- Public page: read-only RSC; internal path allowlist in validation
- TH/EN parity on all static strings and config label overrides
- Mobile: stacked columns; desktop 2–3 columns like Deestone

---

## 8. Verification

- `npm run build`
- `/th/sitemap` + `/en/sitemap` rendered check
- Footer link not `.xml`
- `/sitemap.xml` still 200 with expected `<loc>` count
- Admin save → public update after revalidate
- `npx tsx scripts/e2e-pages-cms.mts` after S5
