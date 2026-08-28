# PLAN — ISSUE_102_calculator_config_map

> Dual source of truth with GitHub [#102](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/102).

## Meta

| Field | Value |
|---|---|
| GitHub | https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/102 |
| Opened | 2026-08-28 |
| Status (disk) | done — **Phase A + B live prod 2026-08-28** |
| Type | wayfinder map |

## Goal

- Admin (ADMIN role only) edits solar calculator business parameters from `/admin/pages/calculator` without a code deploy.
- Phase A: `sunHoursPerDay`, `pricePerKwhThb`, `annualSavingMonthsMultiplier`.
- Phase B: bill slider bounds + tier thresholds, with stricter cross-field validation and admin preview.
- Excel values remain the seeded default; reset-to-default action restores them.
- `withAudit()` on every save/reset; `verify-calculator.mts` guards logic (not frozen constants).

## Scope

- **In-scope**
  - New `CalculatorConfig` singleton model + seed from current `src/lib/calculator.ts` constants
  - Server action `updateCalculatorConfig` + `resetCalculatorConfigToDefaults` (ADMIN only)
  - Admin tab **ตัวเลขการคำนวณ** on existing calculator Pages shell
  - Public page reads config server-side; `calculateSavings()` accepts config object
  - Revalidate `/th/calculator`, `/en/calculator`, `/admin/pages/calculator`
  - Update `scripts/verify-calculator.mts` for logic regression against seed defaults
  - Live-verify before (S0) and after each phase
- **Out-of-scope**
  - Hybrid/battery calculator sheet
  - Editing `calculateSavings()` algorithm (only inputs)
  - Package prices (Packages CMS)
  - TH/EN tier zone label copy (messages stay "3kW/5kW/10kW" — sizes remain 3/5/10)

## Checkpoint: Known / Unknown / Assumption

- **Known:** Sprint 10 deliberately kept formulas code-owned; constants listed in `calculator.ts`; `verify-calculator.mts` asserts Excel reference; `PaymentSettings` singleton is the pattern for admin-tunable commercial data.
- **Unknown:** Whether Phase B ships in same release or after owner feedback on Phase A (default: pause after A).
- **Safe assumption:** Package catalog continues to supply payback prices; empty catalog → `paybackYears: null` (existing behaviour).

## Pre-fix summary (before any code)

| Area | Current | Must change |
|---|---|---|
| `src/lib/calculator.ts` | Hardcoded exports | Accept `CalculatorConfig` (or subset) parameter; keep code defaults as `CALCULATOR_DEFAULTS` for seed/fallback |
| `prisma/schema.prisma` | No config model | Add `CalculatorConfig` singleton |
| `prisma/seed.ts` | No config row | Upsert defaults from `CALCULATOR_DEFAULTS` |
| `src/app/[locale]/calculator/page.tsx` | No config fetch | Load config in RSC, pass to `CalculatorClient` |
| `calculator-client.tsx` | Imports constants | Use props for bounds/thresholds + config in `calculateSavings` |
| `use-calculator-store.ts` | Default bill | Clamp bill when bounds change (Phase B) |
| `/admin/pages/calculator` | Content + Properties only | New tab + client form + preview |
| `scripts/verify-calculator.mts` | Asserts fixed numbers | Assert logic with injected config; separate seed-default snapshot test |
| Audit | `CalculatorPageContent` only | New entity type `CalculatorConfig` |

## Sprint breakdown

| Sprint | Size | Work | Owner | Depends |
|---|:---:|---|---|---|
| **S0** | S | Live-verify baseline: `/admin/pages/calculator` (no formula UI), `/th/calculator` at bill 3500 | human/agent | — |
| **S1** | M | Schema `CalculatorConfig`, migration, `CALCULATOR_DEFAULTS`, seed upsert | nextjs-dev | S0 |
| **S2** | M | `calculator-config` validation (zod ranges), actions + audit + reset | nextjs-dev | S1 |
| **S3** | M | Admin tab Phase A (3 fields, preview panel, reset button) | nextjs-dev (+ ux-ui-expert if layout needs review) | S2 |
| **S4** | M | Public reader: RSC load config → client; wire `calculateSavings(config)` | nextjs-dev | S2 |
| **S5** | S | `verify-calculator.mts` refactor + e2e touch + live-verify Phase A | nextjs-dev | S3, S4 |
| **S6** | M | Phase B fields + cross-validation + slider preview in admin | nextjs-dev | S5 + owner OK |
| **S7** | S | Zustand clamp + tier marker tests + live-verify Phase B | nextjs-dev | S6 |

## Validation rules (zod)

**Phase A**

| Field | Type | Suggested range |
|---|---|---|
| `sunHoursPerDay` | number | 1–12, step 0.5 |
| `pricePerKwhThb` | number | 0.01–50 |
| `annualSavingMonthsMultiplier` | number | 1–12 integer |
| `daysPerMonth` | number | 28–31 (optional in A — can stay code constant until B) |

**Phase B (additional)**

| Field | Rule |
|---|---|
| `minBill`, `maxBill`, `stepBill` | `min < max`, `step` divides range reasonably |
| `billThreshold3To5Kw` | `minBill < threshold < maxBill` |
| `billThreshold5To10Kw` | `billThreshold3To5Kw < threshold <= maxBill` |

## Post-fix summary (Phase A — 2026-08-28)

- [x] `CalculatorConfig` model + migration `20260828094814_add_calculator_config`
- [x] Admin tab **ตัวเลขการคำนวณ** (ADMIN only) — 3 fields + preview + reset
- [x] Public `/th|en/calculator` reads config via `getCalculatorConfig()`
- [x] `withAudit()` on save and reset
- [x] `npm run build` ✓ · `verify-calculator.mts` ✓
- [x] Prod DDL applied + verified (`CalculatorConfig` InnoDB on prod)
- [x] `e2e-calculator-config.mts` green (local)
- [x] Prod smoke: `/th|en/calculator` 200
- [x] Prod DDL applied + verified (`CalculatorConfig` InnoDB on prod)
- [x] `e2e-calculator-config.mts` green (local)
- [x] Prod smoke: `/th|en/calculator` 200
- [ ] Live-verify prod admin save (human login prod)
- [x] Phase B: bill bounds + tier thresholds in admin UI — deployed prod 2026-08-28

## Definition of Done

- [ ] Matches Goal; ADMIN-only mutations audited
- [ ] `npm run build` + `npx tsx scripts/verify-calculator.mts` + relevant e2e green
- [ ] Live-verify evidence for admin + public `/th/calculator`
- [ ] GitHub map #102 closed with outcome comment
- [ ] Folder moved to `backlogs/done/` when implementation complete

## Evidence

### Research (#105)

- **Root cause:** Pages CMS Sprint 10 locked formulas in code for Excel regression safety.
- **Model choice:** Separate `CalculatorConfig` singleton (not extending `CalculatorPageContent`) — mirrors `PaymentSettings`, keeps copy vs numbers separate.
- **Edge cases:** threshold ordering; bill clamp in Zustand; payback null without packages; concurrent version conflict.
- **Security:** ADMIN-only (`requireRole("ADMIN")`); no client-supplied revalidate paths; audit full snapshot without secrets.
- **Impact:** Marketing numbers become admin-controlled — audit + preview mitigate trust risk.

### Verify plan

```bash
npm run build
npm run start   # production mode
npx tsx scripts/verify-calculator.mts
npx tsx scripts/e2e-admin-crud.mts   # calculator content path
# manual: /admin/pages/calculator → ตัวเลข tab; /th/calculator
```
