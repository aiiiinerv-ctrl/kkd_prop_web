# Site Content CMS: meta / social / header / footer / about / contact — Task Breakdown

อ้างอิง:
- คำสั่งจากเจ้าของโปรเจกต์ (2026-08-16) — quote ตรงด้านล่าง ห้ามแก้
- `AGENTS.md` — Working rules (TH/EN parity, `requireAdmin()`/`requireRole()` + audit, surgical changes), Version constraints (`TabsContent keepMounted`, `noValidate`), Agent model tiers, Commit convention
- `CONTEXT.md` — **Content module** / **Content view-model** / **Paired locale columns** / **Audited mutation** (นิยามที่แผนนี้ต้องไม่ละเมิด)
- `docs/adr/0001-two-root-layouts.md` (admin เป็นไทยล้วน ไม่มี message key), `docs/adr/0005-section-padding-convention.md` (py-16 / py-14)
- `docs/plans/rbac-marketing-editor-executive-tasks.md` — permission matrix ที่เพิ่งปิด (2026-08-16) แผนนี้**ต่อยอด ไม่เขียนทับ**
- `docs/plans/kkd-spec-remediation.md` — Sprint 6/7 (PaymentSettings singleton = ต้นแบบของงานนี้)
- `docs/plans/kkd-shared-hosting-redeploy-runbook.md` — deploy

**ข้อเท็จจริงจากผู้ใช้ที่ห้ามแก้ (quote ตรง):**
> "เพิ่ม tab จัดการ meta data, จัดการ ติดต่อเรา เกี่ยวกับเรา
> Setting เพิ่ม mata tag ของ home, จัดการ social, header, footer
> เพิ่มหน้าจัดการ content ของแต่ละ menu จัดการ เรื่องภาษาอังกฤษ"

**คำตอบผู้ใช้ต่อคำถาม scope (2026-08-16, "เอาตาม recommendation ทั้งหมด"):**
1. ขอบเขต content = **field ตายตัวของ about + contact เท่านั้น** — ไม่ทำ page builder
2. ภาษาอังกฤษ = **TH/EN คู่กันทุก field ใหม่** — ไม่ทำ translation editor ของ `messages/*.json`
3. สิทธิ์ = SEO/Social/Header/Footer → **ADMIN + MARKETING**; about/contact content → **ADMIN + SALES + MARKETING + EDITOR**
4. social URL ว่าง → **ซ่อน icon** ไม่โชว์ `#`
5. header/footer = **แก้ข้อความ/ลิงก์เท่านั้น ไม่จัดเมนู**
6. meta = **ทุกหน้าผ่านตาราง `PageSeo`** ไม่ใช่เฉพาะ home

---

## สถานะจริงในโค้ดที่ตรวจแล้ว (2026-08-16) — ห้ามวางแผนสร้างซ้ำ

| ของ | สถานะ | ที่อยู่ |
|---|---|---|
| `/admin/settings` | มีจริง แต่เป็น **หน้าเดียว 2 การ์ด ไม่มี Tabs**; gate = `requireRole("ADMIN")` | `src/app/admin/(dashboard)/settings/page.tsx:6`, `settings-client.tsx` |
| singleton settings pattern | **มีครบแล้ว** — `auditedEntity({snapshot:"full"})` + `findFirst()` หา id + `requireRole("ADMIN")` **คัดลอกแบบนี้ ห้ามคิดใหม่** | `src/actions/payment-settings.ts` |
| `auditedEntity()` | มีแล้ว (create/update/remove ใน transaction เดียวกับ audit row) — **`withAudit()` ไม่มีแล้ว ชื่อเก่า** | `src/lib/audit.ts:114` |
| `AuditEntityType` | **closed union 12 ค่า** — model ใหม่ไม่อยู่ในนี้จะ TS error ทันที ต้องเพิ่มเอง | `src/lib/audit.ts:13-25` |
| capability helper | `canManageContent()` = ADMIN\|SALES\|MARKETING\|EDITOR — **ตรงกับคำตอบข้อ 3 ของ about/contact เป๊ะ ใช้ซ้ำ ห้ามเขียนใหม่** | `src/lib/auth/index.ts:195` |
| helper สำหรับ ADMIN+MARKETING | **ไม่มี** — `canManageChannels()` = ADMIN\|MARKETING แต่คนละความหมาย ห้ามยืมมาใช้ | `src/lib/auth/index.ts:210` |
| `pageMetadata()` | มีแล้ว รับ `MetaKey` union **10 ค่า** อ่านจาก namespace `meta` ของ messages (21 key) | `src/lib/seo.ts:7,27` |
| meta strings ปัจจุบัน | static ทั้งหมด — `meta.{home,about,services,packages,portfolio,booking,contact,calculator,testimonials,cookiePolicy}{Title,Desc}` + `localBusinessDescription` | `src/messages/{th,en}.json` |
| Content module | มีแล้ว 9 reader + `cache()` memoize + view-model | `src/lib/content/index.ts`, `views.ts` |
| `pickLocale()` / `pickLocaleList()` | มีแล้ว fallback TH เมื่อ EN ว่าง | `src/lib/i18n-content.ts:12,26` |
| **ban import ที่ enforce จริง** | `verify-content.mts` ทำให้ **`src/app/[locale]` และ `src/components/site` ห้าม import `@/lib/db`, `@/lib/i18n-content`, `@/lib/storage`** — ละเมิดแล้ว verify แดง | `scripts/verify-content.mts:151-152` |
| `SiteHeader` / `SiteFooter` | **เป็น `"use client"` ทั้งคู่** → อ่าน DB เองไม่ได้ ต้องรับ props จาก layout | `site-header.tsx:1`, `site-footer.tsx:1` |
| social icons | มี SVG 5 ตัวใน footer แต่ **`href="#"` ทุกตัว** (ลิงก์ตาย) + key `footer.social*` 6 key (มี `socialEmail` ที่ไม่ถูกใช้) | `site-footer.tsx:45-51,72` |
| ข้อมูลติดต่อ hardcode | กระจาย **6 ไฟล์**: `tel:0824731567` ×4, `contact@kkdproperty.com` ×2, `line.me/R/ti/p/@kkdsolar` ×4, `facebook.com/kkdsolar` ×2 | `site-footer.tsx:123,129`, `local-business-jsonld.tsx:13,14,26`, `faq-section.tsx:27`, `contact/page.tsx:9,36,42`, `home-content.tsx:14,15,84`, `booking-forms.tsx:209,665,1001` |
| หน้า about | static ล้วน **17 key** (`about.*`) + icon/layout hardcode; `StatsRow` wire แล้ว (อย่าแตะ) | `src/app/[locale]/about/page.tsx` |
| หน้า contact | static **13 key** — label (`address`,`phone`,…) + **value** (`addressValue`,`phoneValue`,…) ปนกัน | `src/app/[locale]/contact/page.tsx` |
| footer messages | **21 key** (`description`, หัวคอลัมน์, ค่าติดต่อ 4 ตัว, copyright, service link 4 ตัว, social 6 ตัว) | `src/messages/{th,en}.json` |
| nav messages | 9 key ผูกกับ `NAV_ITEMS` hardcode 8 รายการ | `site-header.tsx:12`, `messages.nav.*` |
| `BACKUP_MODELS` | **list เขียนมือ 12 ตาราง** — model ใหม่ไม่เพิ่มที่นี่ = backup ตกเงียบ | `scripts/lib/backup-format.mts:32` |
| `/admin/settings` ใน sidebar | `roles: ["ADMIN"]` | `admin-sidebar.tsx:101` |
| e2e ที่ครอบ settings แล้ว | `e2e-admin-crud.mts`, `e2e-rbac-sprint2.mts` (payment-settings ADMIN-only) — **ต่อยอด อย่าเขียนสคริปต์ใหม่** | `scripts/` |
| ประวัติ | เคยมีคนเติม Tabs ใน `settings-client.tsx` ตอน RBAC แล้ว **revert เพราะเป็น scope creep** — รอบนี้คือรอบที่ถูกต้องของงานนั้น | `rbac-...-tasks.md` § Hand-off status |

---

## Default ที่ตัดสินใจแล้ว (ไม่ block — ค้านเป็นข้อ ๆ ได้ตอน review)

1. **3 model ใหม่: `SiteSettings` (singleton), `PageSeo` (key-based), `AboutContent` (singleton)** — ไม่ทำ `PageContent` แบบ generic key/value เพราะจะทำให้ฟอร์ม admin กลายเป็น key editor ที่ไม่มี label ไทย และ `design-business-reviewer` ตรวจไม่ได้ว่าหน้าไหนจะพังเมื่อ field ว่าง
2. **ไม่มี model `ContactContent`** — ค่าติดต่อ (เบอร์/อีเมล/ที่อยู่/เวลา/LINE/FB) เป็น **ข้อมูลชุดเดียวกัน**ที่ footer + contact page + JSON-LD + FAQ + home + booking ใช้ร่วมกัน แยก model จะได้ 2 แหล่งความจริงทันที → เก็บใน `SiteSettings` แหล่งเดียว ส่วน `contactTitleTh/En` + `contactSubtitleTh/En` เกาะไปกับ `SiteSettings` ด้วย (4 คอลัมน์ ไม่คุ้มสร้าง model)
3. **`AboutContent` แยกเป็น model ของตัวเอง** — 17 key → 34 คอลัมน์คู่ ยัดรวม `SiteSettings` จะได้ตารางกว้างเกินอ่าน และ role ที่แก้ได้ก็คนละชุด (EDITOR แก้ about ได้ แต่แตะ SiteSettings ไม่ได้)
4. **label ของหน้า contact (`contact.address`, `contact.phone`, …) ยังอยู่ใน messages** — เป็น label UI ไม่ใช่เนื้อหาธุรกิจ ย้ายเข้า DB แล้วลูกค้าจะแก้คำว่า "โทรศัพท์" ได้ ซึ่งไม่ใช่สิ่งที่ขอ; **เฉพาะ `*Value` เท่านั้น**ที่ย้ายไป `SiteSettings`
5. **`pageMetadata()` อ่าน DB ก่อน แล้ว fallback ไป messages เมื่อไม่มีแถว/ค่าว่าง** — ไม่ลบ key `meta.*` ทิ้ง เพราะ (ก) production ต้อง `CREATE TABLE` + seed ผ่าน phpMyAdmin ถ้า seed พลาดหน้าเว็บจะไม่มี title เลย (ข) `i18n-parity-checker` ยังใช้ไฟล์ messages เป็นตาข่ายอยู่
6. **`PageSeo.key` ต้องเป็นค่าใน `MetaKey` union 10 ค่าเท่านั้น** — export `META_KEYS` เป็น `as const` array จาก `src/lib/seo.ts` แล้ว derive ทั้ง union, zod enum และ seed loop จากตัวเดียว (แบบเดียวกับ `ROLES` ใน `src/lib/enums.ts`) — คีย์เพี้ยนจะไม่มีทางเข้า DB
7. **`SiteHeader`/`SiteFooter` รับ props จาก `src/app/[locale]/layout.tsx`** ไม่แปลงเป็น RSC และไม่อ่าน DB เอง — `verify-content.mts` แบน import `@/lib/db` ในโฟลเดอร์นั้นอยู่แล้ว และทั้งสองตัวมี state/`usePathname` จริง
8. **social URL ว่าง → ไม่ render `<a>` เลย** (ไม่ใช่ disable ไม่ใช่ `#`) — หลักการเดียวกับที่ footer เคยตัดลิงก์ privacy/terms ทิ้ง และที่ `StatsRow` ซ่อนตัวเลขที่ไม่มีแหล่งอ้างอิง
9. **`footer.socialEmail` key ที่ไม่มีใครใช้ ปล่อยไว้** — ไม่ลบ เพราะ surgical; ถ้าอยากล้างให้เปิด issue แยก
10. **Header tab จัดการได้แค่ปุ่ม CTA (ข้อความ TH/EN)** — เพราะข้อ 5 ของผู้ใช้ตัดการจัดเมนูออกไปแล้ว และ nav label ที่เหลือผูกกับ route จริง; ถ้า tab ดูบางเกินไป ให้รวม Header เข้ากับ Footer เป็น tab เดียว "Header / Footer" (แผนนี้ทำแบบรวม)
11. **เปิด `/admin/settings` ให้ MARKETING เข้าได้ แต่ซ่อน tab "นัดสำรวจ & ชำระเงิน"** — page gate เปลี่ยนเป็น `requireRole("ADMIN","MARKETING")`, **action เดิม 2 ตัว (`updateBookingCapacitySetting`, `updatePaymentSettings`) คง `requireRole("ADMIN")` ไม่แตะ** → MARKETING ยิงตรงก็ยัง 403 (fail closed ที่ server ไม่ใช่ที่ UI)
12. **หน้าจัดการ about อยู่ที่ `/admin/content/about`** (ไม่ใช่ `/admin/about`) — เผื่อ Sprint ถัดไปเพิ่ม `/admin/content/home` โดยไม่ต้องย้าย route; sidebar โชว์รายการเดียวชื่อ "เนื้อหาหน้าเว็บ"
13. **ฟอร์ม about/contact/SEO ใช้ Tabs TH/EN พร้อม `keepMounted`** ตาม Version constraints — ถอดออกแล้ว field ของ tab ที่ซ่อนจะไม่ถูกส่ง (เคยพังมาแล้ว)
14. **ไม่มี publish flag ในทั้ง 3 model** — เป็น singleton/1-row-per-page ที่หน้าเว็บต้องมีค่าเสมอ; EDITOR จึงแก้ `AboutContent` ได้ตรง ๆ (สอดคล้องคำตอบข้อ 3 ของผู้ใช้) และ `canPublishContent()`/`canDeleteContent()` ไม่ถูกใช้ในแผนนี้
15. **ไม่มีปุ่มลบในทุกหน้าใหม่** — ลบแถว singleton = หน้าเว็บพัง; action มีแค่ update (ไม่ export `remove`)
16. **`ogImageKey` ใน `PageSeo` เก็บเป็นคอลัมน์ไว้ แต่ยังไม่ทำ UI อัปโหลดในสปรินต์นี้** — เพิ่มคอลัมน์ทีหลังบน production ที่ไม่มี SSH แพงกว่าเพิ่มตอน `CREATE TABLE`; ระบุใน Out of scope ว่า UI ยังไม่มา

---

## คำตอบผู้ใช้เพิ่มเติม (2026-08-16)

1. **ข้อมูลจริงจากลูกค้ายังไม่มี** → seed ด้วย **mock** ให้ฟอร์ม/หน้าเว็บมีค่าทดสอบได้ทันที (ระบุใน seed comment ว่าเป็น mock — เปลี่ยนเป็นของจริงทีหลังได้จาก admin); default #8 (ซ่อน icon เมื่อ URL ว่าง) ยังใช้เมื่อล้างค่าในฟอร์ม
2. **Deploy รวมกับรอบ RBAC** (task #35-37 ใน `rbac-marketing-editor-executive-tasks.md`) — schema-first ทั้ง enum Role + 3 ตาราง CMS ในรอบเดียวผ่าน phpMyAdmin ก่อนอัปโค้ด

## Hand-off status (2026-08-16 evening)

- Sprint 1–5 implemented; UI spec at `docs/plans/site-content-cms-ui-spec.md`
- design-business-reviewer first pass **FAIL** (3 HIGH) → fixed: controlled contact forms + zod messages, tabs orientation scoping/forwarding, contact page no hardcoded social fallback, CTA placeholder aligned
- audit #27 **PASS**; i18n-parity **PASS**; e2e-admin-crud + e2e-rbac-sprint2 + booking + admin **PASS** after fixes
- Sprint 6 deploy still waiting for combined RBAC+CMS production window

### Mock seed ที่ต้องใส่ (task #5)

ใช้ค่า placeholder ที่มีอยู่แล้วในโค้ด/messages เป็นฐาน (อย่าคิดใหม่):
- `phone` = `0824731567`, `email` = `contact@kkdproperty.com`
- `addressTh` / `hoursTh` จาก `footer`/`contact` messages ปัจจุบัน; `addressEn` / `hoursEn` จาก `en.json`
- `lineUrl` = `https://line.me/R/ti/p/@kkdsolar`, `facebookUrl` = `https://facebook.com/kkdsolar`
- `instagramUrl` / `tiktokUrl` / `youtubeUrl` = mock ที่ดูสมจริง เช่น `https://instagram.com/kkdproperty`, `https://tiktok.com/@kkdproperty`, `https://youtube.com/@kkdproperty` (comment ใน seed: `// MOCK — replace with real URLs when client provides them`)
- `mapQuery` = ค่าที่ contact page ใช้อยู่ตอนนี้ (`addressValue` TH)

เมื่อได้ของจริงจากลูกค้า → แก้ผ่าน `/admin/settings` ไม่ต้อง migrate ใหม่

---

## Permission matrix (ส่วนต่อขยายจาก `rbac-marketing-editor-executive-tasks.md`)

| พื้นที่ | ADMIN | SALES | FINANCE | CHANNEL_EXEC | MARKETING | EDITOR | EXECUTIVE |
|---|---|---|---|---|---|---|---|
| `/admin/settings` เข้าหน้าได้ | ✔ | ✘ | ✘ | ✘ | **✔ (ใหม่)** | ✘ | ✘ |
| tab นัดสำรวจ + ชำระเงิน (ของเดิม) | ✔ | ✘ | ✘ | ✘ | **✘ ซ่อน + action 403** | ✘ | ✘ |
| tab SEO / Meta (`PageSeo`) | ✔ | ✘ | ✘ | ✘ | **✔** | ✘ | ✘ |
| tab ติดต่อ & Social (`SiteSettings`) | ✔ | ✘ | ✘ | ✘ | **✔** | ✘ | ✘ |
| tab Header / Footer (`SiteSettings`) | ✔ | ✘ | ✘ | ✘ | **✔** | ✘ | ✘ |
| `/admin/content/about` (`AboutContent`) | ✔ | **✔** | ✘ | ✘ | **✔** | **✔** | ✘ |

helper ที่ใช้: `canManageSiteSettings()` (ใหม่ = ADMIN\|MARKETING) สำหรับ 3 tab ใหม่, `canManageContent()` (**มีอยู่แล้ว**) สำหรับ about

---

## Task List

### Sprint 1 — Schema + module รากฐาน (blocking ทุกอย่าง)

1. `src/lib/seo.ts` — export `META_KEYS = [...] as const` (10 ค่าเดิม เรียงตามลำดับปัจจุบัน) แล้วให้ `type MetaKey = typeof META_KEYS[number]` derive จากมัน; **ยังไม่แตะ body ของ `pageMetadata()`** (ทำที่ #6) | `nextjs-dev` | ✅ ขนานได้
2. `prisma/schema.prisma` — model `SiteSettings` singleton (มิเรอร์ `PaymentSettings`): `id`, `phone`, `email`, `addressTh/addressEn`, `hoursTh/hoursEn`, `mapQuery`, `lineUrl`, `facebookUrl`, `instagramUrl`, `tiktokUrl`, `youtubeUrl`, `footerDescriptionTh/footerDescriptionEn @db.Text`, `contactTitleTh/En`, `contactSubtitleTh/En`, `headerCtaLabelTh/En`, `updatedAt` — **ทุกคอลัมน์เนื้อหา nullable** เพื่อ fallback ไป messages ได้ | `nextjs-dev` | ⏳ รอ #1 (ไม่จำเป็นทางเทคนิค แต่ commit เดียวกับ #3/#4)
3. `prisma/schema.prisma` — model `PageSeo`: `id`, `key String @unique @db.VarChar(40)`, `titleTh/titleEn`, `descriptionTh/descriptionEn @db.Text`, `ogImageKey String?`, `updatedAt` (ค่าใน `key` จำกัดที่ระดับ zod ตาม `META_KEYS` ไม่ใช้ Prisma enum เพราะ production เพิ่มค่า enum ต้อง `ALTER` มือ) | `nextjs-dev` | ⏳ รอ #1
4. `prisma/schema.prisma` — model `AboutContent` singleton: คู่ TH/EN ของ 16 key จาก `messages.about` (`title`, `intro`, `credRegistered{Title,Desc}`, `credEngineer{Title,Desc}`, `credExperience{Title,Desc}`, `team{Title,Desc}`, `teamDesign{Title,Desc}`, `teamInstall{Title,Desc}`, `teamSupport{Title,Desc}`) + `updatedAt`; **ไม่ย้าย `numbersTitle`** (เป็นหัวข้อของ `StatsRow` ที่ผูกกับตัวเลขจาก DB) | `nextjs-dev` | ⏳ รอ #1
5. รัน `npx prisma migrate dev --name add-site-content-cms` + `prisma/seed.ts` — seed 1 แถวของ `SiteSettings`, 1 แถวของ `AboutContent`, 10 แถวของ `PageSeo` (loop จาก `META_KEYS`) **โดยดึงค่าเริ่มต้นจาก `src/messages/th.json` + `en.json` จริง ไม่พิมพ์ค่าใหม่**; social URL seed เป็น `null` ทั้ง 5 (ยังไม่มีของจริง — ดูคำถาม #1); idempotent แบบเดียวกับ `paymentSettings` (`findFirst()` แล้วค่อย create) | `nextjs-dev` | ⏳ รอ #2,#3,#4
6. `src/lib/audit.ts` — เพิ่ม `"SiteSettings" | "PageSeo" | "AboutContent"` ใน `AuditEntityType` (เรียงตามตัวอักษรเหมือนเดิม) | `nextjs-dev` | ⏳ รอ #2,#3,#4
7. `scripts/lib/backup-format.mts` — เพิ่ม 3 ตารางใหม่ใน `BACKUP_MODELS` (วางต่อจาก `PaymentSettings` ก่อนกลุ่ม content) ไม่งั้น backup ตกเงียบ | `nextjs-dev` | ⏳ รอ #5
8. `src/lib/content/views.ts` — เพิ่ม `toSiteSettingsView(row, locale)`, `toPageSeoView(row, locale)`, `toAboutContentView(row, locale)` ใช้ `pickLocale()`; view ของ social คืน **array เฉพาะตัวที่มี URL จริง** (`{ key, url }[]`) เพื่อให้ footer แค่ `.map()` ไม่ต้องตัดสินใจเรื่องซ่อน | `nextjs-dev` | ⏳ รอ #5
9. `src/lib/content/index.ts` — reader ใหม่ห่อด้วย `cache()`: `getSiteSettings(locale)`, `getPageSeo(key, locale)`, `getAboutContent(locale)` — คืน view-model พร้อมใช้ และคืน `null` เมื่อไม่มีแถว (ผู้เรียก fallback เอง) | `nextjs-dev` | ⏳ รอ #8

### Sprint 2 — Server actions + auth helper (ขนานกับ Sprint 3 ได้หลังจบ #12)

10. `src/lib/auth/index.ts` — เพิ่ม `canManageSiteSettings(role)` = `ADMIN | MARKETING` พร้อม JSDoc สไตล์เดียวกับ `canManageChannels`; **ไม่แตะ** `canManageContent`/`canPublishContent`/`canDeleteContent` | `nextjs-dev` | ✅ ขนานได้
11. `src/actions/site-settings.ts` (ใหม่) — `updateSiteSettings(formData)` + `updatePageSeo(key, formData)`: เริ่มด้วย `requireRole("ADMIN","MARKETING")`, zod จาก `src/lib/validations/site-settings.ts` (ใหม่ — URL ต้อง `z.string().url()` หรือว่าง, `key` ต้องอยู่ใน `META_KEYS`), มิวเทตผ่าน `auditedEntity({ snapshot: "full" })`, `revalidate` คืน `["/th","/en","/th/about","/en/about","/th/contact","/en/contact","/admin/settings"]` (+ `["/[locale]","layout"]` สำหรับ header/footer ที่อยู่ใน layout) | `nextjs-dev` | ⏳ รอ #6,#10
12. `src/actions/about-content.ts` (ใหม่) — `updateAboutContent(formData)`: `requireRole()` ตาม `canManageContent` (ADMIN/SALES/MARKETING/EDITOR), zod, `auditedEntity`, revalidate `/th/about`,`/en/about`,`/admin/content/about`; **ไม่ export `remove`** ตาม default #15 | `nextjs-dev` | ⏳ รอ #6,#10

### Sprint 3 — Admin UI

13. `ux-ui-expert` — spec (read-only) ของ `/admin/settings` แบบ tab 4 ตัว: "นัดสำรวจ & ชำระเงิน" (ของเดิมทั้ง 2 การ์ด), "SEO / Meta", "ติดต่อ & Social", "Header / Footer" + spec ฟอร์ม `/admin/content/about`; ต้องระบุพฤติกรรม tab TH/EN ซ้อนใน tab หลัก และวิธีแสดง 10 หน้าใน tab SEO (accordion หรือ select) — ส่งต่อ `nextjs-dev` ไม่เขียนโค้ดเอง | `ux-ui-expert` | ✅ ขนานได้ตั้งแต่ต้น
14. `src/app/admin/(dashboard)/settings/page.tsx` — gate เป็น `requireRole("ADMIN","MARKETING")`, โหลด `siteSettings` + `pageSeo` ทั้ง 10 แถวเพิ่ม, ส่ง `role` ลง client เพื่อซ่อน tab เดิม | `nextjs-dev` | ⏳ รอ #11,#13
15. `src/app/admin/(dashboard)/settings/settings-client.tsx` — แตกเป็น `<Tabs>` ตาม spec #13 **โดยย้าย 2 การ์ดเดิมเข้า tab แรกแบบไม่เปลี่ยน behavior/id ของ input** (`s-max-per-day`, `p-promptpay-id`, … ถูกอ้างใน e2e) + ซ่อน tab แรกเมื่อ `role === "MARKETING"`; ฟอร์มใหม่ทุกตัวใช้ `noValidate` + `TabsContent keepMounted` | `nextjs-dev` | ⏳ รอ #14
16. `src/app/admin/(dashboard)/content/about/page.tsx` + `about-client.tsx` (ใหม่) — gate ด้วย `canManageContent`, ฟอร์ม singleton (ไม่ใช้ `CrudPage` เพราะไม่มี list/create/delete), tab TH/EN `keepMounted`, toast ผ่าน sonner แบบเดียวกับ settings | `nextjs-dev` | ⏳ รอ #12,#13
17. `src/app/admin/(dashboard)/admin-sidebar.tsx` — เพิ่มรายการ "เนื้อหาหน้าเว็บ" → `/admin/content/about` `roles: ["ADMIN","SALES","MARKETING","EDITOR"]` (วางต่อจาก "รีวิวลูกค้า") + เปลี่ยน `roles` ของ `/admin/settings` เป็น `["ADMIN","MARKETING"]` | `nextjs-dev` | ⏳ รอ #14,#16

### Sprint 4 — Wire หน้าสาธารณะ (ทำหลัง Sprint 1 จบ, ขนานกับ Sprint 3 ได้)

18. `src/lib/seo.ts` — `pageMetadata()` อ่าน `getPageSeo(key, locale)` ก่อน แล้ว fallback ไป `getTranslations("meta")` เมื่อ null/ว่าง; **ไม่เปลี่ยน signature** และ `overrides` ยังชนะทุกอย่างตามเดิม (หน้า package detail พึ่งมัน) | `nextjs-dev` | ⏳ รอ #9
19. `src/app/[locale]/layout.tsx` — เรียก `getSiteSettings(locale)` แล้วส่งเป็น props ให้ `<SiteHeader>` และ `<SiteFooter>` (ห้ามให้ component อ่าน DB เอง — `verify-content.mts` แบน) | `nextjs-dev` | ⏳ รอ #9
20. `src/components/site/site-footer.tsx` — รับ props แทน `t()` สำหรับ: `description`, ที่อยู่/เบอร์/อีเมล/เวลา, `tel:`/`mailto:` href (เลิก hardcode บรรทัด 123,129), และ social list — **render `<a>` เฉพาะตัวที่มี URL** ตาม default #8; หัวคอลัมน์และ service link ยังใช้ messages เดิม | `nextjs-dev` | ⏳ รอ #19
21. `src/components/site/site-header.tsx` — รับ `ctaLabel` เป็น prop (fallback messages เดิมเมื่อ null); **ไม่แตะ `NAV_ITEMS`** ตามคำตอบข้อ 5 | `nextjs-dev` | ⏳ รอ #19
22. `src/app/[locale]/contact/page.tsx` — `title`/`subtitle` และค่า 5 รายการอ่านจาก `getSiteSettings(locale)`; ลบ `CONTACT_FACEBOOK_URL` (บรรทัด 9), `tel:` (36), `line.me` (42) ที่ hardcode; `mapQuery` มาจาก settings แทน `encodeURIComponent(t("addressValue"))`; label ยังมาจาก messages ตาม default #4; รายการที่ค่าเป็น null ให้**ไม่ render การ์ดนั้น** | `nextjs-dev` | ⏳ รอ #9
23. `src/app/[locale]/about/page.tsx` — เนื้อหา 16 field อ่านจาก `getAboutContent(locale)` fallback messages; **ไม่แตะ `StatsRow` block (บรรทัด 96-105) และไม่แตะ icon mapping** — icon อยู่ในโค้ดตามลำดับ slot คงที่ | `nextjs-dev` | ⏳ รอ #9
24. `src/components/site/local-business-jsonld.tsx` — `telephone`/`email`/`sameAs` มาจาก settings (รับ props จาก layout เหมือน #19); `sameAs` ใส่เฉพาะ URL ที่มีจริง | `nextjs-dev` | ⏳ รอ #19
25. `src/components/site/faq-section.tsx`, `src/app/[locale]/home-content.tsx`, `src/app/[locale]/booking/booking-forms.tsx` — เลิก hardcode LINE/FB/`tel:` (รวม 7 จุด: faq:27, home:14,15,84, booking:209,665,1001) รับผ่าน props จากหน้าที่เรียก | `nextjs-dev` | ⏳ รอ #19

### Sprint 5 — Verify + review (ห้ามข้ามข้อไหน)

26. `src/messages/{th,en}.json` — ตรวจว่า key ที่ยังใช้เป็น fallback ครบทั้งสองไฟล์ และ**ไม่มี key ใหม่ที่ใส่แค่ภาษาเดียว**; ยืนยันว่าไม่มี string ไทยรั่วเข้า `en.json` จากงานนี้ | `i18n-parity-checker` | ⏳ รอ #25
27. ตรวจ `src/actions/site-settings.ts` + `src/actions/about-content.ts`: `requireRole()` มาก่อนทุก mutation, ผ่าน `auditedEntity` ทุกเส้นทาง, ไม่มี secret เข้า snapshot (`snapshot: "full"` ปลอดภัยเพราะ 3 model ไม่มีคอลัมน์ลับ — **ให้ reviewer ยืนยันข้อนี้เอง**), และ MARKETING ยิง `updatePaymentSettings`/`updateBookingCapacitySetting` ตรง ๆ ยังโดน 403 | `audit-compliance-reviewer` | ⏳ รอ #25
28. `scripts/e2e-admin-crud.mts` — ต่อยอด (อย่าเขียนใหม่): แก้ค่าใน tab ติดต่อ → เปิด `/th` ยืนยันเบอร์ใหม่ขึ้นใน footer; แก้ `PageSeo` ของ home → ยืนยัน `<title>` ของ `/th` เปลี่ยน; แก้ about → ยืนยัน `/en/about` เปลี่ยน; ยืนยันมี `AuditLog` แถวใหม่ครบ 3 entityType | `nextjs-dev` | ⏳ รอ #25
29. `scripts/e2e-rbac-sprint2.mts` — ต่อยอด: MARKETING เข้า `/admin/settings` ได้แต่ไม่เห็น tab ชำระเงิน + POST `updatePaymentSettings` โดน 403; EDITOR เข้า `/admin/content/about` ได้แต่เข้า `/admin/settings` ไม่ได้; FINANCE/CHANNEL_EXECUTIVE เข้าไม่ได้ทั้งคู่ | `nextjs-dev` | ⏳ รอ #25
30. Verify ตาม `.claude/skills/verify/SKILL.md` — รันจริงทั้งชุด: `docker compose up -d mysql` → `npx prisma migrate dev` → `npx prisma db seed` → `npm run build` → `npx tsx scripts/verify-content.mts` (**สำคัญที่สุด: ตรวจว่า `[locale]`/`components/site` ไม่ได้ import `@/lib/db` หรือ `@/lib/i18n-content`**) → `verify-audit-module.mts` → `npm run start` แล้ว `e2e-admin-crud.mts`, `e2e-rbac-sprint2.mts`, `e2e-admin.mts`, `e2e-booking.mts`; เปิดด้วยตา: `/th`, `/en`, `/th/about`, `/en/about`, `/th/contact`, `/en/contact`, `/th/booking`, `/admin/settings`, `/admin/content/about` + ดู view-source ยืนยัน `<title>`, `<meta name="description">`, `hreflang` และ JSON-LD ถูกต้องทั้ง 2 ภาษา | `nextjs-dev` | ⏳ รอ #26,#27,#28,#29
31. ตรวจ **render จริง** (ไม่ใช่ mockup): footer เมื่อ social ว่างครบทั้ง 5 (ต้องไม่มีแถวไอคอนโล่ง ๆ), หน้า contact เมื่อบางการ์ดหาย, `/en` เมื่อ EN ว่างแล้ว fallback เป็นไทย (ผิดหรือรับได้เชิงธุรกิจ), และ `/admin/settings` แบบ tab ว่าใช้งานจริงได้ไม่หลง — ประวัติเว็บนี้คือถูก reject ที่ขั้นนี้ | `design-business-reviewer` | ⏳ รอ #30
32. Commit ตาม Conventional Commits — แยกอย่างน้อย 3 ก้อน: `feat(admin): add site settings and page seo management`, `feat(site): read contact, seo and about content from the database`, `test(e2e): cover site content cms` (**one type per commit**) | `nextjs-dev` | ⏳ รอ #31

### Sprint 6 — Deploy (แยกรอบ รอผู้ใช้เคาะเวลา — ดูคำถาม #2)

33. อ่าน `docs/plans/kkd-shared-hosting-redeploy-runbook.md` ให้จบก่อนแตะ production โดยเฉพาะหัวข้อ schema-first + ถ่าย backup ด้วย `npx tsx scripts/backup-db.mts` | `hosting-deploy-specialist` | ⏳ รอ #32
34. รัน `CREATE TABLE` ของ 3 model + `INSERT` แถว seed (SiteSettings 1, AboutContent 1, PageSeo 10) ผ่าน phpMyAdmin **ก่อน** อัปโค้ดใหม่ — โค้ดเก่าอยู่กับตารางใหม่ได้ แต่โค้ดใหม่อยู่กับ schema เก่าไม่ได้; ถ้าแถว seed ไม่เข้า หน้าเว็บจะ fallback ไป messages (ตาม default #5) ไม่ล่ม แต่ admin จะแก้อะไรไม่ได้ | `hosting-deploy-specialist` | ⏳ รอ #33
35. Deploy + `npx tsx scripts/smoke-test-production.mts` แล้วเช็คด้วยตา: `<title>` ของ production มาจาก DB จริง, footer แสดงเบอร์จาก DB, `/en/about` ไม่ว่าง | `hosting-deploy-specialist` | ⏳ รอ #34

---

## Out of scope

- **Page builder / drag-drop section / เพิ่มลบ section เอง** — ผู้ใช้เลือกข้อ (ก) แล้ว; ถ้าเปิดทางนี้ `design-business-reviewer` จะตรวจไม่ได้ว่า layout จะพังเมื่อลูกค้าลบ section
- **Translation editor ของ `src/messages/*.json` ผ่านหน้า admin** — ผู้ใช้เลือกข้อ (ก); ไฟล์ messages เป็น source of truth ที่ diff ได้และมี `i18n-parity-checker` คุมอยู่ ย้ายเข้า DB = เสียเครื่องมือนั้น
- **จัดเมนู header/footer เอง (เพิ่ม/ลบ/เรียง/ซ่อน)** — คำตอบข้อ 5; nav ผูกกับ route จริงและ `META_KEYS` ให้เมนูลอยได้เมื่อไหร่ก็มีลิงก์ตายเมื่อนั้น
- **ย้ายเนื้อหาหน้า home / services / packages / portfolio / calculator / booking เข้า DB** — สปรินต์ถัดไปถ้าต้องการ; รอบนี้แตะเฉพาะ about + contact ตามคำตอบข้อ 1
- **UI อัปโหลด OG image** — คอลัมน์ `ogImageKey` มีแล้ว (default #16) แต่ฟอร์มยังไม่ทำ; ต้องต่อ `src/lib/storage` + `public/` key namespace ซึ่งเป็นงานคนละก้อน
- **ลบ key `meta.*` / `about.*` / `footer.*` ออกจาก messages** — ยังเป็น fallback path ตาม default #5 การลบทิ้งทำให้ production ที่ seed ไม่ครบขึ้นหน้าเปล่า
- **ลบ `footer.socialEmail` ที่ไม่มีใครใช้** — surgical (default #9); เปิด issue แยกถ้าต้องการ
- **แก้ `NAV_ITEMS`, `StatsRow`, icon mapping ของ about** — ไม่เกี่ยวกับงานนี้
- **`PromoLandingPath` หายจาก `BACKUP_MODELS`** — **สังเกตเจอระหว่างสำรวจ ไม่ใช่ของงานนี้** (`scripts/lib/backup-format.mts:32-45` มี 12 ตาราง ไม่มีตัวนี้ → backup ตกจริง) เสนอเปิด GitHub issue แยก label `needs-triage`
- **เปลี่ยน model tier ของ agent ตัวใด** — ตรึงไว้ตาม `AGENTS.md`
