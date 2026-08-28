# About CMS enhancement — locked owner decisions

Date: 2026-08-28  
Map: [#77](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/77)

## #82 — Icon control model

**Locked:** **Lucide allowlist** — one enum string per card slot (6 columns on `AboutContent`).

| Slot | Default (current hardcode) |
| --- | --- |
| credRegistered | `Building2` |
| credEngineer | `BadgeCheck` |
| credExperience | `Award` |
| teamDesign | `PencilRuler` |
| teamInstall | `Wrench` |
| teamSupport | `Headset` |

- Public render: static `Record<AllowedIcon, LucideIcon>` — **no** dynamic import of user strings
- Server: zod enum of allowed names; invalid → reject save; null/empty → slot default
- Amend `pages-cms-content-ownership-decisions.md` at implement time (icons become admin-selectable within allowlist)
- **Out:** per-card image/SVG upload (Tier C)

## #83 — Scope

**Locked:** **Standard**

### In scope

1. **New fields:** `credSectionTitleTh/En`, `credSectionDescTh/En` — section heading before 3 credential cards
2. **Admin UI + public wire** for existing schema fields:
   - `statsProjectsLabelTh/En`, `statsYearsLabelTh/En`, `statsEngineersLabelTh/En`, `statsCustomersLabelTh/En`
   - `testimonialsTitleTh/En`, `testimonialsSubtitleTh/En`
3. **Public:** `SectionHeading` before credentials grid; `StatsRow` label overrides from AboutContent; testimonials chrome already reads DB

### Rules

- Credentials section heading **optional** when `showCredentials=true` — empty heading = render cards only (same as today visually for heading band)
- **Do not** add `numbersTitle` / stats section title to AboutContent in this effort
- New heading fields use **`optionalPlainMetaText`** per security #81
- TH/EN parity: save both tabs; public EN falls back to TH via `pickLocale`

### Out of scope

- Stats section title (`numbersTitle`)
- Icon upload path
- Layout/card count changes
- Sprint 12 shim removal

## Next map steps

1. [#84](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/84) — Prototype live web-view
2. [#85](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/85) — Sprint plan sign-off
3. [#86](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/86) — Commit implementation plan + verify matrix
