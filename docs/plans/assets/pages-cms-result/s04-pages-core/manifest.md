# Sprint 4 — pages core evidence (#67)

Date: 2026-08-28  
Environment: local implementation (in progress)

## Scope landed

- `src/lib/pages/` — six-key registry; Home `contentRollout: "pages"`, others `legacy`; only Home `adminContentEnabled`
- Compat shim: `src/lib/pages-registry.ts` re-exports
- Validations: `src/lib/validations/page-content/`, `page-properties.ts`
- Actions: `src/actions/pages/update-page-properties.ts` (RBAC + schema, writes not enabled)
- Admin: `PageShell` / `PageWarningPanel`; Home wraps shell; `pages/[page]` fail-closed
- Script: `scripts/verify-pages-cms-model.mts`

## Still open (same issue)

- Playwright axe dependency + keyboard fixture pack
- Full e2e-admin / e2e-admin-crud regression after this commit
- `audit-compliance-reviewer` on `src/actions/pages/`
- Unsaved guard / preview drawer / Properties UI (deferred to cutover sprints where noted)

## Automated checks

```text
npx tsx scripts/verify-pages-cms-model.mts → 9/9 PASS (2026-08-28)
npm run build → Compiled + TypeScript OK; routes include /admin/pages/[page] + /admin/pages/home
```
