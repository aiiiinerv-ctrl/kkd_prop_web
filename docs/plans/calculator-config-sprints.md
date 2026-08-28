# Calculator admin config — sprint plan

Date: 2026-08-28  
GitHub map: [#102 Calculator config wayfinder](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/102)  
Backlog: [`backlogs/ISSUE_102_calculator_config_map/PLAN.md`](../../backlogs/ISSUE_102_calculator_config_map/PLAN.md)

## Status

**Phase A production release complete 2026-08-28.** Prod DDL applied; smoke + e2e green. Phase B paused for owner OK.

---

## Locked decisions (#103 / #105 / #106)

| ID | Decision |
|---|---|
| **A1** | Phase A: `sunHoursPerDay`, `pricePerKwhThb`, `annualSavingMonthsMultiplier` only |
| **A2** | Mutations: **ADMIN only** + `withAudit()` + reset-to-Excel-defaults |
| **A3** | Tab **ตัวเลขการคำนวณ** on existing `/admin/pages/calculator` |
| **A4** | `CalculatorConfig` singleton (separate from `CalculatorPageContent`) |
| **B1** | Phase B: `minBill`, `maxBill`, `stepBill`, tier thresholds — after A stable |
| **B2** | `daysPerMonth` stays in schema/seed; admin UI in Phase B (optional) |

---

## Sprint tracker

| Sprint | Work | Owner | Status |
|---:|---|---|---|
| **S0** | Live-verify baseline (admin shell + public calculator) | human/agent | ✓ done (#104) |
| **S1** | Schema + migration + seed | nextjs-dev | ✓ `20260828094814_add_calculator_config` |
| **S2** | Validations + actions + audit + reset | nextjs-dev | ✓ |
| **S3** | Admin tab Phase A (3 fields, preview, reset) | nextjs-dev | ✓ |
| **S4** | Public RSC reads `getCalculatorConfig()` | nextjs-dev | ✓ |
| **S5** | Verify + prod release | nextjs-dev + human FTP | ✓ 2026-08-28 |
| **S6** | Phase B admin fields + cross-validation | nextjs-dev | pending owner OK |
| **S7** | Zustand clamp + tier markers + live-verify B | nextjs-dev | pending S6 |

---

## S5 — Phase A production release (current lane)

### Pre-fix (prod today)

| Check | Expected now |
|---|---|
| `SHOW TABLES LIKE 'CalculatorConfig'` | empty |
| `/th/calculator` | 200 (uses code fallback / missing row) |
| `/admin/pages/calculator` → ตัวเลข tab save | **500** after deploy without DDL |

### Steps

1. **DDL** — `docs/plans/assets/calculator-config-phase-a-production-ddl-idempotent.sql` via phpMyAdmin on `kkdprop1_kkdproperty`
2. **Verify** — `SHOW COLUMNS FROM CalculatorConfig` → 11 columns; one seed row
3. **Deploy** — only if prod artifact predates `49b3e85` (current main includes it; last deploy `4f5232c` ✓)
4. **Restart** — Passenger if messages/admin bundle changed since last deploy
5. **Smoke**
   - `npx tsx scripts/verify-calculator.mts`
   - `npx tsx scripts/e2e-calculator-config.mts` (local, server running)
   - Prod: `/admin/pages/calculator` → save price → `/th/calculator` reflects change
6. **Close #102** (Phase A scope) — open follow-up for Phase B if owner wants thresholds UI

### Prod DDL file

See [`docs/plans/assets/calculator-config-phase-a-production-ddl-idempotent.sql`](assets/calculator-config-phase-a-production-ddl-idempotent.sql).

---

## Verification

```bash
npm run build
npx tsx scripts/verify-calculator.mts
npx tsx scripts/e2e-calculator-config.mts   # dev server + local DB
npx tsx scripts/smoke-test-production.mts --check /th/calculator --expect-text "คำนวณ"
```

---

## Phase B preview (not started)

- Expose `minBill`, `maxBill`, `stepBill`, `billThreshold3To5Kw`, `billThreshold5To10Kw` in admin
- Cross-field zod: `minBill < threshold3 < threshold5 <= maxBill`
- Admin slider preview + Zustand bill clamp on public client
- Owner gate required before S6
