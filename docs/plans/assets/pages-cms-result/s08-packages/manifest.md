# Sprint 8 — Packages Pages cutover (#71)

Date: 2026-08-28 Asia/Bangkok  
Environment: local `npm run build` + `npm run start`

## Result: COMPLETE

| Gate | Status |
| --- | --- |
| Model script | GREEN (`home+about+services+packages` pages) |
| Build | GREEN |
| e2e-admin-crud | GREEN (`PACKAGES` via `/admin/pages/packages`) |
| e2e-rbac-sprint2 | GREEN (EXECUTIVE blocked on packages paths) |
| Settings partition | Packages removed from SEO UI; `updatePageSeo("packages")` rejected |
| Public | `/th|en/packages` → 200 |

## Landed

- Registry `packages` → `contentRollout: "pages"`
- `/admin/pages/packages` — Page Content + Package CRUD + Properties
- Legacy `/admin/packages` → redirect after auth
- Versioned `PackagesPageContent` + seasonal/payback/CTA visibility
- List + detail public chrome; single-popular clear on create/update
- Audit entity `PackagesPageContent`

## Verify

```text
npx tsx scripts/verify-pages-cms-model.mts → PASS
npm run build → OK
npx tsx scripts/e2e-admin-crud.mts → PACKAGES ✓
npx tsx scripts/e2e-rbac-sprint2.mts → packages blocked ✓
```

## Out

- Prod redeploy (S8-E)
- Portfolio / Calculator cutovers
