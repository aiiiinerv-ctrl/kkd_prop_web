# Google Analytics / tracking scripts config — implementation sprints

Date: 2026-08-29
Wayfinder map: [#116 — Google Analytics / tracking scripts config (header/body tag areas)](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/116)
Status: **Planned — ready for execution** (map fully charted, all 5 tickets resolved; not yet built)

## Destination (locked)

Admin gets a new **Google Analytics / Tracking Scripts** tab at `/admin/settings` with two raw HTML/script textareas — **Header tag area** and **Body tag area**. On save, the Header snippet is injected into `<head>` and the Body snippet immediately after `<body>` opens, on every **public-site page** (`[locale]` layout only — not `/admin/*`). Consent-gated through the existing CookieYes flow. ADMIN role only.

## Locked decisions

| # | Ticket | Decision |
|---|---|---|
| 1 | [#117](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/117) | CookieYes gates via `data-cookieyes="cookieyes-analytics"` attribute on each `<script>` tag (external or inline) — not `type="text/plain"`. Works regardless of plan tier. |
| 2 | [#118](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/118) | Body snippet inserts immediately after `<body>` opens — first child, before `{children}`/providers. Matches GTM/Pixel convention. |
| 3 | [#119](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/119) | Admin includes `data-cookieyes` themselves (help text instructs it) — no server-side HTML rewriting. Minimum-guard validation only (length cap, no sanitization). Rendered via `dangerouslySetInnerHTML` as Server Components (not `next/script`). App has no CSP anywhere — confirmed safe. |
| 4 | [#120](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/120) | Extend `SiteSettings` singleton with `headerScript String? @db.Text` / `bodyScript String? @db.Text`. No new model, no enable/disable toggle. |
| 5 | [#121](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/121) | Admin UI: guided numbered checklist + collapsible example snippet + live per-field "missing `data-cookieyes`" warning (Variant C), with one shared top warning banner (Variant B) instead of repeating placement/consent copy per field. Prototype captured on `prototype/121-ga-analytics-tab-ui` (not merged). |

## Root-cause / impact recap

- No legacy GA/gtag/GTM code anywhere in `src/` — clean-slate feature, no migration/removal risk.
- Direct precedent already in the codebase: `CookieYesScript()` in `src/app/[locale]/layout.tsx` (env-gated `next/script`, `beforeInteractive`) and the tabbed `SiteSettings` singleton + `src/actions/site-settings.ts` (`auditedEntity`, `revalidatePath`).
- `SITE_REVALIDATE` in `src/actions/site-settings.ts` already includes `["/th", "layout"]` / `["/en", "layout"]` — full layout revalidation is already wired; the new action just needs to reuse the existing `siteSettings` `auditedEntity` wrapper, no revalidate-path changes needed.
- Admin settings UI is Thai-only (no `next-intl` keys, hardcoded Thai strings) — no TH/EN parity work for this feature's own admin labels. The stored script content itself has no bilingual dimension (same raw code ships to both `/th` and `/en`).

## E1 — Schema + server action (data layer)

- `prisma/schema.prisma`: add `headerScript String? @db.Text` / `bodyScript String? @db.Text` to `SiteSettings`. `npx prisma migrate dev`.
- `src/lib/validations/site-settings.ts`: new `analyticsSettingsSchema` — both fields optional text, `.max(10000)` guard, no content sanitization (per decision #3).
- `src/actions/site-settings.ts`: new `updateAnalyticsSettings(formData)` server action — `requireRole("ADMIN")` (ADMIN only, not MARKETING, per the destination-locking decisions), reuses the existing `siteSettings` `auditedEntity` wrapper (`snapshot: "full"`) so the audit trail and `revalidatePath` list need no changes.
- Owner: `nextjs-dev`.

## E2 — Admin UI (production build, not the throwaway prototype)

- `src/app/admin/(dashboard)/settings/settings-client.tsx`: new "Google Analytics" tab, gated by the existing `showCapacity` (`role === "ADMIN"`) boolean — same pattern as the "นัดสำรวจ & ชำระเงิน" tab.
- Build clean per the winning prototype spec (decision #5): numbered checklist, collapsible example snippet (a working GA example with `data-cookieyes` already included), per-field char counter (max 10,000), live client-side warning when a pasted `<script>` lacks `data-cookieyes`, one shared top banner covering both the consent-gating requirement and the body-placement fact.
- **Do not resurrect the throwaway `?variant=` switcher or the other two variants from `prototype/121-ga-analytics-tab-ui`** — write the winning design clean.
- Wired to `updateAnalyticsSettings` from E1.
- Owner: `nextjs-dev`.

## E3 — Public injection

- `src/app/[locale]/layout.tsx`: read `headerScript`/`bodyScript` from `getSiteSettings()` (or equivalent existing content reader).
- Header snippet renders inside a `<head>` element in the root layout (Next.js App Router merges static `<head>` children from a root layout) via `dangerouslySetInnerHTML`.
- Body snippet renders as the **first child inside `<body>`**, before `{children}`/providers, also via `dangerouslySetInnerHTML` (per decision #2 + #3).
- Both render only in `[locale]/layout.tsx` — **not** `src/app/admin/layout.tsx` (public site only, per the locked destination scope).
- Owner: `nextjs-dev`.

## E4 — Verify + close

- Build (`npm run build && npm run start`) — catches proxy/static issues dev hides.
- `npx tsx scripts/e2e-admin-crud.mts` (or extend it) — exercises the new admin action + audit trail.
- Live-verify per `.claude/skills/verify/SKILL.md`: log in as ADMIN, save a real GA snippet with `data-cookieyes` on both fields, confirm on a public page that: (a) the header script tag is present in the rendered HTML, (b) the body script is the first thing after `<body>`, (c) before CookieYes consent the script is held (not executed), (d) after accepting consent it fires. This is the deferred "live-verify plan specifics" item noted in the map's fog — resolve it here, at execution time.
- Independent review: `audit-compliance-reviewer` (new mutation in `src/actions/`) since this is an admin mutation requiring `requireRole()` + `withAudit()` verification.
- `i18n-parity-checker`: not applicable — no new TH/EN message keys.
- Owner: `nextjs-dev` (build/e2e/live-verify), `audit-compliance-reviewer` (independent review).

## Definition of Done

- [ ] E1–E3 implemented
- [ ] Build green, e2e green
- [ ] Live-verify: pre-consent held, post-consent fires, header + body placement both correct on a real rendered page
- [ ] `audit-compliance-reviewer` finds no gaps
- [ ] GitHub execution issue (opened when this plan starts) commented with outcome and closed
- [ ] `backlogs/` PLAN moved to `done/`, `INDEX.md` updated

## Out of scope

- GTM/Pixel-specific structured fields (Measurement ID input, container ID input) — the field stays generic raw-script paste.
- Enable/disable toggle separate from clearing the field.
- Any change to `/admin/*` pages' own scripts — this feature only touches the public `[locale]` layout.
- Auto-rewriting pasted HTML to inject `data-cookieyes` automatically — the admin adds it themselves (decision #3).
