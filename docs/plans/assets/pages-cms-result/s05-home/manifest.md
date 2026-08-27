# Sprint 5 — Home Properties + Shared CTA tracer (#68)

Date: 2026-08-28 Asia/Bangkok  
Environment: local `npm run build` + `npm run start`

## Result: COMPLETE

| Gate | Status |
| --- | --- |
| Model script | GREEN |
| Build | GREEN |
| e2e-admin | GREEN |
| e2e-admin-crud | GREEN (PAGE SEO via `/admin/pages/home` Properties) |
| Settings partition | Home removed from SEO UI; `updatePageSeo("home")` rejected |

## Landed

- Home Properties writes (`updatePageProperties`) with version, high-risk ack, OG ops, fresh DB role
- Tabs on `/admin/pages/home`: เนื้อหา · Properties · CTA รวม
- Settings SEO excludes `home`
- `pageMetadata` honors robots / canonical / OG
- Shared CTA from SiteSettings → `CtaBanner` (+ message fallback)
- Featured Portfolio still deferred

## Verify

```text
npx tsx scripts/verify-pages-cms-model.mts → PASS
npm run build → OK
npx tsx scripts/e2e-admin.mts → 0 FAIL
npx tsx scripts/e2e-admin-crud.mts → PAGE SEO ✓ + 0 FAIL
```
