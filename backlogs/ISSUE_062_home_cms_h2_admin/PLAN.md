# PLAN — ISSUE_062_home_cms_h2_admin

> Dual SoT with GitHub `#62`.

## Meta

| Field | Value |
|---|---|
| GitHub | https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/62 |
| Opened | 2026-08-27 |
| Status | done — deployed to production 2026-08-27 |
| Labels | `wayfinder:task` |
| Type | wayfinder execution |

## Goal

- Versioned aggregate audit seam for Home (parent + FAQ)
- Page registry with `home` (public still `legacy` / no cutover)
- Admin `/admin/pages/home` Content UI + Pages → หน้าแรก nav
- Contact via shared SiteSettings helper (Settings RBAC)

## Out of scope

- Public Home reader cutover (H3)
- Live-verify pack / canary (H4)
- Featured Portfolio, other pages

## Task table

| # | Work | Owner | Status |
|---:|---|---|---|
| 1 | Aggregate audit seam in `src/lib/audit.ts` | `nextjs-dev` | done |
| 2 | Home page registry (no public cutover) | `nextjs-dev` | done |
| 3 | `/admin/pages/home` + sidebar | `nextjs-dev` | done |
| 4 | Contact shared mutate + RBAC | `nextjs-dev` | done |
| 5 | `audit-compliance-reviewer` on new actions | reviewer | pending |

## DoD

- [x] Matches sprint H2 in `docs/plans/home-cms-slice-implementation-sprints.md`
- [x] Public Home unchanged (messages)
- [x] Stale version / FAQ limits / EDITOR contact block / one audit row

## Implementation notes (H2, 2026-08-27)

**Files:**
- `src/lib/audit.ts` — new `auditedAggregate()` seam (parent version guard + child mutate + one audit row, one transaction)
- `src/lib/pages-registry.ts` — new, `home` key only, `contentRollout: "legacy"`
- `src/lib/validations/home-content.ts` — new, field allow-list + zod schemas (content fields, FAQ items, plain-text/no-HTML guard)
- `src/actions/home-content.ts` — new, `updateHomeContent()` (aggregate save: parent fields + FAQ sync via temp-negative-sortOrder shift to avoid unique-constraint collisions)
- `src/app/admin/(dashboard)/pages/home/{page.tsx,home-client.tsx}` — new admin Content UI (TH/EN tabs, FAQ editor, Contact section gated by `canManageSiteSettings`)
- `src/app/admin/(dashboard)/admin-sidebar.tsx` — added "หน้าแรก (Pages)" nav item; About untouched
- `src/lib/enum-labels.ts` — `HomePageContent` audit label

**Scope decision:** hero image upload/replace (matrix C1–C5) deferred to H3 — not in Sprint H2's own DoD; `heroImageKey` stays untouched by this action.

**Verification:** `npm run build` (✓ compiled + typechecked) + `eslint` clean on all changed files; full `e2e-admin.mts` + `e2e-admin-crud.mts` rerun with no regressions; ad hoc Playwright smoke covering: admin load, sidebar link, TH field save + persistence, audit row visible, stale-version conflict (two tabs), EDITOR content-yes/contact-no, MARKETING contact-yes, FINANCE denied, FAQ-visible-with-0-items rejected, unknown-FormData-key rejected, public `/th` unaffected. Home content DB row restored to backfill baseline afterward via `backfillHomeContent()` (idempotent).

## Production deploy (2026-08-27, `hosting-deploy-specialist`)

No schema migration (`git diff` against `prisma/` between the pre-H2 and H2 commits is empty — H2 only adds application code against tables already live from H1). Routine incremental redeploy: build → human FTP upload → extract → Passenger restart → smoke, all green. BUILD_ID `Tv8tmovl3W7F7EuH3cX8O` confirmed live via `/th`'s own RSC payload. No-cutover check held (`marketing/hero-solar.jpg` present, `pages/home/hero` absent, on both `/th` and `/en`). `/admin/pages/home` redirects to login (not a Next 404 shell) without a session, confirming the route shipped and is guarded. Full evidence: `docs/plans/assets/home-cms-h2/production-deploy-manifest.md`.

Not checked from this seat: the admin Content UI's live click-through behind a real session (local e2e/Playwright coverage above already exercised this pre-deploy).
