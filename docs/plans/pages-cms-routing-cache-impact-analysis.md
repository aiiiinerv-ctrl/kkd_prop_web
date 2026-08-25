# Pages CMS routing, cache, audit, i18n, and legacy Settings impact analysis

Date: 2026-08-25  
Wayfinder ticket: [Analyze routing, cache, audit, i18n, and legacy-settings impact](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/47)

## Status and scope

This is a pre-implementation decision asset. It identifies every known code and operational path affected by moving Home, About, Services, Packages, Portfolio, and Calculator under `/admin/pages`, and defines compatibility rules that the later data-model and implementation plans must preserve. It does not modify production routes, data, or UI.

The target admin routes are:

| Page | Canonical admin route | Public routes |
| --- | --- | --- |
| Home | `/admin/pages/home` | `/th`, `/en` |
| About | `/admin/pages/about` | `/th/about`, `/en/about` |
| Services | `/admin/pages/services` | `/th/services`, `/en/services` |
| Packages | `/admin/pages/packages` | `/th/packages`, `/en/packages` |
| Portfolio | `/admin/pages/portfolio` | `/th/portfolio`, `/en/portfolio` |
| Calculator | `/admin/pages/calculator` | `/th/calculator`, `/en/calculator` |

Each canonical route has a Content tab. ADMIN and MARKETING additionally receive a Properties tab. The four non-target pages—Booking, Contact, Testimonials, and Cookie Policy—retain their legacy SEO editor under `/admin/settings`.

## Executive finding

This is not a folder-only route move. The current paths are embedded in sidebar state, Server Action revalidation, browser-driven checks, and users' bookmarks. Page data also has reverse dependencies: Package changes affect Packages, Calculator, Home selections, and package details; Portfolio changes affect Portfolio and Home; Services and Testimonials may appear through page-owned featured references. Metadata changes affect the page head and, for robots changes, the sitemap.

The safe seam is one typed six-page registry that owns trusted page keys, canonical admin/public paths, locale paths, metadata defaults, and direct cache consumers. It must not become a generic page-builder registry or accept client-provided paths. Dynamic reverse dependencies such as Featured References must be resolved from database state at mutation time rather than hidden in static revalidation arrays.

## Current-state root causes

1. **Admin navigation reflects implementation history.** Services, Packages, Portfolio, About, and SEO were introduced as independent screens, so no page-level navigation or ownership boundary exists.
2. **Cache invalidation is action-local and incomplete.** Each entity action maintains its own static list. Package mutations omit Calculator and package details; the shared PageSeo invalidation list does not name several edited pages and currently depends on broad locale-layout invalidation.
3. **The audit abstraction assumes static consumers.** `auditedEntity()` accepts a synchronous `revalidate(row)` callback after commit. It cannot query reverse Featured Reference relationships by itself.
4. **Locale fallback has two different intended meanings.** Existing Content Items use `pickLocale()` for per-field EN-to-TH fallback, while the approved Page Content contract requires complete TH/EN records and permits message fallback only when the whole record is absent.
5. **The SEO write surface is wider than its future ownership.** `updatePageSeo(key, formData)` accepts all ten metadata keys and `/admin/settings` renders all ten forms. Merely adding six new Properties screens would create two writable sources for the same rows.
6. **Sitemap and metadata are currently code-owned separately.** `pageMetadata()` reads PageSeo, but `sitemap.ts` uses a fixed path list and does not consult robots state. The dormant `ogImageKey` is neither mutated nor rendered.
7. **Automated checks encode legacy routes.** `scripts/e2e-admin-crud.mts` navigates directly to the four old admin paths and tests the Settings SEO form. Redirect-only coverage would miss the new canonical pages and their authorization, cache, and tab behavior.

## Target route and compatibility contract

### Canonical routes and old-route redirects

Keep the four old route files as temporary authenticated compatibility shims:

| Legacy route | Temporary destination | Treatment |
| --- | --- | --- |
| `/admin/content/about` | `/admin/pages/about?tab=content` | server `redirect()` (temporary 307) |
| `/admin/services` | `/admin/pages/services?tab=content` | server `redirect()` (temporary 307) |
| `/admin/packages` | `/admin/pages/packages?tab=content` | server `redirect()` (temporary 307) |
| `/admin/portfolio` | `/admin/pages/portfolio?tab=content` | server `redirect()` (temporary 307) |

Use route-level Server Component redirects rather than `next.config.ts` redirects or Proxy logic. There are only four known paths; route-level redirects remain inside the existing admin routing/auth flow, are simple to remove after the compatibility window, and avoid a browser-cached 308 that would impede rollback. New canonical routes must still authorize their own reads and mutations; redirects are not an authorization boundary.

The current legacy screens do not own durable query-string state, so the shim should set only the trusted `tab=content` destination. It must not forward arbitrary query parameters. If an implementation later discovers a supported legacy deep-link parameter, it must be explicitly allow-listed and tested.

Do not redirect `/admin/settings`: it continues to own operational settings plus metadata for Booking, Contact, Testimonials, and Cookie Policy.

### Navigation and interaction state

- Replace the four flat content links with one Pages root containing six fixed children.
- The Pages parent is active for any canonical `/admin/pages/*` route; only the exact child is selected.
- `tab` accepts only `content | properties`. Missing or invalid values fall back to Content. A role that cannot read Properties must not receive Properties data and must be sent to Content if it supplies `tab=properties` directly.
- The desktop tree and mobile page selector use the same fixed registry and labels; no duplicate page arrays.
- Preview mode/drawer uses the canonical TH/EN public paths from the server-owned registry. It never treats a user-entered canonical override as an iframe/navigation target.
- Unsaved-state warnings must cover page changes, tab changes, locale-tab changes, browser navigation, and legacy redirect arrival. They must not imply that a save is a staged publish; approved Page Content remains immediate-save.

## Impact matrix

| Area | Current behavior | Required change | Compatibility/edge case | Verification evidence |
| --- | --- | --- | --- | --- |
| Admin route tree | Four unrelated existing routes; Home/Calculator absent | Add six canonical page routes; retain four temporary redirect shims | 307, not permanent 308; `/admin/settings` remains real | Authenticated requests to canonical routes; legacy URLs land on Content tab |
| Sidebar | Flat links; active state uses exact dashboard or `startsWith` | Pages parent + six children using one registry | Avoid sibling false positives and duplicate active items | Desktop and mobile active-state assertions |
| Admin reads | Services/Packages/Portfolio/About read Prisma directly in RSC | Preserve RSC reads; compose Content-tab data per page | Do not add GET APIs/TanStack Query solely for the route move | Render each canonical page with seeded data |
| TanStack Query | Used for filterable operational lists, not these editors | No change expected | New query cache would create unnecessary invalidation paths | Code review confirms no duplicate read channel |
| Content mutations | Existing audited actions revalidate old admin paths and selected public pages | Point admin targets at canonical routes; add every public consumer | A redirect does not refresh the canonical RSC route | Save and observe canonical admin plus all consumers |
| Featured References | Do not exist | Resolve referencing pages before/inside mutation flow and refresh them after commit | Unpublish skips but retains reference; delete is blocked, not cascaded | Multi-page reference mutation tests |
| Page Content | About partial DB fallback; other copy in messages | New complete paired records, record-level emergency fallback | Never globally change `pickLocale()` | Missing-row and incomplete-row tests in both locales |
| Page Properties | Ten keys writable in Settings; broad shared invalidation | Six-key page action and four-key legacy action; exact page/head targets | Old Server Action IDs may be stale during deploy; UI offers refresh/retry | Direct-call key rejection; rendered head in TH/EN |
| Audit | Full before/after snapshots; raw entity ID suffix in list | Preserve old audit rows; label new entities/fields; derive risk badges from diffs | No second audit writer; no secrets/blob bytes | CREATE/UPDATE plus high-risk diff rendering |
| Metadata | DB title/description then messages; code canonical/hreflang; no robots/OG image | Compose typed properties with safe defaults and same-locale paths | Missing OG blob falls back/omits safely; no raw head HTML | Rendered title, description, canonical, hreflang, OG, robots |
| Sitemap | Fixed public path list | Exclude six-page records with `index=false`; keep them crawlable | Sitemap invalidation only when index state changes; no robots.txt disallow | Sitemap before/after noindex transition |
| Legacy Settings | Ten metadata page tabs | Retain four pages only and link authorized users to moved Properties | Never leave two writable forms for the six moved keys | Settings contains exactly four legacy pages |
| E2E/scripts | Navigate to old routes and edit Home SEO in Settings | Exercise canonical pages, tabs, permissions, redirects, and moved Home Properties | Keep a focused redirect assertion during compatibility window | Updated admin CRUD/RBAC suites pass |
| Operations | Bookmarks/docs may reference old routes | Announce compatibility window; inventory internal docs/scripts | Server Action deployment skew can require reload | Production smoke using old and new URLs |

## Revalidation and dependency contract

### Static page registry

Create one server-safe, typed registry for exactly `home | about | services | packages | portfolio | calculator`. For each entry it owns:

- canonical admin path;
- TH and EN public paths;
- code-owned route path used for metadata defaults;
- whether the page supports Content and Properties;
- direct page-level cache targets and stable labels/keys.

The registry must not contain arbitrary database content, permissions decided by the client, or user-entered canonical values. Server Actions derive revalidation targets from the trusted key, never from FormData.

### Known consumer graph

| Mutation source | Direct public consumers that must refresh |
| --- | --- |
| Home Page Content | Home TH/EN |
| About Page Content | About TH/EN |
| Services Page Content | Services TH/EN |
| Packages Page Content | Packages TH/EN |
| Portfolio Page Content | Portfolio TH/EN |
| Calculator Page Content | Calculator TH/EN |
| Page Properties | Same page TH/EN head; sitemap only when robots index changes |
| Service item | Services TH/EN plus every page that references the Service |
| Package item | Packages TH/EN, Calculator TH/EN, affected `/[locale]/packages/[slug]`, plus every referencing page |
| Portfolio Project | Portfolio TH/EN, Home TH/EN when currently rendered/referenced, plus every referencing page |
| Testimonial | Testimonials/About/Home as currently consumed, plus every referencing page |
| Shared Site Content | Every public page that renders the changed shared section, in both locales |

Do not rely on Next.js's current broad side effect where a Server Function `revalidatePath()` may refresh previously visited pages. Every consumer is explicit. Route patterns use the documented `type` argument where required. Revalidation targets refer to route file paths, not rewritten display URLs.

`auditedEntity()` currently resolves static targets synchronously after the transaction. The implementation plan must choose a maintainable extension point for dynamic reverse dependencies. Acceptable shapes include resolving affected trusted page keys before mutation with a transaction-safe recheck, or extending the audited mutation seam to return/resolve post-commit consumers. It must retain the invariant that the mutation and Audit Log write are atomic, and it must not duplicate audit code in each action.

React `cache()` in `src/lib/content` is request memoization, not a substitute for route-cache invalidation. Portfolio is currently request-time dynamic because it consumes `searchParams`, but client Router Cache and admin navigation still require explicit refresh behavior.

## Locale and fallback contract

Do not change `pickLocale()` globally. Existing Content Items intentionally use its per-field EN-to-TH fallback, and current verification covers that behavior.

Page Content requires a separate strict view-model/helper:

1. Migration creates a complete TH/EN record from current messages before a public page switches to DB ownership.
2. If no Page Content record exists, the page uses the complete message-backed record as an emergency fallback.
3. If a record exists but a required locale field is missing, the mutation should have rejected it. A malformed legacy row is an operational/data-integrity error, not permission to mix TH and EN per field.
4. Visible optional sections require complete paired content; hidden sections may follow their declared optional-field contract.
5. Content Item localization semantics remain unchanged.

This separation prevents an English page from silently mixing Thai Page Content while avoiding a breaking migration of Service, Package, Portfolio, and Testimonial behavior.

## Legacy Settings and action boundaries

After the six canonical Properties screens ship:

- `/admin/settings` renders PageSeo forms only for `booking | contact | testimonials | cookiePolicy` (using the repository's canonical key spelling).
- It may show a concise notice and links to Pages for ADMIN/MARKETING, but it must not load or submit the six moved records.
- A dedicated six-key Page Properties action rejects every non-target key server-side.
- The legacy Settings SEO action accepts only the remaining four keys server-side. Hiding forms is insufficient because old clients can call deployed Server Actions directly.
- Shared contact/header/footer/payment/capacity settings stay where they are; the route must not be redirected or renamed as part of this effort.
- Deployment should tolerate an open old tab by returning a small actionable error asking the user to refresh when the action/key boundary changed. It must not accept the old write merely for convenience.

The split also removes the current `SITE_REVALIDATE` coupling where all PageSeo saves use one broad list. Each Properties save receives its exact trusted page targets; legacy pages receive their own exact targets.

## Audit impact and continuity

Route changes do not require rewriting historical AuditLog rows. Existing `AboutContent`, `Service`, `Package`, `PortfolioProject`, and `PageSeo` records remain meaningful and must continue rendering with their current Thai labels.

If the data-model ticket extends `PageSeo`, retaining `PageSeo` as the entity type preserves continuity. If it introduces a new Page Properties or Page Content entity, it must update together:

- `AuditEntityType` in `src/lib/audit.ts`;
- the exhaustive `AUDIT_ENTITY_LABELS` map;
- audit list/diff presentation and high-risk field labels;
- CRUD and audit E2E expectations;
- snapshot projection, explicitly excluding file bytes, secrets, filesystem paths, rejected inputs, and session data.

High-risk SEO badges are derived from before/after snapshots produced by the existing single transactional audit seam. Historic rows retain their old route-independent identity. The audit UI may show the page label from a trusted key in the snapshot instead of exposing only a truncated implementation ID, but unknown historic entity types must remain readable rather than crashing.

## Metadata, sitemap, and robots impact

- Continue using Next.js typed Metadata output. Never inject raw meta HTML.
- Resolve title/description/OG text within the same locale. Optional OG text falls back to same-locale SEO text.
- Store canonical overrides as validated `/th/...` and `/en/...` paths; combine them with configured `SITE_URL` on render.
- Generate canonical and hreflang from one normalized pair so they cannot contradict each other. `x-default` remains the trusted default-locale path.
- Render explicit robots index/follow values with safe initial defaults of true/true.
- Exclude a noindex page from sitemap but do not add it to `robots.txt` disallow; crawlers need access to observe noindex.
- Revalidate sitemap when—and only when—a successful mutation changes sitemap membership. A canonical or copy-only change refreshes the affected page head without unnecessarily regenerating sitemap data.
- Missing or corrupt OG files must not break the page response. Use the approved site fallback image or omit the image, and surface the problem in admin.

Package detail pages currently reuse Packages metadata as an override source. The implementation must decide explicitly whether page-level Package Properties changes should also refresh and influence detail-page metadata; until then, revalidate their route pattern on relevant Package/Packages metadata changes to avoid stale inherited titles.

## Failure, deployment, and rollback cases

| Case | Required behavior |
| --- | --- |
| User opens an old bookmark | Auth flow completes, then temporary redirect lands on the canonical Content tab |
| Unauthorized role supplies `?tab=properties` | No Properties data is returned; user lands on Content or receives server denial |
| Old Settings tab submits a moved page key after deploy | Server rejects with refresh guidance; no mutation, audit, blob, or revalidation |
| New save commits but revalidation fails | Database and audit remain committed; report operational failure/retry, do not claim rollback |
| Two editors save the same version | Second save conflicts; no lost update, second audit row, blob deletion, or cache change |
| Referenced item is unpublished | Public page skips it; admin retains reference with warning; affected pages refresh |
| Referenced item deletion attempted | Block with referencing page names/links; no cascade and no partial audit |
| Page Content row absent | Whole message-backed record renders in the requested locale |
| Page Content row partially malformed | Surface integrity warning/failure; do not mix locale fields silently |
| Rollback to old admin UI | Temporary 307s can be removed/reversed without cached permanent redirects; migrated data remains backward-readable until rollback window ends |
| Rollback after schema contraction | Forbidden during compatibility window; use additive schema and defer destructive column/table removal to a later verified migration |

## Required implementation order handed to later planning

1. Add and test the typed page registry and exact dependency graph without changing public ownership.
2. Make the schema migration additive, backfill complete TH/EN records and safe property defaults, and verify rollback readability.
3. Add canonical admin routes and shared page shell; keep old screens operational until canonical routes pass authorization and rendered checks.
4. Move Properties reads/writes for the six keys, then contract Settings to four keys in the same release boundary so there is never dual write ownership.
5. Switch Page Content one page at a time only after complete migration data and per-page fallback checks pass.
6. Update entity reverse-dependency invalidation, sitemap membership, audit labels, and all route-aware E2E scripts.
7. Enable temporary 307 shims, production smoke both old and new paths, then announce and later remove shims in a separately verified cleanup.

## Acceptance gates for dependent tickets

The data-model design is not ready to implement unless it can answer:

- how complete paired Page Content is represented and backfilled;
- how optimistic versions and atomic audit snapshots work;
- how Featured References are queried for reverse invalidation and delete blocking;
- whether existing PageSeo is extended or migrated while preserving four legacy rows;
- how additive migration and rollback retain old-reader compatibility.

The final verification plan must include production-mode, rendered assertions for both locales, direct server-action authorization/key rejection, canonical and legacy admin routes, Properties visibility by role, exact Settings ownership, audit diffs, stale-editor conflicts, reverse-reference invalidation, rendered metadata, and sitemap behavior.

## Next.js 16 constraints consulted

The bundled Next.js 16 documentation confirms the decisions above:

- `redirect()` from a Server Component produces a temporary redirect, while `permanentRedirect()` produces a permanent redirect.
- `next.config` redirects run before Proxy; therefore route-level compatibility pages keep this small migration inside the existing admin flow.
- `revalidatePath()` operates on route paths; dynamic patterns require a `page` or `layout` type.
- Current Server Function refresh behavior may affect previously visited pages, but it is explicitly temporary behavior and is not a dependency contract.

Implementation must re-check the same bundled documentation before writing route/cache code because this repository's Next.js version intentionally differs from older conventions.
