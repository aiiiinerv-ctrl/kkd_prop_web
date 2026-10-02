# PLAN — ISSUE_153_calculator_hybrid_toggle_map

> Dual source of truth with GitHub `#153` (wayfinder map). Decisions live in the child tickets; this PLAN only indexes them.

## Meta

| Field | Value |
|---|---|
| GitHub | https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/153 |
| Opened | 2026-10-02 |
| Status (disk) | charted — frontier: #154 |
| Triage labels | `wayfinder:map` |
| Type | wayfinder |

## Goal

- Sprint plan (committed in `docs/plans/calculator-hybrid-toggle-sprints.md`) ready to implement:
  - On-grid / Hybrid toggle on the public calculator, with customer-chosen battery size.
  - Hybrid sheet imported from the same Excel file as On-grid (single preview/diff/confirm/rollback).
  - Lead carries system type + battery size.

## Scope

- **In-scope**:
  - Hybrid main table, rows 4–55 (5–125 kW, battery variants per size).
  - Excel formula used exactly as written: saving = (daily kWh + battery kWh) × 4.5 × 30.
  - Payback from the lowest brand price in Excel.
  - One upload reads both sheets.
  - Public page defaults to On-grid; the toggle stays hidden until a Hybrid table is imported.
  - Lead fields for system type and battery size.
  - TH/EN for all of the above.
- **Out-of-scope**:
  - HUAWEI block (rows 57–79) as a calc table; it only supplies battery prices.
  - Customer brand selection.
  - "Physically correct" formula rewrite.
  - Runtime formula engine.
  - On-grid legacy column DROP (#151).
- **Precondition for implementation**: On-grid S10 (real Excel upload on prod) done first.

## Checkpoint: Known / Unknown / Assumption

- **Known**: On-grid design S0–S9 is live on prod (`docs/plans/calculator-excel-import-sprints.md`). The Hybrid sheet is laid out differently: blank kW cells on battery rows, a 0.2 panel factor, and 5 brands with formula-derived battery add-ons.
- **Unknown**:
  - How to read the Hybrid sheet (#154)
  - What "lowest price" means and how to handle price anomalies (#155)
  - Recommendation and battery-selection rules (#156)
  - Public UI (#157)
  - Data model, admin and lead impact (#158)
- **Safe assumptions**: ExcelJS is already used by the On-grid parser.

## Task table

| # | Work | Owner | Depends on | Status |
|---:|---|---|---|---|
| 1 | [#154](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/154) Hybrid sheet read contract + edge cases (research) | agent | — | open (frontier) |
| 2 | [#155](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/155) Meaning of "lowest Excel price" for payback (grilling) | user + agent (+ owner) | 1 | blocked |
| 3 | [#156](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/156) Hybrid recommendation + battery choice rules (grilling) | user + agent | 1 | blocked |
| 4 | [#157](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/157) Public UI prototype (toggle + battery) | user + `ux-ui-expert` | 2, 3 | blocked |
| 5 | [#158](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/158) Data model / admin 2-sheet import / lead / impact (research) | agent | 1, 2, 3 | blocked |
| 6 | [#159](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/159) Sprint plan | `pm-expert` | 4, 5 | blocked |

## Definition of Done

- [ ] All child tickets closed with resolution comments; map Decisions-so-far indexed
- [ ] Sprint plan committed in `docs/plans/` and linked here
- [ ] Plan per sprint has:
  - [ ] สรุปก่อนแก้ / สรุปหลังแก้
  - [ ] DoD with verify skill
  - [ ] Implementer + independent reviewer
  - [ ] Commit messages
  - [ ] Rollback
  - [ ] Risk table
  - [ ] Release via runbook
  - [ ] Prod upload step
- [ ] No secrets in PLAN, INDEX, or GitHub comments
- [ ] `backlogs/INDEX.md` updated
