# KKD PROPERTY

Bilingual (TH/EN) marketing site + admin backend for a solar installation company. Public visitors submit leads through two flows; staff work those leads to close through an admin backend whose every mutation is audited.

## Language

### Lead capture

**Lead**:
A prospective customer's submission from the public site, holding contact info, building type, and province. Every Lead is either a Quote or a Survey — the `type` field distinguishes them, not separate models.
_Avoid_: Inquiry, submission, contact

**Quote** (Lead type: `QUOTE`):
A Lead requesting a price estimate only — no site visit scheduled. The lighter-weight of the two capture flows.
_Avoid_: Estimate request

**Survey Booking** (Lead type: `SURVEY`):
A Lead that has also booked a paid, in-person site survey — carries an address, a time slot, and a payment slip upload. A one-to-one extension of a Lead (`SurveyBooking.leadId` is unique), not a separate pipeline.
_Avoid_: Site visit, appointment

**Lead Status**:
The pipeline stage of a Lead: `NEW → CONTACTED → QUOTED → WON/LOST`. Tracked on the Lead itself, not derived.
_Avoid_: Stage, phase

**Channel** (`PromoChannel`):
The marketing source a Lead was attributed to (e.g. a specific ad campaign or referral slug). A Lead has at most one Channel.
_Avoid_: Source, campaign (campaign is a property of a Channel, not the concept itself)

**Lead Intake**:
The module that accepts Leads from the public site: the shared quote/survey schemas (`src/lib/validations/lead.ts`) are its single validation interface — driving both the booking form's `zodResolver` and the submit actions' server-side re-validation — and the capacity rule, slip compression, and rate limit all sit behind its seam. Validation failures cross the seam as per-field machine codes translated by the client.
_Avoid_: Booking flow, form submission pipeline

**Payment Status**:
State of a Survey Booking's uploaded payment slip as staff review it: `PENDING_REVIEW → VERIFIED` or `REJECTED`. Distinct from Lead Status — a booking can be `VERIFIED` while its parent Lead is still `NEW`.

### Content

**Page Content**:
Localized presentation content owned by one public page, such as its hero, section headings, calls to action, and section visibility. It may select reusable Content Items but never owns copies of them.
_Avoid_: Page copy, page settings

**Shared Site Content**:
Localized presentation content intentionally reused unchanged across multiple public pages, such as the global call-to-action banner, header, footer, and contact details. It has one site-wide owner; individual Page Content may control only whether a shared section is shown.
_Avoid_: Global page content, copied shared content

**Content Item**:
A reusable business record that can appear on one or more public pages, such as a Service, Package, or Portfolio Project. Its business details have one owner regardless of where the item is displayed.
_Avoid_: Page item, section item

**Featured Reference**:
An ordered selection from Page Content to an existing Content Item. It controls where an item is featured without copying or overriding the item's business details.
_Avoid_: Featured copy, duplicated item

**Service**:
A published offering shown on the public site (e.g. installation, maintenance), distinguished by `kind` (`SYSTEM` vs `MAINTENANCE`).

**Package**:
A specific priced solar system configuration (kW size, price, features) a customer can choose, shown alongside Services.

**Portfolio Project**:
A completed installation shown as a case study, categorized by `BuildingType` and optionally linked to Testimonials.

**Testimonial**:
A customer quote, optionally attached to a Portfolio Project. Unpublished by default (`isPublished` defaults false) — requires explicit admin approval before appearing publicly.

### Localized content

**Paired locale columns**:
The pattern for DB-stored bilingual content: every user-facing text field exists twice as `xxxTh`/`xxxEn` (e.g. `titleTh`/`titleEn`), rather than a separate translation table. Resolving a pair to one string is the **Content module**'s job — pages receive a **Content view-model** and never see the pair. Static UI strings use a different mechanism (`src/messages/{th,en}.json`) — the two are not interchangeable.
_Avoid_: i18n field, translation column

**Content module**:
`src/lib/content/` — the only way public pages read content. Each reader answers one question a page asks (`getPublishedPackages`, `getLatestProjects`, …) and owns what counts as published, how rows are ordered, how paired locale columns resolve, and how storage keys become URLs. Readers are memoized per request, so callers may repeat them freely.
_Avoid_: repository, data layer

**Content view-model**:
What a reader returns: a display-ready object (`PackageView`, `ProjectView`, …) with one resolved string per field and image URLs already built. Public pages render these directly — a page that reaches past them for a DB row has bypassed the module.
_Avoid_: DTO, presenter

### Admin & audit

**Admin User** (`AdminUser`):
A staff account with a `Role` (`ADMIN` or `EDITOR`) used to sign into the admin backend. Distinct from a public Lead contact — no relation between the two.

**Role**:
`ADMIN` (full access) or `EDITOR` (content/leads, not user management) — the two authorization tiers checked by `requireAdmin()`/`requireRole()`.

**Audit Log**:
An immutable record of one admin mutation (or login), storing before/after JSON snapshots of the affected entity. Written only by the **Audited mutation** module — never constructed directly.
_Avoid_: Activity log, history

**Audited mutation**:
The module in `src/lib/audit.ts` through which every admin create/update/delete passes. `auditedEntity()` is declared once per entity (its model, its snapshot policy, the pages it feeds) and returns create/update/remove; each runs the mutation and its Audit Log row in one transaction, so a committed change cannot exist without its trail. `recordAuditEvent()` covers the non-mutation case (login). Authorization stays outside it, at the action, because the rule differs per action.
_Avoid_: audit wrapper, withAudit (the earlier callback-shaped version)

### Storage

**Public storage key**:
A file key namespaced `public/…`, served with immutable caching, safe for anyone to fetch (portfolio images, service photos).

**Private storage key**:
A file key namespaced `private/slips/…` (payment slip uploads), servable only to an authenticated admin session via the `/files` route. Never placed under Next's `public/` directory.
