# About CMS enhancement — production deploy evidence (E4)

Date: 2026-08-28  
Issue: [#87](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/87) (closed)

## Deploy

| Step | Evidence |
| --- | --- |
| Commit | `6f1947e` — `feat(about): admin credentials heading, Lucide icons, stats labels` |
| DDL | phpMyAdmin on `kkdprop1_kkdproperty` — `deploy/about-cms-enhancement-prod-ddl.sql` |
| DDL verify | `SHOW COLUMNS FROM AboutContent LIKE 'credSection%'` — 4 columns |
| Upload | FTP `dist.zip` 28,278,827 bytes — `226 File successfully transferred` |
| Extract | Panel API — `File Extracted` |
| Restart | Passenger `restart.txt` — HTTP 302 |

## Read-only smoke (post-deploy)

```
npx tsx scripts/smoke-test-production.mts --check /th/about --expect-text "จดทะเบียนถูกต้อง"
```

- HOMEPAGE 200 ✓
- ADMIN_REDIRECT 307 ✓
- PRIVATE_FILE 401 ✓
- `/th/about` 200 + credential text ✓
- `/api/admin/leads` 401 (not 500) ✓

## Write-path

| Check | Status | Notes |
| --- | --- | --- |
| About admin save + public cred heading | **Pending human** | Automated login failed — local `ADMIN_PASSWORD` ≠ production admin |
| Booking quote submit | Run `smoke-test-production-write.mts` | General DB write gate |

## Manual sign-off (owner)

1. Login `/admin/pages/about` on production
2. Save cred section title or change one icon
3. Confirm `/th/about` updates
4. Optional: restore previous copy

## Out of scope this deploy

- Sprint 12 (#76) shim removal — blocked until 2026-09-11
