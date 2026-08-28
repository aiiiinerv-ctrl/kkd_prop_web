# Research: Contact settings inventory & root cause

Date: 2026-08-28  
Wayfinder ticket: [Research: Contact settings inventory & root cause](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/89)  
Map: [Map: Contact settings — admin แก้ติดต่อ/โซเชี่ยล](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/88)

## Method

Primary sources only:

- `src/app/admin/(dashboard)/settings/settings-client.tsx` (`ContactTab`)
- `src/actions/site-settings.ts`, `src/lib/validations/site-settings.ts`
- `prisma/schema.prisma` (`SiteSettings`), `prisma/seed.ts` (`seedSiteSettings`)
- `src/lib/content/views.ts` (`SiteSettingsView`, `toSiteSettingsView`)
- `src/lib/content/index.ts` (`getSiteSettings`)
- Public: `site-footer.tsx`, `contact/page.tsx`, `layout.tsx`, `local-business-jsonld.tsx`
- Other consumers: `home-content.tsx`, `faq-section.tsx`, `booking/page.tsx`, `booking-forms.tsx`
- Admin duplicate: `pages/home/home-client.tsx` (`ContactSection`)
- Spec/plan: `docs/plans/site-content-cms-tasks.md` (Sprint 4 task #22), `site-content-cms-ui-spec.md` §4
- E2E: `scripts/e2e-admin-crud.mts`, `scripts/e2e-home-cms.mts`

No code was changed for this research.

## Owner requirement (map #88)

> ในระบบหลังบ้าน หน้าตั้งค่าระบบ >> ติดต่อ ให้แอดมินสามารถแก้ไขข้อมูลติดต่อ และโซเชี่ยล ได้ทั้งหมดและระบบดึงจากตรงนี้ ไปแสดงที่หน้าติดต่อ และ footer

## Executive summary

| Layer | Verdict |
| --- | --- |
| Admin `/admin/settings` → ติดต่อ & Social | **Met** — ครบทุก field ตาม spec §4 |
| DB + mutation + audit | **Met** |
| Footer public render | **Mostly met** — ดึงจาก `getSiteSettings`; social ครบ 5; fallback messages เมื่อ null ทั้งก้อน |
| Contact page public render | **Not met** — แสดง LINE+FB เท่านั้น; ไม่มี email card; IG/TikTok/YouTube ไม่ขึ้น |
| Single source of truth | **Partial** — ข้อมูลอยู่ที่ `SiteSettings` แหล่งเดียว แต่ public ยังมี hardcoded fallbacks และ Home admin เป็น entry point ซ้ำ |

**Root cause:** งาน site-content-cms Sprint 4 task #22 wire หน้า contact **ไม่ครบ** — `ITEMS` array hardcode แค่ LINE+Facebook แม้ view-model มี `socialLinks` ครบ 5 ช่องแล้ว Footer wire ครบก่อนหน้า (task #20) แต่ contact page ตกหล่น

Requirement ของ owner **ไม่ใช่ greenfield** — เป็น **completion + parity** ระหว่าง admin/settings, footer, และ contact page (+ policy เรื่อง fallback/duplicate)

## Admin surface today

| Route | Roles | Tab / section |
| --- | --- | --- |
| `/admin/settings` | `ADMIN`, `MARKETING` (`requireRole`) | Tab `ติดต่อ & Social` (`st-tab-contact`) |
| `/admin/pages/home` | Content: `canManageContent`; Contact: `canMutateContact` = `canManageSiteSettings` | `ContactSection` — phone, lineUrl, facebookUrl only |

Mutation: `updateContactSettings(formData)` → `auditedEntity({ entityType: "SiteSettings", snapshot: "full" })` → `revalidatePath` ชุด `SITE_REVALIDATE` (layout + `/th|en/contact` + …)

### Admin fields vs schema (Tab ติดต่อ & Social)

| Field | Admin UI | Zod | DB column |
| --- | --- | --- | --- |
| phone | ✓ | optionalText | `phone` |
| email | ✓ | email optional | `email` |
| mapQuery | ✓ | optionalText | `mapQuery` |
| addressTh/En | ✓ | optionalText | `addressTh/En` |
| hoursTh/En | ✓ | optionalText | `hoursTh/En` |
| contactTitleTh/En | ✓ | optionalText | `contactTitleTh/En` |
| contactSubtitleTh/En | ✓ | optionalText | `contactSubtitleTh/En` |
| lineUrl … youtubeUrl (5) | ✓ | optionalUrl | `lineUrl` … `youtubeUrl` |

**Gap:** ไม่มี admin field สำหรับ display label ของ social (เช่น "@kkdsolar") — ตาม site-content-cms default #4 label มาจาก `messages/contact.*`

**Null row UX:** ถ้าไม่มีแถว `SiteSettings` เลย ContactTab แสดงข้อความเตือนและไม่มีฟอร์ม — seed สร้างแถว idempotent (`findFirst` → `create`)

## Public consumer matrix

| Consumer | Reads | Fields used | Wired from DB? | Gap / fallback |
| --- | --- | --- | --- | --- |
| **Footer** `site-footer.tsx` | props ← layout | phone, email, address, hours, footerDescription, socialLinks | ✓ | ถ้า phone+email+address+hours ว่างทั้งหมด → fallback `messages/footer.*` + hardcoded `tel:`/`mailto:` |
| **Contact page** `contact/page.tsx` | `getSiteSettings` | title, subtitle, phone, address, hours, mapQuery, LINE, FB | **Partial** | email ไม่แสดง; IG/TikTok/YouTube ไม่แสดง; social value = `t("lineValue")` ไม่ใช่ URL/handle จาก admin |
| **Layout** | `getSiteSettings` | → header CTA, footer, JSON-LD | ✓ | — |
| **JSON-LD** `local-business-jsonld.tsx` | props | telephone, email, sameAs | Partial | address locality + openingHours **hardcoded**; sameAs fallback LINE URL |
| **Home** `home-content.tsx` | `getSiteSettings` | phone, line, facebook (hero quick contact + FAQ) | Partial | `FALLBACK_PHONE/LINE/FACEBOOK` constants เมื่อ null |
| **Booking** `booking/page.tsx` | `getSiteSettings` | phone, lineUrl | Partial | hardcoded fallbacks |
| **FAQ** `faq-section.tsx` | prop `lineUrl` | line only | ✓ (from home) | — |

### Contact page — root cause detail

Spec task #22 กำหนด: *"ค่า 5 รายการ"* และ *"รายการที่ค่าเป็น null ให้ไม่ render การ์ด"* — implementation ปัจจุบัน:

```typescript
// src/app/[locale]/contact/page.tsx — only LINE + FB injected into ITEMS
...(lineUrl ? [{ icon: MessageCircle, ... }] : []),
...(facebookUrl ? [{ icon: IconFacebook, ... }] : []),
```

`settings.socialLinks` (ครบ 5 ใน `toSiteSettingsView`) **ไม่ถูกใช้** บนหน้า contact

`settings.email` **ไม่ถูกใช้** แม้ admin แก้ได้และ footer แสดง email

### Footer — reference implementation (correct pattern)

Footer ใช้ `settings?.socialLinks ?? []` และ map ไอคอนครบ 5 — ช่องว่าง = ไม่ render ไอคอน (ตรง default #8)

## Duplicate admin path (Home ContactSection)

จาก Home CMS H3 (#63): MARKETING/ADMIN แก้ phone/line/facebook จาก `/admin/pages/home` ได้

- เรียก **`updateContactSettings` action เดียวกัน**
- Hidden inputs พา field ที่ไม่แสดง (email, address, social 3 ตัว, titles) ผ่าน unchanged — **ไม่ blank** field อื่น
- Copy บอกชัดว่าเป็นชุดเดียวกับ Settings

**Assessment:** ไม่ใช่ second source of truth แต่ **UX duplicate** — อาจทำให้ owner คิดว่าต้องแก้ 2 ที่; Instagram แก้ได้แค่ Settings

## Seed & production posture

`seedSiteSettings()`:

- Idempotent — skip ถ้ามีแถวแล้ว
- Seed ครบทุก contact + social column (social URL เป็น MOCK comments)
- Fresh deploy ก่อน seed → public fallback messages (by design #5)

**Unknown without prod check:** production มีแถว seed ครบหรือไม่ — แนะนำ smoke `#88` ใน impact ticket ไม่ใช่ inventory blocker

## Test coverage today

| Script | Asserts |
| --- | --- |
| `e2e-admin-crud.mts` | แก้ `#c-phone` → footer `/th` มีเบอร์ใหม่; AuditLog SiteSettings UPDATE |
| `e2e-home-cms.mts` | Home ContactSection → DB phone; RBAC hide/show |
| `e2e-rbac-sprint2.mts` | `canManageSiteSettings` gates |

**Missing:** ไม่มี e2e ว่าแก้ social/email ใน Settings → ปรากฏที่ `/th/contact`; ไม่ assert social 5 ช่องบน footer vs contact parity

## Requirement vs current — full matrix

| User ask | Admin editable | Footer | Contact page | Root cause |
| --- | --- | --- | --- | --- |
| แก้เบอร์โทร | ✓ | ✓ | ✓ | Met |
| แก้อีเมล | ✓ | ✓ | ✗ ไม่มีการ์ด | Contact page ไม่ wire `email` |
| แก้ที่อยู่ / เวลา | ✓ | ✓ | ✓ (fallback messages) | Met |
| แก้หัวข้อหน้าติดต่อ | ✓ | N/A | ✓ | Met |
| แก้ map Google | ✓ | N/A | ✓ | Met |
| แก้ LINE URL | ✓ | ✓ icon | ✓ card | Met |
| แก้ Facebook URL | ✓ | ✓ icon | ✓ card | Met |
| แก้ Instagram URL | ✓ | ✓ icon | ✗ | Contact page ไม่ iterate `socialLinks` |
| แก้ TikTok URL | ✓ | ✓ icon | ✗ | Same |
| แก้ YouTube URL | ✓ | ✓ icon | ✗ | Same |
| แก้ได้ที่ Settings tab เดียว | ✓ (Home ซ้ำ subset) | — | — | UX duplicate ไม่ใช่ data duplicate |
| ดึงจาก DB แหล่งเดียว | ✓ write path | ✓ read | Partial read | Contact page implementation gap |

## Recommended fix direction (for #93+ — not executing here)

1. **E1 (primary):** Refactor `contact/page.tsx` ให้ build cards จาก `settings` แบบเดียวกับ footer policy — phone, email, address, hours, map + loop `socialLinks` with icons
2. **E1 (labels):** คง `messages/contact.*` เป็น label; value แสดง URL path/handle หรือ generic CTA text — **lock ใน grilling #93**
3. **E2:** Align fallback constants ใน home/booking/footer/jsonld ตาม policy เดียว
4. **E2:** Home ContactSection → link/read-only ไป Settings (optional per grilling)
5. **E3:** Extend e2e — settings social → contact + footer

**No DDL expected** — schema ครบแล้ว

## Out of scope confirmed (inventory)

- ไม่ขาด column สำหรับ requirement ปัจจุบัน
- Header/footer menu CMS — แยก tab แล้ว
- Page SEO contact — อยู่ tab SEO ใน settings
