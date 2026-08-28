# Pages CMS — 14-day compatibility observation window

Started: **2026-08-28** (Asia/Bangkok) — Sprint 11 local verification green  
Prod deploy: **live 2026-08-28** (#75) — observation continues until 2026-09-11

## Per-page rollout (all `contentRollout: pages`)

| Page | Admin route | Legacy shim | Observation ends | Prod smoke | Prod write canary |
| --- | --- | --- | --- | --- | --- |
| home | `/admin/pages/home` | — | 2026-09-11 | 200 ✓ | optional |
| about | `/admin/pages/about` | `/admin/content/about` → 307 | 2026-09-11 | 200 ✓ | optional |
| services | `/admin/pages/services` | `/admin/services` → 307 | 2026-09-11 | 200 ✓ | optional |
| packages | `/admin/pages/packages` | `/admin/packages` → 307 | 2026-09-11 | 200 ✓ | optional |
| portfolio | `/admin/pages/portfolio` | `/admin/portfolio` → 307 | 2026-09-11 | 200 ✓ | optional |
| calculator | `/admin/pages/calculator` | — | 2026-09-11 | 200 ✓ | optional |

## Gates before Sprint 12 cleanup

- [ ] 14 calendar days elapsed per page (earliest: **2026-09-11**)
- [x] Owner explicit cleanup approval (S12-D) — **granted 2026-08-28**
- [ ] At least one audited save per page on production **or** approved local canary record — local `verify-pages-cms-all` GREEN 2026-08-28 (e2e pages + rbac); prod audited saves still optional
- [ ] No open P1 integrity/audit/cache/accessibility findings
- [x] Prod read-only smoke green after deploy (#75)
- [x] Prod write-path canary green — booking quote `[TEST]` submit 2026-08-28 (`scripts/smoke-test-production-write.mts`)

## Retained until Sprint 12

- Four legacy admin 307 redirects
- Message whole-record fallbacks when Page Content row missing
- Additive schema + backfill endpoints (non-destructive)

## Notes

Local Sprint 11 evidence: `manifest.md` in this directory.  
Write-path canary: `scripts/smoke-test-production-write.mts` — test lead phone `0897739487` (delete in admin).  
Do **not** remove shims or fallbacks based on elapsed time alone.
