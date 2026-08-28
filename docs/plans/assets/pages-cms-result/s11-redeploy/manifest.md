# Prod redeploy — Pages CMS bundle (#68–#74)

Date: 2026-08-28 Asia/Bangkok  
Issue: https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/75  
Commit: `9472a2a` (includes Sprint 11 verify pipeline)

## Status: ARTIFACT READY — human FTP required

| Step | Status |
| --- | --- |
| Local Linux deploy build | GREEN (`deploy/dist.zip`) |
| Sprint 11 local verify | GREEN (prior session) |
| Human FTP upload | **PENDING** |
| Panel extract + restart | PENDING |
| Prod smoke | PENDING |

## Artifact

```text
deploy/dist.zip            # 27 MB (28,261,343 bytes) — upload this file
BUILD_ID (local staging):  eXSXKdHoqhNiDOeKwgx1f
git SHA:                   9472a2a
```

Build command:

```bash
npx tsx scripts/build-shared-hosting-deploy.mts
```

## Human steps (runbook)

1. **Backup production first** — `backup-db.mts` on host or panel export off-server
2. **Confirm DDL** — Pages CMS additive tables exist (Sprint 3); verify InnoDB gate (#65)
3. **Upload (human `!` only):**

```bash
! noglob deploy/upload-dist.sh 2>&1 | tail -40
```

4. **Extract on panel** (agent or human via API — see runbook §3)
5. **Restart Passenger** — edit `tmp/restart.txt` via panel API
6. **Smoke (read-only):**

```bash
npx tsx scripts/smoke-test-production.mts \
  --check /th/calculator --expect-text "คำนวณ" \
  --check /admin/pages/home --expect-text "login"
```

Warm each public route twice after restart (ISR). Admin checks need session — do not commit auth screenshots.

## Pages CMS surface in this bundle

- `/admin/pages/{home,about,services,packages,portfolio,calculator}`
- Legacy 307: `/admin/content/about`, `/admin/services`, `/admin/packages`, `/admin/portfolio`
- Settings SEO: booking, contact, testimonials, cookiePolicy only

## Out of this redeploy

- Sprint 12 cleanup (307 removal) — earliest 2026-09-11 + owner approval
- Agent-run FTP

## Rollback

Redeploy previous known-good `dist.zip` snapshot; DB/content unchanged.
