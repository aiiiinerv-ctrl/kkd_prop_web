# PLAN — ISSUE_132_home_hero_toggle_map

> Dual source of truth with GitHub [#132](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/132).

## Meta

| Field | Value |
|---|---|
| GitHub | https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/132 |
| Opened | 2026-09-07 |
| Status (disk) | done — **live prod 2026-09-07** |
| Type | wayfinder map |

## Goal

Admin เลือกได้ว่าหน้าแรก (Home) จะใช้ hero แบบเดิม (layout 2 ฝั่ง รูป+ข้อความ) หรือ **slide image แบบหน้าอื่น** (แบนเนอร์เต็มความกว้าง ไม่มีข้อความทับ, FIXED หรือ SLIDES 2–5 รูป) — แก้ข้อล็อกเดิมจากแผน #107 ticket #108 ที่เคยตัดสินใจว่า "Home ใช้ hero เดิม"

## Scope

- **In-scope**
  - `heroMode` toggle (HERO/BANNER) บน `HomePageContent`
  - Reuse `PageBanner`/`PageBannerSlide` เดิม — เพิ่ม `"home"` เข้า `BANNER_PAGE_SLUGS`
  - Admin UX: ตัวสลับ 2 ชั้น (Hero/Banner → Fixed/Slides), reuse `PageBannerPanel`
  - Public render branch + fallback safety net (ห้ามหน้าแรกว่างเปล่า)
  - E2E coverage + live-verify matrix + audit review
- **Out-of-scope**
  - เปลี่ยนแปลง UX/ระบบแบนเนอร์ของ 7 หน้าที่มีอยู่แล้ว
  - Hero mode ใหม่นอกเหนือจาก HERO/BANNER เดิม (video, animated ฯลฯ)
  - Latest Works / SEO / Properties ของหน้าแรก (นอกขอบเขตเดียวกับแผน #52)

## Locked decisions (#133–#137)

| Topic | Decision |
|---|---|
| Banner mode scope | แทนที่ทั้ง hero section ทั้งหมด ไม่ overlay ข้อความ |
| Data model | Reuse `PageBanner`/`PageBannerSlide` เดิม + เพิ่ม `heroMode` ใน `HomePageContent` |
| Admin toggle UX | 2 ชั้น (Hero/Banner → Fixed/Slides), บนสุดของฟอร์ม Home, ฟิลด์ hero เดิมซ่อนไม่ลบ |
| Fail-safe | BANNER mode ไม่มีสไลด์ใช้งานได้จริง → fallback กลับ Hero เสมอ (ห้ามว่างเปล่า) |
| Server validation | ปฏิเสธ `mode: "OFF"` เมื่อ `pageSlug: "home"` (defense-in-depth) |

## Sprint breakdown

See **`docs/plans/home-hero-toggle-implementation-sprints.md`** — S1–S4 ✓ (ทั้งหมด deployed)

## Wayfinder child tickets

| # | Ticket | Status |
|---:|---|---|
| 133 | [Grilling: UX ตัวสลับโหมด hero](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/133) | closed |
| 134 | [Research: impact analysis](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/134) | closed |
| 135 | [Research: edge-case catalog](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/135) | closed |
| 136 | [Task: sprint plan](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/136) | closed |
| 137 | [Grilling: owner sign-off](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/137) | closed |

## Execution tickets

| # | Sprint | Status |
|---:|---|---|
| 138 | S1 — schema + slug registration | closed |
| 139 | S2 — admin UX toggle | closed |
| 140 | S3 — public render branch + fallback | closed |
| 141 | S4 — E2E coverage + live-verify matrix | closed |

## Definition of Done

- [x] Owner ปิด tickets #133–#137 (sign-off 2026-09-07)
- [x] Implement S1–S4 per approved plan (#138–#141)
- [x] Post-fix summary filled in ทุก execution ticket
- [x] Live-verify matrix V1–V12 ผ่านครบ; audit review ไม่พบปัญหา
- [x] Commit `dec6518` pushed to `main`
- [x] Production DDL applied via phpMyAdmin, verified (`heroMode` column present, default `HERO`)
- [x] Redeployed to `kkdproperty.co.th` 2026-09-07 — smoke test + marker checks green (classic hero unchanged, no 500s)
- [x] Map #132 closed; folder → `backlogs/done/`

## Evidence

- Research: `docs/plans/home-hero-toggle-impact-research.md`, `docs/plans/home-hero-toggle-edge-cases-research.md`
- Sprint plan + live-verify matrix: `docs/plans/home-hero-toggle-implementation-sprints.md`
- Prod DDL: `docs/plans/assets/home-hero-toggle-production-ddl.sql`
- Bug found & fixed during S4: `HomeAdminShell` remount key included `bannerData.version`, silently resetting an in-progress `heroMode` toggle on independent banner saves — fixed in `page.tsx`

### Verify plan

```bash
npm run build
npx tsx scripts/e2e-admin-crud.mts
npx tsx scripts/smoke-test-production.mts
```

### Production redeploy log (2026-09-07)

1. DDL applied via phpMyAdmin (`kkdprop1_kkdproperty`), verified `SHOW COLUMNS FROM HomePageContent LIKE 'heroMode'`
2. Build: `npx tsx scripts/build-shared-hosting-deploy.mts` — BUILD_ID `58IRmNK9oQroJn4xllG3m`
3. FTP upload (human, `!` prefix) — `226 File successfully transferred`, 28,632,261 bytes matched
4. Extract via DirectAdmin File Manager API — `File Extracted`
5. Passenger restart via `tmp/restart.txt` edit-and-resave — HTTP 302
6. Verify: all 18 public routes 200, `/admin/pages/home` 307 (auth redirect, not 500), `/api/admin/leads` 401 (not 500), `home-hero` marker present / `page-banner` marker absent (heroMode defaults HERO, homepage visually unchanged as intended), `smoke-test-production.mts` 3/3 green
