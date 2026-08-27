# Backlog Index

Updated: 2026-08-27  
Live status = GitHub labels. This file is a TOC of PLAN paths only.

## Active

| GitHub | PLAN | Notes |
|---|---|---|
| [#52](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/52) | [`ISSUE_052_home_cms_slice_map`](ISSUE_052_home_cms_slice_map/PLAN.md) | Wayfinder map — Home CMS H0–H4 complete; canary optional |
| [#38](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/38) | [`ISSUE_038_cookieyes_banner_locale_en`](ISSUE_038_cookieyes_banner_locale_en/PLAN.md) | CookieYes Free = one language — owner decision |
| [#32](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/32) | [`ISSUE_032_lead_notifications_resend_line`](ISSUE_032_lead_notifications_resend_line/PLAN.md) | Blocked on Resend/LINE secrets |
| [#30](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/30) | [`ISSUE_030_attribution_baseline_after_consent`](ISSUE_030_attribution_baseline_after_consent/PLAN.md) | Calendar-bound attribution baselines |

## Done

| GitHub | PLAN | Notes |
|---|---|---|
| [#64](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/64) | [`ISSUE_064_home_cms_h4_verify`](ISSUE_064_home_cms_h4_verify/PLAN.md) | H4 verify complete 2026-08-27 — read-only prod smoke; canary not run |
| [#63](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/63) | [`ISSUE_063_home_cms_h3_cutover`](ISSUE_063_home_cms_h3_cutover/PLAN.md) | H3 public cutover live 2026-08-27 — managed hero `/files/public/pages/home/hero/…` |
| [#62](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/62) | [`ISSUE_062_home_cms_h2_admin`](ISSUE_062_home_cms_h2_admin/PLAN.md) | H2 deployed production 2026-08-27 |
| [#61](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/61) | [`ISSUE_061_home_cms_h1_schema`](ISSUE_061_home_cms_h1_schema/PLAN.md) | H1 production rollout complete 2026-08-27 — DDL applied, redeployed, backfill verified idempotent (1 HomePageContent + 5 HomeFaqItem), teardown env vars removed and verified |
| [#65](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/65) | [`ISSUE_065_pages_cms_gate_d_e`](done/ISSUE_065_pages_cms_gate_d_e/PLAN.md) | Gate D/E complete 2026-08-27 — 16/16 InnoDB, 11/11 FKs, orphans 0, teardown smoke green; #61 H1 unblocked |
| [#51](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/51) | [`ISSUE_051_pages_cms_gate_b_c`](done/ISSUE_051_pages_cms_gate_b_c/PLAN.md) | Gate B/C complete 2026-08-27; Gate D/E followed on #65 |
| [#37](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/37) | [`ISSUE_037_portfolio_hero_vs_inventory`](done/ISSUE_037_portfolio_hero_vs_inventory/PLAN.md) | Home hero copy retargeted to residential inventory; chip-hide logic verified |

## Not backfilled yet (PLAN on claim / promote)

Wayfinder maps and grilling that are open but not in the nearby queue, e.g. #1, #10, #21, #24, #25, #27, #36 — create `ISSUE_XXX_…/PLAN.md` when claimed or when labeled `ready-for-agent` / `ready-for-human`.

Pages CMS Sprint 3–12 remain in [`docs/plans/pages-cms-implementation-sprints.md`](../docs/plans/pages-cms-implementation-sprints.md) until Sprint 2 (Gate B–E) is green. Closed slice ticket: [#50](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/50).

Sprint 3 prep (docs only): [`docs/plans/pages-cms-sprint3-prep.md`](../docs/plans/pages-cms-sprint3-prep.md).
