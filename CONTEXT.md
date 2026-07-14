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

**Payment Status**:
State of a Survey Booking's uploaded payment slip as staff review it: `PENDING_REVIEW → VERIFIED` or `REJECTED`. Distinct from Lead Status — a booking can be `VERIFIED` while its parent Lead is still `NEW`.

### Content

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
The pattern for DB-stored bilingual content: every user-facing text field exists twice as `xxxTh`/`xxxEn` (e.g. `titleTh`/`titleEn`), read through `pickLocale()` rather than a separate translation table. Static UI strings use a different mechanism (`src/messages/{th,en}.json`) — the two are not interchangeable.
_Avoid_: i18n field, translation column

### Admin & audit

**Admin User** (`AdminUser`):
A staff account with a `Role` (`ADMIN` or `EDITOR`) used to sign into the admin backend. Distinct from a public Lead contact — no relation between the two.

**Role**:
`ADMIN` (full access) or `EDITOR` (content/leads, not user management) — the two authorization tiers checked by `requireAdmin()`/`requireRole()`.

**Audit Log**:
An immutable record of one admin mutation (or login), storing full before/after JSON snapshots of the affected entity. Written by `withAudit()` as a wrapper around every create/update/delete — never constructed directly.
_Avoid_: Activity log, history

### Storage

**Public storage key**:
A file key namespaced `public/…`, served with immutable caching, safe for anyone to fetch (portfolio images, service photos).

**Private storage key**:
A file key namespaced `private/slips/…` (payment slip uploads), servable only to an authenticated admin session via the `/files` route. Never placed under Next's `public/` directory.
