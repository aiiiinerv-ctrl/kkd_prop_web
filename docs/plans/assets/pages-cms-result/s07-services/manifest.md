# Sprint 7 — Services Pages cutover (#70)

Date: 2026-08-28 Asia/Bangkok  
Environment: local `npm run build` + `npm run start`

## Result: COMPLETE

| Gate | Status |
| --- | --- |
| Model script | GREEN (`home+about+services` in pages partition) |
| Build | GREEN |
| e2e-admin | GREEN |
| e2e-admin-crud | GREEN (Service CRUD via `/admin/pages/services`) |
| e2e-rbac-sprint2 | GREEN (legacy `/admin/services` → pages; EXECUTIVE blocked) |
| Settings partition | Services removed from SEO UI; `updatePageSeo("services")` rejected |
| Public | `/th/services` + `/en/services` → 200 |

## Landed

- Registry: `services` → `contentRollout: "pages"`, Content + Properties enabled
- `/admin/pages/services` — Page Content + embedded Service CRUD + Properties
- Legacy `/admin/services` → auth then redirect to Pages
- Versioned `updateServicesPageContent` + group/CTA visibility
- Empty groups hide on public; Page Content retained
- Settings rejects `services`; EDITOR publish/delete unchanged
- Audit entity `ServicesPageContent`

## Verify

```text
npx tsx scripts/verify-pages-cms-model.mts → PASS
npm run build → OK
npx tsx scripts/e2e-admin-crud.mts → SERVICES ✓
npx tsx scripts/e2e-rbac-sprint2.mts → services paths ✓
```

## Out / deferred

- Prod redeploy (S7-E — owner OK only)
- Packages / Portfolio / Calculator cutovers
