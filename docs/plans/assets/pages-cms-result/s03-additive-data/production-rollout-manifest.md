# Sprint 3 production rollout — #66

Session: 2026-08-28 ~01:12–02:25 Asia/Bangkok  
Commits deployed: local `main` including Sprint 3 schema + backfill create-if-missing fix

## Result: COMPLETE

| Step | Status |
| --- | --- |
| Pre-DDL baseline | Home 1+5 InnoDB; Sprint 3 tables absent |
| Human DDL (11 steps) | GREEN — all new tables InnoDB; FKs 2/2; CTA/PageSeo/About columns present |
| FTP + extract + restart (2 builds) | GREEN — second build for create-if-missing backfill |
| Backfill 2× | GREEN — digests match |
| Env teardown | GREEN — POST with correct secret → `404 {"error":"not_found"}` |

## Digests (production, final)

Both calls:

`a52b7c0073c0e3dc01dc843c288bc43be1a356ddbd82fd107290a21d3b4c4c4d`

Matches local docker digest.

## Counts after final backfill

| Table | Count |
| --- | ---: |
| PageSeo | 10 |
| SiteSettings | 1 |
| AboutContent | 1 |
| ServicesPageContent | 1 |
| PackagesPageContent | 1 |
| PortfolioPageContent | 1 |
| CalculatorPageContent | 1 |
| AboutFeaturedTestimonial | 0 (no published testimonials) |
| HomePageContent | 1 |
| HomeFaqItem | 5 |

## Notes

- Production originally had **empty** `PageSeo` / `SiteSettings` / `AboutContent` (message fallbacks). First backfill only created page singletons; second deploy + backfill created the missing rows from `messages/*`.
- `HomeFeaturedPortfolioProject` deferred (#66 A2).
- Public `/th` 200, canonical `https://kkdproperty.co.th/th`, `/api/admin/leads` 401.
- phpMyAdmin SSO must use **`http://`** (Chrome `https://` → 404).
