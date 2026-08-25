# Pages CMS data model, migration, backfill, and rollback decision

Date: 2026-08-25  
Wayfinder ticket: [Decide the page data model, migration, backfill, and rollback strategy](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/48)

## Status and owner decisions

This is an approved pre-implementation decision asset. The owner confirmed each material trade-off through a one-question-at-a-time grilling session. It defines the target data shape and release mechanics; it does not edit Prisma schema, create a migration, alter a database, upload content, or change application behavior.

Confirmed decisions:

1. Use a typed hybrid rather than a generic Page/JSON model or duplicated per-page Properties.
2. Extend the existing ten-row `PageSeo` table additively.
3. Use typed per-page Content singletons and normalized child/join rows.
4. Make verified InnoDB conversion a release gate.
5. Roll out with expand → backfill → page-by-page cutover and additive rollback compatibility.
6. Keep the single OG reference in `PageSeo.ogImageKey`; do not add a Media Asset table.
7. Save and audit each Page Content aggregate atomically with one optimistic version.
8. Store Home FAQ as 1–12 ordered, bilingual child rows while its section is visible.
9. Keep compatibility for at least 14 days and remove it only after evidence gates pass.

The architectural trade-off is recorded in [ADR 0007](../adr/0007-typed-hybrid-pages-cms-model.md). No glossary change is required: Page Content, Page Properties, Content Item, Shared Site Content, and Featured Reference already have canonical definitions in `CONTEXT.md`.

## Target model at a glance

```text
code-owned Page Registry (exactly six keys)
        │
        ├── PageSeo (10 existing rows; six get full Properties UI)
        │
        ├── HomePageContent ── HomeFaqItem
        │                   └── HomeFeaturedPortfolioProject ── PortfolioProject
        ├── AboutContent ───── AboutFeaturedTestimonial ─────── Testimonial
        ├── ServicesPageContent ─────────────────────────────── Service items stay separate
        ├── PackagesPageContent ─────────────────────────────── Package items stay separate
        ├── PortfolioPageContent ────────────────────────────── PortfolioProject items stay separate
        ├── CalculatorPageContent ───────────────────────────── Package items stay separate
        └── SiteSettings (Shared Site Content, including global CTA)
```

There is no generic `Page` database row. Page identity, canonical admin/public paths, cache consumers, and the six-key allowlist belong to the trusted code registry already resolved by the routing impact analysis. Database rows store editable data, not routing authority.

## Why the typed hybrid fits

| Option | Benefit | Rejected cost or accepted trade-off |
| --- | --- | --- |
| Generic `Page` + JSON content | Few tables; superficially flexible | Rejected: weak field constraints, opaque audit diffs, runtime-only migrations, irrelevant page-builder flexibility, and harder AI/human navigation |
| One wide Page Content table | One reader and mutation shape | Rejected: many irrelevant nullable columns and cross-page coupling whenever one template evolves |
| Per-page models including duplicated Properties | Maximum isolation | Rejected: duplicates common metadata behavior and breaks the existing PageSeo/legacy Settings boundary |
| Typed hybrid | Typed fixed-template content, shared typed Properties, preserved Content Items and audit continuity | Accepted: more tables and explicit mappers/actions; this is deliberate clarity rather than accidental complexity |

## Code-owned page registry

The registry contains exactly `home | about | services | packages | portfolio | calculator`. It owns trusted identifiers and route/cache mappings but no editable content. Server Actions accept a page key and derive the record, permissions, public paths, and revalidation targets from this registry. They never accept a row ID, canonical route, storage key to delete, or cache target from the client.

The four legacy metadata keys—`booking | contact | testimonials | cookiePolicy`—remain valid PageSeo keys but are not Pages-registry keys. This distinction is expressed through separate server allowlists rather than one permissive ten-key mutation.

## Page Properties: extend PageSeo in place

Retain the current `PageSeo` primary keys, keys, title/description fields, `ogImageKey`, timestamps, and historical `PageSeo` Audit Log identity. Add:

| Column | Shape | Default/constraint |
| --- | --- | --- |
| `ogTitleTh`, `ogTitleEn` | nullable string | Empty means same-locale SEO title |
| `ogDescriptionTh`, `ogDescriptionEn` | nullable text | Empty means same-locale SEO description |
| `canonicalPathTh`, `canonicalPathEn` | nullable string | Empty means trusted self path; validated same-site locale path |
| `robotsIndex` | non-null boolean | `true` |
| `robotsFollow` | non-null boolean | `true` |
| `version` | non-null integer | `1`, incremented on every successful Properties save |

Keep the existing SEO title and description columns nullable at the database level during compatibility because all ten legacy rows share the table. Before the six keys can cut over, the backfill verifier requires complete TH/EN titles and descriptions. Their new action rejects incomplete pairs thereafter. The four Settings-owned keys retain the existing message fallback contract and may remain nullable.

Optimistic concurrency uses `version`, not `updatedAt`. A save performs a conditional update against the submitted version inside the same InnoDB transaction that writes its before/after audit snapshot. A zero-row conditional update returns a conflict without changing the row, image reference, Audit Log, sitemap, or caches.

### Disjoint write boundaries

- The Pages Properties action accepts only the six registry keys and can mutate all typed Properties fields.
- The legacy Settings SEO action accepts only the remaining four keys and can mutate only their existing title/description fields.
- Old clients that submit a moved key receive an actionable refresh-required result. They never receive compatibility write access.
- PageSeo remains the audit entity type, preserving historical list labels and row continuity.

## Typed Page Content singletons

Create five new models and extend the existing `AboutContent` model:

| Aggregate | Database responsibility | Existing reusable data intentionally excluded |
| --- | --- | --- |
| `HomePageContent` | Hero image/alt, hero and proof copy, fixed feature labels, fixed-section visibility/copy, metric presentation, CTA preset selection, FAQ heading copy, version | Service/Package/Portfolio fields, shared contact/social data |
| `AboutContent` | Existing intro/credentials/team fields plus section visibility, derived-stat labels, testimonial heading copy, global CTA visibility, version | Statistic values and Testimonial quotes |
| `ServicesPageContent` | Page title/subtitle, System/Maintenance group headings and visibility, global CTA visibility, version | Service rows and Service publication/order |
| `PackagesPageContent` | Page title/subtitle, empty state, Seasonal and Payback copy/visibility, global CTA visibility, version | Package rows, price, production formula, popular selection behavior |
| `PortfolioPageContent` | Page title/subtitle, disclaimer, empty state, global CTA visibility, version | Portfolio Project fields, filters, controls, project order |
| `CalculatorPageContent` | Hero and calculator-panel copy, Packages-section copy/visibility, version | Inputs, units, formulas, thresholds, result labels, Package rows |

Every editable user-facing string follows paired `xxxTh`/`xxxEn` columns. Fields required by the approved page boundary are non-null in newly created tables. Optional copy is nullable only when the public component has an explicit omit behavior; section hiding is represented by a Boolean, not empty text.

Each table has one canonical row. New rows use the fixed page key as their canonical singleton identity. `AboutContent` keeps its existing primary key to preserve audit continuity; add a unique canonical key and use `findUnique` rather than `findFirst`, without rewriting historical Audit Log entity IDs. Actions derive these identities from the registry and never trust a submitted ID.

Each aggregate has a non-null `version` defaulting to 1 and an `updatedAt`. Content saves perform a conditional parent update plus child changes and one audit insertion inside a single InnoDB transaction.

### Shared Site Content

Global CTA copy remains in `SiteSettings`, alongside existing site-wide contact/header/footer content. Add paired CTA title/subtitle/button labels and a dedicated `ctaVersion`. A scoped version prevents an editor saving Contact from causing a false concurrency conflict for a different editor saving the CTA. CTA destinations remain typed internal presets; no arbitrary URL column is introduced.

The existing `SiteSettings` audit entity remains. Its CTA mutation snapshot includes the changed Shared Site Content fields and version but never secrets or unrelated request/session data.

## Owned child rows and Featured References

### HomeFaqItem

`HomeFaqItem` is owned by `HomePageContent` and contains a stable ID, required question/answer TH/EN text, and `sortOrder`.

- Backfill the current five FAQs.
- When the FAQ section is visible, require 1–12 rows.
- When hidden, retain the rows without rendering them.
- Reject HTML/control characters and enforce server-side text length limits.
- Enforce unique `(homePageContentId, sortOrder)`.
- Reordering keeps stable IDs and normalizes order to contiguous integers.
- There is no row-level publish state or independent mutation endpoint.

### Concrete Featured Reference tables

Only the relationships approved for the current fixed templates are modeled:

- `HomeFeaturedPortfolioProject(homePageContentId, portfolioProjectId, sortOrder)` with at most four rows;
- `AboutFeaturedTestimonial(aboutContentId, testimonialId, sortOrder)` with at most three rows.

Each table has real Foreign Keys, unique `(parentId, itemId)`, unique `(parentId, sortOrder)`, and `ON DELETE RESTRICT` from the referenced Content Item. Parent deletion is not an exposed operation; owned child cleanup may cascade from a parent only in maintenance/migration tooling.

MySQL cannot enforce a cross-row maximum of four/three with a simple constraint. The aggregate action enforces the limit and normalized contiguous order inside the transaction. The public reader skips unpublished referenced items but retains their rows; republishing restores their prior position. An empty selection means show none. Content Item deletion is blocked and returns the referencing page names and admin links—never cascade-deletes a Featured Reference.

A polymorphic `FeaturedReference(itemType, itemId)` table is rejected because MySQL cannot give it real Foreign Keys to multiple target tables. Concrete join tables are intentionally repetitive to preserve referential integrity and make reverse dependency queries explicit.

## Aggregate save, concurrency, and audit

A Page Content save is one domain operation, even when it changes parent fields, FAQ rows, visibility, and Featured References:

1. Re-authorize the actor according to current Content permissions.
2. Load and validate the complete aggregate and submitted version.
3. Normalize localized text and child ordering.
4. Begin an InnoDB transaction.
5. Conditionally increment the parent version; zero affected rows means conflict.
6. Apply child inserts/updates/deletes and reference ordering.
7. Write exactly one Audit Log row containing bounded before/after aggregate snapshots.
8. Commit, then revalidate trusted direct and reverse consumers.

The snapshot contains display fields, visibility, version, ordered FAQ rows, and ordered referenced item IDs. It excludes image bytes, absolute filesystem paths, sessions, secrets, rejected payloads, and derived Content Item copies. Child rows are not separate audit entities; reorder/save must read as one “edited Home Page Content” event.

`auditedEntity()` currently assumes one model row and a synchronous static revalidation callback. Implementation must deepen this single audit module with an aggregate mutation seam or equivalent transaction callback. It must not create AuditLog rows ad hoc in page actions.

## Image storage and lifecycle

### OG image

Continue using `PageSeo.ogImageKey`; do not add a Media Asset table. An absent key uses the approved site-wide fallback or omits `og:image`. Backfill does not manufacture an OG upload.

Every replacement uses a new immutable key under `public/seo/og/<page>/<generated>.jpg`. Store/decode/re-encode limits and failure behavior follow the security guardrail asset: compensate-delete a newly written file if the database mutation/conflict fails, and delete the old key only after a successful commit. A reconciliation task deletes only unreferenced keys older than a safety window.

### Home hero image

The Home hero becomes CMS-managed Page Content and therefore follows the same immutable generated-key lifecycle under a separate namespace such as `public/pages/home/hero/`. Backfill copies/re-encodes the current static hero into managed storage before Home cuts over. A missing hero blob must fall back to the existing static asset and surface an admin integrity warning rather than breaking the public page.

### Backup consequence

The current backup intentionally copies only `storage/private` and skips all public storage. Before either CMS image editor is enabled, backup/restore must include the bounded CMS namespaces `public/seo/og/` and `public/pages/`, not the whole public tree. Restore remains explicit so newer uploads are not silently overwritten. The database backup model order must also include every new parent/child table in Foreign-Key-safe order.

## InnoDB release gate

Production currently reports MyISAM tables. On MyISAM, Prisma transactions do not roll back and Foreign Keys are not enforced, invalidating the model's core guarantees. [The existing MyISAM investigation](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/22) is therefore a prerequisite for implementation release.

Before new schema or CMS writes:

1. Capture and download an off-host production snapshot.
2. Record `SHOW TABLE STATUS` and `SHOW CREATE TABLE` for every existing table.
3. Test `ALTER TABLE ... ENGINE=InnoDB` against a production-shaped copy, including the known AuditLog key-length constraints.
4. Convert production in a controlled maintenance window and verify every table engine, index, and relationship.
5. Run forced-failure proof that an entity mutation and Audit Log insertion roll back together.
6. Create new tables explicitly as InnoDB and verify rather than trusting the host's default engine.

If conversion is not feasible, Pages CMS mutations do not ship. Application-only delete checks or compensating audit writes are not accepted substitutes for database transactions and Foreign Keys.

## Backfill contract

Backfill is idempotent and derives values from authoritative current behavior:

| Target | Backfill source |
| --- | --- |
| PageSeo new booleans/version | `true/true`, version 1; preserve existing title/description/OG key |
| New Page Content rows | Current TH/EN message values named in the ownership decision |
| About additions | Preserve existing AboutContent fields; backfill new labels/visibility from messages/current rendering |
| Home FAQ | Current five `faq` message pairs in rendered order |
| Home featured projects | The four projects currently selected by the baseline latest-completed rule, frozen as explicit order |
| About featured testimonials | Up to three currently rendered published Testimonials, frozen as explicit order |
| Global CTA | Current shared CTA message values; preserve existing SiteSettings data |
| Home hero | Current static hero copied/re-encoded into managed public storage |

The one-time backfill runs only after additive DDL exists and while public pages still use old sources. Because production cannot run Prisma CLI/tsx directly, use the established temporary migration endpoint pattern:

- disabled unless an explicit `ENABLE_*` environment flag is set;
- protected by a high-entropy shared-secret header and server-side authorization;
- accepts no arbitrary table, key, path, or content input;
- performs deterministic upserts and returns only counts/digests;
- never logs the secret or content payload;
- is removed and cleanly redeployed immediately after verified use.

Verification compares row counts, ordered reference IDs, required TH/EN completeness, and deterministic normalized content digests against the baseline. Running it twice must produce no new rows or content changes.

## Expand → backfill → cutover deployment

### Phase 0 — engine and recovery readiness

- Resolve and verify the InnoDB prerequisite.
- Extend backup/restore for all new tables and CMS public-image namespaces.
- Run a restore drill on a disposable production-shaped database and storage root.

### Phase 1 — additive expansion

- Generate the canonical Prisma migration locally and regenerate the client.
- Produce an idempotent production SQL checklist because production has no `_prisma_migrations` table and DDL is applied manually through phpMyAdmin.
- Add columns/tables/indexes only; do not rename or drop anything.
- Verify exact production columns, engines, indexes, and constraints before restarting Passenger.
- The old application remains able to read/write its existing fields throughout this phase.

### Phase 2 — preparation release and backfill

- Deploy schema-aware preparation code while public pages and legacy admin editors still use old ownership.
- Run the gated one-time backfill.
- Verify data and storage, then disable and remove the endpoint in a clean redeploy.
- No new Pages CMS mutation is exposed before verification passes.

### Phase 3 — page-by-page cutover

- Enable registry/read/action/UI slices one page at a time.
- Move each page's Content and six-key Properties ownership together with its exact TH/EN, audit, revalidation, preview, and old-route verification.
- Remove the six moved forms from Settings in the same release boundary that exposes their Properties tabs, preventing dual writes.
- A missing Page Content row uses the complete message-backed record. An existing malformed record is an integrity failure; it never triggers per-field locale mixing.

### Phase 4 — compatibility observation

Keep temporary 307 route shims and additive legacy compatibility for at least 14 days after all six pages cut over. The window cannot end until:

- production-render verification passes for admin and both locales on all six pages;
- at least one real save per page proves audit and revalidation behavior;
- concurrency conflict and high-risk Properties confirmation paths pass;
- backup/restore including an OG image passes;
- no unresolved conflict, orphan-file, missing-blob, or content-integrity alert remains;
- a fresh off-host production snapshot exists.

### Phase 5 — separately verified cleanup

- Remove temporary redirects only after bookmark/operational approval.
- Remove compatibility-only code and documentation references in a dedicated commit/release.
- Tighten nullable legacy fields only when live data proves the constraint and the previous build remains rollback-compatible.
- Do not drop new content data or static message fallbacks; this design requires no destructive database contraction to be considered complete.

## Rollback matrix

| Failure point | Rollback behavior |
| --- | --- |
| InnoDB test/conversion fails | Stop before CMS DDL; restore/repair engine state from verified snapshot and keep old app |
| Additive DDL fails | Old app keeps serving; correct/re-run idempotent DDL before any restart |
| Preparation deploy fails | Revert application build; additive unused columns/tables remain harmless |
| Backfill fails | Keep old reads; rerun idempotently after correction; remove orphaned managed image from failed attempt |
| One page fails cutover | Revert that application slice/build; its new rows remain for investigation and retry |
| New Page Content row is absent | Whole-record static fallback preserves the public page in the requested locale |
| New row is incomplete/corrupt | Do not mix fields/locales; alert and roll back the affected page/read source |
| Properties save conflicts | Reject without database/audit/blob/cache change and reload latest record |
| Revalidation fails after commit | Data and audit remain committed; retry refresh operationally rather than claiming database rollback |
| OG/hero blob missing | Render approved fallback/old static asset and surface an admin warning |
| Full code rollback during 14-day window | Old app ignores additive page tables and continues reading messages/About/PageSeo; no down migration |
| Restore required | Restore schema-compatible DB plus explicitly selected private/CMS-public storage from the same snapshot |

After new Page Content edits, an old-build rollback can temporarily display the pre-CMS message copy for pages other than About; it does not destroy the newer database content. Operators must understand this visibility trade-off and preserve the database for forward recovery.

## Required constraints and verification queries

Implementation must prove, not assume:

- every production table involved reports `ENGINE=InnoDB`;
- the six PageSeo rows have complete TH/EN SEO values, safe robots defaults, and version 1+;
- each canonical Page Content singleton exists exactly once before cutover;
- every visible optional section satisfies its paired-content and minimum-child rules;
- FAQ/reference order is unique and contiguous;
- every Featured Reference resolves to an existing Content Item;
- delete attempts against referenced items fail without partial mutation/audit;
- a forced Audit Log failure rolls back the aggregate update;
- a stale version produces no side effect;
- all new backup tables restore in Foreign-Key-safe order;
- every referenced CMS image is retrievable after a restore drill.

## Implementation handoff

The sprint-planning ticket must schedule the InnoDB prerequisite and backup/restore support before schema expansion, and must keep preparation/backfill separate from public cutover. The live-verification ticket must cover both locales, real rendered metadata, route compatibility, conflict/high-risk flows, aggregate audit diffs, reverse-reference delete blocking, cache consumers, missing-record fallback, and backup/restore evidence.

No implementation may treat the typed prototype UI, current MyISAM behavior, broad `revalidatePath` side effects, or per-field locale fallback as a substitute for this contract.
