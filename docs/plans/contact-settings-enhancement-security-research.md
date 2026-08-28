# Research: Contact settings security guardrails

Date: 2026-08-28  
Wayfinder ticket: [Research: Contact settings security guardrails](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/92)  
Map: [Map: Contact settings — admin แก้ติดต่อ/โซเชี่ยล](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/88)

Related: inventory #89 · guardrails [`pages-cms-properties-security-guardrails.md`](pages-cms-properties-security-guardrails.md) · site-content CMS task #27

No code changed.

## Scope

Security contract for **existing and wired** SiteSettings contact/social path under map #88:

- Admin mutations (`updateContactSettings`)
- Public render (footer, contact page, external links, JSON-LD)
- RBAC gates

Payment settings, booking capacity, PageSeo, header/footer tab are **out of scope** except shared `requireRole` patterns.

---

## Trust boundaries

**Untrusted:** FormData strings (phone, email, URLs, bilingual text), direct Server Action POSTs, proxy cookie alone.

**Trusted:** server `requireRole("ADMIN","MARKETING")`, explicit field list in action (no spread), zod schemas, `auditedEntity` snapshot, fixed social icon map (no dynamic user icon names).

Public renders contact values as **React text nodes** in cards/footer — social links are `<a href={url}>` with `rel="noopener noreferrer"` on external targets (contact page L74–76, footer L84–88).

---

## Current defenses (reuse — already shipped)

| Control | Evidence | Status |
| --- | --- | --- |
| `requireRole("ADMIN","MARKETING")` | `site-settings.ts` L49 | ✓ |
| `canManageSiteSettings` sidebar gate | `admin-sidebar.tsx`, auth L210 | ✓ |
| Explicit field allowlist in action | L51–57 — named keys only | ✓ |
| Zod URL: empty or valid URL | `optionalUrl` in `site-settings.ts` validation | ✓ — blocks non-URL schemes if zod.url() strict |
| Zod email optional | L20–26 | ✓ |
| `auditedEntity({ snapshot: "full" })` | No secrets in SiteSettings columns | ✓ |
| EDITOR/FINANCE cannot call mutation | e2e-rbac-sprint2 | ✓ |
| Home ContactSection gated `canMutateContact` | home-client L767 | ✓ |

**Gap (pre-existing, acceptable):** `optionalUrl` uses `z.string().url()` — verify `javascript:` rejected (edge A5). **Recommend exec test:** POST `javascript:alert(1)` → reject.

**Gap (pre-existing):** No optimistic locking on SiteSettings singleton — concurrent last-write-wins (edge B4). Acceptable for marketing contact info.

---

## URL & link security (contact/social)

| Threat | Control today | Enhancement action |
| --- | --- | --- |
| `javascript:` / `data:` URLs in social fields | Zod `.url()` | **Verify** in e2e/matrix; consider `.refine` allowlist `https?://` only if zod allows edge cases |
| Open redirect via external links | Links open in new tab with `noopener noreferrer` | **Keep** on all new contact social anchors |
| Phishing URL display | Admin-controlled — business trust | Admin-only write; audit trail |
| URL in JSON-LD `sameAs` | Pulled from DB social columns | Same validation as form |

---

## Text field security

| Field | Validator | XSS risk | Recommendation |
| --- | --- | --- | --- |
| phone, address, hours, titles | `optionalText` — trim only | Low — text nodes | Keep; no `dangerouslySetInnerHTML` |
| email | email zod | Low | Keep |
| mapQuery | optionalText | Low — used in iframe `q=` param | **Encode** via `encodeURIComponent` (today ✓); no HTML injection |

**Recommendation for exec:** do not add HTML rendering for contact fields; if tightening desired, apply `optionalPlainMetaText` in follow-up (would change validation behavior — scope separately).

---

## Audit & secrets

| Item | Assessment |
| --- | --- |
| Snapshot content | Phone, email, public URLs, bilingual text — **safe for audit UI** |
| Secrets | None in SiteSettings contact columns |
| MARKETING read access | Can see all contact fields in admin — intended |

---

## RBAC matrix (regression check)

| Role | `/admin/settings` contact tab | `updateContactSettings` | Home ContactSection |
| --- | --- | --- | --- |
| ADMIN | ✓ | ✓ | ✓ |
| MARKETING | ✓ | ✓ | ✓ |
| EDITOR | ✗ | ✗ | hidden |
| FINANCE | ✗ | ✗ | hidden |
| SALES | ✗ | ✗ | hidden (content only on home) |

No RBAC change required for map #88.

---

## Maintainability guardrails (exec sprint)

1. **Single icon map** — extract footer SVG icons to shared module; contact page imports same map (prevents drift / unknown keys).
2. **Single read path** — public pages use `getSiteSettings(locale)` only; no direct Prisma in components (`verify-content.mts` rule).
3. **No FormData spread** — extend action field list explicitly if new columns ever added.
4. **revalidate list** — keep centralized in `site-settings.ts`; extend only with documented routes.

---

## Verify checklist (for #95 matrix / audit reviewer)

- [ ] POST contact settings without session → denied
- [ ] MARKETING can save; EDITOR cannot
- [ ] Invalid URL rejected server-side
- [ ] AuditLog row on successful save (existing e2e)
- [ ] Public contact links use `rel="noopener noreferrer"` for http(s)
- [ ] No secrets in audit snapshot diff

**Verdict:** Existing security posture **adequate** for wire-up work; exec adds verification rows, optional `https?://` refine if zod gap found.
