# Research: About CMS enhancement security (icons & content)

Date: 2026-08-28  
Wayfinder ticket: [Research: About CMS security](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/81)  
Map: [Map: About page CMS — credentials heading, editable icons](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/77)

Related: inventory #78, edge #79, impact #80 · guardrails [`pages-cms-properties-security-guardrails.md`](pages-cms-properties-security-guardrails.md)

No code was changed.

## Scope

Security contract for **new and wired** About Page Content capabilities under map #77:

- Credentials section heading (new text fields)
- Optional per-card **icon** control (Lucide allowlist vs upload — decision #82)
- Wiring existing stats/testimonials label fields to admin + public
- Existing featured-testimonial selection (already shipped — regression check)

Page Properties (SEO/OG) and testimonial CRUD are **out of scope** except where About save touches featured IDs.

---

## Trust boundaries

**Untrusted:** all FormData strings, `featuredTestimonialIdsJson`, client `version`, icon key/file from browser, direct Server Action POSTs, proxy cookie alone.

**Trusted:** server `requireRole` + `canManageContent`, explicit `ABOUT_FIELDS` pick list, zod schemas, DB row loaded in transaction, generated storage keys (upload path only), fixed Lucide allowlist map (enum path).

Public `/th/about` and `/en/about` render stored text as **React text nodes** — no `dangerouslySetInnerHTML` on About cards today.

---

## Current defenses (reuse)

| Control | Evidence | Enhancement use |
| --- | --- | --- |
| `requireRole("ADMIN","SALES","MARKETING","EDITOR")` | `about-content.ts` L65 | Unchanged |
| `canManageContent` page gate | `pages/about/page.tsx` L8 | Unchanged |
| Explicit field list — no FormData spread | `ABOUT_FIELDS` L11–34 | **Extend** with new columns only |
| Optimistic `version` + `auditedAggregate` | L71–74, L107–136 | Unchanged pattern |
| Featured IDs server-validated | L90–97 | Unchanged |
| Featured max 3 | client + `slice(0, ABOUT_FEATURED_MAX)` | Unchanged |
| Delete testimonial blocked when featured | `testimonials.ts` L121–129 | Unchanged |
| `revalidatePath` only via aggregate on success | audit seam | Unchanged |
| Audit entity type `AboutContent` | `audit.ts`, `enum-labels.ts` | Snapshots grow with new fields |

**Gap (known, not introduced by this map):** `requireRole` trusts JWT role snapshot — same as About today; Properties guardrails recommend fresh DB actor lookup for high-impact surfaces. **Recommendation:** match About/Content tier (session role) unless contact-like site-wide fields are added later.

---

## Text field security (heading + labels)

Today `optionalPageText` (`page-content/primitives.ts`) trims and nulls empty strings but **does not** forbid `<`/`>` or control chars — unlike `plainMetaText` used for SEO.

| Field class | Current validator | Risk | Required control for new fields |
| --- | --- | --- | --- |
| Existing card copy | `optionalPageText` | Low — rendered as text; `<script>` visible literally | **Option A:** keep parity with existing About fields. **Option B (stricter):** migrate About content to `optionalPlainMetaText(max)` — broader diff |
| New cred section heading | (none yet) | Stored XSS if future template uses HTML | Use **`optionalPlainMetaText`** (e.g. max 120 title / 500 desc) for **new** fields minimum |
| Stats/testimonials labels (wire-up) | Already in schema via `optionalPageText` | Same as card copy | If wiring admin, consider tightening in same PR or follow-up |

**Recommendation for exec sprint:** new heading fields use `optionalPlainMetaText`; existing fields unchanged unless owner wants hardening pass (note in sprint plan).

Public render: continue text interpolation only; never add `dangerouslySetInnerHTML` for card copy.

---

## Icon security — two paths (#82)

### Path 1: Lucide allowlist enum (**recommended default**)

| Threat | Control |
| --- | --- |
| Arbitrary component / code injection | Server zod `enum([...])` of ~20–40 known icon names; public map `Record<AllowedIcon, LucideIcon>` — **never** `dynamic import(userInput)` |
| Unknown key in DB (tampered POST) | Reject on save; public fallback to slot default |
| XSS via icon | Lucide SVG components — no admin HTML |
| Audit leakage | Store icon **name string** only (e.g. `"Building2"`) |
| Semantic swap (engineer text + building icon) | UX/policy — not auth |

**Verify:** POST invalid icon → validation error; audit diff shows string change only.

### Path 2: Per-card image upload (**Tier C — high scrutiny**)

Mirror [`pages-cms-properties-security-guardrails.md`](pages-cms-properties-security-guardrails.md) OG pipeline and portfolio `storePublicImages`:

| Threat | Control |
| --- | --- |
| SVG / HTML masquerading as image | **Reject SVG**; allow jpeg/png/webp only; Sharp decode + re-encode JPEG |
| Decompression bomb | Pixel/input caps (Properties doc) |
| Client-supplied storage key / path | Server generates `public/pages/about/icons/<slot>/<cuid>.jpg` |
| IDOR delete | Delete only keys from DB snapshot after successful commit |
| DB fail after upload | Compensating delete new blob (S6 / Properties orphan rule) |
| `private/` key misuse | Assert prefix `public/pages/about/` |
| Backup gap | Include `public/pages/about/` in backup before prod enable (#57 pattern) |
| Immutable cache + overwrite | New cuid per replace — never overwrite served key |

**Do not** accept remote URL fetch for icons (SSRF).

**Verify:** malicious fixtures table; forced DB conflict leaves no orphan referenced blob.

---

## Featured testimonials (regression)

| Threat | Control | Status |
| --- | --- | --- |
| Client sends arbitrary testimonial UUIDs | Server `findMany` count match | **Shipped** |
| >3 featured | `slice(0, 3)` | **Shipped** |
| Featured unpublished testimonial | Allowed in DB; public filters published only | Document |
| IDOR — reference another tenant's testimonial | Single-tenant app; IDs global — validate existence only | OK |

No change required unless new UI exposes ordering tampering beyond JSON array.

---

## RBAC matrix (unchanged)

| Capability | ADMIN | MARKETING | SALES | EDITOR | FINANCE/CE/EXEC |
| --- | --- | --- | --- | --- | --- |
| Mutate About Content | Yes | Yes | Yes | Yes | No |
| Mutate About Properties | Yes | Yes | No | No | No |

e2e-rbac already covers `/admin/content/about` → pages/about and FINANCE/CE blocks.

New icon/heading fields inherit **same** action — no separate endpoint.

---

## Threat matrix (enhancement-specific)

| ID | Threat | Impact | Required control | Verify |
| --- | --- | --- | --- | --- |
| A1 | FINANCE POST `updateAboutContent` | Privilege escalation | `requireRole` + page null return | e2e-rbac |
| A2 | Unknown FormData keys (`isAdmin=true`) | Column pollution | Explicit pick list only | Inject key ignored |
| A3 | Tamper `version` | Lost update / bad audit | Optimistic aggregate conflict | Double-tab save |
| A4 | HTML in new section heading | XSS if rendered unsafely | `optionalPlainMetaText` + text render | `<script>` literal |
| A5 | Huge strings DoS | DB/UI bloat | Max lengths on new fields | zod max |
| A6 | Invalid Lucide key | Broken public page | Enum + fallback icon | Tampered POST |
| A7 | SVG upload as icon | Stored XSS | Reject SVG; Sharp pipeline | Fixture |
| A8 | User-supplied delete key | Arbitrary file delete | Server-only key lifecycle | — |
| A9 | Audit snapshot with blob bytes | Leak / huge audit rows | Keys + text only | Audit UI |
| A10 | Error returns stack trace | Info leak | Typed `{ok}\|{error}\|{conflict}` | — |
| A11 | Fail path revalidates | Stale/wrong cache signal | Revalidate success only | — |
| A12 | Stale JWT EDITOR after deactivation | Unauthorized edit | Accept same gap as About today; optional hardening | Future |

---

## Audit snapshot contract (extended)

Include in before/after JSON:

- All `AboutContent` scalar fields (existing + new heading + icon keys)
- `featuredTestimonialIds` ordered array
- Visibility booleans
- `version`

**Never include:** file bytes, absolute filesystem paths, session tokens, rejected upload buffers.

Icon keys are display-safe strings (`"Wrench"`) or storage keys (`public/pages/about/icons/...`) — both OK in audit; no secrets.

---

## Recommendation for #82 grilling

| Option | Security posture | Ops cost |
| --- | --- | --- |
| **Lucide allowlist** | Strong; no new storage/backup surface | Low |
| **Keep icons fixed; text only** | Strongest; meets partial requirement | Lowest |
| **Upload per card** | Achievable with Properties-grade pipeline | High — backup + reconciliation |

Default recommendation: **Lucide allowlist** if owner requires “change icons”; else **text-only Tier A** first.

---

## Must-have before production write (checklist for #85)

1. Server zod for every new field; unknown keys rejected  
2. New heading fields use plain-text meta rules (or documented parity exception)  
3. Icon path decided: enum map **or** full upload pipeline + backup namespace  
4. No `dangerouslySetInnerHTML` on About cards  
5. Optimistic version + conflict UX unchanged  
6. Audit snapshots reviewed for new fields  
7. e2e-rbac still denies FINANCE/CE on About mutate paths  
8. Prod DDL before code (impact #80)  
9. If upload: compensating delete + no SVG — mandatory  

---

## Out of scope

- PageSeo / OG (Properties guardrails doc)  
- Testimonial photo upload (existing portfolio-style action)  
- Fresh DB actor lookup hardening (optional follow-up)  
- CSP / third-party scripts on public About  

---

## Sources

- `src/actions/about-content.ts`, `src/lib/validations/about-content.ts`, `src/lib/validations/page-content/primitives.ts`  
- `src/app/[locale]/about/page.tsx`, `src/actions/testimonials.ts`  
- `docs/plans/pages-cms-properties-security-guardrails.md`  
- Impact #80, edge #79  
