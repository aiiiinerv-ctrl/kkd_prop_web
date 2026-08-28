# Pages CMS content ownership decisions

Date: 2026-08-25
Wayfinder ticket: [Decide content ownership and CMS boundaries for the six pages](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/44)

## Status

Approved by the owner through a one-question-at-a-time grilling session. This document resolves content ownership and behavior only. It does not choose the Prisma schema, route implementation, component design, or migration mechanics.

## Canonical ownership model

### Page Content

Localized presentation content owned by one public page: hero copy, section headings, page-specific calls to action, and section visibility. Page Content may contain Featured References but never copies Content Item details.

### Shared Site Content

Localized presentation content reused unchanged across pages: global CTA banner, header, footer, and contact details. It has one site-wide owner. A page may only decide whether a shared section is visible.

### Content Item

A reusable business record, currently Service, Package, Portfolio Project, or Testimonial. Its business details have one owner regardless of the number of pages where it appears.

### Featured Reference

An ordered page-owned selection pointing to a Content Item. It controls presentation and placement only; it cannot override or copy the referenced item's business details.

These terms are also recorded in `CONTEXT.md`.

## Cross-page rules

### Fixed templates

- Page structure and section order are fixed by the page template.
- Admins cannot drag arbitrary sections into a new order.
- Optional sections have explicit visibility controls.
- Lists inside a section may be ordered through Featured Reference order or the Content Item's existing `sortOrder`.
- Required intro/hero sections cannot be hidden.

This deliberately avoids a general page builder. It preserves layout integrity, semantic heading order, accessibility, responsive behavior, and TH/EN parity.

### Localized content completeness

- Every required Page Content field must be complete in TH and EN before saving.
- Every visible optional section must have its required TH and EN fields complete.
- Optional fields may be empty only where the public component has an explicit “do not render this field” behavior.
- Hiding a section uses its visibility control, not empty strings.
- Migration backfills the current TH/EN message values into complete Page Content records.
- Message files provide an emergency whole-record fallback only when no Page Content record exists. They do not provide per-field fallback after CMS ownership begins.

### Featured Reference lifecycle

- Selection is explicit. An empty selection means “show no featured items,” never “automatically choose latest.”
- A visible section with zero usable references is hidden on the public page and shows a warning in admin.
- Migration may backfill the items currently rendered so the initial post-migration page matches the baseline.
- Admin selection lists contain existing Content Items; unpublished referenced items remain visible in admin with a warning state.
- An unpublished item is skipped on the public page while its reference and order remain stored.
- Republishing returns the item to its previous position.
- Deleting a referenced Content Item is blocked. Admin receives the referencing page names and links for removing the references first.
- No cascade deletion of Featured References: multi-page changes must be explicit and auditable.

### Permissions and audit

- ADMIN, SALES, MARKETING, and EDITOR may edit Page Content.
- ADMIN and MARKETING may see and edit Properties.
- Other roles do not see the Properties tab; direct Properties actions remain server-guarded.
- Existing Content Item publish/delete restrictions remain: EDITOR may create/update but cannot publish, unpublish, or delete.
- Page Content saves take effect immediately, matching existing content update behavior.
- Every Page Content and Shared Site Content mutation records before/after audit snapshots and revalidates every TH/EN consumer.

## Page field boundaries

### Home

Required Page Content:

- hero image and paired alt text;
- kicker;
- styled headline parts;
- subtitle;
- primary and secondary CTA labels;
- quick-contact label;
- hero proof label/title and three proof points;
- four feature labels; icons remain template-owned.

Optional fixed sections:

1. **Latest Works**
   - section heading;
   - three metric label/value pairs;
   - up to four ordered Portfolio Project Featured References;
   - view-all label.
2. **Services CTA**
   - badge, title, body, and link label.
3. **FAQ**
   - badge, title, introduction, LINE button label;
   - localized question/answer entries.

CTA destinations use typed internal-route presets. Page Content does not accept arbitrary URLs. Phone/social values stay in Shared Site Content. Service, Package, and Portfolio Project details stay with their Content Items.

### About

Required Page Content:

- intro title and introduction;
- optional credentials section title/description before the three credential cards;
- three credential title/description pairs; **icons selectable from a fixed Lucide allowlist** (defaults match legacy template);
- team section title/description;
- three team-discipline title/description pairs; **icons selectable from the same allowlist**.

Optional fixed sections:

1. **Credentials** — section heading (optional) + three fixed cards above.
2. **Team** — uses the three fixed team disciplines above.
3. **Stats**
   - editable localized labels;
   - values remain derived from verified data and cannot be typed manually.
4. **Testimonials**
   - localized heading/subtitle;
   - up to three ordered Testimonial Featured References.
5. **Global CTA** — visibility only; content comes from Shared Site Content.

No team-photo or unrendered presentation fields are added in this effort.

### Services

The Content tab contains two areas:

1. **Page Content**
   - required page title/subtitle;
   - System group heading and visibility;
   - Maintenance group heading and visibility;
   - global CTA visibility.
2. **Content Items**
   - existing Service CRUD, paired locale fields, kind, sort order, publication state, and existing permissions.

The public page shows every published Service in its kind group using `sortOrder`. It does not use Featured References on its own collection page. A group with no published Services is hidden as a whole. CTA labels and the global CTA remain shared. Stored Service images are not newly introduced into the public design in this effort.

### Packages

The Content tab contains two areas:

1. **Page Content**
   - required page title/subtitle;
   - localized empty-state message;
   - Seasonal heading/subtitle and visibility;
   - Payback heading and three system explanations, plus visibility;
   - global CTA visibility.
2. **Content Items**
   - existing Package CRUD, paired locale fields, size, price, features, sort order, publication state, and popular state.

The public page shows every published Package using `sortOrder`. At most one Package may have `isPopular`; choosing another clears the previous one. Seasonal production remains derived from `sizeKw` and is not free-form content. The Seasonal section uses the popular Package, falls back to the first published Package when none is popular, and hides when there is no published Package. Package images are not newly introduced into the list-page design. Package detail Properties remain outside this effort.

### Portfolio

The Content tab contains two areas:

1. **Page Content**
   - required page title/subtitle;
   - localized image disclaimer;
   - localized empty-state message;
   - global CTA visibility.
2. **Content Items**
   - existing Portfolio Project CRUD and permissions;
   - explicit image order, where the first image is the cover;
   - image reordering without mandatory re-upload.

The project grid is required and shows every published Portfolio Project using its curated `sortOrder`. Filter names, lightbox controls, and accessibility labels remain static UI translations. Home Featured References do not alter Portfolio's own order. With no published projects, the page renders its empty state rather than hiding the grid region.

### Calculator

Required Page Content:

- hero eyebrow, title, and subtitle;
- calculator-panel title and introduction.

Optional fixed section:

1. **Packages**
   - eyebrow, title, subtitle, and visibility;
   - published Package Content Items ordered by `sortOrder`;
   - hidden automatically when there are no published Packages.

Calculator inputs, result labels, placeholders, units, tier labels, interpolation templates, CTA labels/routes, formula constants, thresholds, savings, and payback calculations remain code-owned. Unrendered message keys for disclaimer/methodology do not become CMS fields in this effort; exposing them would create controls with no visible effect.

## Shared Site Content boundary

The global CTA banner currently reuses copy stored under the Home message namespace even though About, Services, Packages, and Portfolio consume it. Its target ownership is Shared Site Content in Settings:

- paired CTA title/subtitle;
- paired button labels;
- existing header, footer, and contact fields remain site-wide;
- pages own only CTA visibility.

A Shared Site Content mutation must revalidate every page that currently displays the changed section.

## Explicit non-goals

- arbitrary page-builder layout or section ordering;
- copying Content Item fields into Page Content;
- arbitrary CTA URLs;
- manually entered About metrics without a verified data source;
- editable Calculator formulas or operational labels;
- adding dormant/unrendered controls;
- introducing Service/Package images into public layouts merely because storage fields exist;
- moving the other four public pages into the Pages root.

## Handoff to dependent tickets

The data-model ticket must decide how these concepts are represented, constrained, migrated, and rolled back. The UX prototype must make the fixed-template boundary, missing-reference warnings, TH/EN completeness, permissions, and two-area entity-page Content tabs understandable without exposing implementation terminology to non-technical admins.
