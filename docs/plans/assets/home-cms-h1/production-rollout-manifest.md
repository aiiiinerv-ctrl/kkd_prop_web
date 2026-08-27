# H1 production rollout — status manifest (issue #61 / map #52)

Session: 2026-08-27, ~14:15–15:50 Asia/Bangkok (`hosting-deploy-specialist`)
Commit at HEAD: `eec164b` (`feat(pages-cms): add HomePageContent schema and idempotent backfill`), branch `main`, 5 commits ahead of `origin/main` (not pushed — not required for this deploy path; see Non-goals).

**Overall status: COMPLETE.** DDL ✅ · Redeploy ✅ (2 builds — see incident below) · Backfill ✅ (both calls, idempotent, digests match local) · Teardown ✅ (verified — all 5 env vars gone, both gated routes re-disabled, data retained). H1 production rollout is done. H2 (#62) intentionally not started — see "Suggested next pause point" at the end.

## Step 1 — Panel cleanup (Gate B/C leftover env vars)

Checked functionally and structurally; **not** re-verified inside the panel's
own Node.js Selector UI (that requires a human — see below).

- `POST https://kkdproperty.co.th/api/operations/pages-cms-backup` (no secret) →
  **404** `{"error":"not_found"}`. Proves `ENABLE_PAGES_CMS_BACKUP_ROUTE` is
  currently **not** `"true"` — the route is functionally disabled right now.
- `npx tsx scripts/download-production-htaccess.mts` structural summary
  (2026-08-27T07:29Z): `setenv_key_count=7`,
  `setenv_keys=AUTH_SECRET,AUTH_TRUST_HOST,DATABASE_URL,NEXT_PUBLIC_COOKIEYES_ID,NEXT_PUBLIC_SITE_URL,STORAGE_DRIVER,STORAGE_ROOT`
  — none of `ENABLE_PAGES_CMS_BACKUP_ROUTE` / `PAGES_CMS_BACKUP_SECRET` /
  `BACKUP_WRITES_QUIESCED` appear in `.htaccess`. `BACKUP_PATH_EXCLUSION` and
  both `MAINTENANCE_*` markers are `MISS` (no maintenance rewrite active), as
  expected post-Gate-E teardown.
- **Not verifiable from this seat:** whether the panel's own stored Node.js
  Selector config (`.cl.selector/node-selector.json`, not web-reachable) still
  *lists* those 3 keys even though they're absent from `.htaccess` and
  functionally inert. Per `home-cms-slice-foundation-gate-status.md`, this was
  already flagged as **non-blocking** cleanup ("next time convenient") — it
  does not gate H1. Recorded status: functionally disabled, safe to leave for
  now; owner can remove via panel UI whenever convenient, no urgency for this
  rollout.
- **Update:** exactly this risk materialized later in the session — the
  panel's stored config resurfaced these 3 keys (as `true`, with a real
  secret) during an unrelated env-var Save. See "Unrelated but urgent: Gate
  B/C backup-route vars resurfaced" and Step 5 below — torn down and verified
  gone by the end of this session.

## Step 2 — Production DDL — **DONE**

Owner ran all 3 statements in the phpMyAdmin SQL tab. Post-DDL verification
(read-only, `pma-readonly-query.mts`): `HomePageContent`/`HomeFaqItem` both
`ENGINE=InnoDB`, FK `HomeFaqItem_homePageContentId_fkey` present (1 row),
`home_rows=0 faq_rows=0` immediately after (before backfill).

**Pre-DDL baseline captured** (2026-08-27T07:3x Z, via
`scripts/pma-readonly-query.mts`, the read-only phpMyAdmin SSO+AJAX path —
built and hardened this session, see "Tooling" below):

```
SELECT TABLE_NAME, ENGINE, TABLE_ROWS FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'kkdprop1_kkdproperty' AND TABLE_NAME IN ('HomePageContent','HomeFaqItem')
-> live_execution_marker=EMPTY_RESULT (i.e. zero rows)   [tables do not exist yet]

SELECT CONSTRAINT_NAME, TABLE_NAME, REFERENCED_TABLE_NAME FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'kkdprop1_kkdproperty' AND TABLE_NAME = 'HomeFaqItem' AND REFERENCED_TABLE_NAME IS NOT NULL
-> live_execution_marker=EMPTY_RESULT (i.e. zero rows)   [FK does not exist yet — clean slate confirmed]
```

**What the owner needs to do:** open the production database's phpMyAdmin SQL
tab (confirm the correct database, `kkdprop1_kkdproperty`, is selected in the
left sidebar) and run Statements 1, 2, 3 from
`docs/plans/assets/home-cms-h1/production-additive-sql.md` **one at a time**,
confirming each table/FK appears before moving to the next. STOP immediately
on any error.

**After the owner confirms all 3 statements ran clean**, re-run (this agent
can do this, read-only, no human needed):

```bash
npx tsx scripts/pma-readonly-query.mts "SELECT TABLE_NAME, ENGINE, TABLE_ROWS FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'kkdprop1_kkdproperty' AND TABLE_NAME IN ('HomePageContent', 'HomeFaqItem')"
npx tsx scripts/pma-readonly-query.mts "SELECT CONSTRAINT_NAME, TABLE_NAME, REFERENCED_TABLE_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = 'kkdprop1_kkdproperty' AND TABLE_NAME = 'HomeFaqItem' AND REFERENCED_TABLE_NAME IS NOT NULL"
npx tsx scripts/pma-readonly-query.mts "SELECT (SELECT COUNT(*) FROM HomePageContent) AS home_rows, (SELECT COUNT(*) FROM HomeFaqItem) AS faq_rows"
```

Expected green state: both tables `ENGINE=InnoDB`, exactly 1 FK row named
`HomeFaqItem_homePageContentId_fkey`, both row counts `0` (before backfill).

**This gate is a hard stop** — no redeploy upload/extract/restart, no
backfill env-var enable, has happened or will happen until this is green.

### Tooling built this session

`scripts/pma-readonly-query.mts` — new. Implements the read-only phpMyAdmin
SSO + AJAX path documented (but not previously scripted) in
`docs/plans/pages-cms-innodb-conversion-runbook.md` Gate A. Hard-refuses
anything that isn't `SELECT`/`SHOW`/`DESCRIBE`/`EXPLAIN` (regex allow-list +
forbidden-keyword check) so it cannot be used to run DDL even by mistake.
Debugged and proven working live against production this session (see
inline comment on the manual-redirect cookie handling — the session cookie is
set on an intermediate 302 that `redirect: "follow"` silently discards).

## Step 3 — Redeploy — **DONE, verified live**

Local build (safe — no production contact), then human-run upload, then
agent-run extract/restart per the runbook:

- `deploy/dist/.next/BUILD_ID` = `R7ssUHJtoSPCbpK2nWCdm`, `deploy/dist.zip` =
  27,833,029 bytes (sha256 `b99d14a3...4f51ab0`), built 2026-08-27T07:36Z.
  `npx tsc --noEmit` clean; `npm run build` (AlmaLinux 8 container) clean, 48
  static pages generated.
- **Upload (human, `!`):** `noglob deploy/upload-dist.sh` →
  `226-File successfully transferred`, `27833029 bytes` sent — exact match to
  local size.
- **Extract (agent, `CMD_FILE_MANAGER action=extract`):** response contained
  `File Extracted`, HTTP 200.
- **Restart (agent, edit-and-resave `tmp/restart.txt`):** HTTP 302 (no
  success marker by design — verified functionally next).
- **New build confirmed live** two ways:
  1. `POST /api/operations/home-cms-backfill` (no secret) → `404`
     `{"error":"not_found"}`, `content-type: application/json` — this is the
     *route handler's own* disabled-response, not Next's generic 404 (a
     genuinely nonexistent path returns Next's HTML 404 shell instead —
     confirmed by diffing against `POST /api/operations/definitely-does-not-exist`).
     Proves the new route from this deploy is actually present and executing.
  2. The nonexistent-path 404's RSC payload carries `"b":"R7ssUHJtoSPCbpK2nWCdm"`
     — **exact match** to the staged artifact's `BUILD_ID`. Definitive proof
     production is running the new build, not a stale cache.
- **Standard smoke** (`scripts/smoke-test-production.mts`): `HOMEPAGE` 200 ✓,
  `ADMIN_REDIRECT` 307 ✓, `PRIVATE_FILE` 401 ✓.
- **Full page warm (2×, 10s apart)** — all 20 public routes 200 **except**
  `/th/testimonials` and `/en/testimonials` → 404. **Not a regression**:
  `testimonials/page.tsx` calls `notFound()` when zero published testimonials
  exist, and production's `Testimonial` table has had 0 rows since before
  this session (Gate D/E manifest, pre-existing/unrelated).
- **No-cutover check** on `/th`: `marketing/hero-solar.jpg` present (2
  occurrences), `pages/home/hero` (the new managed key prefix) present 0
  times — public site is still 100% message-owned, exactly as H1 intends.
- **General write-path health:** `GET /api/admin/leads` → 401 (unauthenticated,
  correct — not 500, so the wider Prisma-backed app is healthy).

## Deploy incident: `src/messages/` missing from artifact — found and fixed mid-session

The **first** backfill attempt (post-DDL, post-redeploy #1, BUILD_ID
`R7ssUHJtoSPCbpK2nWCdm`) returned `500 {"error":"backfill_failed"}` with the
route's disabled/secret checks passing (i.e. auth was fine, the handler body
threw). Root-caused without SSH/log access, using only read-only panel API
checks:

- Ruled out storage: hero source (`public/marketing/hero-solar.jpg`) present
  on production at the exact local byte size (169,897 bytes); `storage/public`
  and `storage/private` exist, writable, already hold prior content.
- Ruled out schema: `SHOW COLUMNS FROM HomePageContent` / `HomeFaqItem` (via
  `pma-readonly-query.mts`) matched the Prisma schema/DDL exactly, field for
  field.
- Found it: `src/lib/backfill/home-content.ts` reads
  `src/messages/{locale}.json` via a **dynamic runtime `fs.readFile`** (the
  path is built from a variable, so Next's compiler can't statically bundle
  it the way a normal `import` would). `scripts/build-shared-hosting-deploy.mts`'s
  explicit copy allowlist never included `src/messages/` — nothing before
  this route needed message files on disk at runtime. Confirmed via the panel
  File Manager API: production's `src/` contained only `src/generated/`,
  `src/messages/` did not exist at all.

**Fix:** added `src/messages/` to the build script's allowlist plus a
precondition check (`requireExists` on `th.json`/`en.json`) so this can't
silently regress again. Rebuilt (BUILD_ID `X9cGREQEwFfHYOk-xKPdm`), re-ran the
full upload → extract → restart cycle. Confirmed on production via the panel
API after the second deploy: `src/messages/en.json` (23,823 bytes) and
`th.json` (44,207 bytes) present, exact byte match to local.

This fix lives in `scripts/build-shared-hosting-deploy.mts` (deploy tooling,
not application code) — in scope for this session, surgical, and covered by
the precondition check for future deploys.

## `.htaccess` anomaly: duplicate CloudLinux env block (owner Save side-effect)

After the owner's Node.js Selector Save (to add the 2 backfill env vars), the
panel **duplicated** the entire `CLOUDLINUX ENV VARS CONFIGURATION` block
instead of updating the existing one in place — `.htaccess` now has two
`<IfModule Litespeed>` blocks. The **Passenger block is untouched** (single,
correct). Programmatically diffed the two env blocks (values never printed):
the 7 pre-existing keys (`AUTH_SECRET`, `AUTH_TRUST_HOST`, `DATABASE_URL`,
`NEXT_PUBLIC_COOKIEYES_ID`, `NEXT_PUBLIC_SITE_URL`, `STORAGE_DRIVER`,
`STORAGE_ROOT`) are **byte-identical** across both blocks — no drift. The
second (bottom) block is where the 5 new/resurrected keys
(`ENABLE_HOME_CMS_BACKFILL_ROUTE`, `HOME_CMS_BACKFILL_SECRET`,
`ENABLE_PAGES_CMS_BACKUP_ROUTE`, `PAGES_CMS_BACKUP_SECRET`,
`BACKUP_WRITES_QUIESCED`) landed. Apache/LiteSpeed's last-`SetEnv`-wins
semantics mean this is functionally correct (confirmed live — the backfill
route worked once its env vars were set), but it's a latent risk for the
*next* unrelated env-var edit (three blocks next time, or divergence if a
future edit only touches one of the two). **Recommend:** next Node.js
Selector Save for any reason should be followed by a `.htaccess` download +
manual check that only one env block remains; if not, this needs a careful
by-hand consolidation (never `action=edit` with no `text`).

## Unrelated but urgent: Gate B/C backup-route vars resurfaced

The same Save also **resurrected** `ENABLE_PAGES_CMS_BACKUP_ROUTE=true`,
`PAGES_CMS_BACKUP_SECRET=<set>`, `BACKUP_WRITES_QUIESCED=true` — vars that
were previously torn down after the Pages CMS Gate B/C window (issue #51) and
were absent from `.htaccess` as of this session's Step 1 check. The panel's
own stored Node.js Selector config apparently still listed them (exactly the
non-blocking risk flagged in `home-cms-slice-foundation-gate-status.md` — an
unrelated Save resurrected them, as predicted).

**Impact assessed, not just assumed:** `BACKUP_WRITES_QUIESCED` is read in
exactly one place in the codebase
(`src/app/api/operations/pages-cms-backup/route.ts`) — it only gates that one
temporary backup route's own internal check, and has **no effect** on
`withAudit()`, Prisma writes, or any other request path. Confirmed the wider
app's writes are unaffected: `/th`/`/en` 200 throughout, admin API 401 (not
500), and the backfill itself completed writes successfully with this var
set to `true`. So this is a **security-exposure risk** (a backup-creation
route is live with a real secret) rather than a functional-outage risk — but
still needs closing in the same teardown Save as the backfill vars (see
below). Not H1-related; being folded into this rollout's teardown purely for
efficiency (one Save instead of two).

## Step 4 — Gated backfill enable/run — **DONE**

Both calls succeeded once the `src/messages/` fix was live:

**Call 1** (first-ever run):
```json
{"ok":true,"homeCreated":true,"faqCreated":5,"faqUpdated":0,"faqRowCount":5,
 "heroKey":"public/pages/home/hero/sf4a8ub6v7cfowdjhpb10e3b.jpg",
 "heroAlreadyPresent":false,
 "contentDigest":"e801a982dc56abb31d493a66343a825658f8c67a7829cfc3efbc3db8934cffd2",
 "heroImageSha256":"e81bbf967d66242c5fc7714a9d6ca30817890040cd8bbab7da0edc45a4d062c4"}
```

**Call 2** (idempotency check, immediately after):
```json
{"ok":true,"homeCreated":false,"faqCreated":0,"faqUpdated":5,"faqRowCount":5,
 "heroKey":"public/pages/home/hero/sf4a8ub6v7cfowdjhpb10e3b.jpg",
 "heroAlreadyPresent":true,
 "contentDigest":"e801a982dc56abb31d493a66343a825658f8c67a7829cfc3efbc3db8934cffd2",
 "heroImageSha256":"e81bbf967d66242c5fc7714a9d6ca30817890040cd8bbab7da0edc45a4d062c4"}
```

`contentDigest` and `heroImageSha256` **identical** across both calls — proves
idempotency (no drift, no duplicate rows). `contentDigest` also **exactly
matches** the digest recorded from the local docker-MySQL test run in
`backlogs/ISSUE_061_home_cms_h1_schema/PLAN.md` (`e801a982dc56ab...4cffd2`) —
production backfilled the identical content to what was verified locally.

**Independent DB verification** (`pma-readonly-query.mts`, read-only):
`home_rows=1`, `faq_rows=5` — matches the route's own report.

**Hero blob:** `GET /files/public/pages/home/hero/sf4a8ub6v7cfowdjhpb10e3b.jpg`
→ `200`, `content-type: image/jpeg`, 215,355 bytes.

**No-cutover re-check on `/th`:** `marketing/hero-solar.jpg` present (2
occurrences), the new managed hero path (`pages/home/hero`) present 0 times
in the rendered HTML — public site is still 100% message-owned after
backfill, exactly as H1 intends. `/en` also 200.

## Step 5 — Teardown — **DONE, verified**

Owner deleted all 5 keys via one Node.js Selector Save (confirmed via
screenshot: panel now shows only the 7 core vars). Verified independently
from this seat:

- **`.htaccess` re-downloaded** (2026-08-27T08:45Z): `setenv_key_count=14`
  (= 7 core keys × the 2 duplicate blocks — see the anomaly section above,
  still present but now clean). None of the 5 torn-down keys appear in
  either block. Structural markers: `CLOUDLINUX_PASSENGER_BEGIN/END` OK,
  `CANONICAL_WWW_REDIRECT` OK — both blocks intact and untouched by this Save
  beyond the key removal.
- **Passenger restarted** (edit-and-resave `tmp/restart.txt`, HTTP 302) to
  guarantee the Node process picked up the removal.
- **Smoke:** `/th` 200, `/en` 200, `admin` redirect 307, `/api/admin/leads`
  401 (general app health unaffected).
- **Both gated routes confirmed re-disabled:**
  `POST /api/operations/home-cms-backfill` → `404 {"error":"not_found"}`;
  `POST /api/operations/pages-cms-backup` → `404 {"error":"not_found"}`.
- **Data retained through teardown** (env changes don't touch the DB, but
  verified rather than assumed): `pma-readonly-query.mts` →
  `home_rows=1`, `faq_rows=5`, unchanged from Step 4.
- **No-cutover final re-check:** `/th` still renders `marketing/hero-solar.jpg`
  (2 occurrences), the managed `pages/home/hero` path still 0 occurrences.

Duplicate `.htaccess` env-block structure (see anomaly section above) was
**not** fixed as part of this teardown — out of scope for a routine env
removal, and risky to hand-edit without being asked. Recommend the owner or
a future session collapse it into a single block next time `.htaccess` needs
any change, verifying with the same download-and-diff approach used in this
session.

## Step 6 — Evidence

This manifest (finalized). GitHub comments posted on #52 (progress +
completion). `backlogs/ISSUE_061_home_cms_h1_schema/PLAN.md` and
`backlogs/INDEX.md` updated to reflect production-complete status.

### Uncommitted files from this session (not committed — parent/user decides)

- `scripts/pma-readonly-query.mts` — new. Read-only phpMyAdmin SSO+AJAX query
  tool; reusable for any future production DDL/schema verification.
- `scripts/build-shared-hosting-deploy.mts` — modified. Added `src/messages/`
  to the deploy artifact allowlist + a precondition check (the actual bug
  fix from this session — needed for any future deploy that touches
  runtime-read message files).
- `docs/plans/assets/home-cms-h1/production-rollout-manifest.md` — new, this
  file.
- `docs/plans/assets/home-cms-h1/production-additive-sql.md` — modified.
  Added the agent-side read-only re-verification section + pre-DDL baseline
  note.
- `backlogs/ISSUE_061_home_cms_h1_schema/PLAN.md` — modified. Production
  rollout status addendum.
- `backlogs/INDEX.md` — modified. One-liner for #61 updated to reflect
  production-complete status.

All of the above are safe to commit as-is (checked for secrets — none
present). Recommend one commit for the deploy-tooling fix
(`build-shared-hosting-deploy.mts` + `pma-readonly-query.mts`, `fix(deploy):
...` or `feat(deploy): ...`) and a separate `docs`/`chore` commit for the
manifest and backlog updates, per this repo's "one type per commit"
convention — left for whoever is asked to commit, since this session was not
asked to.

## Suggested next pause point

H1 is fully shipped in production. H2 (#62 — admin UI for Home CMS, aggregate
audit seam, page registry) was **not started**, per explicit instruction.
Recommend pausing here for the owner to review this manifest and the #52/#61
comments before scoping H2 as a separate planning pass.

## Non-goals confirmed respected

- No H2 (#62) work started.
- No secrets written to any file in this repo (checked: this manifest,
  `production-additive-sql.md` addendum, and `pma-readonly-query.mts` contain
  no credentials — the script reads them from the gitignored
  `.env.hosting-panel` at runtime only; the backfill secret is communicated
  to the owner only in the operator chat, never written to disk).
- No force-push; nothing pushed to the git `origin` remote (the FTP upload to
  the hosting panel is a separate, unrelated channel from git — no git push
  has happened or is needed for this deploy path).
- No maintenance window / `Retry-After` invoked (correct — additive DDL and a
  disabled-by-default backfill route don't need one).
