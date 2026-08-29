# Packages seasonal production baseline — admin-editable — implementation sprints

Date: 2026-08-29
Status: **Planned — ready for execution**

## Requirement (owner)

> ตารางนี้ (ข้อมูลปริมาณไฟฟ้าจากการวัดจริง บนหน้า /packages) อยากให้ปรับเปลี่ยนข้อมูลจากทางหลังบ้านได้ด้วย

## Root cause (investigated)

- The table (`SeasonalProductionTable`, `src/components/site/seasonal-production-table.tsx`) renders `Package.seasonalProduction` (a required `Json` column) for whichever package has `isPopular: true`.
- That JSON is **computed once, at package create/update time**, by `seasonalProduction(sizeKw)` in `src/actions/packages.ts` — a pure function that linearly scales 4 hardcoded baseline numbers (`20 / 16.5 / 13 / 16` units/day, "scaled from real 5KW measurements" per its own comment) by `sizeKw / 5`.
- **No admin UI edits these 4 numbers or the scaling** — they're hardcoded literals in the action file. Admin can only *indirectly* influence the displayed table by changing a package's kW size (rescales proportionally) or by toggling which package is `isPopular` (switches which package's stored JSON is shown).
- **Recommendation (given to and accepted by owner)**: make the 4 baseline numbers admin-editable, not the whole table free-text — the linear-scaling formula is physically grounded (production scales with system size) and free-text editing per package risks implausible/inconsistent numbers across sizes, undermining the table's own credibility claim ("ข้อมูลจากการวัดจริง").
- Precedent for this exact pattern already exists in the codebase: `CalculatorConfig` (admin-tunable solar-estimate formula constants, `src/actions/calculator-config.ts`). This work reuses the *pattern* (ADMIN-only, audited, singleton config) but lands the fields on `PackagesPageContent` (not `CalculatorConfig` — different formula, different page, keeping the two solar-estimate systems decoupled so they don't get confused by a future reader), since `PackagesPageContent` already owns this exact section's title/subtitle/visibility (`seasonalTitleTh/En`, `seasonalSubtitleTh/En`, `showSeasonal`).

## Edge case found during investigation

`Package.seasonalProduction` is baked in at save time, not computed at render time. If the baseline changes but existing `Package` rows aren't recomputed, the table would silently show stale numbers for every package except the next one an admin happens to re-save — a real staleness bug if left as-is. **Plan**: when the baseline config is saved, recompute and rewrite `seasonalProduction` for every existing `Package` row (not just the currently-popular one) in the same action, so a single baseline edit takes effect everywhere immediately — matching what an admin would actually expect ("I changed the reference numbers, it should update").

## Sprints

### E1 — Schema

- `prisma/schema.prisma`: add 4 fields to `PackagesPageContent` — `seasonalBaselineSummer Float @default(20)`, `seasonalBaselineEarlyRainy Float @default(16.5)`, `seasonalBaselineRainy Float @default(13)`, `seasonalBaselineWinter Float @default(16)`. Defaults match today's hardcoded values exactly, so existing behavior is unchanged until an admin edits them.
- `npx prisma migrate dev`.

### E2 — Formula + recompute-on-save

- `src/lib/packages-seasonal.ts` (already the shared home for `SeasonRow`/`Seasonal` types): move `seasonalProduction(sizeKw)` here from `src/actions/packages.ts`, reparameterize as `seasonalProduction(sizeKw, baseline)` where `baseline` is `{ summer, earlyRainy, rainy, winter }` read from `PackagesPageContent` — no more hardcoded literals in the function body.
- `src/actions/packages.ts` (create/update package actions): fetch the current `PackagesPageContent` baseline before computing `seasonalProduction`, same transaction as today.
- `src/actions/packages-page-content.ts` (the update action already used by `seasonalTitle`/`showSeasonal` etc.): add the 4 new fields to its validation schema; when any of the 4 baseline values actually changed, recompute and update `seasonalProduction` on **every** `Package` row (`prisma.package.findMany()` → recompute each with its own `sizeKw` → `updateMany`/loop update) inside the same mutation, audited the same way as the rest of the config save.

### E3 — Admin UI

- `src/app/admin/(dashboard)/pages/packages/packages-page-content-client.tsx`: add 4 number inputs in the same section as the existing `seasonalTitle`/`seasonalSubtitle`/`showSeasonal` controls — label clearly as "ค่าอ้างอิงที่ 5kW (หน่วย/วัน)" per season, with the current values as placeholders/defaults so it's obvious what's being scaled from.

### E4 — Verify

- `npm run build`.
- Live-verify: change one baseline number in `/admin/pages/packages`, save, confirm `/th/packages` and `/th/packages/<slug>` (for the currently-popular package) show the rescaled number immediately after revalidation.
- Toggle `isPopular` to a *different* package, confirm its table also reflects the new baseline (proves the recompute-all-rows step worked, not just the popular one).
- Confirm `/th/calculator` (the separate `CalculatorConfig`-driven tool) is unaffected — the two systems must stay decoupled.
- `i18n-parity-checker` not applicable (no new message keys, DB-driven numeric fields only).

## Out of scope

- Making the whole table free-text per package (rejected — see root cause above).
- Any change to `CalculatorConfig` or the `/calculator` tool.
