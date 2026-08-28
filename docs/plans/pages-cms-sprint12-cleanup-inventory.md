# Pages CMS Sprint 12 — Cleanup inventory

Date: 2026-08-28 · **Do not execute until 2026-09-11** (owner cleanup OK granted 2026-08-28)

## Legacy admin 307 shims (remove route files)

| Legacy path | Canonical | File to remove |
| --- | --- | --- |
| `/admin/content/about` | `/admin/pages/about` | `src/app/admin/(dashboard)/content/about/page.tsx` |
| `/admin/services` | `/admin/pages/services` | `src/app/admin/(dashboard)/services/page.tsx` |
| `/admin/packages` | `/admin/pages/packages` | `src/app/admin/(dashboard)/packages/page.tsx` |
| `/admin/portfolio` | `/admin/pages/portfolio` | `src/app/admin/(dashboard)/portfolio/page.tsx` |

**Approved final behavior for removed routes:** **404** after bookmark check (owner default; confirm at execute if bookmarks still hit legacy URLs).

## Registry / public readers (simplify)

- `ContentRollout` type + `contentRollout` field — all `"pages"`; remove `legacy` branch
- Public pages: drop `usePages` / `pick()` fallbacks that check rollout; keep whole-record message fallback when DB row missing
- `rolloutPartition()` — remove or collapse to assert-all-pages

## Temporary operations routes (review env on prod before delete)

- `src/app/api/operations/pages-cms-sprint3-backfill/route.ts`
- `src/app/api/operations/home-cms-backfill/route.ts`
- `src/app/api/operations/pages-cms-backup/route.ts` — keep if still used for ops; else gate review

## Tests to update

- `scripts/e2e-pages-cms.mts` — legacy 307 section → final behavior
- `scripts/e2e-rbac-sprint2.mts` — paths using `/admin/content/about`, `/admin/services`
- `scripts/verify-pages-cms-model.mts` — partition assertions

## Deliberately retained (Sprint 12)

- Message whole-record fallbacks when Page Content row absent
- Additive schema + audit history
- Six Pages keys + Settings four-key partition
