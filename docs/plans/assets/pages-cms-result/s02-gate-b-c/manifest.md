# Sprint 2 Gate B/C evidence (sanitized)

Date: 2026-08-27 (Asia/Bangkok)
Issue: https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/51

## Result
- Gate B: GREEN (maintenance 503 during window)
- Gate C: GREEN (snapshot `2026-08-26T20-04-40`, dry restore matched hashes/counts)
- Teardown: GREEN at ~03:09 Bangkok

## Post-teardown smoke (no secrets)
- `/th` 200, `/en` 200, `/admin` 307, `/api/admin/leads` 401
- backup POST `404 {"error":"not_found"}`
- htaccess download: 1077 bytes; CloudLinux + canonical OK; maintenance/backup markers MISS; 7 SetEnv keys

## Explicitly not done
- Gate D/E InnoDB DDL — unauthorized
