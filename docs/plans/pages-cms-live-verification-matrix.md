# Pages CMS live web-view and regression verification matrix

Date: 2026-08-25  
Wayfinder ticket: [Define the live web-view and regression verification matrix](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/49)

## Status and purpose

This is the acceptance contract for implementing the six-page Pages CMS. It defines what must be proven in a production build, what evidence must be captured in a real browser, and what may be checked safely against the deployed site. It does not change application code or production data.

The existing rendered baseline is authoritative and already captured in [`pages-cms-current-state-inventory.md`](pages-cms-current-state-inventory.md) under `docs/plans/assets/pages-cms-baseline/`: twelve TH/EN public screenshots plus About, Services, Packages, Portfolio, and centralized Settings/SEO admin screenshots at 1440px. Implementation must compare against this baseline rather than creating a new “before” after code changes begin.

Passing `next build`, receiving HTTP 200, or inspecting source alone is insufficient. Completion requires all applicable automated checks, production-mode browser behavior, sanitized visual evidence, database/storage recovery evidence, and read-only deployed-site smoke checks.

## Verification environments and safety boundary

| Environment | Purpose | Writes allowed | Evidence allowed in repository |
| --- | --- | --- | --- |
| Dedicated local MySQL + temporary storage | Schema, backfill, mutation, conflict, audit, upload, delete-blocking, restore, and destructive failure tests | Yes, only isolated fixtures | Sanitized logs, fixture IDs, screenshots |
| Local `next build` + `next start` | Canonical acceptance environment for admin/public browser flows and cache behavior | Yes, only isolated fixtures | Full result evidence |
| Production-shaped restore clone | InnoDB conversion, migration, rollback-build, and backup/restore drills | Yes, clone only | Sanitized queries/counts; never copied customer rows/content |
| Deployed `kkdproperty.co.th` | Read-only smoke and public live-render confirmation | No automatic mutation, upload, backfill, or cleanup | Public-page screenshots and redacted status/head summaries only |

Never run Pages CMS mutation suites against the default development database or production. The orchestrator must require a test-only database name and a temporary `STORAGE_ROOT`, fail closed if either points at a normal environment, and clean up only its validated targets. Test data uses seeded local role accounts and synthetic public content; it never imports production Leads, payment slips, credentials, or customer images.

Authenticated production screenshots are not committed. Even a content-only admin page may reveal actor identity, internal warnings, or session-dependent information. Admin visual evidence comes from the local production build with seeded accounts. Production public screenshots contain no overlays, cookies, secrets, or request headers.

## Evidence package

Each implementation sprint writes its result evidence under a sprint-specific directory such as:

```text
docs/plans/assets/pages-cms-result/<sprint>/
├── manifest.md
├── automated-checks.txt
├── public-desktop/
├── admin-desktop/
├── responsive/
└── states/
```

`manifest.md` records:

- commit SHA, date/time/time zone, database seed version, build command, Next/Chrome versions;
- environment (`local production build` or `deployed public read-only`), base URL, locale, route, viewport, and screenshot filename;
- which baseline image is being compared and whether the expected result is visual parity or intentional change;
- pass/fail plus a short human observation—never “looks good” without naming what was inspected;
- every skipped check and why;
- sanitized command output references; no `.env`, cookies, auth headers, local absolute storage paths, or real personal data.

Do not silently replace baseline images. A deliberate baseline change requires an explanation in the result manifest and review of both locales. Pixel diff may be included as advisory evidence, but it is not the acceptance oracle: fonts, anti-aliasing, image decoding, and dynamic content can create noisy pixels. Semantic DOM assertions and human side-by-side review decide pass/fail.

## Deterministic capture protocol

All comparable screenshots use system Chrome, the local production build, a fixed seeded database, and these capture rules:

1. Desktop public/admin: viewport 1440 × 1000; public screenshots are full-page.
2. Tablet representative flows: 768 × 1024.
3. Mobile representative flows: 390 × 844.
4. Set `prefers-reduced-motion: reduce`, wait for `document.fonts.ready`, network idle, and image decode completion.
5. Dismiss or preserve the consent banner consistently with the baseline comparison being made.
6. Scroll through full pages before capture so Reveal/IntersectionObserver sections reach their final state, then return to the top.
7. Freeze fixture dates/order and avoid timestamps, toasts, carets, hover states, and random IDs in comparison screenshots unless that state is the subject.
8. Capture the DOM/metadata assertions before the screenshot so a visually plausible error page cannot pass.

### Minimum result screenshots

#### Public desktop

Capture full-page TH and EN results for Home, About, Services, Packages, Portfolio, and Calculator—twelve images matching the existing baseline route/locale set. Initial backfill acceptance expects no unexplained content or layout drift. Each page must have exactly one meaningful `<h1>`; this intentionally fixes the baseline accessibility gap on About, Services, Packages, and Portfolio.

#### Admin desktop

Capture the Content tab for all six canonical `/admin/pages/<page>` routes and the Properties tab for all six as ADMIN. Also capture:

- Pages sidebar tree expanded with the correct parent and child active;
- Settings showing only Booking, Contact, Testimonials, and Cookie Policy SEO entries;
- one aggregate audit diff containing ordered child/reference changes;
- Home preview mode/drawer in TH and EN.

#### Responsive and interaction states

At minimum capture:

- mobile Pages selector/navigation open, Content tab, and Properties tab;
- tablet Home Content and one entity page with Content Items;
- unsaved-change warning;
- stale-version conflict with the latest-data recovery action;
- High-risk SEO Change confirmation showing affected TH/EN URLs;
- unpublished/missing Featured Reference warning;
- OG preview using the uploaded fixture and its safe fallback state.

## Required test harness changes

Keep the repository's standalone-script convention and system Chrome; a test-runner migration is not required for this feature. Add focused scripts rather than making `e2e-admin-crud.mts` an unbounded monolith:

| Proposed script/surface | Responsibility |
| --- | --- |
| `scripts/verify-pages-cms-model.mts` | Registry/key partition, schemas, strict locale completeness, canonical normalization, risk classification, aggregate limits/order, metadata composition, and fallback behavior |
| `scripts/e2e-pages-cms.mts` | Real browser routes, roles, Content/Properties writes, conflict, audit, revalidation, Settings split, redirects, preview, unsaved warnings, and responsive keyboard flows |
| `scripts/verify-pages-cms-migration.mts` | Clean migration, idempotent backfill/digests, constraints, InnoDB/FK proof, forced rollback, and old-build compatibility on a disposable clone |
| `scripts/verify-pages-cms-backup.mts` | Database model order plus private/OG/page-image backup and explicit restore drill in temporary roots |
| `scripts/screenshot-pages-cms.mts` | Deterministic baseline-matched result captures and sanitized manifest generation |
| `scripts/verify-pages-cms-all.mts` | Isolated database/storage setup, build/start orchestration, focused scripts, screenshot capture, server cleanup, and one fail-loud summary |

After the focused pipeline is stable, invoke it from `scripts/verify-all.mts` without starting a second server or running suites concurrently against the same database. Pull the relevant Pages RBAC checks out of the “ad-hoc” assumptions in `e2e-rbac-sprint2.mts`; do not make unrelated lead fixtures a prerequisite for Pages CMS verification.

Add an automated accessibility scan for representative Content, Properties, preview, and confirmation screens using a maintained Playwright-compatible axe integration. Its dependency and rule set are part of the implementation sprint; serious or critical WCAG 2.2 A/AA findings fail the pipeline. Automated scans supplement, not replace, the keyboard/focus checks below.

## Requirement-to-evidence matrix

### Build, schema, migration, and recovery

| Requirement | Automated evidence | Browser/manual evidence | Pass gate |
| --- | --- | --- | --- |
| Next.js 16 production compatibility | `npm run build`; generated Prisma client compiles | Start with `npm run start`; all target routes render | Output contains both `Compiled successfully` and `Finished TypeScript`; no dev-server evidence substituted |
| Clean schema migration | Apply migration to an empty dedicated MySQL database, then seed twice | None | First run creates schema; second seed changes no row/count/digest unexpectedly |
| Production-shaped expansion | Apply idempotent production SQL to a restored clone twice | Review `SHOW COLUMNS`, indexes, engines | Second application is a no-op; old application build can still read/write its existing fields |
| InnoDB gate | Query every table engine and FK; inject an Audit Log failure inside a mutation | Review sanitized `SHOW TABLE STATUS`/`SHOW CREATE TABLE` evidence | All involved tables are InnoDB; parent and audit both roll back; no Pages mutation ships otherwise |
| Backfill fidelity | Run backfill twice; compare row counts, ordered reference IDs, and normalized TH/EN digests | Initial public screenshots compare to baseline | Second run is a no-op; all six records complete; Home five FAQs/latest projects and About testimonials match frozen baseline selection |
| Missing-record fallback | Remove one Page Content row only in isolated DB and request TH/EN | Both locale pages remain usable | Entire locale-specific message record renders; no mixed DB/message fields |
| Malformed-record behavior | Bypass action in isolated DB if DB permits and invoke reader | Admin integrity warning/error boundary | No per-field TH→EN mixing and no silent blank content |
| Backup/restore | Write synthetic private slip, OG image, Home hero, and every new table; backup then restore to empty compatible schema | Fetch restored `/files` keys | Counts/digests match and all three storage classes are retrievable; restore remains explicit |
| Rollback build | Run pre-cutover application build against expanded/backfilled clone | Open legacy admin/public routes | Old build operates without down migration; new rows/assets remain intact for forward recovery |

### Routes, navigation, and authorization

| Requirement | Automated browser evidence | Pass gate |
| --- | --- | --- |
| Six canonical admin routes | Navigate each `/admin/pages/<page>` as an authorized account | 200/rendered screen, correct page label, exact child active, Pages parent active |
| Legacy compatibility | Request each old route without auto-follow, then navigate authenticated | Route-level response is temporary 307 and final destination is canonical `?tab=content`; no 308 |
| Unauthenticated access | Request every canonical and old admin route without a session | Ends at login; no content/Properties payload leaks |
| Page Content roles | Exercise ADMIN, SALES, MARKETING, EDITOR and excluded roles | Four allowed roles can use Content under existing publish/delete rules; FINANCE/EXECUTIVE/CHANNEL_EXECUTIVE are denied server-side |
| Properties roles | Exercise ADMIN, MARKETING, SALES, EDITOR and excluded roles | Only ADMIN/MARKETING receive Properties tab/data; direct `?tab=properties` never leaks to others |
| Fresh-role enforcement | Load Properties as MARKETING, deactivate/change role in fixture DB, then attempt save with the old session | Save denied; no PageSeo change, audit, upload reference, or cache/sitemap effect; account restored in teardown |
| Six/four key partition | Table-driven calls to trusted parsing/action boundary | Pages action rejects four legacy/arbitrary keys; Settings action rejects six moved/arbitrary keys |
| Settings remains operational | Open `/admin/settings` as ADMIN/MARKETING | Other settings remain; SEO selector contains exactly the four legacy pages and links authorized users to Pages |
| Active/responsive navigation | Navigate all children on desktop/mobile, including invalid route/tab | Exactly one selected child; parent remains active; invalid tab safely resolves to Content |

### Page Content and reusable items

| Scenario | Required evidence | Pass gate |
| --- | --- | --- |
| Save all six aggregates | Pre-warm TH/EN, submit unique paired markers page by page, fetch both locales, then restore exact snapshot | Each save creates one version increment and one aggregate audit row; both locales update immediately; restore verified |
| TH/EN completeness | Submit missing/blank required field in either locale and over-limit/control-character text | Server rejects without partial row/child/audit/cache change; hidden-tab fields still submit because `TabsContent keepMounted` remains |
| Section visibility | Toggle each optional fixed section with complete retained copy | Hidden section is absent in both locales; re-enable restores retained content/order |
| Home FAQ | Add/reorder/delete bilingual rows; test 0, 1, 12, and 13 visible rows | 1–12 accepted, 0/13 rejected when visible, stable IDs retained on reorder, public accordion keyboard behavior works |
| Home Featured Projects | Select/reorder up to four, empty selection, unpublish/republish one | Explicit order renders; empty means none; unpublished is skipped with admin warning; republish returns to prior position |
| About Featured Testimonials | Same lifecycle with up to three | Same reference semantics and reverse-cache behavior |
| Referenced-item deletion | Attempt deletion through real Service/Package/Portfolio/Testimonial actions where applicable | Referenced entity remains; no reference/audit partial change; response names every referencing page with admin links |
| Entity-page ownership | Edit a Service, Package, or Portfolio item from the Content Items area | Item remains single source of truth; page-level row contains no copied business fields |
| Calculator boundary | Edit allowed Calculator Page Content and run `scripts/verify-calculator.mts` | Copy changes; formulas/results remain identical to reference Excel |
| Shared CTA | Edit CTA once and visit every consuming page/locale | All consumers refresh; page-level controls only change visibility, not duplicate CTA text |

### Properties, metadata, indexing, and images

| Scenario | Required evidence | Pass gate |
| --- | --- | --- |
| Normal Properties save | For all six keys, set unique TH/EN SEO/OG markers, pre-warm then request pages | Rendered `<title>`, description, OG title/description, canonical, hreflang and robots match same-locale values immediately |
| Metadata initial HTML | Fetch raw HTTP and inspect browser DOM | Prerendered pages include correct head output in initial HTML; dynamic Portfolio DOM also resolves correct metadata |
| Validation abuse table | Submit tags, CRLF/NUL/bidi controls, excessive code points, unknown fields, foreign/protocol-relative/cross-locale canonicals | Every invalid payload rejected as plain text/path validation; no stored head markup or external authority transfer |
| Safe canonical override | Save allowed TH and EN same-site paths | Canonical/hreflang/x-default remain internally consistent and use configured origin; public preview still opens the real page route, not override target |
| High-risk transition | Attempt index true→false, follow true→false, and canonical self→override without/with acknowledgement | First attempt returns confirmation-required with no side effects; confirmed attempt creates one audited change and exact cache/sitemap effects |
| Robots/sitemap alignment | Pre-warm sitemap, noindex one fixture page, request page/robots/sitemap, then restore | Page emits noindex; page disappears from sitemap; `robots.txt` still allows crawling and never uses disallow as noindex |
| Optimistic conflict | Open same Properties/Content version in two browser contexts; save A then B | A succeeds; B shows conflict/recovery; B causes no second row/audit/blob/cache change |
| Valid OG replace/remove | Generate JPEG/PNG/WebP fixtures, upload/replace/remove, request metadata URL | Stored file is bounded re-encoded JPEG with generated immutable key; metadata fetches; old file deleted only after commit; fallback works after remove |
| Malicious/broken upload | Generate spoofed MIME, bad bytes, SVG/GIF/PDF, empty, >5 MB, high-pixel fixtures | Rejected before reference mutation; no path leakage, audit row, or retained blob |
| Upload conflict/DB failure | Force stale version and forced transaction failure after writing new blob | New blob is compensating-deleted; old key/blob remains; reconciliation later reports no aged orphan |
| Missing referenced blob | Remove only synthetic blob after DB fixture points to it | Public metadata response remains 200 with fallback/omission; admin shows integrity warning |

### Cache and dependency graph

Every cache test first requests each expected consumer to populate the production cache, then performs the mutation, then checks both a fresh HTTP request and client navigation from an already-open browser context. This avoids a false pass where a page was never cached.

| Mutation | Consumers that must show the marker/change without waiting five minutes |
| --- | --- |
| Each Page Content aggregate | Its own TH and EN public page plus canonical admin screen |
| Page Properties | Same page TH/EN head and admin screen; sitemap only when index membership changes |
| Service item | Services TH/EN and every page holding its Featured Reference |
| Package item | Packages TH/EN, Calculator TH/EN, affected package detail routes, and referencing pages |
| Portfolio Project | Portfolio TH/EN, Home TH/EN when selected/rendered, and referencing pages |
| Testimonial | Testimonials/About/Home consumers and referencing pages |
| Shared CTA | Every visible CTA consumer in both locales |

The suite must not infer success from Next.js's temporary “previously visited pages refresh” side effect. It asserts every named consumer and also asserts an unrelated control page did not change. Route patterns with dynamic segments are exercised explicitly.

### Audit, failure atomicity, and leakage

| Scenario | Pass gate |
| --- | --- |
| Aggregate save | Exactly one UPDATE row with parent fields, ordered FAQ/references, before/after versions; no child audit spam |
| CREATE/UPDATE/DELETE Content Items | Existing snapshot shapes and labels remain intact |
| High-risk Properties change | Existing PageSeo entity continuity plus derived risk badge from the same before/after row |
| Failed validation/auth/conflict | Zero Audit Log rows and zero data/blob/cache change |
| Forced Audit Log insert failure | Entire InnoDB data/child update rolls back |
| Snapshot secret scan | No password/hash/token/secret, file bytes, session, rejected payload, absolute path, or real customer data |
| Historic rows | Existing AboutContent/PageSeo/entity rows still render without rewrite or crash |

Extend `scripts/verify-audit-module.mts` exhaustively when new entity types are introduced. Do not loosen its typed entity/label agreement to make a new test pass.

## UX, accessibility, and responsive gates

### Unsaved and conflict experience

- Dirty state activates only after a real change and clears only after a confirmed successful save or explicit discard.
- Attempting page-child navigation, Content/Properties tab switch, TH/EN editor-tab switch, preview navigation, browser Back, or reload invokes the appropriate warning.
- Cancel preserves data and focus; discard performs the requested navigation; save failure/conflict keeps edits available.
- Conflict UI explains that another editor saved, offers review/reload, and never silently replaces either version.

### Keyboard and screen reader semantics

- Sidebar/tree, mobile selector, tabs, dialogs, sortable controls, image remove/replace, preview locale toggle, and confirmation are operable without a pointer.
- `aria-current`, `aria-selected`, expanded state, accessible names, headings, errors, character counts, and status announcements reflect the visible state.
- Dialog focus enters the dialog, is trapped, returns to the trigger, and supports Escape where safe; destructive/high-risk confirmation cannot be bypassed by Escape ambiguity.
- Kept-mounted hidden locale panels retain form controls for submission but are not reachable in the tab order or exposed as visible content.
- Every public target has one meaningful `<h1>` and ordered headings; image alternatives use the active locale.
- Automated axe scan has no serious/critical WCAG 2.2 A/AA violations on representative routes/states; known third-party consent-banner findings are isolated and documented rather than silently ignored.

### Responsive and visual quality

- No horizontal document overflow at 390, 768, or 1440px.
- Mobile has an obvious current page and a usable way to switch among six pages without the desktop sidebar.
- Content Items, bilingual fields, warnings, and action buttons remain readable without clipped labels or overlapping controls.
- Preview does not squeeze the editor below a usable width; it becomes the approved drawer/optional mode at smaller widths.
- Loading, empty, missing-reference, image-fallback, validation, save-success, conflict, and authorization states use clear Thai admin copy.
- Reduced-motion mode removes nonessential transitions without hiding state change.

## Production-mode execution order

The focused orchestrator must execute in this order and stop at the first failed gate:

1. Validate isolated database/storage targets.
2. Apply migration; seed twice; run idempotent backfill twice.
3. Run pure model/security/content assertions.
4. Run database engine/FK/transaction and backup/restore drills.
5. Run `npm run build` and require both compilation and TypeScript success markers.
6. Start a clean `npm run start`; fail if port 3000 is already occupied.
7. Pre-warm routes, run Pages CMS E2E, then existing regression suites and calculator verification.
8. Run audit invariants after mutation suites.
9. Capture deterministic screenshots and manifest only if all behavior checks passed.
10. Stop the server and restore/remove only validated test fixtures/temporary storage even on failure.

At minimum, the existing `scripts/verify-all.mts`, `scripts/e2e-admin.mts`, `scripts/e2e-admin-crud.mts`, `scripts/e2e-booking.mts`, `scripts/verify-content.mts`, `scripts/verify-audit-module.mts`, and `scripts/verify-calculator.mts` remain green. Pages-specific suites add coverage; they do not replace unrelated regressions.

## Read-only deployed-site live verification

After deployment, use web-view/system Chrome and plain GET/HEAD requests only unless the owner separately authorizes a controlled production write. The default evidence set:

1. Warm every target TH/EN route twice because ISR can remain stale per page after a restart.
2. Confirm all twelve public routes return 200 and contain their expected localized page marker.
3. Inspect raw and rendered head output for title, description, canonical, TH/EN/x-default hreflang, OG fields/image, and robots.
4. Fetch `sitemap.xml` and `robots.txt`; compare membership/crawl rules with the approved live Properties state.
5. Fetch referenced public OG/hero URLs and verify content type/status; verify a nonexistent private slip remains 401.
6. Unauthenticated canonical and legacy admin URLs must reach login without leaking content.
7. With an owner-controlled read-only admin session, visually inspect the six routes/tabs, sidebar/mobile selector, Settings four-key state, and audit presentation without submitting forms. Do not commit these authenticated screenshots.
8. Capture public desktop TH/EN results and the unique deployment marker. Record status/head summaries with secrets and cookies removed.

Production write correctness is proven against the exact production build on the isolated production-shaped database. If the owner authorizes a later production canary save, it is a separate manual checklist: snapshot first, use synthetic non-customer copy, save and restore immediately, verify both Audit Log rows and every cache consumer, and record who approved it. It is never silently inferred from this plan.

## Sprint and final-release gates

Every sprint ends with two explicit summaries:

- **Before implementation:** files/surfaces to change, invariants at risk, fixtures, exact commands, screenshots to capture, rollback point, and excluded work.
- **After implementation:** files/surfaces actually changed, migrations/data effects, security/maintenance decisions, commands and observed results, screenshot manifest, deviations, remaining risks, and rollback instructions.

No sprint is complete while an applicable matrix row is untested or marked “may be cached.” A failure is fixed and the affected layer plus dependent checks are rerun. The final implementation handoff requires:

- all local production-mode gates green;
- baseline/result public review accepted for both locales;
- sanitized admin/responsive/state evidence accepted;
- InnoDB and recovery prerequisites proven;
- deployed public read-only smoke green;
- no unresolved serious/critical accessibility, security, integrity, orphan-storage, audit, or cache finding;
- the 14-day compatibility cleanup gate tracked separately rather than prematurely declared complete.

## Next.js 16 constraints consulted

The repository-bundled Next.js 16.2.10 documentation supports these gates:

- Playwright E2E should run against `next build` + `next start` to resemble production behavior.
- `generateMetadata` is server-resolved and may be present in initial HTML for prerendered pages or streamed for dynamic pages, so both raw response and browser DOM checks matter.
- `sitemap.ts` and `robots.ts` are special Route Handlers cached by default; their output must be explicitly exercised after relevant mutation/revalidation.
- `revalidatePath` targets route-file paths, dynamic patterns require a type, and current refresh of previously visited pages is temporary behavior.
- Server Component `redirect()` is temporary 307 by default; acceptance must reject permanent 308 compatibility shims.
- Server Actions remain public mutation entry points and require independent authorization, validation, and minimal return data even when their UI is hidden.

Implementation must re-read the bundled documentation before changing the relevant Next.js surfaces; older framework assumptions are not verification evidence for this repository.
