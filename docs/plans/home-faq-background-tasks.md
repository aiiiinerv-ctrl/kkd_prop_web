# Home FAQ background image — Task Breakdown

Date: 2026-09-25
GitHub: [#142](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/142)
Backlog plan: [`backlogs/ISSUE_142_home_faq_background/PLAN.md`](../../backlogs/ISSUE_142_home_faq_background/PLAN.md)

อ้างอิง:
- Pattern รูป Hero (Home CMS H1–H3): `docs/plans/home-cms-slice-security-research.md` ("Image lifecycle (hero)", S3/S4/S6/S16), `docs/plans/home-cms-slice-implementation-sprints.md`
- Home hero toggle (map #132): `docs/plans/home-hero-toggle-implementation-sprints.md`, prod DDL asset `docs/plans/assets/home-hero-toggle-production-ddl.sql`
- Production schema drift: issue [#124](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/124) — production **ไม่มี** `_prisma_migrations`, DDL ต้องรันเองใน phpMyAdmin
- Deploy: `docs/plans/kkd-shared-hosting-redeploy-runbook.md` ("Second non-negotiable rule: schema first, always verified")
- Verify: `.claude/skills/verify/SKILL.md`

## Status

**Draft — รอ owner review** ยังไม่ commit ยังไม่มีโค้ดถูกแก้ หลัง owner อนุมัติ → promote #142 เป็น `ready-for-agent` แล้วเริ่ม S0/S1

---

## 1. Requirement (owner locked — ห้ามถามซ้ำ)

> - รูปพื้นหลังแสดง **เต็มความกว้างจอ** (full-bleed section) ส่วนเนื้อหายังอยู่ในกรอบ max-w-7xl เหมือนเดิม
> - มี **overlay ขาวโปร่งอัตโนมัติ** ทับรูป (ไม่มี slider ให้ปรับ) ข้อความใช้สีเดิม เพื่อให้เข้ากับ theme ปัจจุบันที่สว่างและดูน่าเชื่อถือ
> - มี **ปุ่มลบรูป** แล้วกลับไปใช้พื้นเรียบ ใช้ **รูปเดียวทั้ง TH/EN** (ไม่ผูกภาษา เหมือน hero)
> - **ถ้าไม่มีรูป หน้าเว็บต้องหน้าตาเหมือนเดิมทุก pixel** (ห้ามกระทบของเดิม)

## 2. Root cause + baseline (live-verified ก่อนแก้)

**ไม่ใช่ bug — ไม่เคยมีฟีเจอร์นี้**

| จุด | สถานะปัจจุบัน (ตรวจโค้ด 2026-09-25) |
|---|---|
| `prisma/schema.prisma` `model HomePageContent` (L455) | มี `heroImageKey String?` แต่ส่วน FAQ chrome มีแค่ฟิลด์ข้อความ `faqBadge/Title/Intro/LineButtonLabel` Th/En + `showFaq` |
| `src/components/site/faq-section.tsx` | client component (ใช้ `Reveal` + `useState`) ไม่มี prop รูป root = `<section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">` |
| `src/app/[locale]/home-content.tsx` L386 | render `FaqSection` เมื่อ `view.showFaq && lineUrl`; message-fallback path (ไม่มี DB row) ~L176 สร้าง view จาก `messages` |
| `src/lib/content/index.ts` L301 `resolveHomeHeroImage()` | pattern `storage.exists()` → `storage.publicUrl()` / fallback — ใช้เป็นต้นแบบได้ |
| `src/actions/home-content.ts` | hero lifecycle: `storePublicImage()` ก่อน tx → ถ้า conflict/throw ลบ blob ใหม่ → สำเร็จแล้วลบ blob เก่า; `HOME_ALLOWED_KEYS` reject key แปลก; `homeAuditSnapshot()` spread ทุกคอลัมน์ (จึงเก็บแค่ storage key) |
| `src/app/admin/(dashboard)/pages/home/home-client.tsx` L198 `HeroImageSection` | client check type/size, preview `<img>`, `heroBlobMissing` warning — **ไม่มีปุ่มลบรูป** |
| `next.config.ts` | `images.unoptimized: true` → `next/image` ออกมาเป็น `<img>` ธรรมดา (มี `loading="lazy"` เมื่อไม่ใส่ `priority`) |
| `src/lib/images.ts` | `compressImage()` resize ให้ด้านยาวสุด ≤ **1920px**, JPEG q82 |

**Production baseline (live-verified 2026-09-25, https://kkdproperty.co.th/th):** ส่วน FAQ เป็น `<section class="mx-auto max-w-7xl px-4 py-16 sm:px-6">` พื้นเรียบ ไม่มีรูปพื้นหลัง ไม่ full-bleed — ค่านี้คือ "ของเดิม" ที่ต้องคงไว้ทุก pixel เมื่อไม่มีรูป

---

## 3. Default ที่ตัดสินใจแล้ว (ไม่ block ถาม owner — ค้านเป็นข้อได้)

1. **ชื่อคอลัมน์ `faqBackgroundImageKey String?`** (nullable, ไม่มี default) — ตามชื่อ `heroImageKey`; nullable ทำให้ DDL บน prod ปลอดภัย (โค้ดเก่าไม่อ่านคอลัมน์นี้ → รัน DDL ก่อน deploy ได้โดยไม่กระทบ traffic) ไม่เลือก Boolean flag แยก เพราะ "มี key = มีรูป" พอแล้ว
2. **Storage prefix `pages/home/faq-bg`** → key จริง `public/pages/home/faq-bg/<cuid>.jpg` (สร้างโดย `storePublicImage()` ฝั่ง server เท่านั้น) — ต้องเป็น `public/` เพราะหน้าแรกเปิดได้โดยไม่ login
3. **ชื่อ form field:** ไฟล์ = `faqBackgroundImage`, ลบ = `removeFaqBackground` (ค่า `"on"` เท่านั้นที่นับ) — เพิ่มทั้งสองลง `HOME_ALLOWED_KEYS`; **ไม่** เพิ่มลง `HOME_CONTENT_FIELDS` (ตามคอมเมนต์ใน `src/lib/validations/home-content.ts` L36 ที่ห้ามรับ image key เป็น string จาก client)
4. **ส่งทั้งไฟล์และ remove มาพร้อมกัน → server reject** ด้วย error ไทย "เลือกได้อย่างใดอย่างหนึ่ง: อัปโหลดรูปใหม่ หรือ ลบรูปพื้นหลัง" **ก่อน** upload ใด ๆ (ไม่มี blob กำพร้า) — ไม่เลือก "ไฟล์ชนะ" แบบเงียบ เพราะ intent กำกวม และ UI ป้องกันไว้แล้วอยู่ดี (เลือกไฟล์ → ยกเลิก pending remove; กดลบ → ล้าง + disable file input)
5. **ลบรูปมีผลเมื่อกด "บันทึกเนื้อหาหน้าแรก"** (ฟอร์มเดียว version เดียว) — ไม่ทำ action แยก เพราะจะมี version bump สองทางและ remount ปัญหาแบบที่เจอใน #141
6. **ลบ blob เก่าหลัง commit แบบ best-effort:** ห่อ `try/catch` + `console.error` และลบเฉพาะ key ที่ขึ้นต้นด้วย `public/pages/home/faq-bg/` เท่านั้น (defense-in-depth กันลบไฟล์นอก namespace) — blob กำพร้า 1 ไฟล์ดีกว่า action ตอบ error ทั้งที่ DB commit ไปแล้ว **ไม่** ไปแก้ hero path เดิม (surgical)
7. **Upload สองรูปในฟอร์มเดียว:** ลำดับ = validate conflict → upload hero → upload FAQ bg; ถ้า FAQ bg fail ต้องลบ `newHeroKey` ทิ้งด้วยก่อน return; conflict/throw ลบ blob ใหม่ **ทั้งสอง**
8. **Render รูปด้วย `next/image` (`fill`, ไม่ใส่ `priority`, `sizes="100vw"`, `alt=""`, `className="object-cover"`) ใน wrapper `aria-hidden="true"`** — ไม่ใช้ CSS `background-image` เพราะ inline background โหลดทันทีที่ render (ไม่มี native lazy) และ `<img loading="lazy">` จะไม่แย่งแบนด์วิดท์กับ LCP (hero) ส่วน a11y: รูปตกแต่งล้วน → `alt=""` + `aria-hidden` ไม่ต้องมีช่อง alt TH/EN (จึงไม่มีคอลัมน์คู่ `xxxTh/xxxEn`)
9. **Markup เมื่อไม่มีรูป = tree เดิมเป๊ะ** — `FaqSection` รับ prop ใหม่ `backgroundImageUrl?: string | null`; ถ้า null → return `<section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">…` เดิมทุกตัวอักษร; ถ้ามี → `<section className="relative isolate overflow-hidden">` + layer `absolute inset-0 -z-10` (รูป + overlay) + `<div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">` ห่อ grid เดิม (padding `py-16` คงตาม convention)
10. **Overlay default `bg-white/85`** เก็บเป็น constant เดียว `FAQ_BG_OVERLAY_CLASS` export จาก `faq-section.tsx` ให้ admin preview import ไปใช้ → preview = ของจริงเสมอ; S0 ให้ `ux-ui-expert` ยืนยัน/ปรับค่า (เช่น 80–90% หรือ gradient) โดยเกณฑ์ `text-muted-foreground` บน overlay ต้องผ่าน WCAG AA 4.5:1 กับรูป worst-case
11. **ไม่มี dark variant** — `globals.css` มี `.dark` แต่หน้า public ไม่มีตัวสลับ theme (ไม่มี next-themes) จึงเป็น light-only; owner ล็อก overlay ขาวไว้แล้ว
12. **Public fallback เมื่อ blob หาย:** resolver ใหม่ `resolveHomeFaqBackground(key)` ใน `src/lib/content/index.ts` คืน `string | null` (`storage.exists` ก่อน) → blob หาย = `null` = พื้นเรียบ (markup เดิม) ไม่ใช่รูปแตก; ไม่มีรูปสำรองแบบ hero เพราะ "พื้นเรียบ" คือ default ที่ owner ต้องการ
13. **Admin card วางเป็นการ์ดแยก ติดกับการ์ด "คำถามที่พบบ่อย (FAQ) — n/5 ข้อ"** (อยู่ถัดจากการ์ด BilingualTabs ที่มีหัวข้อ FAQ chrome) — **ไม่** วางใน BilingualTabs เพราะรูปไม่ผูกภาษา ถ้าวางในแท็บจะซ้ำ 2 ที่และขัดกับ `keepMounted`
14. **ไม่ extract image-card component ร่วมกับ hero** — hero ไม่มีปุ่มลบ/aspect/copy ต่างกัน และ hero เพิ่ง ship (e2e selector `#home-hero-image` ผูกอยู่) การ refactor = ความเสี่ยง regression ที่ไม่จำเป็น ยอมให้ซ้ำ ~60 บรรทัด → บันทึก follow-up ใน Out of scope
15. **ไม่มี message key ใหม่** — ข้อความ admin เป็นไทยล้วนใน TSX (admin เป็น Thai-only UI ตาม AGENTS.md) ฝั่ง public ไม่มี string ใหม่ (รูป `alt=""`) → `i18n-parity-checker` ไม่จำเป็น เว้นแต่ implement แล้วมีการแตะ `src/messages/*.json` ให้รันทันที
16. **Success toast ใช้ของเดิม** "บันทึกเนื้อหาหน้าแรกเรียบร้อย" (surgical); error ใหม่ทั้งหมดเป็นภาษาไทยจาก server
17. **E2E ใส่ใน `scripts/e2e-admin-crud.mts`** (suite ที่ `verify-all.mts` รัน และเป็นที่ของ hero toggle #141) พร้อม restore state (ลบรูปคืน) ตอนจบ
18. **Backfill (`src/lib/backfill/home-content.ts`) ไม่แตะ** — digest ใช้เทียบ run-twice ในรอบเดียว ไม่ได้เก็บค่าเทียบถาวร และ backfill prod เสร็จไปแล้ว (#61); คอลัมน์ใหม่เป็น `null` เท่ากันทุกรอบ digest ยัง idempotent

## 4. Edge cases (ต้องมี handling + ใครตรวจ)

| # | Case | Expected | Sprint / ตรวจโดย |
|---:|---|---|---|
| E1 | ไฟล์ผิด type (เช่น .gif/.svg/.pdf) | client: error ไทยใต้ input + ล้าง input; server: `validateImage()` reject (type + extension) | S2, S4 / e2e + audit reviewer |
| E2 | ไฟล์ > 5MB | client block ก่อนส่ง; server reject; body limit 10mb ใน `next.config.ts` รองรับ hero+faq-bg พร้อมกัน (5+5) | S2, S4 |
| E3 | อัปไฟล์ + กดลบพร้อมกัน | UI ป้องกัน; ถ้ายิงตรงมา server reject ก่อน upload (Default #4) ไม่มี blob ใหม่เกิด | S2 / e2e (inject DOM) |
| E4 | blob หายจาก storage แต่ DB ยังมี key | public: พื้นเรียบ markup เดิม; admin: warning แดง + ปุ่มลบยังใช้ได้ (ล้าง key ค้าง) | S3, S4 |
| E5 | `showFaq=false` | section ไม่ render → รูปไม่แสดง; admin card แสดง hint "ส่วน FAQ ถูกปิดอยู่ รูปจะยังไม่แสดงบนหน้าเว็บ" (อ่านจาก state `showFaq`) | S4 |
| E6 | `lineUrl` ว่าง (SiteSettings) → section ไม่ render | ไม่เปลี่ยนเงื่อนไข L386; admin hint เดียวกัน โดย `page.tsx` ส่ง `faqLineMissing` (คำนวณด้วย `resolveQuickContact` แบบเดียวกับหน้า public) | S3 (ไม่แตะเงื่อนไข), S4 |
| E7 | ไม่มี DB row (message-fallback path) | view `faqBackgroundImageKey: null` → markup เดิม; admin page แสดงข้อความ "ต้องรัน backfill" เดิม | S3 / code review |
| E8 | concurrent edit / version conflict | optimistic `version` เดิม → `{conflict:true}`; blob ใหม่ถูกลบ; key เก่าไม่ถูกแตะ; toast conflict เดิม | S2 / e2e ไม่บังคับ, audit reviewer อ่าน |
| E9 | รูปแนวตั้ง / มือถือ (section สูงเพราะ grid เป็นคอลัมน์เดียว) | `object-cover object-center` crop ได้ ไม่ยืด; hint ใน admin "แนะนำแนวนอน ≥1920px วางจุดสนใจไว้กลางภาพ" | S3 / design reviewer (mobile 390px) |
| E10 | จอกว้าง > 1920px | รูปถูก upscale จาก 1920 (cap ของ `compressImage`) ยอมรับได้เพราะมี overlay 85% | S3 / design reviewer (1440 + 1920+) |
| E11 | dark/light | public light-only (Default #11) | — |
| E12 | `prefers-reduced-motion` | พื้นหลังนิ่ง ไม่มี parallax/ken-burns; `Reveal` เดิมจัดการเองอยู่แล้ว | S3 |
| E13 | LCP/perf | รูปอยู่ท้ายหน้า → ไม่ใส่ `priority`, lazy โดย default; layer `absolute` ไม่มี CLS (ความสูงมาจากเนื้อหา) | S3 / verify HTML ต้องมี `loading="lazy"` |
| E14 | a11y | wrapper `aria-hidden="true"`, `alt=""`; contrast ข้อความเดิมบน overlay ผ่าน AA | S0 spec, S5 design reviewer |
| E15 | ไม่มีรูปแล้วกด "ลบ" | ปุ่มลบซ่อนเมื่อไม่มี key; ถ้ายิง `removeFaqBackground=on` ตรง ๆ ตอนไม่มี key → no-op สำเร็จ | S2, S4 |
| E16 | upload hero + faq-bg พร้อมกันแล้วตัวหลัง fail | ลบ `newHeroKey` ก่อน return (Default #7) | S2 / audit reviewer |
| E17 | ลบ blob เก่าไม่สำเร็จหลัง commit | log แล้วคืน `{ok:true}` (Default #6) | S2 |

## 5. Impact analysis

| ด้าน | ผลกระทบ |
|---|---|
| **Schema / migration** | `ALTER TABLE HomePageContent ADD COLUMN faqBackgroundImageKey VARCHAR(191) NULL` (Prisma `String?` บน MySQL = `VARCHAR(191)`) — local: `npx prisma migrate dev --name add_home_faq_background`; prod: ไฟล์ SQL `docs/plans/assets/home-faq-background-production-ddl.sql` (`ADD COLUMN IF NOT EXISTS`) รันเองใน phpMyAdmin ฐาน `kkdprop1_kkdproperty` **ก่อน** restart Passenger + ตรวจ `SHOW COLUMNS` (prod ไม่มี `_prisma_migrations` — #124) |
| **Backfill** | ไม่ต้อง — nullable, `null` = พื้นเรียบ = สถานะ prod ปัจจุบัน |
| **Audit** | ใช้ `homeContentAggregate` (`auditedAggregate`) เดิม; `homeAuditSnapshot()` spread คอลัมน์อัตโนมัติ → snapshot มี `faqBackgroundImageKey` เป็น **key string เท่านั้น** ไม่มี bytes/URL/absolute path — ไม่ต้องแก้ snapshot function |
| **RBAC** | `updateHomeContent` = `requireRole("ADMIN","SALES","MARKETING","EDITOR")` เดิม (หน้า admin ใช้ `canManageContent`) — ไม่มี RBAC surface ใหม่; FINANCE ยังถูกกัน (มี e2e ใน `scripts/e2e-home-cms.mts`) |
| **revalidatePath** | `contentRevalidatePaths("home")` เดิมใน aggregate ครอบ `/th`, `/en` แล้ว — ไม่ต้องแก้ |
| **ไฟล์ที่แตะ** | `prisma/schema.prisma`, `prisma/migrations/<ts>_add_home_faq_background/migration.sql` (generate), `docs/plans/assets/home-faq-background-production-ddl.sql` (ใหม่), `src/lib/content/views.ts`, `src/lib/content/index.ts`, `src/actions/home-content.ts`, `src/components/site/faq-section.tsx`, `src/app/[locale]/home-content.tsx`, `src/app/admin/(dashboard)/pages/home/page.tsx`, `src/app/admin/(dashboard)/pages/home/home-client.tsx`, `scripts/e2e-admin-crud.mts` |
| **ไฟล์ที่ไม่แตะ (ยืนยันแล้ว)** | `home-admin-shell.tsx` (forward props ด้วย spread อยู่แล้ว), `src/lib/validations/home-content.ts`, `src/lib/admin-content.ts`, `src/lib/backfill/home-content.ts`, `src/messages/*.json`, `next.config.ts` |
| **E2E ที่อาจกระทบ** | `scripts/e2e-admin-crud.mts` (hero toggle block ส่งฟอร์มเดียวกัน — ต้องยังผ่าน), `scripts/e2e-home-cms.mts` (audit snapshot check `heroImageKeyBytes`, FAQ text บน public — ต้องยังผ่าน) |
| **Deploy** | ต้อง DDL ก่อน code; rollback = revert code อย่างเดียว คอลัมน์ทิ้งไว้ได้ (nullable, โค้ดเก่าไม่อ่าน) |
| **Perf** | +1 `storage.exists()` ต่อ render หน้าแรก (เฉพาะเมื่อมี key) บนหน้า `revalidate` — ต้นทุนเท่ากับ hero resolver |

## 6. Security

- Validate ฝั่ง server เสมอผ่าน `storePublicImage()` → `validateImage(maxMb 5)` (MIME + extension) → `compressImage()` re-encode เป็น JPEG (ตัด payload แฝง/EXIF)
- Key สร้างฝั่ง server เท่านั้น: `public/pages/home/faq-bg/<cuid>.jpg` — **ห้าม** รับ key/URL/path จาก client; `HOME_ALLOWED_KEYS` reject field แปลกทั้งฟอร์ม (กัน mass-assign `faqBackgroundImageKey=...`)
- ลบ blob เก่าเฉพาะหลัง commit สำเร็จ + ตรวจ prefix `public/pages/home/faq-bg/` ก่อนลบ; `sanitizeKey()` ใน local driver กัน path traversal อีกชั้น
- Audit snapshot มีแค่ storage key
- `/files/public/...` เสิร์ฟแบบ immutable cache — key ใหม่ทุกครั้ง (cuid) จึงไม่มีปัญหา cache ค้าง

## 7. สรุปสิ่งที่ต้องแก้ก่อนลงมือ (pre-flight checklist)

- [ ] `prisma/schema.prisma` — เพิ่ม `faqBackgroundImageKey String?` ใต้บล็อก FAQ chrome ของ `HomePageContent` + คอมเมนต์อ้าง #142
- [ ] migration `add_home_faq_background` (generate ด้วย `npx prisma migrate dev`) + ไฟล์ prod DDL
- [ ] `src/lib/content/views.ts` — `HomePageContentView.faqBackgroundImageKey: string | null` + map ใน mapper (~L505)
- [ ] `src/lib/content/index.ts` — `resolveHomeFaqBackground(key): Promise<string | null>`
- [ ] `src/actions/home-content.ts` — `FAQ_BG_IMAGE_PREFIX`, allowed keys, conflict rule, upload/cleanup/delete-old
- [ ] `src/components/site/faq-section.tsx` — prop `backgroundImageUrl`, export `FAQ_BG_OVERLAY_CLASS`, branch markup
- [ ] `src/app/[locale]/home-content.tsx` — `HomeViewModel.faqBackgroundImageKey` (DB path + fallback `null`), resolve แล้วส่ง prop
- [ ] `src/app/admin/(dashboard)/pages/home/page.tsx` — `faqBackgroundImageUrl`, `faqBackgroundBlobMissing`, `faqLineMissing`
- [ ] `src/app/admin/(dashboard)/pages/home/home-client.tsx` — `FaqBackgroundSection` card + props ใหม่ใน `HomeClient`
- [ ] `scripts/e2e-admin-crud.mts` — block ใหม่ upload/remove/conflict/restore
- [ ] Baseline local ก่อนแก้ S3: `npm run build && npm run start` แล้ว `curl -s localhost:3000/th` เก็บ HTML ส่วน FAQ ไว้ใน scratchpad เพื่อ diff

## 8. Sprint plan

### Dependency / parallel

```
S0 (ux-ui-expert, read-only) ─┐
S1 (schema) ──────────────────┼─> S2 (action) ─┐
                              └─> S3 (public) ─┴─> S4 (admin UI) ─> S5 (verify + reviews) ─> S6 (deploy)
```
- ✅ **S0 ∥ S1** ขนานได้ทันที
- ✅ **S2 ∥ S3** ขนานได้หลัง S1 (ไฟล์ไม่ทับกัน; S3 ใช้ค่า overlay จาก S0 — ถ้า S0 ยังไม่เสร็จใช้ default `bg-white/85` แล้วปรับทีหลังได้เพราะเป็น constant เดียว)
- ⏳ S4 รอ S2 (contract field names) + S3 (`FAQ_BG_OVERLAY_CLASS`)

---

### S0 — Overlay spec lock | `ux-ui-expert` (opus, read-only) | ✅ ขนานกับ S1

- **Scope:** ยืนยันค่า overlay (default `bg-white/85`) และ `object-position`; ระบุเกณฑ์ contrast AA ของ `text-muted-foreground`/`text-primary`/badge บน overlay กับรูปโทนเข้มและสว่าง; ยืนยันว่าการ์ด FAQ (`bg-card`) ไม่ต้องเปลี่ยน
- **ไฟล์:** ไม่มี (ส่ง spec สั้น ๆ เป็น comment ใน #142)
- **Acceptance:** มีค่า class เดียวที่ตัดสินแล้ว + เหตุผล contrast; ไม่เปลี่ยนสีข้อความ (owner lock)

### S1 — Schema + prod DDL asset | `nextjs-dev` (sonnet) | ✅ ขนานกับ S0

- **Scope:** คอลัมน์ใหม่ + migration + view field (ยังไม่มีผลต่อหน้าเว็บ)
- **ไฟล์:** `prisma/schema.prisma`, `prisma/migrations/<ts>_add_home_faq_background/migration.sql`, `docs/plans/assets/home-faq-background-production-ddl.sql`, `src/lib/content/views.ts`
- **Acceptance:**
  - [ ] `npx prisma migrate dev --name add_home_faq_background` apply ได้; `npx prisma db seed` ยัง idempotent
  - [ ] SQL ใน migration = `ADD COLUMN faqBackgroundImageKey VARCHAR(191) NULL`; ไฟล์ prod DDL ใช้ `ADD COLUMN IF NOT EXISTS` + บรรทัด `SHOW COLUMNS FROM HomePageContent LIKE 'faqBackgroundImageKey';` + header แบบ `home-hero-toggle-production-ddl.sql`
  - [ ] `npm run build` ผ่าน; `/th` ไม่เปลี่ยน
- **Commit:** `feat(admin): add faq background image key to home page content`

### S2 — Server action: upload / remove / lifecycle | `nextjs-dev` → review `audit-compliance-reviewer` | ⏳ รอ S1, ✅ ขนานกับ S3

- **Scope:** `src/actions/home-content.ts` เท่านั้น
  - `const FAQ_BG_IMAGE_PREFIX = "pages/home/faq-bg";` + คอมเมนต์ security แบบ `HERO_IMAGE_PREFIX`
  - เพิ่ม `"faqBackgroundImage"`, `"removeFaqBackground"` ใน `HOME_ALLOWED_KEYS`
  - `removeFaqBg = formData.get("removeFaqBackground") === "on"`; ถ้ามีไฟล์ (File, size>0) **และ** remove → return error ไทยก่อน upload (Default #4)
  - upload ตามลำดับ Default #7; data: `newFaqBgKey ? { faqBackgroundImageKey: newFaqBgKey } : removeFaqBg ? { faqBackgroundImageKey: null } : {}`
  - conflict / catch: ลบ `newHeroKey` และ `newFaqBgKey`
  - หลัง commit: ถ้า (`newFaqBgKey` หรือ `removeFaqBg`) และ `existing.faqBackgroundImageKey` ขึ้นต้นด้วย `public/pages/home/faq-bg/` และ ≠ key ใหม่ → `storage.delete` ใน try/catch (Default #6)
  - อัปเดต JSDoc ของ `updateHomeContent` ให้ครอบ FAQ bg lifecycle
- **Acceptance:**
  - [ ] `requireRole(...)` ยังเป็นบรรทัดแรก; mutation ผ่าน `homeContentAggregate.save` (withAudit) เท่านั้น
  - [ ] audit row หลัง upload มี `faqBackgroundImageKey: "public/pages/home/faq-bg/…jpg"` ทั้ง before/after ไม่มี bytes
  - [ ] E3/E8/E15/E16/E17 ทำงานตามตาราง §4
  - [ ] `npm run build` ผ่าน
- **Review:** `audit-compliance-reviewer` ตรวจ `src/actions/home-content.ts` (requireRole + withAudit + ไม่มี secret/bytes ใน snapshot + ไม่รับ key จาก client + blob cleanup ทุก path)
- **Commit:** `feat(admin): accept faq background upload and removal in home content action`

### S3 — Public render | `nextjs-dev` | ⏳ รอ S1, ✅ ขนานกับ S2

- **Scope:**
  - `src/lib/content/index.ts` — `resolveHomeFaqBackground(key: string | null): Promise<string | null>`
  - `src/app/[locale]/home-content.tsx` — `HomeViewModel.faqBackgroundImageKey` (DB path จาก view, fallback path `null`); resolve **เฉพาะเมื่อ** `view.showFaq && lineUrl` (ไม่เสีย `exists()` ตอน section ซ่อน); ส่ง `backgroundImageUrl` ให้ `FaqSection`; **ไม่** เปลี่ยนเงื่อนไข L386
  - `src/components/site/faq-section.tsx` — Default #8/#9/#10; export `FAQ_BG_OVERLAY_CLASS`
- **Acceptance:**
  - [ ] **ไม่มีรูป:** HTML ส่วน FAQ ของ `/th` และ `/en` (production mode) diff กับ baseline ใน §7 = ไม่ต่าง (ยกเว้น build hash); section class = `mx-auto max-w-7xl px-4 py-16 sm:px-6`
  - [ ] **มีรูป (ตั้ง key ผ่าน prisma studio/สคริปต์ชั่วคราว):** section full-bleed, เนื้อหาอยู่ใน `max-w-7xl`, `<img>` มี `loading="lazy"` + `alt=""` ภายใต้ `aria-hidden="true"`, ไม่มี `fetchpriority="high"`
  - [ ] **key ชี้ blob ที่ไม่มี:** markup เท่ากับกรณีไม่มีรูป
  - [ ] ตรวจทั้ง `/th` และ `/en`; `npm run build` ผ่าน
- **Commit:** `feat(site): render optional full-bleed faq background with white overlay`

### S4 — Admin card | `nextjs-dev` | ⏳ รอ S2 + S3

- **Scope:**
  - `page.tsx` — คำนวณ `faqBackgroundImageUrl` (`storage.publicUrl`), `faqBackgroundBlobMissing` (`storage.exists`), `faqLineMissing` (`resolveQuickContact(siteSettings).lineUrl` ว่าง) ส่งเข้า `HomeAdminShell` (spread ต่อถึง `HomeClient` เอง)
  - `home-client.tsx` — `function FaqBackgroundSection` วางก่อนการ์ด "คำถามที่พบบ่อย (FAQ) — n/5 ข้อ":
    - หัวการ์ด "รูปพื้นหลังส่วนคำถามที่พบบ่อย (FAQ)" + คำแนะนำ "ใช้ภาพเดียวกันทั้งเว็บไทยและอังกฤษ — แนะนำแนวนอน กว้างอย่างน้อย 1920px วางจุดสนใจไว้กลางภาพ ไม่เกิน 5MB (JPEG/PNG/WebP) ระบบจะใส่ชั้นสีขาวโปร่งทับให้อัตโนมัติ"
    - preview กรอบ aspect ~`16/6`: รูป (`preview ?? url`) + `<div className={FAQ_BG_OVERLAY_CLASS}>` + ข้อความตัวอย่างสี `text-primary`/`text-muted-foreground` → เห็นผลจริง; ไม่มีรูป → "ยังไม่มีรูป — หน้าเว็บใช้พื้นเรียบ"
    - `<Input id="home-faq-bg-image" name="faqBackgroundImage" type="file">` + client check type/size (ข้อความเหมือน hero)
    - ปุ่ม "ลบรูปพื้นหลัง" (แสดงเมื่อมี key เดิม) → **inline confirm** แถว "ยืนยันลบรูปพื้นหลัง? รูปจะถูกลบเมื่อกดบันทึก" [ยืนยันลบ] [ยกเลิก] (ไม่ใช้ `window.confirm`); ยืนยัน → `<input type="hidden" name="removeFaqBackground" value="on">`, preview เป็นพื้นเรียบ + badge "จะถูกลบเมื่อบันทึก", ล้าง + disable file input; ปุ่ม "เลิกลบ" คืนสถานะ; เลือกไฟล์ใหม่ = ยกเลิก pending remove
    - `faqBackgroundBlobMissing` → warning แดงแบบ hero "ไม่พบไฟล์รูปพื้นหลังในระบบจัดเก็บ — หน้าเว็บจริงแสดงพื้นเรียบแทน"
    - hint E5/E6 เมื่อ `!showFaq || faqLineMissing`
    - id ที่ e2e ใช้: `#home-faq-bg-image`, `#home-faq-bg-remove`, `#home-faq-bg-remove-confirm`
- **Acceptance:**
  - [ ] login `/admin/pages/home` (ADMIN และ EDITOR) — upload → toast "บันทึกเนื้อหาหน้าแรกเรียบร้อย" → preview แสดงรูปที่เก็บแล้ว; ลบ → confirm inline → บันทึก → กลับ "ยังไม่มีรูป"
  - [ ] ไฟล์ผิด type/เกินขนาด แสดง error ไทยใต้ input ไม่ส่งฟอร์ม
  - [ ] hero image card และ hero toggle ทำงานเหมือนเดิม
- **Commit:** `feat(admin): add faq background card with preview and inline remove confirm`

### S5 — E2E + verify + independent reviews | `nextjs-dev` → `audit-compliance-reviewer` ∥ `design-business-reviewer` | ⏳ รอ S4

- **Scope:** `scripts/e2e-admin-crud.mts` block "Home FAQ background" (บันทึก baseline key → upload fixture → ตรวจ DB key prefix + `/th`,`/en` HTML มี key + `aria-hidden` → inject DOM ส่งไฟล์+remove พร้อมกัน → ต้องเห็น error และจำนวนไฟล์ใน `STORAGE_ROOT/public/pages/home/faq-bg/` ไม่เพิ่ม → remove → DB `null`, blob เดิมหาย, section class กลับเป็น baseline → audit row ล่าสุดมีแค่ key → restore)
- **Verify (ตาม `.claude/skills/verify/SKILL.md`):**
  ```bash
  npx prisma migrate dev && npx prisma db seed
  npx tsx scripts/verify-all.mts          # build → start → booking → admin → admin-crud
  npx tsx scripts/e2e-home-cms.mts        # hero/FAQ/RBAC/audit regression (server running)
  ```
  เปิดดู: `/th`, `/en` (ไม่มีรูป + มีรูป), `/admin/pages/home`
- **Reviews (ขนานกันได้ ✅):**
  - `audit-compliance-reviewer` — `src/actions/home-content.ts` รอบสุดท้าย (คนละตัวกับผู้เขียน)
  - `design-business-reviewer` — **real render บน `npm run start`** ไม่ใช่ mockup: desktop 1440 + ≥1920 และ mobile 390, ทั้ง `/th` `/en`, ทั้งมีรูป (รูปสว่าง + รูปเข้ม) และไม่มีรูป; ตัดสิน contrast/ความน่าเชื่อถือ/ไม่แย่ง CTA LINE
- **Acceptance:** ✓ lines ครบทุก suite; reviewer ทั้งสองไม่มี blocker (มี → กลับ S2/S3/S4)
- **Commit:** `test(e2e): cover home faq background upload, conflict and removal`

### S6 — Deploy + live-verify | `deploy-verify` → `hosting-deploy-specialist` (+ owner สำหรับ FTP/phpMyAdmin) | ⏳ รอ S5 + owner อนุมัติ

1. อ่าน `docs/plans/kkd-shared-hosting-redeploy-runbook.md` ทั้งไฟล์ก่อนเริ่ม
2. Owner merge/push commit S1–S5 บน `main`
3. phpMyAdmin (`kkdprop1_kkdproperty` — ตรวจชื่อ DB ใน sidebar): รัน `docs/plans/assets/home-faq-background-production-ddl.sql` → `SHOW COLUMNS FROM HomePageContent LIKE 'faqBackgroundImageKey';` ต้องเห็นคอลัมน์ **ก่อน** ไปต่อ
4. `npx tsx scripts/build-shared-hosting-deploy.mts` → upload → extract → restart Passenger ตาม runbook (`deploy-verify` ตรวจ artifact ก่อน)
5. Smoke (ยังไม่มีรูป = ต้องเหมือน baseline):
   ```bash
   npx tsx scripts/smoke-test-production.mts \
     --check /th --expect-text 'class="mx-auto max-w-7xl px-4 py-16 sm:px-6"' \
     --check /en --expect-text 'class="mx-auto max-w-7xl px-4 py-16 sm:px-6"'
   ```
   + `/admin/pages/home` 307, `/api/admin/leads` 401 (ไม่ใช่ 500)
   + negative check (smoke script ไม่รองรับ "ต้องไม่มี"): `curl -s https://kkdproperty.co.th/th | grep -c 'pages/home/faq-bg'` → ต้องได้ `0`
   + หมายเหตุ: class `mx-auto max-w-7xl px-4 py-16 sm:px-6` ใช้ซ้ำในหลายหน้า/คอมโพเนนต์ (`stats-row`, `testimonials-section`, …) — บน `/th` ใช้ได้เป็นสัญญาณประกอบเท่านั้น ให้ยืนยันคู่กับการเปิดดูด้วยตาเทียบ baseline
6. Owner อัปรูปจริงใน `/admin/pages/home` แล้ว:
   ```bash
   npx tsx scripts/smoke-test-production.mts \
     --check /th --expect-text '/files/public/pages/home/faq-bg/' \
     --check /en --expect-text '/files/public/pages/home/faq-bg/'
   ```
7. `design-business-reviewer` ดู production render desktop + mobile อีกรอบ
- **Commit:** `docs(deploy): mark home faq background deployed`
- **Rollback:** redeploy build ก่อนหน้า; คอลัมน์ทิ้งไว้ได้ (nullable) — ไม่ต้อง DROP

---

## 9. Template — สรุปสิ่งที่แก้ไปแล้ว (กรอกหลังจบแต่ละ sprint, comment ลง #142 ด้วย)

```markdown
### After-fix — S<n> <ชื่อ sprint>  (YYYY-MM-DD, by <agent>)
- ไฟล์ที่แก้: `path` — <เปลี่ยนอะไร ระดับ function/field>
- Commit: `<hash> <type(scope): description>`
- Acceptance: [x]/[ ] ตามรายการใน sprint (ข้อที่ไม่ผ่าน/ข้าม ระบุเหตุผล)
- Verify ที่รันจริง: <คำสั่ง> → <✓ lines / status codes>
- Locales ที่เปิดดู: /th … /en … (desktop/mobile)
- Reviewer: <agent> → pass / findings <ลิงก์>
- ความเสี่ยงคงค้าง / follow-up:
```

## Out of scope

- Slider ปรับความเข้ม overlay / สี overlay ต่อรูป — owner ล็อก "อัตโนมัติ ไม่มี slider"
- รูปแยก TH/EN หรือช่อง alt TH/EN — owner ล็อก "รูปเดียว" และรูปเป็น decorative
- ปุ่มลบรูป **hero** และการ extract image-card ร่วมกับ hero — แยกเป็น follow-up issue ถ้าต้องการ (Default #14)
- ทำ post-commit delete ของ hero ให้เป็น best-effort แบบเดียวกัน — ไม่แตะ hero path (surgical)
- รูปพื้นหลังให้ section อื่น (Latest Works / Services CTA) หรือหน้าอื่น
- dark-mode variant ของ overlay
- Automated prod schema-drift check — อยู่ใน #124
