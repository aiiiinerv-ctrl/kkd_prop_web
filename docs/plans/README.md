# `docs/plans/` — implementation plans index

Committed, multi-sprint **implementation plans** for kkd_prop (not the live
triage board). Live issue status = GitHub labels; per-issue execution PLANs =
[`backlogs/`](../../backlogs/README.md) (dual SoT — [ADR 0008](../adr/0008-dual-backlog-sot-github-and-local-plan.md)).

| Surface | Role |
|---|---|
| `docs/plans/*.md` | Long-lived sprint / research / runbook docs (this folder) |
| `backlogs/ISSUE_XXX_*/PLAN.md` | Dual-SoT execution plan tied 1:1 to a GitHub issue |
| GitHub Issues | Live labels (`needs-info`, `ready-for-agent`, …) |

Statuses below are **orientation only** (checked against closed issues /
`backlogs/done/` / Gate evidence as of 2026-08-27). Prefer GitHub +
`backlogs/INDEX.md` for “what is open right now.”

## Active

| Plan | Notes |
|---|---|
| [pages-cms-implementation-sprints.md](pages-cms-implementation-sprints.md) | Mother plan Sprint 1–12; Sprint 3 open as [#66](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/66) |
| [pages-cms-sprint3-prep.md](pages-cms-sprint3-prep.md) | Pre-flight for #66 (unlocked after Gate B–E) |
| [pages-cms-data-model-migration-decision.md](pages-cms-data-model-migration-decision.md) | Locked data model for Sprint 3+ |
| [pages-cms-content-ownership-decisions.md](pages-cms-content-ownership-decisions.md) | Ownership boundaries |
| [pages-cms-properties-security-guardrails.md](pages-cms-properties-security-guardrails.md) | RBAC / upload / validation |
| [pages-cms-routing-cache-impact-analysis.md](pages-cms-routing-cache-impact-analysis.md) | Cache / revalidate impact |
| [pages-cms-live-verification-matrix.md](pages-cms-live-verification-matrix.md) | Live evidence criteria |
| [kkd-shared-hosting-redeploy-runbook.md](kkd-shared-hosting-redeploy-runbook.md) | **Required read** before every production redeploy |
| [repo-hygiene-docs-system-tasks.md](repo-hygiene-docs-system-tasks.md) | Hygiene track (gitignore decision still owner HITL) |

## Reference (recently completed / evidence pointers)

| Plan | Notes |
|---|---|
| [home-cms-slice-implementation-sprints.md](home-cms-slice-implementation-sprints.md) | Home pilot H0–H4 — map [#52](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/52) closed |
| [home-cms-slice-foundation-gate-status.md](home-cms-slice-foundation-gate-status.md) | Gate A–E scoreboard → GREEN |
| [home-cms-slice-live-verification-matrix.md](home-cms-slice-live-verification-matrix.md) | Home live-verify matrix |
| [home-cms-slice-*-research.md](home-cms-slice-inventory-research.md) | Research pack #53–#56 |
| [pages-cms-innodb-conversion-runbook.md](pages-cms-innodb-conversion-runbook.md) | Production Gate B–E runbook |
| [pages-cms-sprint2-temporary-backup-route.md](pages-cms-sprint2-temporary-backup-route.md) | Temp backup route (teardown lessons) |
| [pages-cms-sprint2a-*.md](pages-cms-sprint2a-guard-deploy-readiness.md) | Sprint 2a delete-guard |
| [pages-cms-codex-handoff-tasks.md](pages-cms-codex-handoff-tasks.md) | Codex hand-off (partially superseded by Gate E green) |
| [myisam-innodb-atomicity-investigation.md](myisam-innodb-atomicity-investigation.md) | Gate A SQL / engine investigation |
| [pages-cms-current-state-inventory.md](pages-cms-current-state-inventory.md) | Pre-CMS inventory |

Evidence dirs: `assets/pages-cms-result/` (`s01-*`, `s02-*`, `s03-additive-data/` placeholder), `assets/home-cms-h*`.

## Historical / earlier sprints

| Plan | Notes |
|---|---|
| [sprint-3-booking-tasks.md](sprint-3-booking-tasks.md) … [sprint-7-content-numbers-tasks.md](sprint-7-content-numbers-tasks.md) | Early product sprints (booking, leads, reports, content) |
| [sprint-3-cookie-consent-tasks.md](sprint-3-cookie-consent-tasks.md) | Cookie consent |
| [sprint-5b-reports-gap-tasks.md](sprint-5b-reports-gap-tasks.md) | Reports gap |
| [kkd-mysql-cutover.md](kkd-mysql-cutover.md), [kkd-mysql-driver-adapter-recommendation.md](kkd-mysql-driver-adapter-recommendation.md) | SQLite → MySQL |
| [kkd-shared-hosting-deploy-guide.md](kkd-shared-hosting-deploy-guide.md), [kkd-shared-hosting-sprint3-cutover.md](kkd-shared-hosting-sprint3-cutover.md), [kkd-production-host-mapping.md](kkd-production-host-mapping.md) | Hosting cutover |
| [archived-fly-io-deploy-config.md](archived-fly-io-deploy-config.md) | Retired Fly.io path |
| [deploy-workflow-improvement-plan.md](deploy-workflow-improvement-plan.md) | Deploy workflow notes |
| [kkd-spec-remediation.md](kkd-spec-remediation.md) | Spec remediation |
| [theme-4-5-6.md](theme-4-5-6.md) | Theme experiments |
| [site-content-cms-*.md](site-content-cms-tasks.md), [admin-about-field-clarity-*.md](admin-about-field-clarity-tasks.md) | Earlier CMS / About clarity |
| [rbac-marketing-editor-executive-tasks.md](rbac-marketing-editor-executive-tasks.md) | RBAC |
| [admin-landing-path-management-tasks.md](admin-landing-path-management-tasks.md) | Landing paths |
| [sa-channel-taxonomy-utm-tasks.md](sa-channel-taxonomy-utm-tasks.md) | Channel / UTM |
| [lead-capture-complete-fields.md](lead-capture-complete-fields.md) | Lead fields |
| [system-completeness-audit-tasks.md](system-completeness-audit-tasks.md) | Completeness audit |
| [backlog-dispatch-2026-08-16-tasks.md](backlog-dispatch-2026-08-16-tasks.md) | Dispatch snapshot |

Physical archive/move of “Historical” files is **out of scope** unless the
owner explicitly requests it (relative cross-links break easily).

## Related

- [`backlogs/INDEX.md`](../../backlogs/INDEX.md)
- [`docs/agents/issue-tracker.md`](../agents/issue-tracker.md)
- [`AGENTS.md`](../../AGENTS.md) — working rules + verify skill
