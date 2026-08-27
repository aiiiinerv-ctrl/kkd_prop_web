# Sprint 3 production window — live checklist (#66)

Updated: 2026-08-28 ~02:25 Asia/Bangkok  
Owner window: 02:00–05:00 ICT (±1h OK)

## Done

- [x] Pre-DDL baseline (Home 1+5 InnoDB; Sprint 3 tables absent; no SiteSettings cta*)
- [x] Local `deploy/dist.zip` built + second build after create-if-missing fix
- [x] Production smoke (`/th` 200, canonical `https://kkdproperty.co.th/th`, `/api/admin/leads` 401)
- [x] FTP upload + panel extract + Passenger restart (2×)
- [x] Numbered DDL paste sheet: `production-ddl-steps.md`
- [x] Human DDL in phpMyAdmin (DB `kkdprop1_kkdproperty`)
- [x] Verify DDL via `pma-readonly-query` (InnoDB + columns + FKs)
- [x] Enable backfill env → POST 2× → digests match local → disable
- [x] Teardown verify: POST with secret → `404 {"error":"not_found"}`
- [x] Evidence: `production-rollout-manifest.md` + #66 comments

## Out of scope (later sprints)

- Admin shell / public CMS cutover
- `HomeFeaturedPortfolioProject` (deferred A2)
