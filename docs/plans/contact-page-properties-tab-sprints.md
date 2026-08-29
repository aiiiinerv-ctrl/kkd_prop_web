# Contact page Properties tab — implementation sprints

Date: 2026-08-29
Status: **Planned — ready for execution**

## Requirement (owner)

> ติดต่อเรา (Pages) tab Properties ไม่มี เพิ่มให้หน่อย

## Root cause (investigated)

- The "Pages Properties" (SEO/meta) admin feature is gated by `PAGE_KEYS` (`src/lib/pages/types.ts`) — currently exactly `home | about | services | packages | portfolio | calculator`, matching the security contract documented in `docs/plans/pages-cms-properties-security-guardrails.md` line 56.
- Contact isn't in that set because its **content** lives in the shared `SiteSettings` singleton (not a per-page Content aggregate) — deliberate, per the comment in `contact-admin-shell.tsx`. That reasoning is correct for *content*, but not for *properties*: `PageSeo` (the SEO/meta table) already has a row for `key: "contact"` (seeded), and `META_KEYS` in `src/lib/seo.ts` already lists `"contact"` as a valid SEO key — the DB and metadata-resolution side is fully ready.
- `PageRegistryEntry` (`src/lib/pages/types.ts`) already models content and properties as **independent capability flags** (`supportsContent`/`adminContentEnabled` vs. `supportsProperties`/`propertiesAdminEnabled`) — this is exactly the extension point needed, no new parallel registry required.
- Also true today, unrelated to this task: `booking`, `testimonials`, `cookiePolicy`, `sitemap` have the same gap (valid `META_KEYS`, no properties admin UI) — **out of scope**, not requested, not touched.

## Plan

Add `"contact"` to `PAGE_KEYS` as a **properties-only** entry: `supportsContent: false`, `adminContentEnabled: false` (contact's actual content editing stays on its existing bespoke `ContactContentClient` UI, untouched), `supportsProperties: true`, `propertiesAdminEnabled: true`. Reuse the existing `PagePropertiesPanel` component and `updatePageProperties` action as-is — both already branch on entry capability flags, not a hardcoded key list.

## Sprints

### E1 — Registry + security contract

- `src/lib/pages/types.ts`: add `"contact"` to `PAGE_KEYS`. Update the module comment (no longer strictly "six pages" for the registry as a whole — clarify it's six pages for *content*, seven keys including contact for *properties*).
- `src/lib/pages/registry.ts`: add a `contact` entry to `PAGE_REGISTRY` — `adminContentPath: ""` (unused, content disabled), `publicPaths: ["/th/contact", "/en/contact"]` (used for properties revalidation), `contentRollout: "legacy"`, `adminContentEnabled: false`, `propertiesAdminEnabled: true`, `supportsContent: false`, `supportsProperties: true`, `contentRoles: []` (unused), `propertiesRoles: ["ADMIN", "MARKETING"]` (matching the other 6).
- `docs/plans/pages-cms-properties-security-guardrails.md` line 56: update the documented trusted-enum from `home | about | services | packages | portfolio | calculator` to include `contact` — this file **is** the security contract, must stay accurate to what the server actually trusts.
- Verify `contentRevalidatePaths()`/`pageContentRevalidateTargets()` (content-only functions) still work correctly when called with a `supportsContent: false` entry — they should never be called for `"contact"` in practice (no content admin UI wired to it), but the type-level exhaustiveness should not silently produce garbage paths. Confirm `[page]/page.tsx`'s dynamic content route (`isPageKey` gate) still fails closed for `"contact"` — the whole point is content stays on the bespoke shell, not the generic `[page]` route.

### E2 — Contact admin UI

- `src/app/admin/(dashboard)/pages/contact/contact-admin-shell.tsx`: add a "Properties" tab following the exact pattern already used in `about-admin-shell.tsx` (import `PagePropertiesPanel` from `../home/home-properties-panel`, add `TabsTrigger`/`TabsContent` for `"properties"`, gate on `canMutateProperties`).
- `src/app/admin/(dashboard)/pages/contact/page.tsx`: fetch the `"contact"` `PageSeo` row and `canMutateProperties` (role check), pass through to the shell — same shape as `about/page.tsx`.

### E3 — Verify

- `npm run build`.
- Live-verify: log in as ADMIN, open `/admin/pages/contact`, confirm "Properties" tab renders, edit title/description, save, reload, confirm persisted.
- Confirm `https://kkdproperty.co.th/th/contact` (after deploy) or local `/th/contact` reflects the new meta title/description in rendered `<head>`.
- Confirm `/admin/pages/contact` still does **not** route through the generic `[page]` dynamic content route (content stays on the bespoke shell) — no regression to the deliberate content/properties split.
- `i18n-parity-checker` not applicable (no new message keys — Properties fields are DB-driven, not `next-intl`).

## Out of scope

- `booking`, `testimonials`, `cookiePolicy`, `sitemap` Properties tabs — same underlying gap, not requested here.
- Any change to Contact's *content* editing (stays on `ContactContentClient`/`SiteSettings`, untouched).
