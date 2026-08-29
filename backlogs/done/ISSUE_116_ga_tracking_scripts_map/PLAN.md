# PLAN — ISSUE_116_ga_tracking_scripts_map

> Dual SoT with GitHub `#116` (wayfinder map).

## Meta

| Field | Value |
|---|---|
| GitHub | https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/116 |
| Opened | 2026-08-29 |
| Status | **closed** — charted 2026-08-29, all 5 tickets resolved, sprint plan signed off, execution [#122](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/122) |
| Labels | `wayfinder:map` |
| Type | wayfinder |

## Goal

Chart the route to an admin-editable "Google Analytics / Tracking Scripts" tab — no production code in this map, planning only until the frontier is clear.

## Requirement (owner)

> ในระบบหลังบ้าน เพิ่ม tab config google analytics มี tag area คือ header, body — นำค่าที่อยู่ใน tag area ของ header ไปแทรกไว้ใน header ของทุกๆหน้า นำค่าที่อยู่ใน tag area ของ body ไปแทรกไว้ใน body ของทุกๆหน้า

## Destination decisions locked (AskUserQuestion, 2026-08-29)

| Question | Decision |
|---|---|
| Content type | Raw HTML/script paste (generic — not GA-specific parsing) |
| Consent gating | Must be gated through the existing CookieYes flow |
| Page scope | Public site (`[locale]` layout) only — not `/admin/*` |
| Access role | ADMIN only (not MARKETING) |

## Root-cause / impact check (this session)

- No legacy GA/gtag/GTM code found anywhere in `src/` — clean-slate feature, no migration concerns.
- Direct precedent exists: `CookieYesScript()` in `src/app/[locale]/layout.tsx` (env-gated `next/script`, `beforeInteractive`, documented `.env.production` build-time gotcha) and the tabbed `SiteSettings` singleton + `src/actions/site-settings.ts` (`auditedEntity`, `revalidatePath`) — both are the shape this feature should follow.

## Ticket frontier

| Ticket | Type | Status |
|---|---|---|
| [#117 CookieYes consent-gating mechanism](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/117) | research | **resolved & closed** — `data-cookieyes="cookieyes-analytics"` attribute on each `<script>` tag |
| [#118 Body-tag insertion point](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/118) | grilling | **resolved & closed** — immediately after `<body>` opens |
| [#119 Trust boundary + rendering approach](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/119) | grilling | **resolved & closed** — admin sets `data-cookieyes` attr; `dangerouslySetInnerHTML` |
| [#120 Data model shape](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/120) | grilling | **resolved & closed** — extend `SiteSettings` with `headerScript`/`bodyScript` |
| [#121 Prototype: admin UI](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/121) | prototype | **resolved & closed** — C base + B banner; prototype on `prototype/121-ga-analytics-tab-ui` |

**All 5 tickets resolved. Frontier is empty — map is fully charted.** One QA-level item remains noted (not blocking): the exact pre/post-consent browser check for execution-time live-verify — deferred to execution, not a design decision.

## Scope

- **In-scope**: admin config tab, storage, public-page injection (header + body), CookieYes consent-gating, audit trail, ADMIN-only access, live-verify.
- **Out-of-scope**: not yet declared — nothing has been ruled out of the destination yet.

## Definition of Done (for this map)

- [x] All frontier tickets resolved, no tickets left in "Not yet specified" fog
- [x] `docs/plans/*.md` sprint-structured implementation plan drafted from the resolved decisions — [`docs/plans/ga-tracking-scripts-implementation-sprints.md`](../../docs/plans/ga-tracking-scripts-implementation-sprints.md) (E1–E4)
- [ ] Owner sign-off on the plan
- [ ] Map issue #116 closed, execution tracked as a fresh issue (per this repo's wayfinder pattern — map closes, execution is separate)

## Evidence

### 1) Research

- Scope: admin backend config surface, public page injection, consent flow
- Files explored: `prisma/schema.prisma` (SiteSettings + all admin models), `src/app/admin/(dashboard)/settings/`, `src/actions/site-settings.ts`, `src/app/[locale]/layout.tsx`, `src/app/admin/layout.tsx`
- Current state: no existing GA/tracking-script feature; CookieYes consent banner already live via env-var-gated script in the public root layout only
- Constraints: two separate root layouts (public vs admin) with no shared code; public layout has `revalidate = 300` but admin mutations already call `revalidatePath`; shared-hosting build pipeline has a known env-var static-optimization gotcha (not directly applicable here since this is DB-stored, not env-var, but the same layout file)

### 4) Risk / follow-up

- Residual risk: raw script injection is inherently a site-wide code-execution surface; mitigated by ADMIN-only access + audit trail, exact hardening decided in ticket #119
- Follow-up: none yet — map still open
