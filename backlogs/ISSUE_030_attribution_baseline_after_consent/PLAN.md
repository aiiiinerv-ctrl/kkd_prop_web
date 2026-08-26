# PLAN — ISSUE_030_attribution_baseline_after_consent

## Meta

| Field | Value |
|---|---|
| GitHub | https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/30 |
| Opened | 2026-08-13 |
| Status (disk) | active |
| Triage labels | `ready-for-human` |
| Type | analysis / measurement |

## Goal

- Capture attribution baselines on the dated checkpoints (20 Aug and 12 Sep 2026 BE calendar as stated on the issue) after consent gating is live.

## Scope

- **In-scope**: scheduled measurement / notes comparing pre/post consent-gate attribution
- **Out-of-scope**: changing consent or UTM schema (#24) in this PLAN

## Checkpoint: Known / Unknown / Assumption

- **Known**: Consent-gated `kkd_ref` shipped; issue is calendar-bound analysis.
- **Unknown**: Exact metrics owner wants on each date.
- **Safe assumptions**: Read-only analytics / DB aggregates; no deploy required for the analysis itself.

## Task table

| # | Work | Owner | Depends on | Parallel? | Status |
|---:|---|---|---|---|---|
| 1 | Confirm metric list for baseline | User | — | — | pending |
| 2 | Run checkpoint captures on scheduled dates | User / agent | 1 | — | pending |
| 3 | Publish notes on #30; close when both dates done | User | 2 | — | pending |

## Definition of Done

- [ ] Both checkpoint notes attached to #30
- [ ] Folder done; INDEX updated

## Evidence

### 1) Research
- Issue #30 body; channel-tracking e2e / consent docs

### 2–4)
- (fill when executed)
