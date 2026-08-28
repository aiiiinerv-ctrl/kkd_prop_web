# Grilling: Contact settings scope & completeness — locked decisions

Date: 2026-08-28  
Wayfinder ticket: [Grilling: Contact settings scope & completeness](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/93)  
Map: [Map: Contact settings](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/88)

Owner instruction 2026-08-28: *ดำเนินการตามที่คุณแนะนำได้เลย* — agent locked recommendations below.

## Locked decisions

| # | Topic | Decision |
| --- | --- | --- |
| G1 | Contact social layout | **A — การ์ดแยก** หนึ่งการ์ดต่อช่องทาง (เหมือน LINE/FB วันนี้); loop `socialLinks` ครบ 5 |
| G2 | Social display text | **Labels + display จาก `messages/contact.*`** (`lineValue`, …); href = admin URL; เพิ่ม keys สำหรับ IG/TikTok/YouTube + email |
| G3 | Home ContactSection | **เก็บ shortcut** — same `updateContactSettings`; เพิ่มลิงก์ไป `/admin/settings` (tab contact) ในข้อความช่วย |
| G4 | JSON-LD address/hours | **E1 ไม่แตะ** — คง hardcode structured address/hours; E2 optional ถ้าต้องการ SEO parity |
| G5 | Empty field policy | **เมื่อมีแถว SiteSettings:** null = **ไม่ render** การ์ด/แถวนั้นบน **contact page**; **ไม่มีแถว:** fallback messages (design #5). Footer fallback block — **E2** (ไม่เปลี่ยนใน E1) |

## E1 scope (authorized)

- Refactor `contact/page.tsx` — email + social 5 ช่อง + null-hide when row exists
- Shared `social-brand-icons.tsx` (DRY กับ footer)
- TH+EN message keys ใหม่ใน `contact` namespace
- Home ContactSection — ลิงก์ช่วยไป Settings
- e2e: assert social/email บน `/th/contact` หลัง save settings

## Out of E1

- Footer null-hide refactor (E2)
- JSON-LD address/hours (E2)
- Home/booking FALLBACK constant cleanup (E2)

## Sign-off

Owner delegated to agent recommendations 2026-08-28 via chat.
