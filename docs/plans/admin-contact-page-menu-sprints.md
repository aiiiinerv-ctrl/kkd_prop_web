# Admin — แยกเมนู "ติดต่อเรา (Pages)" ออกจาก Settings — Sprint breakdown

อ้างอิง:

- Requirement เดิม: ในระบบหลังบ้าน tab จัดการหน้า "ติดต่อเรา" ยังไม่มีเป็นเมนูของตัวเอง ต้องแยกออกมาเป็นเมนูใหม่ที่มี banner + เนื้อหา เหมือนเมนู Pages อื่น (บริการ/แพ็กเกจ/ผลงาน/เครื่องคำนวณ/เกี่ยวกับเรา/หน้าแรก)
- Precedent ที่ copy pattern มาโดยตรง: `src/app/admin/(dashboard)/pages/calculator/` (shell มี tab เนื้อหา + แบนเนอร์ + tab พิเศษเฉพาะฟีเจอร์)
- **Update (2026-08-28, งานคนละใบแต่กระทบแผนนี้โดยตรง):** tab "SEO / Meta" ทั้งหมดใน `/admin/settings` (ครอบคลุม booking/contact/testimonials/cookiePolicy) ถูกถอดออกจากระบบไปแล้ว — ลบทั้ง UI (`SeoTab`/`SeoPageForm`), action (`updatePageSeo()`), และ schema (`pageSeoSchema`) ทิ้งทั้งหมด เพราะฉะนั้น**เมนู "ติดต่อเรา (Pages)" ใหม่จะไม่มี Properties/SEO tab** (ยืนยันจากผู้ใช้แล้ว) เหลือแค่ 2 tab: เนื้อหา + แบนเนอร์

## Requirement analysis (root cause)

ฟีเจอร์จัดการ "ติดต่อเรา" **ไม่ได้หายไป** — มีอยู่แล้วทั้ง 2 ส่วนที่ยังเหลืออยู่ (เนื้อหา/แบนเนอร์) แต่ถูกฝังอยู่ใน `/admin/settings` แทนที่จะแยกเป็นเมนูของตัวเอง:

| ส่วน | ที่อยู่ปัจจุบัน | Component/Action ที่ใช้อยู่ |
|---|---|---|
| เนื้อหา (phone/email/address/social/หัวข้อ-คำโปรย) | Settings → tab "ติดต่อ & Social" | `ContactTab` → `updateContactSettings()` (เขียนลง `SiteSettings` model) |
| แบนเนอร์ | Settings → tab "แบนเนอร์" (scope เฉพาะ `pageSlug="contact"` อยู่แล้ว) | `PageBannerPanel` → action เดิมใน `page-banner-admin` |
| ~~Properties (SEO)~~ | ~~ถูกถอดออกจากระบบทั้งหมดแล้ว~~ | — ไม่มีอีกต่อไป |

Root cause: งานนี้เป็น **UI reorganization** ไม่ใช่ฟีเจอร์ที่ขาดหาย — ย้าย component/action เดิมไปขึ้นเมนูใหม่ ไม่ต้องสร้างของใหม่

## Investigation — impact analysis

1. **`SiteSettings` เป็น singleton ที่ใช้ร่วมกับหน้าอื่น** (`phone/email/address/lineUrl/social` ใช้ใน `layout.tsx` [footer/header], `home-content.tsx`, `booking/page.tsx`, `contact/page.tsx`) → **ห้ามย้ายข้อมูลออกจาก `SiteSettings` model เด็ดขาด** ต้องคงเป็น single source of truth เดิม เปลี่ยนแค่ตำแหน่ง UI ที่แก้ไข ไม่เปลี่ยน schema/action
2. **`PAGE_REGISTRY` (`src/lib/pages/registry.ts`, `types.ts`) เป็น "code-owned six-page registry" ที่ปิด scope แล้วหลัง Sprint 10** — ผูกกับ aggregate content model แบบ per-page table (`XxxPageContent`) ซึ่ง contact ไม่มี (ใช้ `SiteSettings` แทน) → **ต้องไม่เพิ่ม `"contact"` เข้า `PAGE_KEYS`/registry** งานนี้จะสร้าง route/shell แยกต่างหาก (bespoke) เหมือนที่ calculator มี tab พิเศษนอกเหนือจาก tab มาตรฐาน
3. **E2E regression ที่ต้องแก้:** `scripts/e2e-admin-crud.mts` บรรทัด ~651–683 (`SITE SETTINGS: contact phone updated`) คลิก `#st-tab-contact` ใน Settings ตรงๆ — จะพังทันทีที่ลบ tab ออก ต้องแก้ให้ไปที่ `/admin/pages/contact` แทน
4. **Data integrity:** ถ้าเหลือ 2 จุดแก้ไขข้อมูลชุดเดียวกัน (Settings เดิม + เมนูใหม่) จะเสี่ยง desync/สับสนว่าจุดไหนคือของจริง → ผู้ใช้ยืนยันแล้วว่าให้ **ลบออกจาก Settings ทั้งหมด** หลังย้าย
5. **Security:** ไม่มี action ใหม่ถูกสร้าง มีแต่ route ใหม่ที่เรียก action เดิม (`updateContactSettings`, banner action) ซึ่งมี `requireRole()`/`requireAdmin()` และ `withAudit()` อยู่แล้วในตัว — ไม่มี attack surface ใหม่ ต้องรัน `audit-compliance-reviewer` ยืนยันหลังแก้เพื่อ sanity check เท่านั้น (ไม่คาดว่าจะเจอ finding)
6. **ไม่มี schema/Prisma migration** → **ไม่มี production DDL** ต้องทำ (ต่างจาก Calculator Config ที่เพิ่งเจอปัญหา DDL ค้าง) — ความเสี่ยง deploy ต่ำกว่ามาก

## Edge cases ที่ต้อง cover ตอน implement/verify

- Role ที่ไม่มีสิทธิ์ (เช่น FINANCE) ต้องเห็น 404/ไม่เห็นเมนูใหม่ เหมือนหน้า Pages อื่น
- แบนเนอร์ "contact" ที่มีข้อมูลอยู่แล้ว (ถ้ามี) ต้องโชว์ต่อเนื่องหลังย้าย ไม่ reset เป็นค่าว่าง
- Public `/th/contact`, `/en/contact`, footer, header ต้องไม่กระทบ (อ่านจาก `SiteSettings` เหมือนเดิม)
- Deep link เก่าที่อาจ bookmark `/admin/settings#contact` (ถ้ามี) จะไม่มี tab ให้กดอีก — ยอมรับได้ตามที่ user เลือก (ลบออกทั้งหมด)

## แผนแก้ (ไม่มี DB migration)

### Sprint 1 — สร้างเมนู/หน้าใหม่ `/admin/pages/contact`

1. สร้าง `src/app/admin/(dashboard)/pages/contact/page.tsx` (server component) — `requireRole("ADMIN","SALES","MARKETING","EDITOR")` + `canManageContent()` gate เหมือน `pages/calculator/page.tsx`; ดึง `siteSettings` + `bannerData("contact")` แบบขนาน
2. สร้าง `src/app/admin/(dashboard)/pages/contact/contact-admin-shell.tsx` (client) — `PageShell` + `Tabs` 2 อัน: เนื้อหา / แบนเนอร์ (`PageBannerTabTrigger/Content` pageSlug `"contact"`) — mirror `calculator-admin-shell.tsx` โครงสร้างเดิม (ตัด Properties tab ออก)
3. ย้าย (ไม่ copy) `ContactTab` จาก `settings-client.tsx` → ไฟล์ใหม่ `src/app/admin/(dashboard)/pages/contact/contact-content-client.tsx` ต่อกับ `updateContactSettings()` เดิม ไม่แก้ logic
4. เพิ่มเมนูใน `admin-sidebar.tsx`: `{ href: "/admin/pages/contact", label: "ติดต่อเรา (Pages)", icon: Phone, roles: ["ADMIN","SALES","MARKETING","EDITOR"] }` ต่อจาก "หน้าแรก (Pages)"

### Sprint 2 — ลบของเดิมออกจาก Settings + กัน dead code

5. ลบ tab "ติดต่อ & Social" และ tab "แบนเนอร์" (ทั้ง tab เพราะ scope เฉพาะ contact) ออกจาก `settings-client.tsx` และ `settings/page.tsx` (`contactBannerData` prop/fetch ที่ไม่ใช้แล้ว, `ContactTab` component ที่ย้ายไปแล้วในข้อ 3)
6. เช็คว่าไม่มีจุดอื่นอ้าง `st-tab-contact` / `st-tab-banners` ที่เหลือค้าง (grep เต็ม repo)

### Sprint 3 — Verify (build → e2e → live-verify เว็บจริง)

7. แก้ `scripts/e2e-admin-crud.mts` (~651-683): เปลี่ยนจากคลิก `#st-tab-contact` ใน Settings → `page.goto("/admin/pages/contact")` แล้วยืนยัน field เดิมทั้งหมด (phone update → เห็นใน `/th/contact` + footer, audit log บันทึก) ยังผ่านครบเหมือนเดิม
8. `npm run build` (build+typecheck ต้องผ่าน)
9. **Live-verify บน web-view จริงก่อนถือว่าเสร็จ** (ตามที่ขอ): เปิด `npm run start`, login `/admin`, เข้าเมนูใหม่ "ติดต่อเรา (Pages)" ผ่าน browser จริง (Claude in Chrome) — คลิกทั้ง 2 tab, แก้ค่าทดสอบ 1 ค่าแล้วดูผลสะท้อนที่ `/th/contact`, กด undo กลับค่าเดิม, ยืนยัน role ที่ไม่มีสิทธิ์เห็น 404
10. รัน `npx tsx scripts/e2e-admin-crud.mts` เต็มชุด (regression หน้าอื่นต้องไม่พัง) + `npx tsx scripts/e2e-admin.mts` + `npx tsx scripts/e2e-pages-cms.mts`
11. รัน `audit-compliance-reviewer` เช็ค route ใหม่ (ควร PASS เพราะไม่มี action ใหม่)
12. สรุปว่าแก้อะไรไปบ้าง (ไฟล์ที่เปลี่ยน/ย้าย/ลบ) ก่อนปิดงาน

## Out of scope

- เพิ่ม `"contact"` เข้า `PAGE_REGISTRY`/`PageKey` (ระบบปิด scope แล้ว — ถ้าต้องการ full aggregate pattern ในอนาคตต้องเปิดเป็น effort ใหม่)
- Properties/SEO tab สำหรับหน้าติดต่อเรา (กลไก SEO tab ถูกถอดออกจากทั้งระบบแล้ว ไม่สร้างใหม่เฉพาะหน้านี้)
- เปลี่ยน schema/เพิ่มฟิลด์ใหม่ให้หน้าติดต่อเรา
- Production DDL (ไม่จำเป็นสำหรับงานนี้)
- Redesign UI/visual ใหม่ทั้งหมด (คง layout เดิมของ ContactTab ทุกจุด ย้ายตำแหน่งเท่านั้น)

## ตัดสินใจแล้ว (ยืนยันจากผู้ใช้)

- ลบ tab เดิมออกจาก Settings ทั้งหมดหลังย้าย (ไม่เก็บซ้ำ)
- Role ที่เข้าเมนูใหม่ได้: เหมือนหน้า Pages อื่นทั้งหมด (ADMIN, SALES, MARKETING, EDITOR)
- เขียนแผนนี้เป็น `docs/plans/*.md` แบบ sprint แทนการเปิด wayfinder map บน GitHub (scope ชัดพอหลัง investigate แล้ว)
- ไม่มี Properties/SEO tab ในเมนูใหม่ — เหลือแค่เนื้อหา + แบนเนอร์ (สอดคล้องกับการถอด SEO tab ออกจากทั้งระบบ)
