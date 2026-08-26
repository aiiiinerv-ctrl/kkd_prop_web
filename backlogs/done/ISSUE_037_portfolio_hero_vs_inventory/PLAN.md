# PLAN — ISSUE_037_portfolio_hero_vs_inventory

## Meta

| Field | Value |
|---|---|
| GitHub | https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/37 |
| Opened | 2026-08-15 |
| Closed | 2026-08-27 |
| Status (disk) | done |
| Triage labels | `ready-for-agent` |
| Type | bug / content honesty |

## Goal

- Stop the Portfolio hero from advertising commercial work the published inventory does not support.
- Hide empty filter chips or align copy with the real 住宅/residential case studies until more projects exist.

## Scope

- **In-scope**: public Portfolio page copy / chip visibility; TH+EN messages
- **Out-of-scope**: Pages CMS Sprint 9 refactor; uploading new portfolio assets for the client

## Checkpoint: Known / Unknown / Assumption

- **Known**: Issue documents residential-only inventory vs commercial hero claim.
- **Unknown**: Whether owner prefers softer copy vs hiding chips — UX call.
- **Safe assumptions**: Surgical copy/chip changes won't require schema.

## Task table

| # | Work | Owner | Depends on | Parallel? | Status |
|---:|---|---|---|---|---|
| 1 | Decide copy + chip behavior | `ux-ui-expert` | — | — | done |
| 2 | Implement TH/EN | `nextjs-dev` | 1 | — | done |
| 3 | Verify `/th` + `/en` home, `/th/portfolio` + `/en/portfolio` | `nextjs-dev` | 2 | — | done |
| 4 | Close #37; move to done; INDEX | User / agent | 3 | — | done |

## Definition of Done

- [x] No commercial overclaim vs published inventory
- [x] TH/EN parity
- [x] Verify skill evidence for both locales
- [x] #37 closed; folder in `backlogs/done/`; INDEX updated

## Evidence

### 1) Research
- Issue #37 body; `docs/plans/system-completeness-audit-tasks.md` if referenced

### 2) Implement TH/EN — copy
- `src/messages/th.json` + `en.json`, `home` namespace, keys `theme3Kicker`, `theme3ProofLabel`, `theme3ProofItem3`, `theme3Metric1Value`, `theme3Metric2Value` — rendered on the `/[locale]` home hero (`theme3` section, `src/app/[locale]/home-content.tsx:63,136`).
- Before → after:
  - `theme3Kicker`: "COMMERCIAL SOLAR PROPOSAL" → TH "ข้อเสนอโซลาร์รูฟท็อป" / EN "SOLAR ROOFTOP PROPOSAL"
  - `theme3ProofLabel`: TH "สำหรับลูกค้าองค์กร" / EN "For commercial buyers" → TH "สำหรับเจ้าของบ้าน" / EN "For homeowners"
  - `theme3ProofItem3`: TH "ใช้ผลงานโรงพยาบาลและอาคารพาณิชย์เป็น reference" / EN "Use hospital and commercial projects as references" → TH "ใช้ผลงานติดตั้งบ้านพักอาศัยจริงเป็น reference" / EN "Use completed home installations as references"
  - `theme3Metric1Value`: TH "ลดค่าไฟองค์กร" / EN "Corporate electricity savings" → TH "ลดค่าไฟบ้าน" / EN "Home electricity savings"
  - `theme3Metric2Value`: TH "ผลงานเชิงพาณิชย์จริง" / EN "Real commercial references" → TH "ผลงานติดตั้งบ้านจริง" / EN "Real home installation references"
- Portfolio filter chips (`src/app/[locale]/portfolio/portfolio-grid.tsx:37-40`): `showFilters = availableFilters.length > 2` already hides the chip bar when the published inventory has only one real category (currently both live projects are `RESIDENTIAL`). No code change was needed — verified still correct.

### 3) Verify — build + production smoke (both locales)
- `npm run build` → `✓ Compiled successfully` + `Finished TypeScript` with 0 errors, all 48 static pages generated.
- Full TH/EN message-key parity check (`src/messages/th.json` vs `en.json`): 365 keys each side, 0 missing either direction.
- `npm run start` (production mode) + curl:
  - `GET /th` → 200; `GET /en` → 200
  - Old strings confirmed **absent** from both `/th` and `/en` HTML: "COMMERCIAL SOLAR PROPOSAL", "ผลงานเชิงพาณิชย์จริง", "hospital and commercial", "โรงพยาบาลและอาคารพาณิชย์"
  - New strings confirmed **present**: TH "ข้อเสนอโซลาร์รูฟท็อป", "สำหรับเจ้าของบ้าน", "ใช้ผลงานติดตั้งบ้านพักอาศัยจริงเป็น reference", "ลดค่าไฟบ้าน", "ผลงานติดตั้งบ้านจริง"; EN "SOLAR ROOFTOP PROPOSAL", "For homeowners", "Use completed home installations as references", "Home electricity savings", "Real home installation references"
  - `GET /th/portfolio` → rendered (86,608 bytes); `GET /en/portfolio` → rendered (61,734 bytes); filter chip bar absent in output (expected — inventory has only the `RESIDENTIAL` category, `all` counts as one, `2 ≤ 2` so `showFilters` is false)
- No lead-form, auth, admin CRUD, or Prisma schema surface was touched by this change, so `e2e-booking.mts` / `e2e-admin.mts` / `e2e-admin-crud.mts` were not run (per verify skill's behavior-check table, these only apply when those areas are touched).

### 4) Close
- Committed as `fix(site): retarget home hero copy to residential inventory`, pushed to `main`.
- Issue #37 commented + closed on GitHub.
- Folder moved to `backlogs/done/ISSUE_037_portfolio_hero_vs_inventory/`; `backlogs/INDEX.md` updated.
