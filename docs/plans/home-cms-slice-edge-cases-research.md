# Research: edge-case catalog for Home CMS slice

Date: 2026-08-27  
Wayfinder ticket: [Research: edge-case catalog for Home CMS slice](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/54)  
Map: [Map: Home CMS slice — hero, contact, Our service, FAQ](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/52)  
Depends on inventory: [`home-cms-slice-inventory-research.md`](home-cms-slice-inventory-research.md)

## Method

Catalog edge cases the **sprint plan must explicitly handle** before implement. Each row cites a primary source (approved decision, current code, or map Notes). No code was changed.

Scope = map #52 only: Hero (+ shared contact), Our service, FAQ. Latest Works / SEO out.

## Decision tension to resolve at sign-off (#60)

| Topic | Map #52 Notes (charting) | Approved data-model decision | Plan must pick one |
| --- | --- | --- | --- |
| FAQ max when section visible | สูงสุด **20** | **1–12** rows when FAQ visible (`pages-cms-data-model-migration-decision.md`) | Prefer **12** unless owner reopens charting — data-model is the committed CMS contract; 20 was a charting convenience |

Until #60, treat **12** as the planning default and list “reject >12” as the server edge case; note map said 20 so owner can override.

## Catalog

Severity: **Blocker** = must design before write; **High** = must be in DoD/live-verify; **Med** = handle with clear UX; **Low** = document only.

### A. FAQ list

| ID | Edge case | Expected behavior (from sources) | Severity | Verify idea |
| --- | --- | --- | --- | --- |
| F1 | FAQ section visible + **0 items** | Map: hide section on public + admin warning. Data-model: when visible require **1–12** rows — **reject save** if visible and empty. Prefer reject-on-save + hide only if visibility=false | Blocker | Save visible+0 → validation_error; set hidden+0 → public omits FAQ |
| F2 | FAQ **> max** (12 default / 20 if owner insists) | Enforce in aggregate action (MySQL cannot CHECK cross-row max) | Blocker | UI disables add; server rejects 13th |
| F3 | Item missing TH or EN Q/A | Ownership: required fields complete in both locales before save | Blocker | Partial EN → no DB write, no audit |
| F4 | Duplicate / gaps in `sortOrder` | Normalize contiguous unique order in transaction; unique `(parentId, sortOrder)` | High | Reorder then save; DB unique holds |
| F5 | Delete all items while section still “visible” | Same as F1 — cannot leave visible empty | High | Confirm UI forces hide or keeps one item |
| F6 | Soft-delete confirm then cancel | No partial child delete outside aggregate save | Med | Cancel leaves previous list |
| F7 | Backfill of current 5 FAQs | Data-model: backfill five `faq` message pairs in order | High | Digest matches messages before cutover |
| F8 | Public open accordion index after list shrinks | Current UI defaults `openIndex=0`; empty list must not assume index 0 | Med | 0 items → no accordion crash |

### B. Hero image

| ID | Edge case | Expected behavior | Severity | Verify idea |
| --- | --- | --- | --- | --- |
| H1 | Managed blob **missing** but key set | Fall back to static `/marketing/hero-solar.jpg`; admin integrity warning; page must not 500 | Blocker | Delete blob fixture; public still renders |
| H2 | Upload decode/size/MIME fail | Reject before DB; no key write (security guardrails + existing upload patterns) | High | Oversized/non-image → error, old hero remains |
| H3 | Blob written then **DB conflict/fail** | Compensate-delete new blob; keep old key | Blocker | Force conflict after store |
| H4 | Success then delete **old** key only after commit | No orphan old keys indefinitely; reconciliation for unreferenced aged keys | High | Two replacements; only latest key referenced |
| H5 | Cutover before backfill copy of static hero | Public must not point at empty key; backfill copies static into `public/pages/home/hero/` first | Blocker | Gate cutover on backfill digest |
| H6 | Alt text empty / one locale only | Ownership: paired alt required with image | High | Save blocked if altTh/altEn incomplete |
| H7 | Backup excludes public storage today | Before enabling hero upload in prod, backup must include `public/pages/` namespace | Blocker (ops) | Tied to #57 / foundation |

### C. Hero / Our service copy

| ID | Edge case | Expected behavior | Severity | Verify idea |
| --- | --- | --- | --- | --- |
| C1 | **No** `HomePageContent` row | Whole-record messages fallback for that locale page — **not** per-field mix | Blocker | Delete/hide row in staging; public matches messages |
| C2 | Row exists but editor clears a required field | Reject save; keep previous version | High | Empty subtitle → validation_error |
| C3 | Hide Our service via visibility vs empty strings | Ownership: hide with Boolean; empty strings are not hide | High | visibility=false omits section even if old text remains |
| C4 | Our service link destination | Typed internal preset only (e.g. `/services`); no arbitrary URL column | High | Reject `https://evil.example` |
| C5 | Required hero cannot be hidden | Ownership: intro/hero required | Med | No hide control on hero |
| C6 | Styled title parts (white/gold) one locale incomplete | Both parts required TH+EN | High | Partial pair rejected |

### D. Contact (Shared Site Content)

| ID | Edge case | Expected behavior | Severity | Verify idea |
| --- | --- | --- | --- | --- |
| T1 | Invalid LINE/Facebook URL | Current zod `optionalUrl` rejects non-URL; empty → null | High | `javascript:` / relative junk rejected |
| T2 | Empty phone/LINE/FB | Public uses hard-coded fallbacks in `home-content.tsx` today — plan must **decide** keep fallbacks vs hide icons when empty (UX); do not invent Home-only copies | High | Clear phone in Settings; document rendered result |
| T3 | Save contact from **Home** and **Settings** nearly same time | Same `SiteSettings` row; need version/`ctaVersion`-style or accept last-write on contact columns — data-model adds scoped versions for CTA; contact path today has **no version** (`about-content` / `updateContactSettings` last-write-wins) | Blocker | Two tabs save; define conflict or document LWW until SiteSettings versioned |
| T4 | Role: SALES/EDITOR edit Home content but not Settings contact today | Map wants Home-adjacent contact edit; Settings action is `ADMIN`\|`MARKETING` only — role policy must stay consistent (widen both or keep narrow on contact fields) | High | EDITOR cannot escalate via Home UI |
| T5 | Site-wide warning ignored | UX only; values still affect header/footer/contact pages | Med | Copy + confirm pattern |
| T6 | `tel:` / external link with spaces in phone | Current strip on render; store raw trimmed | Low | Display still dialable |

### E. Concurrency & audit (Home aggregate)

| ID | Edge case | Expected behavior | Severity | Verify idea |
| --- | --- | --- | --- | --- |
| X1 | Two editors save Home from same `version` | First wins; second conflict; **no** audit/blob/cache side effect | Blocker | Requires InnoDB + aggregate seam (#57) |
| X2 | FAQ reorder + parent copy in one save | One audit event “Home Page Content”; child not separate entities | High | Audit diff shows ordered FAQ list |
| X3 | Partial failure mid-child writes | Transaction rollback — MyISAM cannot; foundation gate | Blocker | Part of #57 |
| X4 | Stale admin tab after conflict | Reload latest aggregate; no silent overwrite | High | UI conflict state |

### F. Locale / i18n / rollback

| ID | Edge case | Expected behavior | Severity | Verify idea |
| --- | --- | --- | --- | --- |
| L1 | View `/en` after TH-only mental edit | Save always bilingual; public EN never falls back field-wise to TH | Blocker | Live-verify both locales |
| L2 | Messages still present after cutover | Emergency **whole-record** fallback only when row absent — not mixed | High | With row present, changing messages must not affect public |
| L3 | Rollback cutover (registry → legacy) | Prior build / legacy flag; messages + static hero return; preserve DB rows | High | Documented in mother sprint plan |
| L4 | next-intl missing key after removing message use | Keep messages until observation window ends (Sprint 11/12 pattern) | Med | Don’t delete keys in same release as cutover |

### G. Public UX / a11y

| ID | Edge case | Expected behavior | Severity | Verify idea |
| --- | --- | --- | --- | --- |
| U1 | FAQ answers with HTML/script pasted | Store plain text only; strip/reject HTML (security ticket deep-dive) | High | `<script>` not executed |
| U2 | Very long FAQ answers | Layout must not break hero/FAQ grid; consider max length in zod | Med | 5k chars |
| U3 | LINE button with empty `lineUrl` | Fallback URL today; after CMS, empty may hide button or keep fallback — decide with T2 | Med | Matrix row |
| U4 | Motion / accordion with `prefers-reduced-motion` | Keep existing reduce behavior | Low | Smoke |

## Minimum set the sprint plan must name explicitly

1. F1–F3, F2 max decision (12 vs 20)  
2. H1, H3, H5, H7  
3. C1, C3, C4  
4. T2, T3, T4  
5. X1, X3 (foundation)  
6. L1, L2  

## Out of catalog (deferred)

- Featured portfolio empty/unpublished (Latest Works out of map)  
- SEO/OG Properties conflicts (SEO out of map)  
- Calculator/formula edges  

## Sources

- Map #52 Notes (FAQ 20, hide when empty, live-verify, foundation)  
- `docs/plans/pages-cms-content-ownership-decisions.md`  
- `docs/plans/pages-cms-data-model-migration-decision.md`  
- `docs/plans/pages-cms-properties-security-guardrails.md`  
- `src/app/[locale]/home-content.tsx`, `src/components/site/faq-section.tsx`  
- `src/lib/validations/site-settings.ts`, `src/actions/site-settings.ts`, `src/actions/about-content.ts`  
- Inventory research #53 asset  
