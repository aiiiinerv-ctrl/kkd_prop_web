# Home CMS slice — live web-view verification matrix

Date: 2026-08-27  
Wayfinder ticket: [Task: prepare live-verify web-view matrix for Home CMS slice](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/59)  
Map: [Map: Home CMS slice — hero, contact, Our service, FAQ](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/52)  
Sprint plan: [`home-cms-slice-implementation-sprints.md`](home-cms-slice-implementation-sprints.md) (H0–H4)

## Status and purpose

Acceptance contract for **map #52 only** (Home Content: hero, shared contact, Our service, FAQ). It trims [`pages-cms-live-verification-matrix.md`](pages-cms-live-verification-matrix.md) — no six-page Properties, Featured References, Shared CTA, or other page cutovers.

This file does **not** run checks and does **not** change code. Execute during/after H2–H4; H0–H1 use ops/schema evidence instead of full web-view.

Passing `next build` or HTTP 200 alone is **not** acceptance. Follow `.claude/skills/verify/SKILL.md` plus rows below.

## Environments and safety

| Environment | Purpose | Writes | Repo evidence |
| --- | --- | --- | --- |
| Isolated local MySQL + temp `STORAGE_ROOT` | Schema, backfill, mutations, conflict, upload failure | Yes (fixtures only) | Sanitized logs, IDs, screenshots |
| Local `npm run build` + `npm run start` | Canonical admin/public web-view + revalidation | Yes (fixtures only) | Full result pack |
| Production `kkdproperty.co.th` | Read-only smoke | **No** mutations unless owner names a canary | Public screenshots only; **no** authenticated admin shots |

Fail closed if test DB/storage points at default `prisma/dev` or production paths. Never import production leads/slips. Seeded ADMIN/MARKETING/EDITOR/FINANCE only.

## Evidence package layout

```text
docs/plans/assets/home-cms-slice-result/<sprint-id>/
├── manifest.md
├── automated-checks.txt
├── public-desktop/          # th-home.png, en-home.png, …
├── admin-desktop/           # home-content.png, audit-diff.png, …
├── responsive/              # 768 + 390 home public + admin
└── states/                  # conflict, validation, fallback hero, faq-empty-hidden
```

`manifest.md` must record: commit SHA, timezone, seed note, Next/Chrome versions, env, base URL, locale, route, viewport, filename, baseline compared (or “intentional change”), pass/fail + what was inspected, skips + why. No `.env`, cookies, auth headers, absolute storage paths, or PII.

**Baseline before H3 cutover:** compare public Home to current messages/static hero (inventory 2026-08-25 / live local). After intentional cutover, expect controlled diffs only in hero / Our service / FAQ / contact hrefs — Latest Works may still change with portfolio data (out of CMS scope; note in manifest).

## Capture protocol

1. System Chrome; production build (`next start`).  
2. Desktop 1440×1000 full-page public; admin same width.  
3. Tablet 768×1024 and mobile 390×844 for Home public + Home admin Content.  
4. `prefers-reduced-motion: reduce`; wait `document.fonts.ready`, network idle, images decoded.  
5. Consent banner: dismiss or keep consistent with baseline comparison.  
6. Scroll full page so Reveal sections settle; return to top before shot.  
7. Avoid toasts/carets/hover in comparison shots unless that state is the subject.  
8. Assert DOM/text (and `href` where relevant) **before** screenshot.

## Matrix

Legend: **P** = must pass for H3/H4 acceptance; **G** = gate for that sprint; **A** = automated preferred; **M** = manual web-view; **B** = Blocker from edge/security research.

### A. Pre-cutover / foundation (H0–H1)

| ID | Check | Sprint | How | Pass criteria |
| --- | --- | --- | --- | --- |
| A1 | InnoDB + FK evidence | H0 | Ops / #57 | Gate E green before H1 writes in prod |
| A2 | Backfill digest stable (2×) | H1 | Script/SQL | Row counts + FAQ order + TH/EN digests match; public site unchanged |
| A3 | Hero blob under `public/pages/…` reachable | H1 | `/files/…` GET | 200 image/jpeg; key not under `private/` |
| A4 | Backup includes `public/pages/` plan | H0/H1 | Runbook note | Documented before H3 prod upload |

### B. Admin Content (H2+)

| ID | Check | Sev | How | Pass criteria |
| --- | --- | --- | --- | --- |
| B1 | `/admin/pages/home` loads for ADMIN | P | M/A | 200; Content form visible |
| B2 | FINANCE denied Home page | B | A e2e | Redirect/deny; no form |
| B3 | EDITOR can edit Content, not contact | B | M/A | Contact inputs absent or server rejects; content save OK |
| B4 | MARKETING can edit contact on Home | P | M | Same values appear in Settings Tab 3 |
| B5 | TH+EN incomplete save rejected | B | M/A | No DB/audit/revalidate |
| B6 | FAQ visible + 0 items rejected | B | M/A | validation_error |
| B7 | FAQ add up to 12; 13th rejected | B | M/A | Max enforced UI+server |
| B8 | FAQ reorder persists | P | M | Public order matches |
| B9 | Stale `version` conflict | B | M/A | Second save conflict; one audit from winner |
| B10 | Unknown FormData keys / mass-assign | B | A | No column overwrite |
| B11 | Audit snapshot: FAQ list + hero key, no bytes/paths | P | M | Audit UI readable |
| B12 | Unsaved navigation warning | P | M | Warn on leave with dirty form |
| B13 | Site-wide contact warning visible | P | M | Copy states affects whole site |

### C. Hero image (H2/H3)

| ID | Check | Sev | How | Pass criteria |
| --- | --- | --- | --- | --- |
| C1 | Replace hero; public TH+EN show new image | P | M | `/files` URL in img; both locales |
| C2 | Reject SVG / oversized / bad MIME | B | A/M | Old hero retained |
| C3 | Force DB conflict after upload | B | A | New blob deleted; old key remains |
| C4 | Missing blob fallback | B | M | Static `/marketing/hero-solar.jpg` (or approved fallback); admin warning |
| C5 | Alt TH+EN required | P | M/A | Incomplete alt rejected |

### D. Contact (H3)

| ID | Check | Sev | How | Pass criteria |
| --- | --- | --- | --- | --- |
| D1 | Save phone/LINE/FB from Home | P | M | Home icons `href`/`tel` updated; Settings matches |
| D2 | Reject `javascript:` / non-http(s) URL | B | A | No DB change |
| D3 | Empty phone/URL behavior matches written decision | P | M | Documented fallback or hide — no Home-only copy |
| D4 | Save contact from Settings still works | P | M | Home reflects Settings write |

### E. Our service (H3)

| ID | Check | Sev | How | Pass criteria |
| --- | --- | --- | --- | --- |
| E1 | Badge/title/body/link label TH+EN | P | M | Both locales |
| E2 | Link is internal preset only | B | A/M | External URL rejected |
| E3 | Hide via visibility (not empty string) | P | M | Section omitted when hidden |

### F. FAQ public (H3)

| ID | Check | Sev | How | Pass criteria |
| --- | --- | --- | --- | --- |
| F1 | Dynamic list renders Q/A plain text | P | M | No HTML execution if `<script>` stored attempt |
| F2 | Section hidden when visibility false | P | M | No FAQ landmark |
| F3 | Accordion safe with 1 item and with many | P | M | No crash; keyboard expand |
| F4 | LINE button uses shared line URL | P | M | Matches SiteSettings |

### G. Public Home + i18n + cache (H3/H4)

| ID | Check | Sev | How | Pass criteria |
| --- | --- | --- | --- | --- |
| G1 | `/th` and `/en` show saved Content | P **B** | M | Both locales; not TH-only |
| G2 | Missing Home row → whole messages fallback | B | M | Parity with pre-CMS copy |
| G3 | With row present, editing messages JSON does not change public | P | M | Controlled experiment on isolated DB |
| G4 | After Content save, public updates without waiting 300s | B | M | Explicit revalidate; hard-refresh both locales |
| G5 | Latest Works still loads (unchanged ownership) | P | M | Section present; not part of CMS form |
| G6 | Home SEO still editable in Settings | P | A | Existing e2e SEO path still green |
| G7 | One meaningful H1 on Home | P | M | a11y smoke |

### H. Automated suite gates (H3/H4)

| ID | Command / surface | Pass |
| --- | --- | --- |
| H1 | `npm run build` | Compile + TypeScript |
| H2 | Extend `e2e-rbac-sprint2.mts` for `/admin/pages/home` | Role matrix ✓ |
| H3 | Extend `e2e-admin-crud.mts` (or new `e2e-home-cms.mts`) for Content/FAQ/conflict | ✓ lines |
| H4 | Keep Settings Home SEO assertions | Still ✓ |
| H5 | `i18n-parity-checker` after message/admin copy touches | Pass |
| H6 | `audit-compliance-reviewer` after Home actions land | No findings / fixed |

Prefer a focused `scripts/e2e-home-cms.mts` over growing `e2e-admin-crud.mts` unboundedly (same convention as mother matrix).

### I. Production read-only (H4)

| ID | Check | Pass |
| --- | --- | --- |
| I1 | Public `/th` `/en` Home smoke | 200; hero/FAQ/Our service render; no auth screenshots committed |
| I2 | Optional canary | Only if owner names it; evidence stays out of repo auth surfaces |

## Minimum screenshots (H3/H4)

**Public desktop:** `th-home-full.png`, `en-home-full.png` (after representative Content save).  
**Admin desktop:** Home Content (TH tab + EN tab or both visible via keepMounted), one audit diff with FAQ change, contact warning state.  
**States:** conflict dialog; FAQ validation error; hero fallback warning; FAQ section hidden.  
**Responsive:** mobile + tablet public Home; mobile admin Home Content.

## Sprint mapping

| Sprint | Matrix focus |
| --- | --- |
| H0 | A1, A4 |
| H1 | A2–A4 |
| H2 | B*, C2–C3 (admin), partial D roles |
| H3 | C1/C4/C5, D*, E*, F*, G1–G7, H* |
| H4 | Full P/B rows or written waivers; I*; evidence pack complete |

## Explicitly out of this matrix

- About/Services/Packages/Portfolio/Calculator Pages CMS  
- Home Properties / OG / robots / canonical  
- Featured portfolio empty/unpublish/delete-block  
- High-risk SEO confirmation  
- Shared CTA banner CMS  

## Sign-off use (#60)

Owner confirms this matrix is the acceptance bar for H4 before execution tickets open. Waivers must cite row IDs.

## Sources

- Map #52 Notes (live-verify rules)  
- `home-cms-slice-implementation-sprints.md`, edge/security/impact research  
- `pages-cms-live-verification-matrix.md` (structure)  
- `.claude/skills/verify/SKILL.md`  
