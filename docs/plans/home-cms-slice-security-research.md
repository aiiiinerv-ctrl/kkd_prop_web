# Research: security analysis for Home CMS slice

Date: 2026-08-27  
Wayfinder ticket: [Research: security analysis for Home CMS uploads, contact URLs, FAQ CRUD](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/56)  
Map: [Map: Home CMS slice — hero, contact, Our service, FAQ](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/52)

Scope: threats and required controls **before enabling Home writes** for hero upload, shared contact URLs, FAQ CRUD, and Home Page Content text. Home SEO/Properties remain out of map #52 (reuse [`pages-cms-properties-security-guardrails.md`](pages-cms-properties-security-guardrails.md) only where the same upload/concurrency patterns apply).

No code was changed.

## Trust boundaries (Home Content)

Treat as **untrusted**: FormData fields, FAQ row IDs/order from the client, uploaded filenames/MIME/extensions, expected `version`, contact URLs/phone, preview blob URLs, Server Action direct POSTs, proxy/cookie presence alone.

Treat as **trusted**: fresh server actor (see gap below), server zod schemas built from explicit keys, DB state inside the mutation transaction, generated storage keys under `public/pages/home/…`, site origin / typed internal CTA presets, page registry key `home`.

## Current defenses to reuse

| Control | Evidence | Applies to Home slice |
| --- | --- | --- |
| Server Action `requireRole` | e.g. `about-content.ts`, `site-settings.ts` | Yes — every Home mutate |
| Audited mutation + snapshot in one tx | `auditedEntity()` in `src/lib/audit.ts` | Must **extend** for FAQ aggregate (not row-only) |
| Public image allow-list + re-encode | `validateImage` + `compressImage` + `storePublicImage` → `public/<prefix>/<cuid>.jpg` | Yes for hero; use dedicated prefix `pages/home/hero` (or equivalent) |
| `/files` serves only `public/` or `private/`; private auth-gated | `src/app/files/[...key]/route.ts` + `sanitizeKey` | Hero stays **public/** (immutable cache OK); never `private/` |
| Typed Metadata API for SEO | Properties guardrails | N/A this slice (SEO stays Settings) |
| Contact URL zod | `optionalUrl` in `site-settings.ts` validations | Reuse for Home contact fields |

## RBAC contract for this slice

Aligned with ownership decisions + current code:

| Capability | ADMIN | MARKETING | SALES | EDITOR | Other |
| --- | --- | --- | --- | --- | --- |
| View/mutate Home **Page Content** (hero copy, Our service, FAQ) | Yes | Yes | Yes | Yes | No |
| Mutate **contact/social** (SiteSettings) | Yes | Yes | No* | No* | No |
| Upload/replace **hero image** | Same as Page Content roles (ownership) | same | same | same | No |

\*Today `updateContactSettings` is `ADMIN`\|`MARKETING` only (`canManageSiteSettings`). Map wants Home-adjacent contact edit **without** a second store — **must not** let EDITOR/SALES mutate contact via a new Home action while Settings denies them. Implement contact through the **same** authorize helper as Settings.

**Gap vs Properties guardrails:** Properties require re-reading active user from DB on every high-impact mutate (stale JWT). Current `requireRole` uses session JWT role (`src/lib/auth/index.ts`). For Home Content, plan should at least match About today; for contact (site-wide) prefer **fresh actor lookup** like Properties contract when touching SiteSettings from Home.

UI hiding is not a control. Proxy admin cookie redirect is not authorization.

## Threat matrix (Home slice)

| ID | Threat | Impact | Required control | Verify |
| --- | --- | --- | --- | --- |
| S1 | FINANCE/CE/anonymous POSTs Home save | Privilege escalation | `requireRole` + page gate `canManageContent`; fail closed | e2e-rbac denial; no row/audit/blob |
| S2 | EDITOR mutates contact via Home form | Bypass Settings RBAC | Contact fields call shared Settings authorize (`ADMIN`\|`MARKETING` only) or omit fields for other roles server-side | Direct action denial |
| S3 | Mass-assign / unknown FormData keys into Prisma | Overwrite `id`, `version`, unrelated columns | Explicit field pick + zod; never `Object.fromEntries` whole FormData into update | Unit: inject `version=999` / unknown key ignored or rejected |
| S4 | Client supplies storage key / path to delete | Arbitrary file delete / IDOR | Server generates keys; delete only previous key from DB after commit; never delete user-supplied key | Attempt `../../../` key rejected |
| S5 | SVG/GIF/PDF / spoofed MIME as hero | XSS via stored file or resource exhaustion | Allow-list jpeg/png/webp; Sharp decode+re-encode JPEG; reject SVG; prefer pixel/input caps beyond current `validateImage` (MIME+ext+5MB are **hints** — Properties doc) | Malicious fixtures |
| S6 | Upload then DB conflict | Orphan public blob | Compensate-delete new key; delete old only post-commit | Forced conflict |
| S7 | Hero key under `private/` | Wrong auth model / broken public hero | Namespace must start `public/pages/…`; reader uses `/files` public cache | Key prefix assert |
| S8 | Backup skips public storage | Irrecoverable hero after restore | Include `public/pages/` in backup before prod upload enable (#57) | Restore drill |
| S9 | `javascript:` / `data:` / non-http contact URL | XSS via `href` on public Home | Tighten beyond bare `z.string().url()`: allow only `http:`/`https:` (and empty→null); phone not used as HTML | Table-driven URL tests |
| S10 | Open redirect via Our service / CTA | Phishing | Typed **internal route presets** only (ownership); no free URL column | Reject external URL |
| S11 | FAQ / hero copy with HTML/`<script>` | Stored XSS if ever `dangerouslySetInnerHTML` | Store plain text; render as text nodes only; strip/`<` policy + length caps (mirror Properties text rules where practical) | Render assert no script exec |
| S12 | FAQ HTML in admin preview | XSS in admin | Same plain-text; no `innerHTML` preview | — |
| S13 | Unlimited FAQ rows / huge strings | DoS / DB bloat | Max 12 (data-model default); per-field max lengths; normalize sortOrder in tx | 13th rejected |
| S14 | Client reorders using another home’s FAQ ids | IDOR across tenants/rows | All child IDs must belong to the singleton Home parent loaded server-side | Foreign id rejected |
| S15 | Stale version last-write-wins | Lost update / audit lies | Optimistic `version` in aggregate tx (needs InnoDB) | Second save → conflict |
| S16 | Audit snapshot leaks paths/bytes/PII extras | Secret/path exposure | Snapshot: display fields, visibility, version, ordered FAQ text, hero **key** only — no bytes, no absolute paths, no session | Audit UI review |
| S17 | Error returns Prisma/stack/paths | Info leak | Typed `{ok}\| {error}\| {conflict}` unions only | — |
| S18 | Fail path still `revalidatePath` | Cache confusion / info about success | Revalidate only after successful commit | — |
| S19 | MyISAM “transaction” | Partial FAQ write without audit | Foundation gate #57 before writes | — |

## Image lifecycle (hero) — required sequence

Mirror Properties OG pipeline adapted to Content roles:

1. Authorize actor (Page Content roles).  
2. Accept one jpeg/png/webp ≤5MB; Sharp rotate/resize/re-encode JPEG.  
3. Put `public/pages/home/hero/<cuid>.jpg` (immutable new key).  
4. Version-checked aggregate DB+audit commit.  
5. On failure/conflict → delete new blob.  
6. On success → delete previous key if replaced.  
7. Missing blob → static `/marketing/hero-solar.jpg` fallback + admin warning (data-model).

Current `storePublicImage` does steps 2–3 but **does not** compensate on DB failure (callers delete old after success only). Home implementation must close S6 explicitly.

## FAQ CRUD security notes

- Children are not separately authorized entities; only the Home aggregate action mutates them.  
- Deletes are part of the aggregate payload, not a public `deleteFaq(id)` without parent version check.  
- Empty visible FAQ → validation failure (see edge catalog), not “delete all then hide quietly” without visibility flag.

## Contact URL / phone notes

- Reuse Settings schema path; empty URL → null; public fallbacks today are hard-coded in `home-content.tsx` — decide empty behavior without inventing Home-only URLs.  
- `rel="noopener noreferrer"` on external anchors (already on Home LINE/FB).  
- Do not fetch remote URLs server-side for “preview” (SSRF).

## Controls that are **out of scope** this slice (still relevant later)

- Canonical/robots high-risk acknowledgement (Properties).  
- Sitemap index toggles.  
- OG image under `public/seo/og/`.

## Must-have before production Home write (checklist for #58 / #57)

1. InnoDB + FK + aggregate audit seam with version.  
2. Explicit zod allow-lists; no mass-assign.  
3. Hero upload compensate-delete + `public/pages/` backup.  
4. Contact RBAC identical to Settings; http(s)-only URLs.  
5. Plain-text FAQ/copy rendering; CTA presets only.  
6. RBAC e2e denials + conflict test + malformed upload fixtures.

## Sources

- `docs/plans/pages-cms-properties-security-guardrails.md`  
- `docs/plans/pages-cms-content-ownership-decisions.md`  
- `docs/plans/pages-cms-data-model-migration-decision.md`  
- `src/lib/audit.ts`, `src/lib/admin-content.ts`, `src/lib/storage/*`, `src/lib/images.ts`  
- `src/app/files/[...key]/route.ts`, `src/lib/auth/index.ts`  
- `src/actions/site-settings.ts`, `src/actions/about-content.ts`, `src/actions/services.ts`  
- Map #52 Notes; edge/impact research assets  
