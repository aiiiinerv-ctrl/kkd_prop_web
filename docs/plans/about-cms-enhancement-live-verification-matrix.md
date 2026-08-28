# About CMS enhancement — live web-view verification matrix

Date: 2026-08-28  
Wayfinder ticket: [Task: Commit About enhancement plan & verify matrix](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/86)  
Map: [Map: About page CMS — credentials heading, editable icons](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/77)  
Sprint plan: [`about-cms-enhancement-implementation-sprints.md`](about-cms-enhancement-implementation-sprints.md) (E1–E4)

## Status and purpose

Acceptance contract for **map #77** (About credentials heading, Lucide icons, stats/testimonials label wire-up). Trims [`pages-cms-live-verification-matrix.md`](pages-cms-live-verification-matrix.md) to About-only delta — not a full six-page cutover.

This file does **not** run checks and does **not** change code. Execute during/after E2–E4; E1 uses schema/backfill evidence.

Passing `next build` or HTTP 200 alone is **not** acceptance. Follow `.claude/skills/verify/SKILL.md` plus rows below.

**Baseline:** compare public About to [`pages-cms-current-state-inventory.md`](pages-cms-current-state-inventory.md) / `assets/pages-cms-baseline/` until E3 intentional diffs (new heading, icon swap, stats labels).

## Environments and safety

| Environment | Purpose | Writes | Evidence |
| --- | --- | --- | --- |
| Isolated local MySQL + temp `STORAGE_ROOT` | E1 migration, backfill, mutations | Yes (fixtures) | Sanitized logs, digests |
| Local `npm run build` + `npm run start` | E2–E4 web-view + revalidation | Yes (fixtures) | Full result pack |
| Production `kkdproperty.co.th` | Read-only smoke post-deploy | **No** admin mutations unless owner names window | Public screenshots only |

Fail closed if DB/storage points at production paths. Seeded roles only; no PII in evidence.

## Evidence package layout

```text
docs/plans/assets/about-cms-enhancement-result/<sprint-id>/
├── manifest.md
├── automated-checks.txt
├── public-desktop/          # th-about.png, en-about.png
├── admin-desktop/           # about-content.png, icon-picker.png, audit-diff.png
├── responsive/              # 768 + 390 about public + admin
└── states/                  # heading-empty, credentials-hidden, icon-default, conflict
```

`manifest.md`: commit SHA, timezone, seed note, Next/Chrome, base URL, locale, route, viewport, filename, baseline compared, pass/fail, skips. No `.env`, cookies, storage paths, PII.

## Capture protocol

1. System Chrome; production build (`next start`).
2. Desktop 1440×1000 full-page public About; admin Content same width.
3. Tablet 768×1024 and mobile 390×844 for About public + admin.
4. `prefers-reduced-motion: reduce`; `document.fonts.ready`, network idle.
5. Scroll credentials + stats + testimonials bands; return to top before shot.
6. Assert DOM/text **before** screenshot.

## Matrix

Legend: **P** = must pass E3/E4; **G** = gate for sprint; **B** = Blocker; **A** = automated; **M** = manual web-view.

### A. Schema + backfill (E1)

| ID | Check | Sprint | How | Pass criteria |
| --- | --- | --- | --- | --- |
| A1 | Migration applies 2× | E1 | SQL/Prisma | No error; columns present |
| A2 | Backfill idempotent | E1 | Script 2× | Digest unchanged run 2 |
| A3 | Public unchanged pre-E3 | E1 | M compare baseline | No new heading/icons/labels visible |
| A4 | Invalid icon zod reject | E1 | A unit/action | POST `NotAnIcon` → validation_error |

### B. Admin Content (E2+)

| ID | Check | Sev | How | Pass criteria |
| --- | --- | --- | --- | --- |
| B1 | `/admin/pages/about` loads ADMIN | P | M/A | 200; new sections visible |
| B2 | FINANCE denied | B | A e2e | Redirect/deny |
| B3 | Cred section title TH+EN save | P | M/A | Audit + DB; revalidate scheduled |
| B4 | Cred section desc optional empty | P | M | Save OK; public heading-only if title set |
| B5 | Icon picker 6 slots — allowlist only | P | M | Only enum options; invalid blocked |
| B6 | Icon empty → null in DB | P | M/A | Public uses default (E3) |
| B7 | Stats 4 labels save | P | M | Fields persist |
| B8 | Testimonials title/subtitle save | P | M | Fields persist |
| B9 | Stale `version` conflict | B | M/A | Second save conflict |
| B10 | Unknown FormData keys | B | A | No mass-assign |
| B11 | Audit snapshot: new fields, icon names only | P | M | No secrets/paths |
| B12 | `showCredentials=false` + heading filled | P | M | Save OK; public hides all (S1) |
| B13 | TH incomplete required pair rejected | B | M/A | Per existing About rules |

### C. Public About (E3+)

| ID | Check | Sev | How | Pass criteria |
| --- | --- | --- | --- | --- |
| C1 | Cred section heading visible TH+EN | P | M | `SectionHeading` text matches save |
| C2 | Empty heading — cards only | P | M | Matches baseline cred band (S2) |
| C3 | Icon change on cred slot 1 | P | M | Lucide glyph matches picker |
| C4 | Null icon → default Building2 slot 1 | P | M | I4 |
| C5 | Stats labels from DB | P | M | Overrides `home` messages when set |
| C6 | Stats labels unset → message fallback | P | M | Same as baseline |
| C7 | Testimonials chrome from DB | P | M | Title/subtitle if wired |
| C8 | `showCredentials=false` | B | M | No heading, no cards |
| C9 | EN field blank → TH fallback | P | M | `pickLocale` |
| C10 | Revalidate after save | P | M/A | Public updates without manual cache bust |
| C11 | No row whole-record fallback | G | M | Missing row → messages; new fields empty |

### D. Security + regression (E4)

| ID | Check | Sev | How | Pass criteria |
| --- | --- | --- | --- | --- |
| D1 | Tampered invalid icon POST | B | A | Rejected; DB unchanged |
| D2 | Heading with `<script>` stored as text | B | M | Visible literal; not executed |
| D3 | Featured testimonial rules unchanged | P | A e2e | Max 3; delete block |
| D4 | Legacy `/admin/content/about` 307 | P | A | Still 307 (Sprint 12 not merged here) |
| D5 | `e2e-admin-crud` ABOUT block | P | A | Green |
| D6 | Production smoke read-only | G | smoke script | `/th/about` 200; optional `--expect-text` |

### E. Prototype parity (map #84 — pre-exec)

| ID | Check | When | Pass criteria |
| --- | --- | --- | --- |
| E1 | Prototype viewed | Map | Owner/agent opened `preview.html` |
| E2 | Cred heading UX | Map | Matches committed admin layout intent |
| E3 | Icon picker UX | Map | Six-slot allowlist acceptable |

## Sign-off row

| Gate | Requirement |
| --- | --- |
| Map #77 close | Research #78–#81, grilling #82–#83, prototype #84, plan #85, matrix #86 |
| Exec open | Owner checks #85 sign-off boxes in sprint plan |
| E4 done | All **P** rows green + evidence manifest committed |

## Edge-case index (must appear in evidence or skips)

| ID | Source | Matrix rows |
| --- | --- | --- |
| S1 | Edge #79 | B12, C8 |
| S2 | Grilling #83 | C2 |
| I1 | Security #81 | A4, D1 |
| I4 | Edge #79 | B6, C4 |
| N1 | Impact #80 | C5, C6 |
