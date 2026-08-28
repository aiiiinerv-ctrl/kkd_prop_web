# Research: Contact settings impact analysis

Date: 2026-08-28  
Wayfinder ticket: [Research: Contact settings impact analysis](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/91)  
Map: [Map: Contact settings — admin แก้ติดต่อ/โซเชี่ยล](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/88)

Related: [`contact-settings-enhancement-inventory-research.md`](contact-settings-enhancement-inventory-research.md) (#89)

No code was changed.

## Question answered

If we complete map #88 (public parity: admin Settings → contact page + footer + consumers), what must change, what stays, deploy risk, and test surface?

## Executive finding

Impact is **wire-up only** — no new models, no registry change, no Pages CMS cutover.

| Tier | Scope | DDL | Deploy risk |
| --- | --- | --- | --- |
| **E1 — Contact page parity** | Refactor `contact/page.tsx` to use `socialLinks` + email | **None** | **Low** |
| **E2 — Fallback + JSON-LD + Home duplicate** | Policy alignment, optional Home UX, jsonld fields | **None** unless grilling adds address columns | **Low** |
| **E3 — Verify + e2e** | Matrix, extended e2e, design review | None | **Low** |

**Independent of:** Pages CMS Sprint 12 (#76), About enhancement (#77), Home CMS H3 (already live).

---

## Impact matrix

| Area | Current | Impact | Must change | If skipped |
| --- | --- | --- | --- | --- |
| **Prisma / DDL** | `SiteSettings` singleton complete | None for stated requirement | — | N/A |
| **Admin Settings tab** | Full contact + social form | None unless UX clarity from #94 | Copy/helper only | Owner thinks feature missing |
| **Admin Home ContactSection** | Subset duplicate | Optional: link/remove per #93 | `home-client.tsx` | Confusion persists |
| **`updateContactSettings`** | Audited, zod, revalidate | Unchanged unless new fields | — | N/A |
| **`SiteSettingsView` / `toSiteSettingsView`** | `socialLinks` array built | Maybe export icon metadata helper shared with contact | Optional shared util | Duplicate icon maps |
| **Footer** | Already wired | None for parity | — | Reference impl |
| **Contact page** | Partial wire | **Primary change** | `contact/page.tsx`; maybe shared social icons | Requirement unmet |
| **Layout / header** | CTA from settings | None | — | — |
| **JSON-LD** | Partial hardcode | Optional E2: address/hours from DB text | `local-business-jsonld.tsx` | SEO stale vs visible site |
| **Home content** | FALLBACK constants | E2: align with fallback policy | `home-content.tsx` | Inconsistent when DB null |
| **Booking** | phone/line fallbacks | E2 optional | `booking/page.tsx`, `booking-forms.tsx` | — |
| **FAQ section** | lineUrl prop | None if home passes correct URL | — | — |
| **Messages / i18n** | Labels + fallbacks | Keep keys; no new keys unless display policy changes | `th.json`/`en.json` only if new labels | Parity checker if keys added |
| **Audit UI** | `SiteSettings` entity | No change | — | — |
| **Revalidation** | `SITE_REVALIDATE` in `site-settings.ts` | Sufficient for contact/footer/layout | None | Stale ≤ layout cache |
| **E2E admin CRUD** | Phone → footer only | Extend: social/email → `/th/contact` + footer icons | `e2e-admin-crud.mts` | Regression undetected |
| **E2E home CMS** | Home contact RBAC | Unchanged unless Home section removed | — | — |
| **verify-content.mts** | No SiteSettings unit tests | Optional: `toSiteSettingsView` social filter fixture | `scripts/verify-content.mts` | Mapper bugs |
| **Backup / restore** | `SiteSettings` in backup models | None | — | — |
| **Prod deploy** | SiteSettings row likely exists post site-content-cms | Routine redeploy; **no DDL** | Runbook incremental | Old code ignores new render paths |
| **Static preview / Firebase** | May lag | Note if contact parity matters there | — | Preview stale |

---

## File touch list (indicative — post #93 sign-off)

### E1 minimum

| File | Change |
| --- | --- |
| `src/app/[locale]/contact/page.tsx` | Build items from `settings` + `socialLinks`; add email card |
| Optional: `src/components/site/social-icons.tsx` | Share SVG icons with footer (maintainability) |

### E2 optional

| File | Change |
| --- | --- |
| `src/app/[locale]/home-content.tsx` | Remove/centralize FALLBACK_* |
| `src/app/[locale]/booking/page.tsx` | Same |
| `src/components/site/site-footer.tsx` | Fallback policy per #93 |
| `src/components/site/local-business-jsonld.tsx` | Wire address/hours |
| `src/app/admin/(dashboard)/pages/home/home-client.tsx` | Link to Settings vs remove ContactSection |
| `scripts/e2e-admin-crud.mts` | Contact page + social asserts |

### E3

| Asset | Change |
| --- | --- |
| `docs/plans/contact-settings-enhancement-live-verification-matrix.md` | Acceptance rows |
| `.claude/skills/verify/SKILL.md` loop | Full verify |

---

## Rollback posture

- **Code rollback:** Revert deploy bundle — public reverts to partial contact (current production behavior)
- **Data rollback:** Not needed — no schema change
- **Risk:** Low; changes are presentational reads of existing columns

---

## Observation / compatibility

- Existing admin saves remain valid — no migration
- MARKETING role path unchanged
- TH/EN `pickLocale` unchanged for address/hours/titles
