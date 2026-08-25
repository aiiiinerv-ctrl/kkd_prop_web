# Pages CMS current-state inventory and rendered baseline

Date: 2026-08-25  
Wayfinder ticket: [Inventory current page content, metadata ownership, and rendered baseline](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/43)

## Scope and method

This is a read-only baseline for the six pages in the Pages CMS redesign: Home, About, Services, Packages, Portfolio, and Calculator. It records current ownership, routes, permissions, data sources, fallbacks, revalidation, and rendered behavior before implementation.

Evidence was collected from:

- the current source, Prisma schema, messages, actions, auth helpers, and audit module;
- the Next.js 16.2.10 documentation bundled in `node_modules/next/dist/docs/`, especially metadata, redirects, `revalidatePath`, and Playwright production testing;
- a local MySQL-backed `next build` followed by `next start`;
- Playwright using system Chrome at a 1440 × 1000 viewport, with scrolling before each full-page screenshot so `IntersectionObserver`-driven Reveal sections reached their rendered state;
- authenticated admin pages viewed with the seeded local ADMIN account; no form was submitted and no content was mutated.

## Executive finding

The fragmented experience is an ownership problem, not only a sidebar problem:

1. Four target entity/content editors live at three unrelated route shapes: `/admin/services`, `/admin/packages`, `/admin/portfolio`, and `/admin/content/about`.
2. Home and Calculator have no page-content editor. Their page-specific copy remains in `messages/{th,en}.json`.
3. SEO for ten public pages is centralized in `/admin/settings`, separated from each page's content.
4. `PageSeo.ogImageKey` already exists in the database and view-model, but the admin loader, form, validation, action, and metadata assembler do not use it.
5. The desired OG-specific text, canonical override, and robots controls do not exist in the current schema or rendering path.
6. Reusable entity collections already have a clear Content-module seam. Copying them into page records would create a second source of truth.

The redesign therefore needs a page-level ownership seam around the existing content collections, not a simple folder move or one all-purpose content blob.

## Current navigation and route ownership

| Target page | Public route | Current admin route | Sidebar label/location | Current editor |
| --- | --- | --- | --- | --- |
| Home | `/th`, `/en` | none | none | static messages + shared data only |
| About | `/th/about`, `/en/about` | `/admin/content/about` | `เนื้อหาหน้าเว็บ` | singleton AboutContent form |
| Services | `/th/services`, `/en/services` | `/admin/services` | flat `บริการ` item | Service CRUD |
| Packages | `/th/packages`, `/en/packages` | `/admin/packages` | flat `แพ็กเกจ` item | Package CRUD |
| Portfolio | `/th/portfolio`, `/en/portfolio` | `/admin/portfolio` | flat `ผลงาน` item | PortfolioProject CRUD |
| Calculator | `/th/calculator`, `/en/calculator` | none | none | static messages; formulas in code |
| Properties for all six | same public routes | `/admin/settings`, SEO tab | `ตั้งค่าระบบ` | PageSeo title/description only |

Existing automated checks and action revalidation arrays contain the old admin URLs, so route migration affects more than the sidebar. At minimum it reaches `scripts/e2e-rbac-sprint2.mts`, the four content action modules, active-link matching, bookmarks, and direct-route authorization checks.

## Content ownership by page

### Home

Page-specific content is currently entirely static in the `home` message namespace, including hero copy, proof points, feature labels, section headings, metrics, CTA copy, quick-contact label, and FAQ-adjacent copy. The hero image is a code-owned static asset at `/marketing/hero-solar.jpg`.

Shared dynamic inputs are:

- four latest published Portfolio Projects from `getLatestProjects(locale, 4)`, ordered by `completedAt desc`, then `createdAt desc`;
- phone, LINE, and Facebook from SiteSettings with hard-coded fallbacks;
- global/common CTA labels and contact translations;
- the FAQ component and site-wide header/footer.

There is no Home content model, admin page, action, validation schema, audit entity, or page-specific visibility/featured-selection setting. The current selection rule is “latest four,” not curated content.

### About

About has the only existing page-level singleton: `AboutContent`. It stores paired locale columns for the title, introduction, three credentials, the team heading/description, and three team disciplines. Public reads go through `getAboutContent(locale)` and fall back field-by-field to `messages.about` when a DB value is empty.

Other sections remain shared or computed:

- published Portfolio Project count;
- closed Lead count;
- published Testimonials;
- global CTA banner;
- message fallback for labels not represented by AboutContent.

The admin form updates the full singleton. The mutation is authorized for ADMIN, SALES, MARKETING, and EDITOR; it is a full-snapshot audited update and revalidates both locale pages plus the old admin route.

### Services

The item collection is DB-owned through `Service`: kind, paired title/description/features, image key, sort order, publication state, and slug. The public Content module returns published rows ordered by `sortOrder asc`; the page divides them into SYSTEM and MAINTENANCE groups.

The page-level heading, subtitle, group headings, empty behavior, and CTA labels are message-owned. Service icons are selected by a hard-coded slug-to-icon map with Wrench as fallback. The page does not render the stored Service image.

ADMIN, SALES, MARKETING, and EDITOR can create/update. EDITOR is forced to draft on create and cannot alter publication state or delete; this is enforced server-side. Mutations are full-snapshot audited and use public storage for uploaded images.

### Packages

The item collection is DB-owned through `Package`: paired name/suitability/features, system size, price, popular flag, seasonal production JSON, image key, sort order, publication state, and slug. Public rows are published-only and ordered by `sortOrder asc`.

The list page chooses the first popular package, or the first row, as the source of the seasonal-production table. Payback explanations, headings, empty state, and CTA labels are message-owned. Seasonal production is regenerated from `sizeKw` in the mutation code; it is business behavior rather than free-form content.

Package data is also consumed by Calculator and package detail pages. Current Package action revalidation explicitly covers Packages and Home, but not Calculator or package detail routes. This is a required impact test; the page-level layout invalidation used by PageSeo is a separate mechanism.

Permissions and audit behavior match Services. Although `imageKey` exists and uploads are supported, the admin page loader does not pass it to the current client form and the public list view-model does not expose it.

### Portfolio

The item collection is DB-owned through `PortfolioProject`: paired title/description, category, province, system size, multiple public image keys, completion date, sort order, publication state, and slug. The public Portfolio page uses published rows ordered by curated sort order; Home uses a different “latest completed” order on purpose.

The page-level title, subtitle, image disclaimer, filter labels, empty state, and lightbox labels are message-owned. The `category` search parameter drives the client-side initial filter.

Permissions and audit behavior match Services. Portfolio mutations revalidate the Portfolio and Home route patterns. Unlike the other five target list pages, Portfolio has no exported `revalidate = 300` and is rendered dynamically because it consumes search parameters.

### Calculator

All page copy is message-owned: hero, input and result labels, package-section copy, disclaimer, and methodology text. Published Package rows supply package price/features and the calculation's package inputs.

Formula constants and `calculateSavings()` live in `src/lib/calculator.ts`; input state lives in Zustand. There is no Calculator content model, admin editor, action, audit entity, or validation schema. Per the standing decision, formulas and commercial assumptions remain code-controlled and covered by `scripts/verify-calculator.mts`.

## Current Properties and metadata pipeline

`META_KEYS` contains ten keys. `PageSeo` has one row per key with:

- paired title and description columns;
- `ogImageKey`;
- key and timestamps.

The effective resolution order in `pageMetadata()` is caller overrides, then localized PageSeo title/description, then `messages.meta` fallback. It always derives:

- canonical URL from `NEXT_PUBLIC_SITE_URL`, locale, and the code-owned page path;
- TH, EN, and x-default alternates;
- Open Graph title/description from the same SEO title/description;
- Open Graph locale, site name, type `website`.

It currently emits no configurable OG-specific title/description, OG image, robots directive, or canonical override. `ogImageKey` is effectively dormant: it is read into `PageSeoView`, but omitted from the Settings loader/client payload, validation schema, update action, and returned Metadata object.

The Settings SEO form edits only paired title/description. It has per-language tabs, character counters, a dirty indicator, and immediate save. It does not warn on navigation, show a rendered preview, or distinguish save from publish. PageSeo writes are restricted to ADMIN and MARKETING and are full-snapshot audited.

PageSeo revalidation names Home, About, Contact, Settings, and the TH/EN public layouts. Next.js 16 documents that layout-path revalidation also invalidates pages beneath that layout, so the locale-layout entries appear intended to refresh every localized descendant. This must be behavior-tested rather than simplified based only on the explicit page list.

## Permissions and security baseline

| Capability | Current server-side rule |
| --- | --- |
| View/edit About | ADMIN, SALES, MARKETING, EDITOR |
| Create/update Service, Package, Portfolio Project | ADMIN, SALES, MARKETING, EDITOR |
| Publish/delete entity content | ADMIN, SALES, MARKETING; EDITOR denied server-side |
| View/edit PageSeo | ADMIN, MARKETING |
| Upload Service/Package images | validated image, max 5 MB, compressed, stored under `public/<type>/...` |
| Upload Portfolio images | validated images, max 5 MB each, compressed, stored under `public/portfolio/...` |
| Audit | mutation and AuditLog row commit in one transaction; full snapshots for these entities |

The current PageSeo schema accepts only a closed `META_KEYS` enum and trimmed optional text. New canonical, robots, and OG image inputs will need equivalent server-side validation and must not rely on hidden UI controls or proxy checks.

## Rendered production baseline

### Build and environment

The first build exposed a local-environment incompatibility: the MariaDB driver could not authenticate to the MySQL 8 container without RSA public-key retrieval. No repository config was changed. The evidence build used an ephemeral local `DATABASE_URL` override with `allowPublicKeyRetrieval=true`.

The successful production build reported:

- `✓ Compiled successfully`;
- `Finished TypeScript`;
- 48 static pages generated;
- Home, About, Services, Packages, and Calculator as five-minute SSG routes;
- Portfolio as a dynamic route;
- one pre-existing Turbopack NFT tracing warning involving local storage.

### Public routes

All twelve TH/EN target URLs returned HTTP 200. Rendered `<head>` inspection found:

- localized title and description on all twelve;
- localized canonical URL on all twelve;
- Open Graph title and description equal to the normal title and description;
- no `og:image` on any target page;
- no explicit `meta[name=robots]` on any target page;
- Home and Calculator have an `<h1>`;
- About, Services, Packages, and Portfolio use `SectionHeading`, which renders the top page title as `<h2>`, leaving those pages without an `<h1>`.

Screenshots:

- Home: [TH](assets/pages-cms-baseline/public-th-home.png), [EN](assets/pages-cms-baseline/public-en-home.png)
- About: [TH](assets/pages-cms-baseline/public-th-about.png), [EN](assets/pages-cms-baseline/public-en-about.png)
- Services: [TH](assets/pages-cms-baseline/public-th-services.png), [EN](assets/pages-cms-baseline/public-en-services.png)
- Packages: [TH](assets/pages-cms-baseline/public-th-packages.png), [EN](assets/pages-cms-baseline/public-en-packages.png)
- Portfolio: [TH](assets/pages-cms-baseline/public-th-portfolio.png), [EN](assets/pages-cms-baseline/public-en-portfolio.png)
- Calculator: [TH](assets/pages-cms-baseline/public-th-calculator.png), [EN](assets/pages-cms-baseline/public-en-calculator.png)

### Admin routes

Authenticated read-only navigation returned HTTP 200 for About, Services, Packages, Portfolio, and Settings/SEO. The Settings screen rendered ten SEO page tabs. At the desktop baseline width, its vertical page selector is visually compressed and labels overflow horizontally behind adjacent content, making page selection difficult.

Screenshots:

- [About editor](assets/pages-cms-baseline/admin-about.png)
- [Services editor](assets/pages-cms-baseline/admin-services.png)
- [Packages editor](assets/pages-cms-baseline/admin-packages.png)
- [Portfolio editor](assets/pages-cms-baseline/admin-portfolio.png)
- [Centralized SEO editor](assets/pages-cms-baseline/admin-settings-seo.png)

## Root causes and design constraints handed to later tickets

1. **Navigation mirrors implementation history, not page ownership.** Existing entity editors, a singleton editor, static message content, and centralized SEO entered the admin independently.
2. **Page content and reusable entities are different concepts.** A page-level Content tab must compose existing collections rather than duplicate their records.
3. **Fallback behavior is inconsistent by page.** About supports field-level DB-to-message fallback; Home and Calculator are message-only; entity pages combine DB items with message-owned headings.
4. **Properties are only partially modeled.** The dormant OG image column should not be mistaken for a working feature.
5. **Cross-page dependencies are real.** Package changes affect Packages, package detail, and Calculator; Portfolio changes affect Portfolio and Home; page-level revalidation must cover every consumer.
6. **Route compatibility is test-visible.** Old admin paths appear in actions and E2E scripts, so redirects alone do not complete the migration.
7. **SEO and accessibility need rendered acceptance criteria.** Source-level assertions would miss missing head tags, missing top-level headings, and the current Settings selector layout problem.
8. **Local production verification needs a documented database-auth prerequisite.** Otherwise future agents may misdiagnose the RSA authentication failure as a Pages CMS regression.

## Questions intentionally left for downstream tickets

This inventory does not choose the target schema, the precise editable field list, the canonical restriction policy, OG image lifecycle, section-reference behavior, or the final interaction. Those decisions remain with the dependent Wayfinder tickets.
