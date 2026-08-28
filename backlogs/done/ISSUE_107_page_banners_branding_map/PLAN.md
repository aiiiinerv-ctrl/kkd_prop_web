# PLAN — ISSUE_107_page_banners_branding_map

> Dual source of truth with GitHub [#107](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/107).

## Meta

| Field | Value |
|---|---|
| GitHub | https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/107 |
| Opened | 2026-08-28 |
| Status (disk) | done — **live prod 2026-08-29** |
| Type | wayfinder map |

## Goal

- Admin จัดการ **แบนเนอร์หน้าละหน้า** (fixed / slides / ปิด) กว้างเต็มจอไม่สูงมาก — ทุกเมนูที่ owner ล็อก
- Admin เปลี่ยน **logo Header**, **logo Footer**, **ข้อความเกี่ยวกับเรา Footer** จาก ตั้งค่าระบบ → Header/Footer
- Live-verify baseline (S0) ก่อน implement และ evidence หลัง deploy
- Owner ควบคุมเต็มที่ — ใส่/ไม่ใส่แบนเนอร์, เปลี่ยน/ลบ logo ได้

## Scope

- **In-scope**
  - Page banner CMS (fixed + carousel) — 7 pages (home excluded)
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

## Locked decisions (#108–#110)

| Topic | Decision |
|---|---|
| Banner pages | 7: about, services, packages, portfolio, testimonials, calculator, contact |
| Home | Hero CMS only — no page banner |
| Logos | Separate `headerLogoKey` / `footerLogoKey`; fallback static assets |
| Banner modes | OFF / FIXED (1 slide) / SLIDES (2–5) |
| Links | Free-typed internal path or https/mailto/tel (#116) |

## Sprint breakdown

See **`docs/plans/page-banners-branding-sprints.md`** — S0–S9 ✓

## Wayfinder child tickets

| # | Ticket | Status |
|---:|---|---|
| 108 | [ขอบเขตหน้า + Home hero](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/108) | closed |
| 109 | [Header/Footer logo scope](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/109) | closed |
| 110 | [fixed vs slides UX](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/110) | closed |
| 111 | [Research](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/111) | closed |
| 112 | [Data model + admin surface](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/112) | closed |
| 113 | [Live-verify S0](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/113) | closed |
| 114 | [Sprint plan finalize](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/114) | closed |

## Definition of Done

- [x] Owner ปิด tickets #108–#114
- [x] Implement S1–S9 per approved plan
- [x] Post-fix summary filled in sprint doc
- [x] Verify + e2e green (`e2e-page-banners.mts`)
- [x] Map #107 closed; folder → `backlogs/done/`

## Evidence

- Result manifest: `docs/plans/assets/page-banners-branding-result/manifest.md`
- Prod DDL: `docs/plans/assets/page-banners-branding-production-ddl-idempotent.sql`
- E2E: `scripts/e2e-page-banners.mts`

### Verify plan

```bash
npm run build
npx tsx scripts/e2e-page-banners.mts
npx tsx scripts/smoke-test-production.mts --check /th/services --expect-text "บริการ"
```
