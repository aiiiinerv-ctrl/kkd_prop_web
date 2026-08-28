# Sprint 10 — Calculator Pages cutover (#73)

Date: 2026-08-28 Asia/Bangkok  
Environment: local `npm run build` + `npm run start`

## Result: COMPLETE

| Gate | Status |
| --- | --- |
| Model script | GREEN (all six pages in `pages` partition; legacy empty) |
| Calculator regression | GREEN (`verify-calculator.mts` byte-for-byte) |
| Build | GREEN (`/admin/pages/calculator` present) |
| e2e-admin-crud | GREEN (`CALCULATOR CONTENT` via `/admin/pages/calculator`) |
| e2e-rbac-sprint2 | GREEN (EXECUTIVE blocked on `/admin/pages/calculator`) |
| Settings partition | Calculator removed from SEO UI; `updatePageSeo("calculator")` rejected; four keys remain |
| Public | `/th\|en/calculator` → 200 |

## Landed

- Registry `calculator` → `contentRollout: "pages"`
- `/admin/pages/calculator` — Page Content + Properties (no legacy admin route)
- Versioned `CalculatorPageContent` — hero/panel/packages copy + `showPackages`
- Public reader; formulas/thresholds stay in `src/lib/calculator.ts`
- Packages section hides when empty or `showPackages` off; copy retained in DB
- Audit entity `CalculatorPageContent`

## Verify

```text
npx tsx scripts/verify-pages-cms-model.mts → PASS
npx tsx scripts/verify-calculator.mts → PASS
npm run build → OK
npx tsx scripts/e2e-admin-crud.mts → CALCULATOR CONTENT ✓
npx tsx scripts/e2e-rbac-sprint2.mts → pages/calculator blocked ✓
```

## Out

- Prod redeploy (S10-E)
- Sprint 11 full release observation window
