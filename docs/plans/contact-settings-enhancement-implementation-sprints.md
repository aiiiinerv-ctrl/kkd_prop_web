# Contact settings enhancement — implementation sprints

Date: 2026-08-28  
Wayfinder map: [Map: Contact settings — admin แก้ติดต่อ/โซเชี่ยล](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/88)  
Status: **Complete — deployed production 2026-08-28** (E1–E3)

## Destination (locked)

แอดมินแก้ contact + social **ครบ** ที่ `/admin/settings` → **ติดต่อ & Social** — ระบบอ่านจาก `SiteSettings` แหล่งเดียว แสดงสอดคล้องที่ **footer**, **หน้า contact**, home, booking, JSON-LD

## Executive summary (final)

| Layer | Verdict |
| --- | --- |
| Admin tab ติดต่อ & Social | **Met** |
| Contact page | **Met** — 5 social + email cards |
| Footer | **Met** — G5 null-hide when row exists |
| Home / booking / JSON-LD | **Met** — `site-contact.ts` resolver |
| Security / audit | **No regression** — mutations unchanged; `requireRole` + `auditedEntity` |
| Production | **Live** — smoke ✓ TH+EN contact |

## Research pack

| Asset | Ticket |
| --- | --- |
| [`contact-settings-enhancement-inventory-research.md`](contact-settings-enhancement-inventory-research.md) | #89 |
| [`contact-settings-enhancement-edge-cases-research.md`](contact-settings-enhancement-edge-cases-research.md) | #90 |
| [`contact-settings-enhancement-impact-research.md`](contact-settings-enhancement-impact-research.md) | #91 |
| [`contact-settings-enhancement-security-research.md`](contact-settings-enhancement-security-research.md) | #92 |
| [`contact-settings-enhancement-grilling-decisions.md`](contact-settings-enhancement-grilling-decisions.md) | #93 |
| [`contact-settings-enhancement-live-verification-matrix.md`](contact-settings-enhancement-live-verification-matrix.md) | #95 |

## E1 — Contact page parity ✓ (2026-08-28)

- `contact/page.tsx` — cards from `socialLinks` + email; shared icons
- TH+EN message keys (+8)
- Home admin link → Settings
- e2e: phone on `/th/contact` + footer

## E2 — Fallback + JSON-LD ✓ (2026-08-28)

- `src/lib/site-contact.ts` — G5 policy choke point
- Footer / home / booking / JSON-LD aligned

## E3 — Verify + close ✓ (2026-08-28)

| Check | Result |
| --- | --- |
| i18n contact keys TH/EN | 21/21 parity ✓ |
| Production smoke standard | ✓ |
| `/th/contact` Instagram, TikTok, email | ✓ |
| `/en/contact` Email | ✓ |
| Audit mutations | No code change in E1/E2 — existing `updateContactSettings` gate unchanged ✓ |
| Backlog | `backlogs/done/ISSUE_088_contact_settings_map/` |

## Locked decisions (G1–G5)

See [`contact-settings-enhancement-grilling-decisions.md`](contact-settings-enhancement-grilling-decisions.md).

## Out of scope (unchanged)

- Admin UI redesign; new social platforms; footer nav CMS
