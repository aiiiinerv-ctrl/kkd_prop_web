# PLAN — ISSUE_122_ga_tracking_scripts_execution

> Dual SoT with GitHub `#122`. Follows from wayfinder map `#116` (closed).

## Meta

| Field | Value |
|---|---|
| GitHub | https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/122 |
| Opened | 2026-08-29 |
| Status (disk) | **done** — deployed to production 2026-08-29 |
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
| 5 | Independent review (audit gate) | `audit-compliance-reviewer` | 4 | — | done — 1 moderate finding fixed, 1 informational accepted, 3 clean |
| 6.5 | Re-run pre/post-consent check against real `kkdproperty.co.th` production domain | User | production deploy | — | done — see §6 below; root cause found, not this feature's bug |
| 6 | Owner accept + close GitHub + move folder to `backlogs/done/` | User | 5, 6.5 | — | done |

## Definition of Done

- [x] Behavior matches Goal — schema/action/UI/injection all shipped and confirmed live in production; the attribute-based consent-gating *contract* is implemented correctly, see §6 for the account-level caveat
- [x] Verify skill evidence attached (build + e2e; live-verify done in both dev and production — see §6)
- [x] No secrets in PLAN, INDEX, or GitHub comments
- [x] `audit-compliance-reviewer` finds no gaps — 1 moderate finding, fixed (commit `ca1b921`); 1 informational, accepted as inherent to the locked no-sanitization decision (see §5 below)
- [x] GitHub issue #122 commented with outcome and closed
- [x] This folder moved to `backlogs/done/` when closed
- [x] `backlogs/INDEX.md` updated (link + one-line status)

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

### 5) Independent review (E5, `audit-compliance-reviewer`)

- **Finding 1 (moderate, fixed — commit `ca1b921`)**: `src/app/admin/(dashboard)/settings/page.tsx` gates `bookingCapacity`/`paymentSettings` behind `isAdmin` before fetching, but `siteSettings.headerScript`/`bodyScript` were being serialized into `SettingsClient`'s props for any `ADMIN|MARKETING` session even though the write path is ADMIN-only and the tab is only hidden client-side — a MARKETING session could read the raw script content from the RSC payload. Fixed by withholding both fields at the serialization boundary unless `isAdmin`, matching the established pattern.
- **Finding 2 (informational, accepted)**: the audit log's `snapshot: "full"` on the shared `siteSettings` `auditedEntity` means an admin who mistakenly pastes something sensitive (e.g. a vendor snippet embedding a write-scoped key) into the script fields would have it land verbatim in `AuditLog`. This is inherent to the locked "no content sanitization" decision (#3 in `docs/plans/ga-tracking-scripts-implementation-sprints.md`) and not fixable without contradicting that decision — accepted as a residual risk of admin error, not a code defect.
- **Findings 3–5 (no violation)**: auth-guard ordering and audit transaction correct; no alternate write path bypasses ADMIN gating for these two columns (checked every `prisma.siteSettings` write site in the repo); public-render side (`getSiteAnalyticsScripts()`, `[locale]/layout.tsx`) correctly no-ops on empty fields and stays confined to the public site.
- **Follow-up verification (done, not a code issue)**: the reviewer also flagged a *possible* duplicate-`<head>`/metadata-clobbering risk from combining `export const metadata` with a manually-rendered `<head>` element in the same root layout — worth a direct check given Next 16's App Router differences. Verified directly (dev server, real DB value, curl + parse): single `<head>` tag, `<title>` renders correctly, injected header script appears as the first child. Not a bug — no action needed.

### 6) Production deploy + consent-gating resolution (2026-08-29)

- **Deploy**: schema DDL applied via phpMyAdmin (human, idempotent `ADD COLUMN IF NOT EXISTS`) → build (`scripts/build-shared-hosting-deploy.mts`, BUILD_ID `DWgjGsyVxnH0gMtSL3Ej3`) → FTP upload (human via `!`, `226 File successfully transferred`, byte count matched) → extract (`File Extracted`, HTTP 200) → Passenger restart (HTTP 302) → health checks all green (`/th`/`/en` 200, `/api/admin/leads` 401 not 500, `/admin/settings` 307) → `npx tsx scripts/smoke-test-production.mts` all ✓. DB snapshot skipped by owner decision — migration is purely additive/nullable, no data-loss risk.
- **Feature verified live on real production**: logged into `https://kkdproperty.co.th/admin/settings` as ADMIN, saved real test snippets, confirmed persistence after reload, confirmed both scripts render on `https://kkdproperty.co.th/th` in the correct `<head>`/body-first positions.
- **Consent-gating check — root cause found, not a bug in this feature**: from a fresh incognito session on the real `kkdproperty.co.th` domain, both test scripts fired immediately and **no consent banner appeared at all**. This ruled out the E4 hypothesis (CookieYes domain-mismatch on `localhost`) — the real cause is that this site's CookieYes account has `applicable_laws: ["gdpr"]` only (CCPA banner `inactive`), and CookieYes's GDPR banner + blocking only activates for visitors it detects as EU/EEA. A Thai visitor gets no banner and no gating at all, for this feature or any other tracking script on the site, by the account's existing configuration — this predates and is outside the scope of #116/#122.
- **This feature's own implementation is correct**: the `data-cookieyes="cookieyes-analytics"` attribute contract (ticket #117) is implemented exactly as CookieYes documents it. Whether CookieYes actually gates for a given visitor is entirely an account-level configuration question, not something this feature's code controls.
- **Filed separately**: [#123 — CookieYes account has no PDPA/Thailand consent banner](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/123), for the site owner to decide (needs a plan check — CookieYes Free may support only one active law/banner, see #38's related precedent).
- Test snippets cleared from production after verification — confirmed via curl, no test markers remain live.
