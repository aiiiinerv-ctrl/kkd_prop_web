# PLAN — ISSUE_122_ga_tracking_scripts_execution

> Dual SoT with GitHub `#122`. Follows from wayfinder map `#116` (closed).

## Meta

| Field | Value |
|---|---|
| GitHub | https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/122 |
| Opened | 2026-08-29 |
| Status (disk) | active — live triage status is GitHub labels |
| Triage labels | `ready-for-agent` |
| Type | enhancement (execution of wayfinder map #116) |

## Goal

Ship the admin-editable Google Analytics / Tracking Scripts config: `/admin/settings` tab + storage + audited server action + consent-gated public-page injection.

## Scope

- **In-scope**: `SiteSettings` schema addition, `updateAnalyticsSettings` action, new admin tab, `[locale]/layout.tsx` header/body injection, e2e + live-verify.
- **Out-of-scope**: structured GTM/Pixel fields, enable/disable toggle, `/admin/*` injection, auto-rewriting pasted HTML to inject `data-cookieyes` (admin adds it themselves).

## Checkpoint: Known / Unknown / Assumption

- **Known** (from map #116, tickets #117–#121): CookieYes attribute contract, body placement, rendering approach (`dangerouslySetInnerHTML`, no `next/script`), data model shape, admin UI design (live-verified prototype).
- **Unknown**: none — map fully charted before this issue opened.
- **Safe assumptions**: existing `SITE_REVALIDATE` array in `src/actions/site-settings.ts` needs no changes (already revalidates both locale layouts in full).

## Task table

| # | Work | Owner (agent / human) | Depends on | Parallel? | Status |
|---:|---|---|---|---|---|
| 1 | E1 — schema + action | `nextjs-dev` | — | — | done |
| 2 | E2 — admin UI tab | `nextjs-dev` | 1 | — | done |
| 3 | E3 — public injection | `nextjs-dev` | 1 | can run parallel with 2 | done |
| 4 | E4 — verify (build/e2e/live-verify) | `nextjs-dev` | 2, 3 | — | done — structural verify clean; consent-gating behavior has a known gap, see §3–4 below |
| 5 | Independent review (audit gate) | `audit-compliance-reviewer` | 4 | — | pending |
| 6.5 | **Follow-up (new)**: re-run pre/post-consent check against real `kkdproperty.co.th` production domain | User / `nextjs-dev` | production deploy | — | pending |
| 6 | Owner accept + close GitHub + move folder to `backlogs/done/` | User | 5, 6.5 | — | pending |

## Definition of Done

- [x] Behavior matches Goal — structurally (injection/placement/attribute); consent-gating behavior is production-only-verifiable, see gap below
- [x] Verify skill evidence attached (build + e2e; live-verify pre/post-consent structurally confirmed, behaviorally **not yet** confirmed — CookieYes domain-binding makes this untestable on `localhost`, needs a production check, see task 6.5)
- [ ] No secrets in PLAN, INDEX, or GitHub comments
- [ ] `audit-compliance-reviewer` finds no gaps
- [ ] GitHub issue #122 commented with outcome and closed
- [ ] This folder moved to `backlogs/done/` when closed
- [ ] `backlogs/INDEX.md` updated (link + one-line status)

## Evidence

### 1) Research

- Scope: fully covered by wayfinder map #116 (tickets #117–#121) — see `docs/plans/ga-tracking-scripts-implementation-sprints.md` for the consolidated decisions.

### 2) Fix / diagnosis

- No feature code changed in E4 (verify-only sprint). Confirmed E1–E3 build/structure are correct:
  - `npm run build`: `✓ Compiled successfully` + `Finished TypeScript` with zero errors.
  - `npm run start` (production mode) serving `/th`, `/en`, and `/admin/*` correctly.
  - Header script renders inside a literal `<head>` element (not nested `<script>`); body script renders as the first element inside `<body>` (ahead of `CookieYesScript`, `RefConsentCapture`, providers) — both confirmed via rendered HTML/DOM inspection with real saved snippets.

### 3) Quality

- Regression suite, all green: `scripts/e2e-booking.mts`, `scripts/e2e-admin.mts`, `scripts/e2e-admin-crud.mts` (run twice, clean both times, including after test-snippet cleanup).
- Live-verify (throwaway Playwright script, deleted after use — saved `<script data-cookieyes="cookieyes-analytics">console.log(...)</script>` snippets via the real `/admin/settings` Google Analytics tab, then loaded `/th` in a **fresh browser context with zero stored cookies/localStorage**, confirmed via `context.cookies()` returning `[]` for any `cky*`/`cookieyes*` cookie before the check):
  - **DOM/structural**: header + body script tags present in rendered HTML with correct placement. ✓
  - **Pre-consent behavioral**: both `kkd-e4-header` and `kkd-e4-body` fired **immediately** on first page load, before any interaction with a consent banner — and **no CookieYes banner rendered at all** (`.cky-consent-container`/`[class*='cky-']` not found in DOM; screenshot confirms no banner UI). CookieYes's `script.js` loaded successfully (`200`, no console errors/warnings), and a CookieYes global object was present on `window`, but it set **no consent cookie** and did not hold/block the tagged scripts.
  - **Post-consent**: no accept button existed to click (no banner rendered), so the post-consent path could not be exercised at all in this environment.
  - **Conclusion — consent-gating is NOT behaviorally verified working in this dev environment.** Only the structural contract (correct `data-cookieyes` attribute, correct DOM placement) is confirmed. The most likely cause, consistent with the plan's own risk note in `docs/plans/ga-tracking-scripts-implementation-sprints.md`, is the CookieYes account's domain registration (`kkdproperty.co.th`) not matching `localhost:3000` — CookieYes appears to load in a degraded/inactive mode on an unregistered domain (script loads, global object exists, but no banner and no cookie-based consent gating engages). **This must be re-verified against the real `kkdproperty.co.th` domain in production** before the consent-gating half of this feature can be called confirmed; the injection/placement half is confirmed.

### 4) Risk / follow-up

- Residual risk: raw script injection is a site-wide code-execution surface; mitigated by ADMIN-only access + audit trail (locked decisions #3, #4).
- **Known gap (must be closed before calling ticket #117 done)**: consent-gating behavior (pre-consent held / post-consent fires) is unverified on `localhost` due to a probable CookieYes domain-matching issue and could only be confirmed structurally here. Follow-up: after next production deploy, run the same pre-consent-fresh-session check (clear cookies for `kkdproperty.co.th`, load the page, check console before touching the CookieYes banner) directly against production.
