# Sprint 3 production window — live checklist (#66)

Updated: 2026-08-28 ~01:15 Asia/Bangkok  
Owner window: 02:00–05:00 ICT (±1h OK)

## Done

- [x] Pre-DDL baseline (Home 1+5 InnoDB; Sprint 3 tables absent; no SiteSettings cta*)
- [x] Local `deploy/dist.zip` built (~27MB, 27996250 bytes)
- [x] Production smoke still green (`/th` 200, `/api/admin/leads` 401)
- [x] FTP upload (`226`, 27996250 bytes)
- [x] Panel extract + Passenger restart (smoke `/th` `/en` 200; backfill route disabled → 404 JSON)
- [x] Numbered DDL paste sheet: `production-ddl-steps.md`

## Blocked on human

- [ ] **DDL** — paste steps in `production-ddl-steps.md` (phpMyAdmin, DB `kkdprop1_kkdproperty`)

## After DDL (agent continues)

- [ ] Verify DDL via `pma-readonly-query` (InnoDB + columns + FKs)
- [ ] Enable backfill env → POST 2× → matching digests → disable + verify 404
- [ ] Smoke + update production evidence + #66 comment
