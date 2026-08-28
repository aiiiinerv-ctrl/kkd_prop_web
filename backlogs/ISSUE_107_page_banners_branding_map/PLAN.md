# PLAN — ISSUE_107_page_banners_branding_map

> Dual source of truth with GitHub [#107](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/107).

## Meta

| Field | Value |
|---|---|
| GitHub | https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/107 |
| Opened | 2026-08-28 |
| Status (disk) | active — **planning only, no code changes** |
| Type | wayfinder map |

## Goal

- Admin จัดการ **แบนเนอร์หน้าละหน้า** (fixed / slides / ปิด) กว้างเต็มจอไม่สูงมาก — ทุกเมนูที่ owner ล็อก
- Admin เปลี่ยน **logo Header**, **logo Footer**, **ข้อความเกี่ยวกับเรา Footer** จาก ตั้งค่าระบบ → Header/Footer
- Live-verify baseline (S0) ก่อน implement และ evidence หลัง deploy
- Owner ควบคุมเต็มที่ — ใส่/ไม่ใส่แบนเนอร์, เปลี่ยน/ลบ logo ได้

## Scope

- **In-scope**
  - Page banner CMS (fixed + carousel)
  - SiteSettings logo upload (header + footer)
  - Public rendering + admin preview
  - Audit, TH/EN alt parity, security review
  - Sprint plan: `docs/plans/page-banners-branding-sprints.md`
- **Out-of-scope**
  - Page builder / section reorder
  - CookieYes banner (#38)
  - Global `CtaBanner` content (Shared Site Content — แยก feature)
  - Nav/footer link editing
  - Footer description text fields (มีแล้ว — regression only)

## Checkpoint: Known / Unknown / Assumption

- **Known:** Footer description + header CTA แก้ได้แล้ว; Home มี hero CMS; upload pipeline พร้อม; PAGE_REGISTRY = 6 หน้า
- **Unknown:** รายชื่อหน้า banner; Home รวมหรือไม่; carousel UX; admin surface location
- **Safe assumption:** ไม่ upload logo → fallback static asset เดิม (ไม่ broken image)

## Pre-fix summary (before any code)

| Area | Current | Must change |
|---|---|---|
| `BrandLogo` | Static PNG paths | Dynamic URL from SiteSettings |
| `SiteSettings` | Text only for header/footer | + `headerLogoKey`, `footerLogoKey` |
| Public pages | No top banner | `PageBanner` optional slot |
| Admin settings | Text fields only | Logo upload + preview |
| Admin pages | No banner tab | Banner editor per scoped page |
| Schema | No banner tables | `PageBanner` + slides (TBD #112) |

## Sprint breakdown

See **`docs/plans/page-banners-branding-sprints.md`** — S0 (live-verify) → S9 (prod deploy)

## Wayfinder child tickets

| # | Ticket | Status |
|---:|---|---|
| 108 | [ขอบเขตหน้า + Home hero](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/108) | open |
| 109 | [Header/Footer logo scope](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/109) | open |
| 110 | [fixed vs slides UX](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/110) | open (blocked by 108) |
| 111 | [Research](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/111) | open |
| 112 | [Data model + admin surface](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/112) | open (blocked by 108, 110) |
| 113 | [Live-verify S0](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/113) | open |
| 114 | [Sprint plan finalize](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/114) | open (blocked) |

## Definition of Done

- [ ] Owner ปิด tickets #108–#114
- [ ] S0 baseline screenshots committed
- [ ] Implement S1–S9 per approved plan
- [ ] Post-fix summary filled in sprint doc
- [ ] Verify + audit review green
- [ ] Map #107 closed; folder → `backlogs/done/`

## Evidence

### Research (draft — chart session 2026-08-28)

- **Root cause:** Pages CMS ไม่ได้ออกแบบ page chrome/banner; logo เป็น static asset
- **Files explored:** `site-header.tsx`, `site-footer.tsx`, `brand-logo.tsx`, `settings-client.tsx`, `site-settings.ts`, `pages/registry.ts`, `home-content.ts`, `admin-content.ts`
- **Constraints:** `withAudit()`, TH/EN parity, no arbitrary URLs (Pages CMS precedent), shared hosting DDL
- **Edge cases:** E1–E11 in sprint doc
- **Security:** image validation, role gates, audit snapshots without secrets
- **Impact:** ~15–25 files; new schema; all public routes; Settings tab extension

### Verify plan (S0 — before code)

```bash
npm run dev   # or build+start for prod-mode verify
# Capture to docs/plans/assets/page-banners-branding-baseline/
# - /th/services, /en/services (no banner today)
# - /admin/settings → Header/Footer tab
# - Header logo on /th
# - Home hero /th for comparison
```
