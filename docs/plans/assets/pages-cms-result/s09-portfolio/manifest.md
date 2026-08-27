# Sprint 9 — Portfolio Pages cutover (#72)

Date: 2026-08-28 Asia/Bangkok  
Environment: local `npm run build` + `npm run start`

## Result: COMPLETE

| Gate | Status |
| --- | --- |
| Model script | GREEN (`home+about+services+packages+portfolio` pages; calculator legacy) |
| Build | GREEN (`/admin/pages/portfolio` present) |
| e2e-admin-crud | GREEN (`PORTFOLIO` via `/admin/pages/portfolio`) |
| e2e-rbac-sprint2 | GREEN (EXECUTIVE blocked on `/admin/pages/portfolio` + legacy `/admin/portfolio`) |
| Settings partition | Portfolio removed from SEO UI; `updatePageSeo("portfolio")` rejected |
| Public | `/th|en/portfolio` → 200 |

## Landed

- Registry `portfolio` → `contentRollout: "pages"`
- `/admin/pages/portfolio` — Page Content + Project CRUD + Properties
- Legacy `/admin/portfolio` → redirect after auth
- Versioned `PortfolioPageContent` + empty/CTA/disclaimer visibility
- Image reorder via permutation of stored `imageKeys` (first = cover); invalid order rejected
- Delete Home-ref guard stubbed (`homeReferenceBlockMessage` → null until Featured Portfolio model)
- Audit entity `PortfolioPageContent`

## Verify

```text
npx tsx scripts/verify-pages-cms-model.mts → PASS
npm run build → OK
npx tsx scripts/e2e-admin-crud.mts → PORTFOLIO ✓
npx tsx scripts/e2e-rbac-sprint2.mts → pages/portfolio blocked ✓
```

## Out

- Prod redeploy (S9-E)
- Calculator cutover; Featured Portfolio / `HomeFeaturedPortfolioProject`
