# Research: About CMS enhancement edge-case catalog

Date: 2026-08-28  
Wayfinder ticket: [Research: About CMS edge cases](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/79)  
Map: [Map: About page CMS — credentials heading, editable icons](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/77)  
Depends on: [`about-cms-enhancement-inventory-research.md`](about-cms-enhancement-inventory-research.md) (#78)

## Method

Catalog edge cases the **sprint plan and live-verify matrix must name explicitly** before implement. Each row cites primary sources (inventory #78, ownership doc, current code). No code was changed.

Scope = map #77: credentials section heading, optional icon control, text completeness (stats/testimonials), within existing About template (3+3 cards).

Severity: **Blocker** = design before write; **High** = DoD/live-verify; **Med** = clear UX; **Low** = document only.

## Decision tensions (resolve at #82–#83, not here)

| Topic | Options | Plan must pick |
| --- | --- | --- |
| Icon model | Lucide allowlist enum vs image upload vs icons stay fixed | #82 grilling |
| Credentials heading required? | Optional empty (hide heading) vs required when `showCredentials` | #83 grilling |
| Stats section title | Add `statsSectionTitle*` vs wire labels only vs add `numbersTitle` to AboutContent | #83 grilling |
| EN blank fields | Current: `pickLocale` falls back EN→TH on public; admin says “เว้น EN ได้” | Keep existing behavior for new fields |

---

## A. New credentials section heading

| ID | Edge case | Expected behavior | Severity | Verify |
| --- | --- | --- | --- | --- |
| S1 | `showCredentials=false` but heading fields filled | Hide entire credentials band including heading; stored text preserved | High | Toggle off → no heading/cards on `/th`+`/en` |
| S2 | `showCredentials=true` + heading empty | **TBD #83:** render cards only (today) vs require heading vs fallback message key | Blocker | Matrix row after grilling |
| S3 | Heading filled, all three card titles empty | Section shows heading + three empty card shells | Med | Avoid 500; admin helper text |
| S4 | Very long heading/subtitle | `SectionHeading` must not overflow hero band; consider max length in zod (plain text) | Med | 200+ char TH copy |
| S5 | Backfill after migration | Additive columns null → public matches today (no heading) until admin saves | High | Idempotent backfill; digest note |
| S6 | Whole-record fallback when no `AboutContent` row | New heading fields must not render from messages unless a dedicated message key is added — prefer empty until row exists | High | No row → same as today |

---

## B. Editable icons (if #82 unlocks)

### B1. Lucide allowlist (recommended default in security #81 preview)

| ID | Edge case | Expected behavior | Severity | Verify |
| --- | --- | --- | --- | --- |
| I1 | Invalid / unknown icon key in DB | Server rejects on save; public falls back to slot default Lucide | Blocker | Tampered POST → validation_error |
| I2 | Icon key valid but component not bundled | Build-time allowlist map only imports known icons | Blocker | Enum zod + `Record<string, LucideIcon>` |
| I3 | Admin swaps icon on card 2 but leaves engineer copy on card 2 | Allowed — semantic mismatch is owner responsibility (today’s position-fixed warning becomes picker UX) | Med | Document in admin |
| I4 | Empty icon field | Fall back to current default per slot index | High | Null → Building2 on cred slot 1 |
| I5 | Audit snapshot stores icon keys | No secrets; keys are plain strings | Low | Audit diff readable |

### B2. Image/SVG upload (if owner picks upload in #82)

| ID | Edge case | Expected behavior | Severity | Verify |
| --- | --- | --- | --- | --- |
| I6 | SVG with script | Reject or sanitize; never render raw SVG from admin | Blocker | Security #81 |
| I7 | Oversize / wrong MIME | Reject before storage write | High | Same as portfolio image guards |
| I8 | Blob written then DB conflict | Compensate-delete new blob | Blocker | Hero pattern |
| I9 | Six small icons vs one shared style | Card layout expects ~32px in circle — raster blur | Med | Prototype #84 |

---

## C. Existing text fields (already shipped)

| ID | Edge case | Expected behavior | Severity | Verify |
| --- | --- | --- | --- | --- |
| T1 | All optional text empty but row exists | Public shows empty strings, not message fallback, when `usePages && hasRow` (`pick()` L40–43) | High | Clear all fields save → blank sections |
| T2 | EN blank, TH filled | Public `/en` shows TH via `pickLocale` | High | Live-verify `/en/about` |
| T3 | HTML in textarea | `optionalPageText` does not strip `<` — renders as text in React (escaped) | Med | `<b>` visible as literal |
| T4 | Card title empty, desc filled | Card shows blank `<h3>` + desc | Med | Admin helper warns |
| T5 | Swapping copy between cards without moving icons (fixed icons) | Icons stay with slot — meaning can mismatch | Med | Already documented in admin |

---

## D. Section visibility toggles

| ID | Edge case | Expected behavior | Severity | Verify |
| --- | --- | --- | --- | --- |
| V1 | All sections hidden | Page still shows hero + legal footer; no empty `<section>` shells | High | All toggles off |
| V2 | `showStats=true` but all stat values null-skipped | `StatsRow` returns null when `visibleStats.length===0` | High | No projects/leads in DB |
| V3 | `showTestimonials=true` but zero published testimonials | `TestimonialsSection` returns null | High | Empty catalog |
| V4 | `showGlobalCta=false` | `CtaBanner` omitted; Shared CTA content unchanged | Med | Toggle |
| V5 | Featured IDs set but all unpublished | Public filters to empty → testimonials section null while toggle true | High | Select unpublished in admin |

---

## E. Featured testimonials (max 3)

| ID | Edge case | Expected behavior | Severity | Verify |
| --- | --- | --- | --- | --- |
| F1 | Select 4th testimonial | UI toast max 3; server slices `featuredIds.slice(0, ABOUT_FEATURED_MAX)` | High | Client + server |
| F2 | Featured ID deleted from testimonials admin | `deleteTestimonial` blocked if featured (`testimonials.ts` L121–129) | High | Error message TH |
| F3 | Featured unpublished testimonial | Checkbox disabled for new selection; existing selection can remain until save | Med | Admin list |
| F4 | Curated order vs `sortOrder` on testimonial model | About featured uses selection order in JSON → `sortOrder` 1..n on join table | Med | Order matches UI |
| F5 | Empty featured list | Public falls back to **all** published testimonials | High | Default behavior Sprint 6 |
| F6 | Featured ID not found on save | Server rejects (`found.length !== featuredIds.length`) | Blocker | Stale ID tamper |

---

## F. Stats labels & section title (partial wiring)

| ID | Edge case | Expected behavior | Severity | Verify |
| --- | --- | --- | --- | --- |
| N1 | DB labels set, public still reads `home` messages | **Today’s bug/gap** — wiring must pass About labels into `StatsRow` or wrapper | Blocker | After Exec, `/th/about` shows DB label |
| N2 | Label empty in DB | Fall back to `home` message label or hide label line — **pick at #83** | High | Matrix row |
| N3 | `numbersTitle` in messages unused | If stats section title added, do not confuse with credentials heading | Med | Naming in admin |
| N4 | Stat value override null | About passes `statsYearsValue: null` etc. — skips stat entirely | High | Only projects/customers may show |
| N5 | `showStats=false` | Entire stats band hidden regardless of labels | Med | Toggle |

---

## G. Testimonials chrome (schema exists, admin UI missing)

| ID | Edge case | Expected behavior | Severity | Verify |
| --- | --- | --- | --- | --- |
| M1 | DB title empty | Public uses `testimonials` message namespace defaults (`TestimonialsSection` L30–31) | High | Already works |
| M2 | DB title set | Overrides message title for both locales via `pickLocale` when wired | High | After admin UI |
| M3 | Subtitle only one locale | EN falls back to TH subtitle via `pickLocale` | Med | `/en` check |

---

## H. Concurrency, audit, cache

| ID | Edge case | Expected behavior | Severity | Verify |
| --- | --- | --- | --- | --- |
| X1 | Two editors same `version` | Second gets `{ conflict: true }`; toast reload | Blocker | e2e pattern from about save |
| X2 | No row on first save | Action returns “ไม่พบเนื้อหา” — admin must seed/backfill row first | High | Empty DB state banner |
| X3 | ISR `revalidate=300` | After save, `contentRevalidatePaths("about")` must include `/th/about`, `/en/about` | High | Save → curl within 5m |
| X4 | Audit snapshot size with new icon keys | Still JSON-safe; no blob bytes in audit | High | Audit page diff |
| X5 | Properties tab SEO save concurrent with Content | Separate models/versions — independent conflicts | Med | Two tabs |

---

## I. Locale / rollback / Sprint 12

| ID | Edge case | Expected behavior | Severity | Verify |
| --- | --- | --- | --- | --- |
| L1 | Message whole-record fallback when row absent | Sprint 11/12 rule: changing messages must not affect public when row present | High | With row, messages static |
| L2 | Legacy `/admin/content/about` 307 | Still works until Sprint 12 removes shim | Low | e2e-pages-cms |
| L3 | Rollback deploy without new columns | Old app ignores new columns; additive DDL only | Blocker | Impact #80 |

---

## J. Public UX / accessibility

| ID | Edge case | Expected behavior | Severity | Verify |
| --- | --- | --- | --- | --- |
| U1 | Unequal desc length in 3 cards | Layout uses equal-height cards; long desc stretches row | Med | Visual check mobile |
| U2 | Icon-only change (Lucide) | Decorative in circle — no separate alt per icon today | Low | a11y: paired text required |
| U3 | `Reveal` motion | Existing reduced-motion behavior preserved | Low | Smoke |
| U4 | Empty `<h3>` on credential card | Screen reader hears blank heading | Med | Prefer non-empty title helper |

---

## Minimum set for sprint plan (#85) / live-verify matrix

1. **S1–S2, S5–S6** (credentials heading)  
2. **I1–I4** if Lucide path; **I6–I8** if upload path  
3. **T1–T2, V1–V3, V5**  
4. **F1–F2, F5–F6**  
5. **N1–N2, N4** if stats labels in scope  
6. **X1–X3**  
7. **L1, L3**

---

## Out of catalog

- Full About page re-layout or 4th credential card (ownership: count template-owned)  
- Testimonial CRUD edges (covered elsewhere)  
- PageSeo Properties tab (already shipped)  
- Sprint 12 shim removal timing (#80)

## Sources

- Inventory #78 asset  
- `src/app/[locale]/about/page.tsx`, `about-client.tsx`, `about-content.ts`  
- `src/lib/i18n-content.ts`, `src/lib/validations/page-content/primitives.ts`  
- `src/components/site/stats-row.tsx`, `testimonials-section.tsx`  
- `src/actions/testimonials.ts`  
- `docs/plans/pages-cms-content-ownership-decisions.md`
