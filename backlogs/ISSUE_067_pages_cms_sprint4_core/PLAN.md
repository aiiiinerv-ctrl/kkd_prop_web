# PLAN — ISSUE_067_pages_cms_sprint4_core

> Dual source of truth with GitHub `#67`.

## Meta

| Field | Value |
|---|---|
| GitHub | https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/67 |
| Opened | 2026-08-28 |
| Status (disk) | active — ready for implementation after defaults below |
| Triage labels | `enhancement`, `ready-for-agent` |
| Type | enhancement (Pages CMS Sprint 4 execution) |

## Goal

- One code-owned six-page registry + shared admin shell + validated `actions/pages` seam.
- Keep every **non-Home** production page on legacy ownership; Home pilot stays live.
- Evidence under `docs/plans/assets/pages-cms-result/s04-pages-core/`.

## Locked decisions (2026-08-28)

| ID | Decision |
|---|---|
| S4-A | **Home stays** `contentRollout: "pages"` (post-H3 truth). Mother plan “all six legacy” is superseded by Home pilot. Other five keys register as `legacy`. |
| S4-B | **No new DDL / backfill.** Sprint 3 data already live (#66). |
| S4-C | **Reuse H2 UI patterns** from `pages/home/home-client.tsx`; extract shared shell — no UX redesign sprint. Skip `ux-ui-expert` unless implementer hits a blocking shell gap. |
| S4-D | **Nav:** keep existing “หน้าแรก (Pages)” link; do **not** add a parent Pages tree listing dormant pages until each page’s cutover sprint. |
| S4-E | **Deploy:** local green first; production redeploy only with owner OK (refactor must not regress Home). |
| S4-F | **`HomeFeaturedPortfolioProject` still deferred** (same as #66 A2). |
| S4-G | Prefer moving registry into `src/lib/pages/` (deep module) and re-export/adapt Home callers; keep `auditedAggregate()` as the single aggregate seam (extend bounds/docs only if needed). |

## Scope

- **In-scope** — mother Sprint 4, adjusted for Home pilot:
  - Expand registry to `home \| about \| services \| packages \| portfolio \| calculator`
  - Validations under `src/lib/validations/page-content/` (+ Properties)
  - Server readers/actions under `src/actions/pages/` (and migrate Home action behind shared helpers where safe)
  - Shared admin components; dynamic `admin/pages/[page]` fail-closed for non-enabled admin surfaces
  - Verify scripts + axe dependency per live-verification matrix
  - Preserve `/admin/pages/home` Content save path
- **Out-of-scope**
  - Sprint 5 Home “tracer” extras already partly done (hero upload lifecycle refinements, Featured Portfolio, Properties cutover from Settings) — only if required for shell contracts; otherwise leave to Sprint 5 ticket
  - Public cutover for About/Services/Packages/Portfolio/Calculator
  - Dual writers / flipping non-Home readers
  - Production mutation suites against live DB

## Checkpoint: Known / Unknown / Assumption

- **Known:** `#66` closed; `auditedAggregate()` + `src/lib/pages-registry.ts` (home only) + `/admin/pages/home` live; About remains `/admin/content/about`.
- **Unknown:** none blocking start (defaults S4-A…G locked).
- **Safe assumptions:** dormant registry keys with no admin UI exposure cannot mutate production content; Home public reader still branches on registry flag.

## Task table

| # | Work | Owner | Depends on | Parallel? | Status |
|---:|---|---|---|---|---|
| 1 | Inventory + extract `src/lib/pages/` registry (6 keys) | `nextjs-dev` | — | ✅ | **done** |
| 2 | Validations `page-content/` + Properties schemas | `nextjs-dev` | 1 | ✅ w/ 3 after 1 | **done** |
| 3 | Bound aggregate audit docs/helpers if needed; keep Home consumer green | `nextjs-dev` | 1 | ✅ | **done** (reused `auditedAggregate`; Home uses `contentRevalidatePaths`) |
| 4 | `src/actions/pages/` seam + Home adapter | `nextjs-dev` | 2, 3 | — | **partial** — Properties seam fail-closed; Home still `home-content.ts` |
| 5 | Shared admin shell components + `[page]` fail-closed route | `nextjs-dev` | 1 | ✅ w/ 2–3 | **done** (shell MVP; preview/unsaved deferred) |
| 6 | Wire Home UI onto shared shell without regressing fields | `nextjs-dev` | 4, 5 | — | **done** (`PageShell`) |
| 7 | Verify scripts + axe fixture pass; evidence `s04-pages-core/` | `nextjs-dev` | 6 | — | **partial** — model script green; axe + full e2e pending |
| 8 | `audit-compliance-reviewer` on new/changed actions | reviewer | 4, 6 | — | pending |
| 9 | `i18n-parity-checker` only if `messages/*` touched | checker | 6 | — | skip (no messages) |
| 10 | Close #67; PLAN → `done/`; INDEX | agent | 7–9 | — | pending |

Executable breakdown: `docs/plans/pages-cms-sprint4-pages-core-tasks.md`

## Definition of Done

- [ ] Six-key registry module; Home `pages`, others `legacy`
- [ ] Shared shell + fail-closed dormant admin routes
- [ ] Actions use registry + `auditedAggregate` / existing seams; denial matrix green
- [ ] Model + axe + keyboard checks recorded under `s04-pages-core/`
- [ ] Home admin save still one version + one audit; public Home unchanged
- [ ] Reviewers pass; #67 closed; PLAN moved to `done/`
- [ ] No secrets in PLAN / issue comments

## Evidence

### 1) Research

- Mother: `docs/plans/pages-cms-implementation-sprints.md` Sprint 4
- Matrix: `docs/plans/pages-cms-live-verification-matrix.md`
- Home H2: `#62` / `backlogs/ISSUE_062_home_cms_h2_admin/PLAN.md`
- Sprint 3 unlock: `#66`

### 2) Fix / diagnosis

- Pending implementation

### 3) Quality

- Pending verify pack

### 4) Risk / follow-up

- Refactor risk on live Home — gate with build + e2e-admin + Home ad hoc save
- Sprint 5+ must enable nav children only when that page’s admin surface is ready
