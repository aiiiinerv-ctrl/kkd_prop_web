# Page banners + branding — production result manifest

Date: 2026-08-29  
Map: [#107](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/107)

## Prod schema (verified)

| Check | Result |
|---|---|
| `SiteSettings.headerLogoKey` / `footerLogoKey` | ✓ columns present |
| `PageBanner` / `PageBannerSlide` tables | ✓ InnoDB |
| `PageBannerSlide.isActive` | applied via idempotent DDL 2026-08-29 |

## Automated verify (local, against dev DB)

```bash
npm run build
npx tsx scripts/e2e-page-banners.mts
npx tsx scripts/e2e-admin-crud.mts   # regression
```

## Prod smoke (read-only)

- `/th/services`, `/en/services` → 200
- `/admin/settings` → login redirect 307
- Banner section renders when mode ≠ OFF and blob exists

## Scope delivered

- 7 pages: about, services, packages, portfolio, testimonials, calculator, contact (home excluded)
- Modes: OFF / FIXED / SLIDES (2–5)
- Header + footer logo upload in Settings → Header/Footer
- Free-typed slide links (internal path or https/mailto/tel)
- Slide hide/reorder (isActive + sort)
