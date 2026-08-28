# Page banners + Header/Footer branding — sprint plan

Date: 2026-08-28  
Wayfinder map: [Map: แบนเนอร์หน้าละหน้า + Header/Footer logo จากหลังบ้าน](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/107)  
Backlog: `backlogs/ISSUE_107_page_banners_branding_map/PLAN.md`

## Status

**Planning only — ยังไม่ implement.** Owner ต้องปิด wayfinder tickets (#108–#114) และอนุมัติแผนก่อน S1

---

## 1. Requirement analysis

### 1.1 สิ่งที่ owner ขอ

| กลุ่ม | ความต้องการ |
|---|---|
| **Page banners** | Admin เพิ่ม/แก้แบนเนอร์ได้ทุกเมนู — แบบ **fixed** (รูปเดียว) หรือ **slides** — ใส่หรือไม่ใส่ก็ได้ |
| **Banner layout** | กว้างเต็มจอ (full bleed), ไม่สูงมาก |
| **Header** | เปลี่ยน logo ได้ |
| **Footer** | เปลี่ยนข้อความเกี่ยวกับเรา + เปลี่ยน logo ได้ |
| **Admin location** | ตั้งค่าระบบ → Header & Footer (logo + ข้อความ); แบนเนอร์หน้าละหน้า (ตำแหน่ง admin TBD ใน #112) |
| **Process** | วิเคราะห์ก่อนแก้, live-verify ก่อน/หลัง, sprint เล็ก, สรุป pre/post fix |

### 1.2 สิ่งที่มีอยู่แล้ว (ไม่ต้องสร้างใหม่)

- **Footer description (TH/EN):** Tab Header/Footer ใน `/admin/settings` — `updateHeaderFooterSettings()` + `footerDescriptionTh/En` ใน `SiteSettings`
- **Header CTA label (TH/EN):** แก้ได้ใน tab เดียวกัน
- **Home hero CMS:** `/admin/pages/home` — รูป + copy แยกต่างหาก (ไม่ใช่ full-width banner แบบที่ขอ)
- **Global CTA banner ล่างหน้า:** `CtaBanner` จาก Shared Site Content — คนละ feature กับ page top banner
- **Image upload pipeline:** `storePublicImage()`, `validateImage`, `compressImage`, storage keys `public/…`

### 1.3 Root cause — ทำไมยังทำไม่ได้วันนี้

1. **ไม่มี data model สำหรับ page-level banner** — Pages CMS ออกแบบมาสำหรับ copy/visibility ไม่ใช่ visual chrome ด้านบน
2. **Logo hardcoded** — `BrandLogo` ชี้ `/brand/logo.png` และ `/brand/logo-ex.png` ไม่มีคอลัมน์ใน `SiteSettings`
3. **PAGE_REGISTRY ครอบ 6 หน้า** — nav มี 8 หน้า (ขาด testimonials, contact); ไม่มี admin surface สำหรับ banner บนหน้าเหล่านั้น
4. **หน้าส่วนใหญ่เริ่มด้วย `SectionHeading` ข้อความ** — ไม่มี slot สำหรับ full-width image/carousel

---

## 2. Edge cases

| # | Edge case | แนวทางที่แนะนำ (รอ owner ยืนยันใน #110) |
|---|---|---|
| E1 | เปิด banner แต่ไม่มีรูป / blob หาย | ไม่ render section (เหมือน `resolveHomeHeroImage` fallback — แต่ banner optional = ซ่อน) |
| E2 | Slides มี 1 รูป | แสดงเป็น fixed (ไม่ autoplay carousel) |
| E3 | Slides 0 รูป แต่ mode=slides | Admin validation block save |
| E4 | Home: hero + banner พร้อมกัน | **ต้องตัดสินใน #108** — แนะนำ: Home ใช้ hero เดิม; banner CMS ไม่ใช้กับ home |
| E5 | Testimonials 404 เมื่อไม่มีรีวิว | Banner config ไร้ผลจนกว่ามี published testimonials |
| E6 | รูปกว้างมากบน mobile | `object-cover` + max-height + `sizes="100vw"` |
| E7 | LCP / CLS | Banner ใต้ header sticky; กำหนด aspect/max-height; `priority` เฉพาะ slide แรก |
| E8 | TH/EN alt ไม่ครบ | Server zod block save (Pages CMS completeness rule) |
| E9 | แทนที่รูป logo — blob เก่า | Delete old key หลัง save สำเร็จ (pattern จาก `home-content.ts`) |
| E10 | Concurrent edit SiteSettings | ใช้ `version` + optimistic conflict ถ้ามี pattern อยู่แล้ว |
| E11 | MARKETING แก้ logo แต่ไม่มีสิทธิ์ page banner | แยก role: Settings=ADMIN|MARKETING; page banner=CONTENT_ROLES |

---

## 3. Impact analysis

### 3.1 Database / schema

| เปลี่ยน | รายละเอียด |
|---|---|
| **SiteSettings** | `headerLogoKey`, `footerLogoKey` (nullable) — แนะนำ |
| **Page banners** | ตารางใหม่ `PageBanner` + `PageBannerSlide` keyed by `pageSlug` (รอ #112) — ครอบ contact/testimonials ได้ |
| **Migration prod** | DDL manual ผ่าน phpMyAdmin (shared hosting runbook) |

### 3.2 Server / actions

| ไฟล์ | การเปลี่ยน |
|---|---|
| `src/actions/site-settings.ts` | upload logo + `withAudit()` |
| `src/actions/page-banners.ts` (ใหม่) | CRUD banner/slides per page |
| `src/lib/validations/site-settings.ts` | logo fields optional |
| `src/lib/validations/page-banner.ts` (ใหม่) | mode, slides, alt TH/EN |

### 3.3 Public UI

| ไฟล์ | การเปลี่ยน |
|---|---|
| `src/components/site/brand-logo.tsx` | รับ dynamic URL + fallback static |
| `src/components/site/page-banner.tsx` (ใหม่) | fixed + carousel |
| `src/app/[locale]/layout.tsx` | ส่ง logo keys ไป header/footer |
| `src/app/[locale]/*/page.tsx` (8+ routes) | `<PageBanner pageKey=… />` ใต้ header |

### 3.4 Admin UI

| ไฟล์ | การเปลี่ยน |
|---|---|
| `settings-client.tsx` | logo upload + preview ใน HeaderFooterTab |
| `/admin/pages/*` หรือ settings banners tab | banner editor |

### 3.5 Security

- `requireRole("ADMIN","MARKETING")` สำหรับ logo settings
- `requireRole` content roles + `withAudit()` สำหรับ banners
- `validateImage` max 5MB, JPEG only — ไม่ arbitrary HTML
- ลิงก์ banner: **แนะนำ internal preset** (booking, packages, …) — ไม่เปิด arbitrary URL โดย default
- Audit snapshot: เก็บ storage keys ไม่เก็บ binary

### 3.6 Maintainability

- Component เดียว `PageBanner` + reader `getPageBanner(pageSlug, locale)`
- Page slug registry ขยายจาก `PAGE_KEYS` เป็น `BANNER_PAGE_SLUGS` รวม contact/testimonials
- อย่า duplicate upload logic — reuse `storePublicImage`

### 3.7 UX / experience

- ไม่มี banner = ไม่มีช่องว่าง (zero shift)
- Carousel: keyboard, `prefers-reduced-motion` → ปิด autoplay
- Admin: preview thumbnail + link เปิด public page (pattern Home hero)

---

## 4. Pre-fix summary (ก่อนแก้โค้ด)

| Area | Current | Must change |
|---|---|---|
| Page top visual | `SectionHeading` text only | Optional `PageBanner` full-width |
| Home | Custom split hero | ไม่แตะ หรือ แทนที่ (owner #108) |
| Header logo | Static `/brand/logo.png` | `SiteSettings.headerLogoKey` + fallback |
| Footer logo | Static `BrandLogo` | `SiteSettings.footerLogoKey` + fallback |
| Footer about text | ✅ CMS แล้ว | ไม่ต้องทำใหม่ — อาจปรับ label ให้ชัด |
| Admin banners | ไม่มี | Editor per page หรือ centralized |
| Tests | ไม่มี | `e2e-page-banners.mts` หรือขยาย `e2e-admin-crud` |
| Live verify | ไม่มี baseline | S0 capture ก่อน S1 |

---

## 5. Sprint breakdown (draft — finalize ใน #114)

| Sprint | Size | Work | Owner | Depends |
|---|:---:|---|---|---|
| **S0** | S | Live-verify baseline + owner ปิด #108 #109 #110 | human + agent | — |
| **S1** | M | Schema: `PageBanner`/`PageBannerSlide` + SiteSettings logo keys + seed | nextjs-dev | S0, #112 |
| **S2** | M | Validations, readers (`getPageBanner`), `resolveBannerImage` | nextjs-dev | S1 |
| **S3** | M | Public `PageBanner` component (fixed + carousel) + a11y | nextjs-dev (+ ux-ui-expert) | S2 |
| **S4** | M | Settings: logo upload + preview ใน Header/Footer tab | nextjs-dev | S1 |
| **S5** | M | Admin banner editor — pilot 1 หน้า (e.g. services) | nextjs-dev | S2, S3 |
| **S6** | L | Rollout ทุกหน้าที่ owner ล็อกใน #108 + contact/testimonials | nextjs-dev | S5 |
| **S7** | M | Wire `BrandLogo` + layout revalidation | nextjs-dev | S4 |
| **S8** | S | E2E + `audit-compliance-reviewer` + live-verify post-fix | nextjs-dev | S6, S7 |
| **S9** | S | Prod DDL + redeploy runbook | hosting-deploy-specialist | S8 |

**Parallel lanes:** S4 (logo) กับ S5 (banner pilot) ทำคู่ขนานได้หลัง S1

---

## 6. Post-fix summary (template — เติมหลัง implement)

- [ ] `PageBanner` ทุกหน้าที่ scope — fixed/slides/off
- [ ] Header/Footer logo จาก Settings + fallback static
- [ ] Footer description ยังทำงาน (regression none)
- [ ] `withAudit()` ทุก mutation
- [ ] TH/EN alt complete เมื่อ banner visible
- [ ] Live-verify evidence ใน `docs/plans/assets/page-banners-branding-result/`
- [ ] `npm run build` + e2e green

---

## 7. Verify commands (หลัง implement)

```bash
npm run build
npx tsx scripts/e2e-admin-crud.mts          # regression
npx tsx scripts/e2e-page-banners.mts         # new (S8)
# Live-verify: compare baseline vs result screenshots
```

---

## 8. Wayfinder tickets (decision queue)

| Ticket | Type | Frontier? |
|---|---|---|
| [#108 ขอบเขตหน้า + Home hero](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/108) | grilling | ✅ เริ่มที่นี่ |
| [#109 Header/Footer logo scope](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/109) | grilling | ✅ parallel |
| [#111 Research](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/111) | research | ✅ parallel |
| [#113 Live-verify S0](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/113) | task | ✅ parallel |
| [#110 fixed vs slides UX](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/110) | grilling | blocked by #108 |
| [#112 Data model + admin surface](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/112) | grilling | blocked by #108, #110 |
| [#114 Sprint plan finalize](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/114) | task | blocked by all |
