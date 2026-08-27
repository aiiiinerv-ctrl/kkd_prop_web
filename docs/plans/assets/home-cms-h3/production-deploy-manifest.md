# H3 production deploy — public Home cutover

Date: 2026-08-27 (Asia/Bangkok evening)
Commit: `31f05fa` (`feat(home): cut over public Home to CMS Page Content`)
BUILD_ID (artifact): `8apxw88rDqp_p_jYZ-X94`
Zip: `deploy/dist.zip` 27,910,875 bytes

## Steps

| Step | Result |
| --- | --- |
| Build | `npx tsx scripts/build-shared-hosting-deploy.mts` OK; `src/messages/` included |
| FTP upload | Owner: `226 File successfully transferred`, 27,910,875 bytes exact |
| Extract | Panel `CMD_FILE_MANAGER` action=extract → `File Extracted`, HTTP 200 |
| Passenger restart | edit-and-resave `tmp/restart.txt` → HTTP 302 empty body |

## Smoke (post-restart)

| Check | Result |
| --- | --- |
| `GET /th` | 200 |
| `GET /en` | 200 |
| Managed hero on `/th` | `files/public/pages/home/hero` count **1** |
| Static marketing hero on `/th` | count **0** (cutover marker — no longer message-era static path) |
| Managed hero on `/en` | count ≥1 |
| `/admin/pages/home` (no session) | **307** → `/admin/login` (route present, auth-gated) |

## Notes

- No new DDL this deploy (tables + backfill already live from H1).
- Rollback: set `PAGE_REGISTRY.home.contentRollout` to `"legacy"`, redeploy prior build (`3468346` / H2 artifact era); DB rows retained.
- `scripts/smoke-test-production.mts` failed to start in this session (local esbuild/tsx platform issue) — content markers above are the authoritative verify for this cutover.

## Status

**COMPLETE** — production public Home reads CMS Page Content.
