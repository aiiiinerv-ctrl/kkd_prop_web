# Sprint 6 — About Pages cutover (#69)

Date: 2026-08-28 Asia/Bangkok  
Environment: local `npm run build` + `npm run start`

## Result: COMPLETE

| Gate | Status |
| --- | --- |
| Model script | GREEN (`home+about` in pages partition) |
| Build | GREEN |
| e2e-admin | GREEN (pre-existing DASHBOARD lead visibility noise when no fixture) |
| e2e-admin-crud | GREEN (`ABOUT CONTENT` via `/admin/pages/about`) |
| e2e-rbac-sprint2 | GREEN (307 → pages/about for MARKETING/EDITOR; blocked for others) |
| Settings partition | About removed from SEO UI; `updatePageSeo("about")` rejected |
| Public | `/th/about` + `/en/about` → 200 |

## Landed

- Registry: `about` → `contentRollout: "pages"`, Content + Properties admin enabled
- `/admin/pages/about` (Content + Properties); legacy `/admin/content/about` → auth then temporary redirect to `?tab=content`
- Versioned `updateAboutContent` + visibility bools + featured testimonials (max 3)
- Empty featured → public still shows all published (S6-B)
- Delete testimonial blocked when referenced as featured
- Settings rejects `about`; `[page]` fail-closed for about
- Shared `PagePropertiesPanel` for home \| about

## Verify

```text
npx tsx scripts/verify-pages-cms-model.mts → PASS
npm run build → OK
npx tsx scripts/e2e-admin.mts → exit 0
npx tsx scripts/e2e-admin-crud.mts → ABOUT CONTENT ✓
npx tsx scripts/e2e-rbac-sprint2.mts → about redirect/RBAC ✓
curl /th/about /en/about → 200
```

## Out / deferred

- Prod redeploy (S6-D — owner OK only)
- Featured Portfolio (global defer)
- Axe / unsaved / preview chore (S4-H)
