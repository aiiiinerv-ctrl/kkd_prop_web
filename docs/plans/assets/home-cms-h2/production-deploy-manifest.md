# H2 production redeploy — status manifest (issue #62 / map #52)

Session: 2026-08-27, ~17:00–17:15 Asia/Bangkok (`hosting-deploy-specialist`)
Commit at HEAD: `eb6b4af` (`feat(home): add Home CMS admin shell and aggregate audit seam`), on top of `99f7715` (`fix(deploy): include src/messages in shared-hosting artifact`) and the H1 rollout (`46d9a17`). Branch `main`.

**Overall status: COMPLETE.** Build ✅ · Upload ✅ (human, `!`) · Extract ✅ · Restart ✅ · Smoke ✅ (all green, no regressions). No schema migration in this deploy — H2 only adds admin code against `HomePageContent`/`HomeFaqItem`, which were created and backfilled in H1 and are unchanged here.

## Scope of this deploy

`eb6b4af` adds, with **no `prisma/` diff** (confirmed via `git diff 99f7715..eb6b4af -- prisma/` — empty):

- `src/lib/audit.ts` — `auditedAggregate()` seam (parent version guard + child mutate + one audit row, one transaction)
- `src/lib/pages-registry.ts` — `home` key, `contentRollout: "legacy"` (no public cutover)
- `src/lib/validations/home-content.ts` — field allow-list + zod schemas
- `src/actions/home-content.ts` — `updateHomeContent()` aggregate save
- `src/app/admin/(dashboard)/pages/home/{page.tsx,home-client.tsx}` — new admin Content UI
- `src/app/admin/(dashboard)/admin-sidebar.tsx` — new "หน้าแรก (Pages)" nav item
- `src/lib/enum-labels.ts` — audit label for `HomePageContent`

Because there's no DDL and no data backfill, this redeploy skips the DDL gate, pre-deploy DB snapshot, and gated-route teardown steps that the H1 manifest (`docs/plans/assets/home-cms-h1/production-rollout-manifest.md`) needed — it is build → upload → extract → restart → smoke only, per the runbook's "routine incremental redeploy" path.

## Pre-flight

- `npx tsc --noEmit` — clean, repo-wide.
- Local docker-compose MySQL already running (`kkd_prop-mysql-1`, healthy, up 21h) — used by the build container, not touched by the deploy itself.

## Step 1 — Build — DONE

```bash
npx tsx scripts/build-shared-hosting-deploy.mts
```

- Built in the AlmaLinux 8 Docker container matching the panel's OS/Node ABI.
- **BUILD_ID: `Tv8tmovl3W7F7EuH3cX8O`**
- `deploy/dist.zip`: 27,897,915 bytes, sha256 `926edf338a5d041339335c368a819517844e5684e03934dd366df1d56def1e71`
- Route manifest from the build log confirms `ƒ /admin/pages/home` is present in this artifact.
- `deploy/dist/src/messages/{th.json,en.json}` present (44,207 / 23,823 bytes) — the H1 fix (`99f7715`) to the build script's copy allowlist is holding; no regression.

## Step 2 — Upload (human, `!`) — DONE

Owner ran `noglob deploy/upload-dist.sh`:

```
226-File successfully transferred
27897915 bytes
```

Byte count is an **exact match** to the local `deploy/dist.zip` size above.

## Step 3 — Extract — DONE

`CMD_FILE_MANAGER action=extract`, `path=kkd-app-production/dist.zip`, `directory=kkd-app-production` (paths relative to panel home root, per the runbook's known gotcha). Response body contained `File Extracted`, HTTP 200.

## Step 4 — Restart Passenger — DONE

Edit-and-resave `tmp/restart.txt` (empty `text=`) via `CMD_FILE_MANAGER action=edit`. Response: empty body, HTTP 302 — the expected no-success-marker signature per the runbook; verified functionally in Step 5.

## Step 5 — Smoke — ALL GREEN

**BUILD_ID confirmed live** — read directly from `/th`'s own RSC payload (stronger evidence than the nonexistent-path trick used in H1, no extra request needed):

```
\"b\":\"Tv8tmovl3W7F7EuH3cX8O\"
```

Exact match to the staged artifact's BUILD_ID. Also cross-checked against a nonexistent-path RSC fetch (`/api/operations/definitely-does-not-exist-h2-check`), same value.

**Standard smoke** (`npx tsx scripts/smoke-test-production.mts`):

```
HOMEPAGE: GET /th -> 200 (expected 200) ✓
ADMIN_REDIRECT: GET /admin -> 307 (expected 307) ✓
PRIVATE_FILE: GET /files/private/slips/nonexistent -> 401 (expected 401) ✓
```

**No-cutover check (this deploy's own DoD — public Home must stay message-owned):**

| Page | `marketing/hero-solar.jpg` occurrences | `pages/home/hero` (managed key) occurrences |
|---|---:|---:|
| `/th` | 2 | 0 |
| `/en` | 2 | 0 |

Public Home is unaffected by H2, as intended — the admin UI writes to `HomePageContent`/`HomeFaqItem` but `pages-registry.ts`'s `contentRollout: "legacy"` means the public reader never touches it.

**Admin route guard check (feature-specific to this deploy):**

```
GET /admin              -> 307 -> https://kkdproperty.co.th/admin/login
GET /admin/pages/home   -> 307 -> https://kkdproperty.co.th/admin/login
GET /admin/login        -> 200
```

`/admin/pages/home` redirects to login rather than returning a Next missing-route 404 shell — this proves the route exists in the deployed build and is correctly guarded by `src/proxy.ts`'s optimistic cookie redirect (real authorization is re-checked server-side by `requireAdmin()`, which this check does not reach without a session — expected and correct per AGENTS.md). No live admin session was available from this seat to go further (e.g. confirm the Content UI itself renders); that would need the owner to log in and check manually.

**Write-path health (general, not H2-specific — confirms the wider app didn't regress):**

```
GET /api/admin/leads -> 401 (unauthenticated, correct — not 500)
```

**Full public-page warm** (2×, 10s apart, per the runbook's ISR-per-page caveat — all 20 routes):

```
/th 200   /en 200
/th/about 200   /en/about 200
/th/services 200   /en/services 200
/th/packages 200   /en/packages 200
/th/portfolio 200   /en/portfolio 200
/th/calculator 200   /en/calculator 200
/th/contact 200   /en/contact 200
/th/booking 200   /en/booking 200
/th/testimonials 404   /en/testimonials 404
/th/cookie-policy 200   /en/cookie-policy 200
```

`/th/testimonials` and `/en/testimonials` returning 404 is **not a regression** — same pre-existing behavior recorded in the H1 manifest (`testimonials/page.tsx` calls `notFound()` when the `Testimonial` table has 0 published rows; production's table has been empty since before H1). Every other route is 200 on both passes.

## What was not checked (out of reach from this seat)

- The admin Content UI's actual rendering/behavior behind a real session (TH/EN tabs, FAQ editor, save flow, audit row) — needs the owner to log in. H2's local Playwright/e2e coverage (`backlogs/ISSUE_062_home_cms_h2_admin/PLAN.md`) already exercised this against local docker-MySQL before this deploy; this session only confirms the *build shipped* and the *route is guarded*, not a live click-through.
- `.htaccess` / Node.js Selector env config — untouched by this deploy (no new env vars), not re-checked this session since nothing here should have disturbed it.

## Evidence

This manifest. Standard + custom smoke commands and their literal output are inlined above (no separate log file). GitHub comment posted on [#52](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/52).

## Non-goals confirmed respected

- No H3 (public Home cutover) work started or implied by this deploy.
- No secrets written to any file in this repo — this manifest, like the H1 one, contains no credentials; `.env.hosting-panel` was only sourced in-memory for the extract/restart `curl` calls.
- No commits made by this agent; nothing pushed to `origin`. Whether to commit the deploy-tooling/doc/backlog changes from this and prior sessions is left to the parent/user.
- No destructive action taken — extract only adds/overwrites files (per the runbook, old artifacts accumulate but nothing is deleted), and the restart touch is the same idempotent no-op-content resave used in every prior redeploy.
