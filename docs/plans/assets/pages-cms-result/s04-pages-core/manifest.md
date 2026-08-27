# Sprint 4 — pages core evidence (#67)

Date: 2026-08-28 Asia/Bangkok  
Commit (feat): `48acf3d` (+ close-out docs commit)  
Environment: local `npm run build` + `npm run start` @ `http://127.0.0.1:3000`

## Result: COMPLETE (close #67)

| Gate | Status |
| --- | --- |
| Model script | GREEN — 9/9 |
| Production build | GREEN |
| e2e-admin | GREEN — 0 FAIL |
| e2e-admin-crud | GREEN — 0 FAIL |
| Auth Home shell | GREEN — 200, h1 เนื้อหาหน้าแรก, `data-page-key=home` |
| Dormant `/admin/pages/*` | GREEN — authenticated 404 for about/services/packages/portfolio/calculator + unknown |
| Audit compliance (manual, subagent limit) | PASS with notes — see below |

## Scope landed

- `src/lib/pages/` — six-key registry; Home `contentRollout: "pages"`, others `legacy`; only Home `adminContentEnabled`
- Validations: `page-content/` primitives + `page-properties.ts`
- `src/actions/pages/update-page-properties.ts` — RBAC + schema, **no writes** (`not_enabled`)
- Admin: `PageShell` / `PageWarningPanel`; Home wrapped; `[page]` fail-closed
- Script: `scripts/verify-pages-cms-model.mts`

## Deferred (intentional, not blocking #67)

- Full Playwright axe package + keyboard matrix pack
- Unsaved guard / preview drawer
- Enabling Properties writes (cutover sprints)
- Production redeploy (no new reachable prod surface required)

## Automated checks

```text
npx tsx scripts/verify-pages-cms-model.mts → 9/9 PASS
npm run build → OK; routes /admin/pages/[page] + /admin/pages/home
npx tsx scripts/e2e-admin.mts → FAIL count 0
npx tsx scripts/e2e-admin-crud.mts → FAIL count 0
```

### Auth smoke (Playwright)

```text
auth home status 200
auth home h1 เนื้อหาหน้าแรก
auth home PageShell yes
auth /admin/pages/about|services|packages|portfolio|calculator|notapage → 404
```

Unauthenticated `/admin/pages/*` → 307 login (proxy) — expected.

## Audit compliance review (#67)

Checked: `src/actions/pages/update-page-properties.ts`, `src/lib/pages/access.ts`, `src/actions/home-content.ts`.

| Mutation | Auth | Audit | Secrets | Verdict |
| --- | --- | --- | --- | --- |
| `updatePageProperties` | `requirePagePropertiesAccess` → `requireRole(ADMIN, MARKETING)` before any write path | N/A — returns `not_enabled` with **zero** DB writes | N/A | **PASS** — fail-closed stub without audit is correct |
| `updateHomeContent` | `requireRole(ADMIN,SALES,MARKETING,EDITOR)` | `auditedAggregate.save` | no password/token fields; hero key via storage | **PASS** |

### Notes (non-blocking)

- **LOW (future cutover):** when Properties writes are enabled, must use `auditedEntity`/`auditedAggregate` and consider fresh DB role re-read per properties guardrails (JWT snapshot alone).
- Dead second role check after `requireRole` is harmless (requireRole already partitions).

No CRITICAL/HIGH findings.

## Public baseline

Not re-captured — no public reader/cutover changes in Sprint 4. `/th` smoke 200 during e2e window.
