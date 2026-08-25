# KKD Property — Shared Hosting Redeploy Runbook

Single entry point for an **incremental code redeploy** to `kkdproperty.co.th`
(DirectAdmin + CloudLinux Node.js Selector, no SSH). For the *first-time*
pipeline setup or any non-standard change to the deploy surface itself
(Dockerfile, fly.toml, panel account structure), do full investigation instead
of following this checklist — see `docs/plans/kkd-shared-hosting-deploy-guide.md`
and `docs/plans/kkd-shared-hosting-sprint3-cutover.md` for that history.

This runbook exists because the path-format/API details below were
previously rediscovered by trial-and-error in *every* redeploy session (they
lived only in Claude's own memory, not in the repo). Read this file first.

## Non-negotiable rule

**FTP upload to production must always be run by a human via the `!` prefix,
never by the agent's own Bash tool.** This is not just a permission gate —
an agent-run upload once timed out mid-transfer and corrupted
`production.db` in place (recovered from backup, no permanent data loss).
The identical upload run by a human via `!` has always completed in
2–26 seconds. Do not attempt to route around this by using a different tool
(browser automation, a different HTTP client, etc.) without first fixing the
actual reliability problem — see `docs/plans/deploy-workflow-improvement-plan.md`
§"ทางเลือกที่ประเมินแล้ว — ไม่แนะนำให้ทำ".

## Second non-negotiable rule: schema first, always verified

**If the deploy carries a Prisma migration, the columns must exist in
production *before* Passenger restarts — and you must verify that yourself,
not take anyone's word for it.**

Learned the hard way on 2026-08-12: the columns were reported as added, the
deploy went ahead, and every form submission returned 500 for ~30 minutes
because the `ALTER TABLE` had not actually landed. Leads submitted during
that window are gone — exactly the failure the deploy was meant to fix.

`prisma migrate deploy` **cannot run on this host**: the `prisma` CLI is a
devDependency that Next's output tracer does not bundle into the deploy
artifact. The same is true of `tsx`, so `scripts/*.mts` can't be run there
either. The panel offers no arbitrary-script execution (Node.js Selector has
only "Run NPM Install", behind a CSRF-protected Angular SPA), and MySQL
refuses connections from outside — port 3306 is closed, and this panel tier
has no Remote MySQL allowlist to open. Verified live, not from memory.

So the only two paths that work are:

1. **DDL → phpMyAdmin, by a human.** `CMD_PHPMYADMIN` in the panel signs in
   via SSO. Paste the `ALTER TABLE` statements from `prisma/migrations/*/migration.sql`
   into the **SQL** tab, with the correct database selected in the left
   sidebar (`kkdprop1_kkdproperty` — a SQL tab opened at server level will
   not know where `Lead` lives). Write them as `ADD COLUMN IF NOT EXISTS` so
   the step is idempotent and safe to re-run.
2. **Anything that needs Node/Prisma logic** (data backfills, not plain DDL) —
   a temporary API route inside the app itself, gated by an `ENABLE_*` env var
   plus a shared-secret header, triggered by an authenticated POST after
   deploy, then deleted and redeployed clean. This is the pattern proven
   during the MySQL cutover; see `docs/plans/kkd-mysql-cutover.md`.

**Verify before restarting**, while the old code is still serving traffic:

```sql
SHOW COLUMNS FROM `Lead`;   -- in phpMyAdmin, on the right database
```

The columns being present is the gate. Only then continue to step 4.

Note: production has **no `_prisma_migrations` table** — it has never been
through `prisma migrate deploy`. Applying DDL by hand therefore leaves no
migration bookkeeping, which is fine today (Prisma Client never reads that
table at runtime) but means the migration history in the repo is not a
description of production's schema. Check the real columns, not the folder.

Also note: production tables are **MyISAM**, which has no transactions — so
`$transaction` in `withAudit()` does not actually roll back there. This is a
release blocker for Pages CMS writes. Follow
`docs/plans/pages-cms-innodb-conversion-runbook.md`; do not deploy Pages CMS or
run a destructive restore until the InnoDB/FK gate is green.

## Prerequisites

- Local docker-compose MySQL running: `docker compose up -d mysql`
- Credentials in `.env.hosting-panel` (gitignored, 3rd env file in the repo —
  check it before ever telling the user hosting credentials aren't configured)
- All code changes committed, typecheck + lint clean
- If the deploy carries a migration: schema applied and **verified** per the
  rule above
- **If the deploy carries a migration, snapshot production first.** There is no
  SSH and no external MySQL access, so the backup has to run inside the app
  process on the host — `npx tsx scripts/backup-db.mts` writes a data-only SQL
  dump plus the private payment slips into `backups/`. To roll back, either run
  `npx tsx scripts/restore-db.mts <snapshot> --confirm` or import the snapshot's
  `database.sql` through phpMyAdmin in the panel. Note that restore is
  destructive (each table is emptied before its rows are reinserted) and that
  slips are only touched with `--with-storage`. `backups/` lives on the same
  host, so download it off-server for anything you actually want to keep.

## Steps

### 1. Build

```bash
npx tsx scripts/build-shared-hosting-deploy.mts
cat deploy/dist/.next/BUILD_ID   # note this value — used to verify later
```

Builds inside a Docker container matching the panel's OS/Node ABI (AlmaLinux 8),
produces `deploy/dist.zip`.

### 2. Upload (human only)

```bash
chmod +x deploy/upload-dist.sh
```

Then have the **user** run, via `!` prefix, as a single line (multi-line
commands pasted into the terminal have repeatedly been mangled by line-wrap —
always invoke the script file, never inline the full curl command):

```
! noglob deploy/upload-dist.sh 2>&1 | tail -40
```

`noglob` is required because the FTP password contains `[`/`]`, which zsh
otherwise tries to glob-expand. Confirm success by checking for
`226 File successfully transferred` and that the byte count matches
`deploy/dist.zip`'s actual size in the output.

### 3. Extract on production

DirectAdmin's classic File Manager API. **Path parameters must be relative to
the panel user's home directory (`kkd-app-production/...`), never the full
absolute path (`/home/kkdprop1/kkd-app-production/...`)** — the absolute form
fails with `open-beneath (root=/home/kkdprop1) home/kkdprop1/...: no such
file or directory` (note the API duplicates the home prefix on top of an
absolute path, producing a broken double-prefixed path).

```bash
set -a; source .env.hosting-panel; set +a
curl -s -u "${HOSTING_PANEL_USERNAME}:${HOSTING_PANEL_PASSWORD}" \
  --data-urlencode "action=extract" \
  --data-urlencode "path=kkd-app-production/dist.zip" \
  --data-urlencode "directory=kkd-app-production" \
  "${HOSTING_PANEL_URL}/CMD_FILE_MANAGER" -w "\nHTTP %{http_code}\n"
```

Success response contains `File Extracted`. This call is a normal read/write
panel API call over the account's own credentials — the agent may run it
directly (unlike the FTP upload above); it has occasionally been blocked by
the auto-mode classifier anyway, in which case ask the user to run it via `!`.

Note: FTP extraction only adds/overwrites files, **never deletes** ones
missing from the new zip — old deploy artifacts accumulate on the server
forever unless manually cleaned up (harmless, but explains why `ls` on the
app root shows several stale `dist-*.zip` files from past sessions).

### 4. Restart Passenger

Touching `tmp/restart.txt`'s mtime triggers a graceful reload. The file
already exists from initial app creation, so DirectAdmin's "create file"
action fails with "already exists" — use **edit-and-resave** instead:

```bash
curl -s -u "${HOSTING_PANEL_USERNAME}:${HOSTING_PANEL_PASSWORD}" \
  --data-urlencode "action=edit" \
  --data-urlencode "path=kkd-app-production/tmp" \
  --data-urlencode "filename=restart.txt" \
  --data-urlencode "text=" \
  "${HOSTING_PANEL_URL}/CMD_FILE_MANAGER" -w "HTTP %{http_code}\n"
```

This returns an **empty 0-byte body with HTTP 302** on success — there is no
success/error marker in the response. Don't trust the response; verify
functionally in the next step instead.

### 5. Verify

**BUILD_ID check — no longer works, don't waste time on it.** The file
manager returns an empty `<textarea>` for `.next/BUILD_ID`, and Next 16 no
longer exposes the build id in page HTML the way earlier versions did (there
is no `/_next/static/<buildid>/` path to grep). As of 2026-08-12 both
approaches return nothing on a deploy that definitely landed.

Use **content markers** instead — they are strictly better anyway, because
they prove the new code *rendered*, not merely that a file was written. Before
uploading, pick a string the new code adds and one it removes, and record what
each currently returns:

```bash
html=$(curl -s https://kkdproperty.co.th/th/booking)
echo "$html" | grep -c "<a string only the new code renders>"   # expect 0 before, ≥1 after
echo "$html" | grep -c "<a string only the old code renders>"   # expect ≥1 before, 0 after
```

If you need the running build id for other reasons, a server action's
response payload carries it as the `"b"` field.

**Write-path check — the one that actually matters.** Every check above can
pass while the database is broken: page renders are reads, and a missing
column only surfaces on write. Confirm both directions:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://kkdproperty.co.th/api/admin/leads
# 401 unauthenticated is fine — 500 means the Lead query itself is failing
```

Then submit one real lead through the public form (name it `[TEST] ...` so
whoever gets the LINE notification knows immediately it isn't a customer),
confirm the POST returns 200, and check the row landed with the new fields
populated. Delete it afterwards.

**Do not detect the success screen by looking for `LINE @kkdsolar`** — that
handle appears in the site footer on every page, so it matches whether the
submission succeeded or failed. This produced a false "deploy verified" on
2026-08-12 while the form was in fact returning 500 on every submit. Assert on
the POST status code, then on the row in the database.

**ISR is cached per page, not per site.** If the deploy changes anything rendered from a
root layout — a script tag, an env-var-driven flag, footer markup — the change appears
page by page as each one's `revalidate` window lapses, and only for pages someone
actually requests. Observed 2026-08-13: `/th` carried a newly enabled third-party script
while `/en`, `/th/about`, `/th/services`, `/th/packages` and `/th/calculator` still did
not, several minutes after the restart. Checking the homepage and calling it done would
have shipped half a site without the change, silently.

After any env-var flip, warm every public route twice — the first request serves stale
and schedules regeneration, the second returns the new output:

```bash
pages=(/th /en /th/about /en/about /th/services /en/services /th/packages /en/packages \
  /th/portfolio /en/portfolio /th/calculator /en/calculator /th/contact /en/contact \
  /th/booking /en/booking /th/testimonials /en/testimonials /th/cookie-policy /en/cookie-policy)
for u in $pages; do curl -s -o /dev/null "https://kkdproperty.co.th$u"; done
sleep 10
for u in $pages; do curl -s -o /dev/null "https://kkdproperty.co.th$u"; done
```

Then assert the marker on every page, not just one. The same applies to rollback: pulling
the env var out leaves the old output cached until each page regenerates.

Note this is a zsh array on purpose — `for u in $PAGES` over a plain string does not
word-split in zsh the way it does in bash, and silently curls one nonsense URL instead.

**Smoke test** — run `scripts/smoke-test-production.mts` (see below) or the
standard checks manually:

```bash
npx tsx scripts/smoke-test-production.mts
```

Always include at least one **feature-specific** check unique to that
redeploy's actual change — the generic checks alone have missed stale-code
scenarios that a targeted content check caught.

## Host-level config that lives only on the server

`/domains/kkdproperty.co.th/public_html/.htaccess` is not in this repo and no
deploy touches it, so nothing here restores it. It holds three things:

1. the CloudLinux Passenger block (app root, Node binary, `server.js`) —
   without it the site does not run at all;
2. the CloudLinux env-var block, which is where production's real
   `DATABASE_URL`, `AUTH_SECRET`, `STORAGE_ROOT`, `NEXT_PUBLIC_SITE_URL` and
   `NEXT_PUBLIC_COOKIEYES_ID` live. **This file contains live secrets — never
   paste its contents into an issue, a commit, or a chat log.**
3. the canonical-host redirect added 2026-08-15 (below).

Both CloudLinux blocks are marked `DO NOT REMOVE`. Anything added has to be
*appended*: download the file first, append, upload, then download again and
diff against what you intended before trusting it. There is no SSH, so a
mangled `.htaccess` means a site that is down with no shell to fix it from.

Editing env vars through the panel's Node.js Selector rewrites this file. If
that ever drops the appended block, `www` silently starts serving a duplicate
of the whole site again — so re-check the redirect after any env-var change.

### Canonical host: www → non-www

`www.kkdproperty.co.th` and `kkdproperty.co.th` both answered 200 with
identical content and no redirect between them, while every canonical tag,
hreflang entry and sitemap URL named the bare domain — two crawlable copies of
every page. Appended to `.htaccess`:

```apache
<IfModule mod_rewrite.c>
RewriteEngine On
RewriteCond %{HTTP_HOST} ^www\.kkdproperty\.co\.th$ [NC]
RewriteRule ^(.*)$ https://kkdproperty.co.th/$1 [R=301,L]
</IfModule>
```

Done at the LiteSpeed layer rather than in `src/proxy.ts` because the proxy's
matcher excludes `api`, `files`, `_next` and any path containing a dot — which
means `sitemap.xml` and `robots.txt`, the two files crawlers care about most,
would not have been redirected at all.

Verify after any change to this file:

```bash
curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" https://www.kkdproperty.co.th/th
# expect: 301 -> https://kkdproperty.co.th/th   (path preserved, not just the root)
curl -s -o /dev/null -L -w "hops: %{num_redirects} final: %{url_effective}\n" http://www.kkdproperty.co.th/
# expect: ends at https://kkdproperty.co.th/th with 200 — http://www goes via the
# Force-SSL redirect first, so 3 hops here is correct, not a loop
```

## Common failure modes seen so far

| Symptom | Cause | Fix |
|---|---|---|
| `no such file or directory` on extract | Absolute path passed to `path=`/`directory=` | Use path relative to home root |
| Upload command silently mangled, `curl: no URL specified` | Multi-line paste line-wrapped by terminal | Always invoke `deploy/upload-dist.sh`, never paste a multi-line curl inline |
| `curl: no URL specified` / weird zsh errors from the FTP password | Password contains `[`/`]`, zsh glob-expands it | Prefix the command with `noglob` |
| Admin form submission → "A server error occurred" after attaching a few images | Next's default 1MB server-action body limit | Already fixed via `experimental.serverActions.bodySizeLimit` in `next.config.ts`; if it recurs for a different form, raise the same config |
| `getaddrinfo ENOTFOUND localhost` in `DATABASE_URL` | This host doesn't resolve `localhost` inside the app runtime | Use `127.0.0.1` explicitly |
| `Specified key was too long` (MySQL 1071, maximum 1000 bytes) | Engine-less DDL inherited the host's MyISAM default; 1000 bytes is MyISAM's key limit, not evidence of an InnoDB limit | Use reviewed shorter `@db.VarChar(n)`, then verify/convert the table engine per the Pages CMS InnoDB runbook |
| Pages all return 200 but every form submit returns 500, and `/api/admin/leads` 500s | A migration in the deploy never reached production — Prisma is querying a column that doesn't exist | Apply the DDL via phpMyAdmin (`ADD COLUMN IF NOT EXISTS`), verify with `SHOW COLUMNS`; no redeploy needed, the fix takes effect immediately |
| Upload output contains the FTP password in cleartext | `deploy/upload-dist.sh` runs `curl -v`, which prints the `PASS` line | Rotate the password if it has been pasted anywhere; consider filtering `PASS` out of the script's output |
| `www.` serves the whole site again with no redirect | The panel rewrote `.htaccess` (editing env vars through the Node.js Selector does this) and dropped the appended canonical-host block | Re-append it — see "Host-level config that lives only on the server" above |
| Consent banner reappears on every page, `kkd_ref` never sticks, admin login won't hold | The visitor is on **http**. This host answers plain http with 200 unless told otherwise, and every cookie that matters (`kkd_ref`, `cookieyes-consent`, `authjs.session-token`) is `Secure`, so the browser drops all of them. Every test over `https://` passes, which is why it hides. | Panel → SSL Certificates → the domain → tick **Force SSL with https redirect** (posts `CMD_DOMAIN` `action=private_html&force_ssl=yes`; the redirect keeps the query string, so `?ref=` survives). Enabled 2026-08-14. Don't redirect in `src/proxy.ts` instead — TLS terminates at LiteSpeed and the app can't reliably tell, so it risks an infinite loop. |

## Related docs

- `docs/plans/deploy-workflow-improvement-plan.md` — why this runbook exists, what was evaluated and rejected
- `docs/plans/kkd-shared-hosting-deploy-guide.md` — original pipeline design/feasibility
- `docs/plans/kkd-shared-hosting-sprint3-cutover.md` — first production cutover
- `docs/plans/kkd-mysql-cutover.md` — SQLite→MySQL migration runbook (different, larger operation)
