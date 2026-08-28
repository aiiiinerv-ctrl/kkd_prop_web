# Pages CMS Sprint 12 — Execute runbook

Date: 2026-08-28 · **Run on or after 2026-09-11 only** (S12-C)  
Issue: [#76](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/76)  
Inventory: [`pages-cms-sprint12-cleanup-inventory.md`](pages-cms-sprint12-cleanup-inventory.md)

## Preconditions (all must be green)

- [x] Owner cleanup approval (S12-D) — 2026-08-28
- [ ] 14 calendar days since 2026-08-28 deploy (#75)
- [x] Prod read-only smoke + write-path canary
- [x] Local `verify-pages-cms-all` + `e2e-admin-crud` baseline (2026-08-28)

## Execute order

1. **Implement inventory** — remove four 307 shim files; simplify registry/public readers; review ops routes.
2. **Update tests** — `e2e-pages-cms`, `e2e-rbac-sprint2`, `verify-pages-cms-model` (legacy paths → 404 or canonical).
3. **Verify locally**

```bash
npx tsx scripts/verify-pages-cms-all.mts
npx tsx scripts/e2e-admin-crud.mts   # server must be running
npx tsx scripts/verify-all.mts       # full pipeline
```

4. **Evidence** — `docs/plans/assets/pages-cms-result/s12-cleanup/manifest.md` (before/after routes, test output, rollback SHA).
5. **Redeploy** — read [`kkd-shared-hosting-redeploy-runbook.md`](kkd-shared-hosting-redeploy-runbook.md); human FTP only.
6. **Prod smoke** — `smoke-test-production.mts` + optional `smoke-test-production-write.mts`.
7. **Close #76** — move PLAN to `backlogs/done/`, update INDEX + mother plan.

## Rollback

Redeploy last Sprint 11 bundle (`9472a2a` era) to restore 307 shims. DB unchanged.

## Out of scope (S12-A / S12-B)

- No DDL or data drop
- Keep message whole-record fallbacks when Page Content row missing
