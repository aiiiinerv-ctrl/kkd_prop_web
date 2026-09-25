# PLAN — ISSUE_143_calculator_excel_import_map

> Dual source of truth with GitHub `#143` (wayfinder map). Decisions live in the child tickets; this PLAN only indexes them.

## Meta

| Field | Value |
|---|---|
| GitHub | https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/143 |
| Opened | 2026-09-25 |
| Status (disk) | done 2026-09-26 — map closed; sprint plan → [`docs/plans/calculator-excel-import-sprints.md`](../../../docs/plans/calculator-excel-import-sprints.md) |
| Triage labels | `wayfinder:map` |
| Type | wayfinder |

## Goal

- Sprint plan (committed in `docs/plans/`) ready to implement: admin uploads the On-grid Excel → preview + diff → confirm → public calculator recommends system size from the imported size table.
- Plan: [`docs/plans/calculator-excel-import-sprints.md`](../../../docs/plans/calculator-excel-import-sprints.md) — S0–S10 (~8.5 dev-days); after deploy public numbers stay identical to prod (legacy 3-row default, #150); the 31-size table goes live only when an ADMIN uploads + confirms on prod (S10).

## Scope

- **In-scope**: On-grid sheet only; header-label parser with file guards (xlsx magic, ≤2 MB, zip limits, no macro, ADMIN only, in-memory); size table per row (kW, phases 1/3 merged, sun hours, days, price/kWh, panels, roof m², billMin/billMax); rule = smallest size with `billMax > bill`; `sizeTable` JSON + `CalculatorImport` history (preview → apply, rollback = apply older, reset → legacy default); admin tab keeps ×10 + slider only (thresholds/sun/price removed from UI/zod/schema); public: no 3-zone labels, typed bill up to last billMax, tiles (panels/roof/kWh), special states, "ครอบคลุมค่าไฟเต็ม 100%"; TH/EN copy; payback still from Package prices; security: `/stuffs/` gitignored, `private/calculator-imports/` ADMIN-only attachment + nosniff, storage-engine contract, InnoDB DDL; fix "5kw kW".
- **Out-of-scope**: Hybrid sheet; runtime Excel formula evaluation; per-brand/Excel prices for payback; template export; DROP of legacy columns on prod (follow-up deploy); FAQ `a1` copy; deleting pre-existing dead i18n keys (`billRange*` …).

## Checkpoint: Known / Unknown / Assumption

- **Known**: `CalculatorConfig` singleton + ADMIN-only tab exist (#102); new reference file `stuffs/คำนวณติดตั้ง.xlsx` has 33 rows 3 kW–3 MW and shifted columns vs `docs/stuffs/…`; prod baseline in map Notes.
- **Unknown**: none blocking — resolved in #146 (rules), #147 (UI), #148 (model/impact), #150 (post-deploy default, no template). Plan-level defaults and source contradictions (C1–C5) are listed in the sprint plan.
- **Safe assumptions**: ExcelJS (already a dependency) parses the file — confirm on shared hosting in #145.

## Task table

| # | Work | Owner | Depends on | Status |
|---:|---|---|---|---|
| 1 | [#144](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/144) Live-verify admin baseline (task) | agent (browser) | — | done 2026-09-25 |
| 2 | [#145](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/145) Excel read contract + edge cases (research) | agent | — | done 2026-09-25 — [asset](research-145-excel-read-contract.md) |
| 3 | [#146](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/146) Recommendation rules (grilling) | user + agent | 2 | done 2026-09-25 |
| 4 | [#147](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/147) Public UI prototype | user + `ux-ui-expert` | 3 | done 2026-09-25 — keep production layout, minimal changes |
| 5 | [#148](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/148) Data model / audit / impact (research) | agent | 2, 3 | done 2026-09-25 — [asset](research-148-data-model-impact.md) |
| 5b | [#150](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/150) Default after deploy + template download (grilling) | user + agent | 5 | done 2026-09-25 |
| 6 | [#149](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/149) Sprint plan | `pm-expert` | 1, 4, 5, 5b | done 2026-09-25 — [plan](../../../docs/plans/calculator-excel-import-sprints.md) |

## Definition of Done

- [x] All child tickets closed with resolution comments; map Decisions-so-far indexed
- [x] Sprint plan committed in `docs/plans/` and linked here — [`calculator-excel-import-sprints.md`](../../../docs/plans/calculator-excel-import-sprints.md)
- [x] Plan has, per sprint: สรุปก่อนแก้ / สรุปหลังแก้ placeholder, DoD with verify-skill commands, implementing agent + independent reviewer, commit messages, rollback for risky sprints; risk table; S0 live baseline; release (S9) via runbook; post-deploy upload step (S10)
- [x] Follow-up issues opened: #151 (DROP legacy columns), #152 (FAQ `a1` copy)
- [x] No secrets in PLAN, INDEX, or GitHub comments
- [x] `backlogs/INDEX.md` updated
