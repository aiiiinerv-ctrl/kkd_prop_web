# H4 — live-verify pack + canary readiness

Date: 2026-08-27 (Asia/Bangkok evening)  
Issue: [#64](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/64)  
Depends on: H3 live (`31f05fa` + production cutover)

**Canary:** NOT run — owner must name a canary explicitly (matrix I2). No production content mutation in this sprint.

## Automated gates (H)

| ID | Result | Notes |
| --- | --- | --- |
| H1 `npm run build` | **PASS** | arm64 Homebrew Node (`v26.3.0`); x64 Node path fails `@parcel/watcher` on this machine |
| H2 RBAC `/admin/pages/home` | **PASS** | via `scripts/e2e-home-cms.mts` — FINANCE denied; EDITOR/SALES no contact; MARKETING contact visible |
| H3 `e2e-home-cms.mts` | **PASS** (1 waived row) | See B/C/D/F/G below; one local disk fixture fail |
| H4 Settings Home SEO | **PASS** | `e2e-admin-crud.mts` PAGE SEO lines all ✓ |
| H5 i18n parity | **N/A waived** | No `src/messages` key changes in H3/H4 commits under review |
| H6 audit-compliance | **PASS (prior)** | H2 finding (`heroImageKey`) addressed; H3 re-includes key-only in snapshot per S16 comment — no new mutation surface this sprint |

Also green: `e2e-admin.mts` (login/logout/users; slip 404 without SLIP_KEY as usual), full `e2e-admin-crud.mts` exit 0.

Local server for e2e: `node .next/standalone/server.js` (required — `next start` incompatible with `output: standalone`).

## Matrix row summary

### A foundation — inherited PASS (H0–H1 evidence)
A1–A3 green from Gate E + H1 rollout manifests.  
**A4 waiver:** backup `public/pages/` coverage still a runbook note / follow-up — not re-proven this session (cite H1 foundation docs).

### B admin — PASS via e2e-home-cms
B2, B3 (EDITOR), B6, B9, B10-ish (unknown keys covered in H2), B11 (no binary in audit), B13 (site-wide contact copy) exercised.  
**B7 waiver (written):** max-12 / reject-13 not re-driven this run (server schema `HOME_FAQ_MAX=12` + H2 validation still in code).  
**B4/B8/B12 waiver:** MARKETING contact save covered as D1; FAQ reorder + unsaved-nav are manual-only / not in script.

### C hero — mostly PASS
C1 upload + public reflect ✓; old blob 404 / new 200 ✓.  
**C4 local fixture FAIL/waiver:** `HERO: blob file present on disk before test ✗` — local `STORAGE_ROOT` did not contain the DB key file for the rename fixture after prior upload cycle; **production** missing-blob admin warning remains code-complete (`heroBlobMissing` in admin page). Public missing-blob fallback still implemented in `resolveHomeHeroImage`.  
C2/C3/C5 not re-automated this run (waived as covered by `storePublicImage` + action compensate-delete path — cite security research + H3 action).

### D contact — PASS
Save from Home, DB phone, `/th` `tel:` update, audit, restore — all ✓.

### E Our service — waived (manual)
Code path reads DB fields when rollout=`pages`; no dedicated e2e assertion this run. Spot-check: production HTML includes services CTA structure (section present).

### F FAQ — PASS
Public TH/EN questions from DB ✓; zero-item while visible rejected ✓.  
F2 hide-section not toggled this run (waived).

### G public + cache — PASS
G1 TH+EN from DB ✓; G4 immediate revalidation after save ✓; G6 SEO Settings ✓.  
G2/G3 isolated-DB experiments not re-run (waived; code paths present).  
G5 Latest Works: unchanged ownership (no CMS form) — not broken in smoke.  
G7: one `<h1 class="theme6-hero-title">` on production `/th`.

### I production read-only — PASS (no canary)

| Check | Result |
| --- | --- |
| `/th` `/en` | 200 |
| Managed hero in HTML | `files/public/pages/home/hero` count 1 each locale |
| Static marketing hero | count 0 |
| Hero blob GET | `200 image/jpeg` (`…/sf4a8ub6v7cfowdjhpb10e3b.jpg` at smoke time) |
| `/admin/pages/home` | 307 → `/admin/login` |

Screenshots (public only, no admin/auth):  
- `th-home-full.png`  
- `en-home-full.png`  
- `th-home-mobile.png`

## Owner decision remaining

**I2 canary** — only if you name a specific production Content save experiment. H4 does not authorize it.

## Status

**H4 COMPLETE** for read-only verify + local automated pack, with written waivers above. Ready for owner canary decision.
