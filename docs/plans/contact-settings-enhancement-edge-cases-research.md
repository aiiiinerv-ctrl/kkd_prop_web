# Research: Contact settings edge-case catalog

Date: 2026-08-28  
Wayfinder ticket: [Research: Contact settings edge-case catalog](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/90)  
Map: [Map: Contact settings — admin แก้ติดต่อ/โซเชี่ยล](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/88)  
Depends on: [`contact-settings-enhancement-inventory-research.md`](contact-settings-enhancement-inventory-research.md) (#89)

## Method

Edge cases the **sprint plan and live-verify matrix must name** before implement. Each row cites inventory #89 and current code. No code changed.

Severity: **Blocker** = lock in #93 grilling; **High** = DoD/live-verify; **Med** = UX clarity; **Low** = document only.

## Decision tensions (resolve at #93, not here)

| Topic | Options | Plan must pick |
| --- | --- | --- |
| Contact social layout | Card per channel (today LINE/FB) vs icon row (footer style) vs hybrid | #93 grilling |
| Social display value | Message keys (`lineValue`) vs URL hostname vs `@handle` derived | #93 grilling |
| Empty admin value | Hide element vs fallback messages (design #5) | #93 grilling |
| Home ContactSection | Keep shortcut vs read-only link vs remove | #93 grilling |
| JSON-LD address/hours | Keep hardcoded vs map from `address`/`hours` text | #93 grilling |

---

## A. Admin save & null semantics

| ID | Edge case | Expected behavior | Severity | Verify |
| --- | --- | --- | --- | --- |
| A1 | No `SiteSettings` row (pre-seed) | Admin tab shows warning; save returns `ไม่พบการตั้งค่า` | High | Fresh DB without seed |
| A2 | Admin clears phone (empty string) | Zod → `null` in DB; public policy TBD (#93): hide vs fallback | Blocker | Save empty → footer/contact |
| A3 | Admin clears all 5 social URLs | `socialLinks` = `[]`; footer hides icon row; contact hides social cards | High | Matches spec default #8 |
| A4 | Admin clears email only | Footer omits email line; contact omits email card (after E1 wire) | High | Partial clear |
| A5 | Invalid URL (not http/https) | Server zod rejects; toast error; no partial write | High | `javascript:alert(1)` blocked |
| A6 | Valid URL with trailing spaces | Trimmed by zod | Low | — |
| A7 | Phone with spaces/dashes | Display as stored; `tel:` href strips `[-\s]` (footer + contact today) | Med | `082-473-1567` |
| A8 | Email invalid format | Server rejects | High | `not-an-email` |
| A9 | EN address/hours empty, TH filled | Public `/en` shows TH via `pickLocale` | High | Live-verify `/en/contact` |
| A10 | mapQuery empty | Contact iframe uses `encodeURIComponent(address)` fallback (today L50) | Med | Map still loads |

---

## B. Duplicate admin paths (Settings vs Home)

| ID | Edge case | Expected behavior | Severity | Verify |
| --- | --- | --- | --- | --- |
| B1 | MARKETING edits phone on Home ContactSection | Same `updateContactSettings`; footer + contact update after revalidate | High | e2e-home-cms pattern |
| B2 | EDITOR on Home — contact hidden | Notice shown; cannot mutate contact | High | RBAC e2e |
| B3 | Home save changes phone only | Hidden fields preserve email/social/address | Blocker | Must not blank IG/TikTok/YouTube |
| B4 | Concurrent save Settings + Home | Last write wins (no version lock on SiteSettings) | Med | Document — acceptable for singleton |
| B5 | Home changes facebook; Settings open with stale UI | Next refresh shows DB truth | Low | Standard form stale state |

---

## C. Public contact page (post-E1 target)

| ID | Edge case | Expected behavior | Severity | Verify |
| --- | --- | --- | --- | --- |
| C1 | Only LINE URL set | Single social card + core contact fields | High | — |
| C2 | All social set | Five cards or icon row per #93 decision | High | Parity with footer |
| C3 | Social URL set but label from messages | Display value may not match URL (today `@kkdsolar` vs real handle) | Blocker | #93 picks policy |
| C4 | Grid with odd card count | Responsive 2-col grid — last row single card | Med | Mobile 390px |
| C5 | Very long address textarea | Card wraps; no overflow clip | Med | — |
| C6 | Title/subtitle empty in DB | Fallback `messages/contact.title/subtitle` (today L37–38) | High | Fresh deploy |

---

## D. Footer & layout

| ID | Edge case | Expected behavior | Severity | Verify |
| --- | --- | --- | --- | --- |
| D1 | All contact fields null | Today: entire fallback block with hardcoded tel/mailto (L163–186) | Blocker | #93: keep vs hide |
| D2 | Some fields set, some null | Render only non-null items | High | Phone only |
| D3 | Social icons — unknown key in map | `SOCIAL_ICON_MAP[key]` null → skip (footer L82) | Med | Defensive |
| D4 | footerDescription null | Fallback `t("description")` | High | — |

---

## E. Other consumers (home, booking, JSON-LD)

| ID | Edge case | Expected behavior | Severity | Verify |
| --- | --- | --- | --- | --- |
| E1 | Home quick contact — only phone in DB | LINE/FB icons use FALLBACK constants (today) | High | #93 fallback policy |
| E2 | Booking form — lineUrl null | Hardcoded LINE URL fallback | Med | — |
| E3 | JSON-LD — all social cleared | `sameAs` empty or fallback LINE array (today L13–15) | Med | SEO review |
| E4 | JSON-LD telephone — non-TH format | Prepends `+66` after stripping leading `0` | Med | International wrong if admin stores +66 |

---

## F. Cache & revalidation

| ID | Edge case | Expected behavior | Severity | Verify |
| --- | --- | --- | --- | --- |
| F1 | Save contact settings | `SITE_REVALIDATE` includes layout + contact + home paths | High | Footer on `/th` updates |
| F2 | e2e checks HTML string immediately | May flake if cache — e2e-admin-crud notes this | Med | Prefer DOM assert post-navigation |

---

## Matrix rows for live-verify (#95)

Minimum IDs to cover in acceptance matrix: **A2, A3, A5, A9, B3, C2, C6, D1, D2, E1** plus TH+EN desktop/mobile for `/contact` and footer on `/th`.
