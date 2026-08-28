# PLAN — ISSUE_088_contact_settings_map

> Dual source of truth with GitHub [#88](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/88).

## Meta

| Field | Value |
|---|---|
| GitHub | https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/88 |
| Opened | 2026-08-28 |
| Status (disk) | E1 complete 2026-08-28 — map closed |
| Triage labels | `wayfinder:map` |
| Type | wayfinder / enhancement |

## Goal

- แอดมินแก้ข้อมูลติดต่อ + โซเชียล **ครบ** ที่ `/admin/settings` → ติดต่อ & Social
- ค่าทั้งหมดมาจาก `SiteSettings` แหล่งเดียว — แสดงสอดคล้องที่ `/contact` และ footer
- มี live-verify matrix ก่อน/หลัง implement; before-fix / after-fix summary ทุก sprint exec

## Scope

- **In-scope**
  - Wire-up / hardening ที่ทำให้ requirement ครบ (contact page, footer, consumer ที่เกี่ยว)
  - ตัดสิน duplicate Home `ContactSection` ใน grilling
  - Research pack + sprint plan + live-verify (แบบ About #77)
- **Out-of-scope**
  - แก้ messages ผ่าน admin; social platform ใหม่; จัดเมนู footer; Page SEO contact tab

## Checkpoint: Known / Unknown / Assumption

- **Known:** `SiteSettings` model + admin tab + `updateContactSettings` + footer wired มีแล้ว (site-content-cms Sprint 1–5)
- **Known (preliminary gap):** contact page แสดงแค่ LINE+FB; email/IG/TikTok/YouTube ไม่ขึ้น; Home admin แก้ contact ซ้ำ subset
- **Unknown:** owner ต้องการ display label social แก้ได้หรือ derive จาก URL; JSON-LD address/hours จาก DB หรือไม่
- **Assumption:** ไม่ต้อง DDL ใหม่ — ใช้คอลัมน์ `SiteSettings` ที่มีอยู่

## Wayfinder tickets

| Ticket | Type | Blocked by |
|---|---|---|
| [#89 Research: inventory & root cause](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/89) | research | — (**frontier**) |
| [#90 Research: edge-case catalog](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/90) | research | #89 |
| [#91 Research: impact analysis](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/91) | research | #89 |
| [#92 Research: security guardrails](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/92) | research | #89 |
| [#93 Grilling: scope & completeness](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/93) | grilling | #89–#92 |
| [#94 Prototype: admin + public web-view](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/94) | prototype | #93 |
| [#95 Task: plan + live-verify matrix](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/95) | task | #93, #94 |
| [#96 Grilling: sprint plan sign-off](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/96) | grilling | #95 |

Execution sprint (post-map) opens as separate issue after #96 sign-off.

## Task table

| # | Work | Owner | Depends on | Status |
|---:|---|---|---|---|
| 1 | Inventory & root cause (#89) | agent | — | pending |
| 2 | Edge / impact / security research (#90–#92) | agent | 1 | pending |
| 3 | Scope grilling with owner (#93) | pm + owner | 2 | pending |
| 4 | Live web-view prototype (#94) | ux + owner | 3 | pending |
| 5 | Commit sprint plan + matrix (#95–#96) | pm | 4 | pending |
| 6 | Execute E1–En (future issue) | nextjs-dev | 5 | not started |

## Definition of Done (map)

- [ ] Tickets #89–#96 closed with resolution comments
- [ ] `docs/plans/contact-settings-enhancement-*.md` research pack committed
- [ ] Owner sign-off on sprint plan (#96)
- [ ] Map Decisions-so-far complete; fog cleared or ruled out-of-scope
- [ ] Execution issue opened (separate from this map)

## Evidence

Preliminary inventory (2026-08-28, pre-#89):

- Admin: `settings-client.tsx` ContactTab — phone, email, address, hours, mapQuery, 5 social URLs, contact title/subtitle ✓
- Footer: `site-footer.tsx` ← `getSiteSettings` via layout ✓ (fallback messages เมื่อ null)
- Contact page: `contact/page.tsx` — LINE+FB only ✗; email card ไม่มี ✗
- Duplicate: `home-client.tsx` ContactSection (phone, line, fb + hidden fields)
- Hardcode fallbacks: `home-content.tsx`, `booking/page.tsx`, `site-footer.tsx`, `local-business-jsonld.tsx`
