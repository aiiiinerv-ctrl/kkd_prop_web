# Sprint 3 local evidence — additive schema + backfill (#66)

Date: 2026-08-27  
Window (production, not run yet): Fri 28 Aug 2026 02:00–05:00 Asia/Bangkok

## Before (local)

- Gate B–E green; Home pilot tables present (`HomePageContent` + `HomeFaqItem`).
- APPLICATION_TABLE_CONTRACTS still listed 16 legacy tables (Home missing — fixed in this sprint).
- Backup copied only `storage/private`.

## After (local)

### Migration

- `prisma/migrations/20260827163000_add_pages_cms_sprint3_schema/`
- Applied via `npx prisma migrate deploy` on `kkd_prop_dev`
- New / extended: PageSeo Properties fields, SiteSettings CTA + `ctaVersion`, AboutContent key/visibility/stats/testimonial chrome/version, AboutFeaturedTestimonial, Services/Packages/Portfolio/CalculatorPageContent
- Deferred: `HomeFeaturedPortfolioProject`

### Backfill (2×)

| Run | contentDigest |
| --- | --- |
| 1 | `a52b7c0073c0e3dc01dc843c288bc43be1a356ddbd82fd107290a21d3b4c4c4d` |
| 2 | `a52b7c0073c0e3dc01dc843c288bc43be1a356ddbd82fd107290a21d3b4c4c4d` |

Parity: **PASS**

Sample counts (both runs): PageSeo 10 updated; SiteSettings CTA filled; About extended; page singletons upserted; `homePageContentCount=1`, `homeFaqItemCount=5` unchanged; `aboutFeaturedRowCount=0` (no published testimonials in local seed).

### Backup

- Contracts include Home + Sprint 3 tables (FK-safe order)
- Snapshot now also copies bounded `public/seo/og` + `public/pages` under `cms-public/`
- Restore `--with-storage` restores those namespaces

### Files

- `src/lib/backfill/pages-cms-sprint3.ts`
- `scripts/backfill-pages-cms-sprint3.mts`
- `src/app/api/operations/pages-cms-sprint3-backfill/route.ts`
- `docs/plans/assets/pages-cms-result/s03-additive-data/production-additive-sql.md`
- `scripts/lib/storage-engine-contract.ts`, `create-backup.ts`, `restore-db.mts`, `backup-db.mts`

### Not done in this evidence pack

- Production DDL / gated HTTP backfill / cleanup redeploy (wait for A1 window)
- Admin shell / public cutover (Sprint 4+)
