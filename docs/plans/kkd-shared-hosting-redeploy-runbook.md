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

## Prerequisites

- Local docker-compose MySQL running: `docker compose up -d mysql`
- Credentials in `.env.hosting-panel` (gitignored, 3rd env file in the repo —
  check it before ever telling the user hosting credentials aren't configured)
- All code changes committed, typecheck + lint clean

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

**BUILD_ID check** (confirms the new code actually landed, not just that the
zip extracted):

```bash
curl -s -u "${HOSTING_PANEL_USERNAME}:${HOSTING_PANEL_PASSWORD}" \
  --get --data-urlencode "action=edit" \
  --data-urlencode "path=kkd-app-production/.next/BUILD_ID" \
  "${HOSTING_PANEL_URL}/CMD_FILE_MANAGER" \
  | grep -oE '<textarea[^>]*>[a-zA-Z0-9_-]+' | sed 's/.*>//'
```

Compare against the value noted in step 1.

**Smoke test** — run `scripts/smoke-test-production.mts` (see below) or the
standard checks manually:

```bash
npx tsx scripts/smoke-test-production.mts
```

Always include at least one **feature-specific** check unique to that
redeploy's actual change — the generic checks alone have missed stale-code
scenarios that a targeted content check caught.

## Common failure modes seen so far

| Symptom | Cause | Fix |
|---|---|---|
| `no such file or directory` on extract | Absolute path passed to `path=`/`directory=` | Use path relative to home root |
| Upload command silently mangled, `curl: no URL specified` | Multi-line paste line-wrapped by terminal | Always invoke `deploy/upload-dist.sh`, never paste a multi-line curl inline |
| `curl: no URL specified` / weird zsh errors from the FTP password | Password contains `[`/`]`, zsh glob-expands it | Prefix the command with `noglob` |
| Admin form submission → "A server error occurred" after attaching a few images | Next's default 1MB server-action body limit | Already fixed via `experimental.serverActions.bodySizeLimit` in `next.config.ts`; if it recurs for a different form, raise the same config |
| `getaddrinfo ENOTFOUND localhost` in `DATABASE_URL` | This host doesn't resolve `localhost` inside the app runtime | Use `127.0.0.1` explicitly |
| `Specified key was too long` (MySQL 1071) | Index on multiple default `VARCHAR(191)` columns exceeds this panel's InnoDB key-length limit | Use explicit shorter `@db.VarChar(n)` |

## Related docs

- `docs/plans/deploy-workflow-improvement-plan.md` — why this runbook exists, what was evaluated and rejected
- `docs/plans/kkd-shared-hosting-deploy-guide.md` — original pipeline design/feasibility
- `docs/plans/kkd-shared-hosting-sprint3-cutover.md` — first production cutover
- `docs/plans/kkd-mysql-cutover.md` — SQLite→MySQL migration runbook (different, larger operation)
