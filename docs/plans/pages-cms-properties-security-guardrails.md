# Page Properties security threat model and guardrails

Status: wayfinding decision asset; no production implementation is included.

## Scope

This document defines the security contract for editable Page Properties on Home, About, Services, Packages, Portfolio, and Calculator. It covers authorization, untrusted metadata text, canonical paths, robots directives, Open Graph (OG) images, preview, concurrency, audit, storage cleanup, caching, and recovery.

Page Properties are typed metadata only. Raw `<meta>` HTML, arbitrary scripts, arbitrary header names, redirects, remote-image fetches, calculator variables, and public-page layout controls are outside this interface.

## Current-state findings and root causes

The existing system already provides important defenses:

- `updatePageSeo()` re-authorizes `ADMIN`/`MARKETING` inside the Server Action, validates the page key against `META_KEYS`, returns a minimal result, and mutates through `auditedEntity()`.
- `auditedEntity()` commits the entity mutation and immutable before/after Audit Log snapshots in one database transaction.
- Public uploads use generated storage keys outside Next's `public/` directory. Images are allow-listed, re-encoded to JPEG with Sharp, and served through `/files`.
- `pageMetadata()` uses Next.js's typed Metadata API rather than injecting head markup.

The new fields expose or amplify these existing gaps:

1. `pageSeoSchema` currently has no server-side length limits, control-character policy, or paired-locale completeness rule. UI counters are advisory only.
2. `PageSeo` has an `ogImageKey` column but the current action and renderer do not manage or emit it. Canonical and robots values are not modeled.
3. The current PageSeo revalidation list omits several public pages, so a successful metadata save can remain stale until timed revalidation.
4. Auth sessions carry role and active state in a seven-day JWT. `requireRole()` trusts that snapshot; a deactivated user or revoked MARKETING role can retain mutation authority until the token expires.
5. Current image actions correctly delete the old blob only after the database commit, but a newly stored blob can become orphaned if the database mutation fails.
6. `backup-db.mts` intentionally skips all `public/` storage. CMS-uploaded OG images would therefore be absent from backups even though their keys remain in the database.
7. PageSeo has no optimistic concurrency guard. Two authorized editors can silently overwrite each other's immediate saves.
8. The current sitemap is code-owned and lists the six pages regardless of per-page robots state, which can send contradictory indexing signals.

## Trust boundaries

Treat all of the following as untrusted even when the UI generated them:

- route/page keys, FormData values, hidden confirmation values, expected record versions, uploaded filenames, MIME headers, file extensions, and client preview state;
- Server Action identifiers and direct POST requests—the UI and proxy are not authorization boundaries;
- stored Page Properties when rendering metadata or the admin audit diff, because a previous version or migration may contain malformed values.

Trusted sources are the fresh server-side actor lookup, the six-page definition registry, server validation schemas, database state read inside the mutation transaction, generated storage keys, and the configured site origin.

## Locked RBAC contract

| Capability | ADMIN | MARKETING | SALES | EDITOR | Other roles |
| --- | --- | --- | --- | --- | --- |
| See Page Content | Yes | Yes | Yes | Yes | No |
| Mutate Page Content | Existing content rules | Existing content rules | Existing content rules | Existing content rules | No |
| See Properties tab/data | Yes | Yes | No | No | No |
| Mutate Page Properties | Yes | Yes | No | No | No |
| Change robots/canonical | Yes, with acknowledgement | Yes, with acknowledgement | No | No | No |
| Upload/remove OG image | Yes | Yes | No | No | No |

Every Properties read route and mutation must fail closed on the server. Hiding a tab or button is only a user-experience measure.

Before every Properties mutation, the server must re-read the actor by session user ID and verify that the account still exists, is active, and currently holds `ADMIN` or `MARKETING`. A stale JWT role alone is insufficient for this high-impact surface. The implementation may harden the shared authorization seam, but must not duplicate role logic in individual page actions.

The page identifier is an enum of exactly `home | about | services | packages | portfolio | calculator | contact`. The server maps it to the one trusted record and public routes; the client never chooses a database row ID or revalidation target.

## Server validation contract

The mutation schema must be strict and constructed from explicitly selected fields. Unknown keys are rejected rather than spread into Prisma data.

| Field | Required behavior |
| --- | --- |
| SEO title TH/EN | Both required after migration; trim and collapse whitespace; reject control characters and `<`/`>`; hard cap 120 Unicode code points; UI guidance at 60. |
| SEO description TH/EN | Both required; normalize to one line; reject control characters and `<`/`>`; hard cap 500 code points; UI guidance at 160. |
| OG title TH/EN | Optional; same text rules and 120-code-point cap. Empty means fall back to the same-locale SEO title inside the Page Properties record. |
| OG description TH/EN | Optional; same text rules and 500-code-point cap. Empty means fall back to the same-locale SEO description. |
| Canonical path TH | Optional normalized path beginning with `/th`; no origin, credentials, port, query, fragment, backslash, control character, or dot segment. Empty means the trusted self path. |
| Canonical path EN | Same rules, beginning with `/en`. Empty means the trusted self path. |
| Robots | Two real booleans: `index` and `follow`; missing or stringly values are rejected. Initial default for all six public pages is `true/true`. |
| OG image operation | Typed discriminated operation: keep, replace with exactly one file, or remove. Absence must not accidentally mean remove. |
| Concurrency | A server-issued record version is required and compared with current database state inside the mutation transaction. |
| Acknowledgement | The server recomputes whether the requested transition is high risk. A typed acknowledgement is required only when the transition is high risk; a client-provided flag cannot downgrade the classification. |

Canonical values are stored as same-site locale paths and combined with the configured site origin when rendering. This removes open-redirect, phishing, cross-origin canonical, SSRF, and environment-host leakage classes instead of trying to maintain a hostname denylist. TH canonical paths cannot point to `/en` and vice versa, preserving same-language canonical/hreflang alignment.

Metadata rendering must continue through Next.js's typed Metadata API. It must never use `dangerouslySetInnerHTML`, concatenate head markup, or render arbitrary metadata keys. Stored text is treated as plain text even after validation.

## High-risk transition rules

The server classifies these as High-risk SEO Changes based on the current database row and requested next state:

- `index: true → false`;
- `follow: true → false`;
- a canonical path changing from the trusted self path to any override;
- changing an existing canonical override to a different target.

Returning to `index/follow`, removing a canonical override back to self, and replacing/removing an OG image are not search-authority transfers, though they remain authorized and audited mutations.

For a high-risk transition, the UI must show the affected TH and EN URLs, the current value, the requested value, the likely search impact, and a clear confirmation action. The action independently detects the transition and returns `confirmation_required` without mutating when acknowledgement is missing. Confirmation prevents accidents; it does not grant permission.

Noindex pages must be excluded from the generated sitemap while remaining crawlable so search engines can observe the meta directive. `robots.txt` must not be used as the noindex mechanism. Canonical and hreflang generation must remain internally consistent and must not emit conflicting canonical tags.

## OG image security and lifecycle

Required upload pipeline:

1. Authorize the fresh actor before reading or decoding the file.
2. Accept exactly one JPEG, PNG, or WebP file, at most 5 MB. Reject SVG, GIF, PDF, remote URLs, multiple files, and empty files.
3. Treat filename, extension, and `Content-Type` only as hints. Decode with Sharp under an explicit input-pixel limit; decoding failure is rejection.
4. Auto-rotate, strip metadata, and re-encode to a bounded JPEG suitable for social preview. Use a generated key such as `public/seo/og/<page>/<cuid>.jpg`; never preserve the client filename and never overwrite a key already served with immutable caching.
5. Preview locally from the selected file without uploading. Revoke client object URLs when replaced/unmounted; preview never fetches an arbitrary remote URL.
6. Store the new blob, then run the version-checked audited database mutation. If the mutation fails or conflicts, best-effort delete the new blob. Delete the prior blob only after the database commit succeeds.
7. Cleanup failures must be reported to operational logging and handled by a reconciliation job that deletes only unreferenced keys older than a safety window. Never delete by user-supplied key.
8. A missing referenced blob must not break metadata rendering. Fall back to the approved site-wide OG asset, or omit `og:image` when no fallback exists, and surface an admin warning.

Before release, backup/restore must include CMS-managed `public/seo/og/` assets or storage must provide equivalent versioned durability. A database backup containing keys without their blobs is not a recoverable backup.

## Concurrency, audit, and failure behavior

- Use optimistic concurrency. If the submitted version is stale, do not update the row, upload reference, Audit Log, sitemap, or caches. Return a conflict state that asks the editor to review the latest data; never silently last-write-wins.
- The Page Properties update and its before/after Audit Log snapshots remain one database transaction through the single audited-mutation seam.
- Audit snapshots include the page key, all typed property values, OG storage key, robots values, canonical paths, and version. They never include file bytes, local filesystem paths, session data, secrets, or raw rejected payloads.
- The audit UI derives and highlights High-risk SEO Changes from before/after snapshots. Do not create a second audit writer merely for risk badges.
- Action results remain small typed unions such as `ok`, `validation_error`, `confirmation_required`, `conflict`, or a generic failure. Do not return Prisma rows, stack traces, filesystem paths, or decoder details.
- Validation failure, authorization failure, confirmation-required, and conflict paths perform no public revalidation. Successful saves revalidate the exact admin route, both locale public pages, sitemap when robots changed, and any shared preview/cache consumers.
- If audit insertion fails, the database mutation rolls back. If cache revalidation fails after commit, the save remains committed and must surface an operational error/retry path rather than pretending the database rolled back.

## Threat and edge-case matrix

| Threat or edge case | Impact | Required control | Verification evidence |
| --- | --- | --- | --- |
| SALES/EDITOR calls the action directly | Privilege escalation | Fresh server actor lookup and ADMIN/MARKETING allowlist | Direct action/E2E denial; no row, audit, blob, or cache change |
| MARKETING role is revoked while an old JWT remains | Revoked user can noindex pages | Re-read active actor and current role on every Properties mutation | Existing session fails after role/deactivation change |
| Client submits `booking` or an arbitrary PageSeo ID | Cross-scope mutation/IDOR | Six-key registry; server derives record ID | Invalid key rejected without database access/mutation |
| `<script>`, CRLF, NUL, bidi/control characters, or huge strings | Head/audit corruption, misleading UI, resource abuse | Plain-text normalization, forbidden characters, hard caps, typed Metadata API | Schema unit cases plus rendered-head assertion |
| External, protocol-relative, credentialed, queried, fragmented, or cross-locale canonical | Search authority transfer, phishing, inconsistent hreflang | Store locale-specific same-site paths only | Table-driven canonical schema tests |
| Accidental `noindex`/`nofollow` | Page disappears from search | Safe `true/true` default; server-derived high-risk acknowledgement; sitemap alignment | Confirmation and rendered robots/sitemap E2E |
| Spoofed MIME/extension or image decompression bomb | Code execution attempt or CPU/memory exhaustion | Decode/re-encode, pixel/file caps, single-file limit, no SVG | Malformed/spoofed/oversized/high-pixel fixtures rejected |
| DB conflict/failure after new image write | Orphaned public blobs | Compensating delete plus age-gated reconciliation | Forced DB failure leaves no referenced/orphan blob after cleanup |
| Old image deleted before commit | Broken OG metadata after rollback | Delete old key only after successful commit | Forced rollback keeps old blob and key available |
| Two editors save from the same version | Silent lost update/audit ambiguity | Optimistic version check in transaction | First save succeeds; second returns conflict with one audit row |
| Referenced OG blob is missing | Broken social preview | Site fallback or omit tag; admin warning | Delete fixture blob and verify stable metadata response |
| Public storage excluded from backup | Irrecoverable OG assets after restore | Include CMS OG namespace or equivalent versioned durability | Backup/restore drill restores row and retrievable blob |
| Revalidation list misses a locale/page/sitemap | Stale or contradictory metadata | Page registry owns exact consumers | TH/EN/admin/head/sitemap post-save assertions |

## Implementation boundaries for later tickets

- The data-model ticket decides the exact table/columns and version mechanism, but it must preserve this field and concurrency contract.
- The routing/cache impact ticket owns the six-page registry, exact revalidation targets, sitemap behavior, legacy SEO editor compatibility, and metadata composition.
- The verification ticket turns every matrix row above into automated unit/integration/E2E evidence where practical.
- The sprint plan must schedule backup/restore support before enabling OG uploads in production.
- The throwaway UI prototype is evidence of the interaction decision only. Its mocked confirmation and preview logic must not be promoted directly.

## Authoritative references

- [Next.js 16 Data Security guide](https://nextjs.org/docs/app/guides/data-security): Server Actions are externally reachable entry points and must authenticate, authorize, validate, and constrain return values.
- [Next.js 16 Metadata API](https://nextjs.org/docs/app/api-reference/functions/generate-metadata): canonical, Open Graph, robots, and alternates are structured metadata with defined URL composition and merge behavior.
- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html): allow-list formats, do not trust MIME headers, generate filenames, cap resources, authorize uploads, and store outside the webroot.
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html): protect audit integrity, sanitize event data, and exclude secrets and sensitive values.
- [Google Search canonical guidance](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls): use consistent self/same-language canonicals, avoid fragments and conflicting signals, and do not use noindex as canonicalization.
