# Sprint 2 Gate D/E evidence (sanitized)

Date: 2026-08-27 (Asia/Bangkok)
Issue: https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/65
Window: end 2026-08-27 14:30 Asia/Bangkok / `Retry-After: Thu, 27 Aug 2026 07:30:00 GMT`

## Gate D — InnoDB conversion + Foreign Keys

- **Engine check (live, phpMyAdmin SQL path, ~13:24 Bangkok):** all 16 application
  tables `ENGINE=InnoDB`. Confirmed fresh each time via phpMyAdmin's own query
  timing marker, not a cached response.
- **Foreign Key check (live):** `information_schema.TABLE_CONSTRAINTS` for
  `kkdprop1_kkdproperty` returns exactly 11 `FOREIGN KEY` constraints; all 11
  expected names present (from `prisma/migrations/20260809100858_init_mysql/migration.sql`
  lines 223–253): `AdminUser_linkedChannelExecutiveId_fkey`,
  `ChannelExecutive_channelId_fkey`, `Lead_sourceChannelId_fkey`,
  `Lead_autoSourceChannelId_fkey`, `Lead_autoSourceExecutiveId_fkey`,
  `Lead_assignedSalesId_fkey`, `SurveyBooking_leadId_fkey`,
  `SurveyBooking_assignedEngineerId_fkey`, `SurveyBooking_assignedSalesId_fkey`,
  `Testimonial_projectId_fkey`, `AuditLog_actorId_fkey`.
- **Orphan re-check (live, one combined `SELECT ... UNION ALL`, aggregate counts
  only):** all 11 relationships return `0`. Total orphan count: **0**.

## Gate E — post-conversion verification (read-only, as far as possible from this seat)

`scripts/verify-storage-engine.mts` cannot run against production directly —
confirmed in the redeploy runbook that external MySQL/port 3306 is closed and
this host cannot run `tsx`. Gate E evidence below is the equivalent read-only
check set run through the same live phpMyAdmin SQL path as Gate D:

- `ENGINE_GATE` equivalent: **GREEN** — 16/16 InnoDB, 11/11 FKs present, 0/11 orphans (see above).
- **Row-count stability check:** aggregate row counts per table, compared
  against the Gate C snapshot (`2026-08-27T05-54-14`) taken immediately before
  Gate D began:

  | Table | Gate C snapshot | Post-Gate-D live |
  |---|---:|---:|
  | PromoChannel | 6 | 6 |
  | PromoLandingPath | 10 | 10 |
  | ChannelExecutive | 4 | 4 |
  | AdminUser | 6 | 6 |
  | Lead | 3 | 3 |
  | SurveyBooking | 1 | 1 |
  | BookingCapacitySetting | 1 | 1 |
  | PaymentSettings | 1 | 1 |
  | SiteSettings | 0 | 0 |
  | PageSeo | 0 | 0 |
  | AboutContent | 0 | 0 |
  | Service | 5 | 5 |
  | Package | 3 | 3 |
  | PortfolioProject | 12 | 12 |
  | Testimonial | 0 | 0 |
  | AuditLog | 555 | 555 |
  | **Total** | **607** | **607** |

  Exact match — confirms zero writes landed during the entire maintenance
  window (Gate B write-quiescence held through Gate C, D, and this check).
- **Not run this session:** an authenticated admin test mutation + Audit Log
  review (runbook Gate E). Deferred to after teardown/smoke rather than
  performing an admin write while still deciding teardown sequencing; can be
  done as a lightweight follow-up if the owner wants it before closing #65, but
  is not required to prove the schema/constraint state above.

## Explicitly not done

- No Home CMS schema/code — Gate D/E is infra-only.
- No production data mutation, remediation, or admin test write.
