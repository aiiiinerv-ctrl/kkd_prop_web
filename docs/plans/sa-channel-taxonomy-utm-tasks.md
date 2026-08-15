# SA Channel Taxonomy + UTM Tracking — Task Breakdown

อ้างอิง:
- SA draft table (Google Sheet) — taxonomy 3 ชั้น + คอลัมน์ UTM ต่อช่องทาง (สรุปเนื้อหาโดยผู้ใช้แล้ว ไม่ต้องเปิดชีตซ้ำ)
- GitHub issue **#24** — "ระบบไม่เก็บ UTM / gclid / fbclid / landing page" (ยังเปิดค้าง, label `wayfinder:grilling`) — แผนนี้ปิดเฉพาะส่วน UTM
- `docs/plans/sprint-3-cookie-consent-tasks.md` (consent gate ของ `kkd_ref`), `docs/plans/sprint-5-reports-tasks.md` (รายงาน/export), `docs/plans/kkd-shared-hosting-redeploy-runbook.md` (กฎ "schema first, always verified")
- `AGENTS.md` — TH/EN parity, `withAudit()` + `requireAdmin()`, surgical changes, commit convention

**ข้อเท็จจริงจาก SA ที่ห้ามแก้ (quote ตรง):**
- ประเภทช่องทาง 3 ค่า: แพลตฟอร์มออนไลน์ / บริษัท / บุคคล
- ประเภทช่องทางย่อย 10 ค่า + รหัสตัวย่อ: Tele Sale `TE`, Line `LN`, Line OA `LO`, TikTok `TT`, Facebook `FB`, Website `WS`, บริษัท (Corporate/B2B) `CP`, ลูกค้าเก่า `RF`, พนักงาน `EF`, นายหน้า `AG`
- รหัสพนักงาน = รหัสช่องทาง + running 2 หลัก เช่น `TE00101`
- utm_source: `telesale` / `line` / `line_oa` / `tiktok` / `facebook` / `website`; utm_medium: `direct` / `chat` / `social`; utm_campaign: `package_info` หรือ `always_on`; utm_content: รหัสช่องทาง หรือรหัสพนักงาน/ปุ่ม
- ลิงก์โปรโมทชี้ `https://www.kkdproperty.co.th/th/packages?ref=<code>` (ไม่ใช่หน้าแรก)

**สถานะจริงในโค้ดที่ตรวจแล้ว (2026-08-15) — ห้ามวางแผนสร้างซ้ำ:**

| ของ | สถานะ | ที่อยู่ |
|---|---|---|
| `ChannelType` enum INDIVIDUAL/COMPANY/PLATFORM | **มีแล้ว** ตรงกับชั้น "ประเภทช่องทาง" | `prisma/schema.prisma:61`, label ไทยที่ `src/lib/enum-labels.ts:71` |
| ชั้น "ประเภทช่องทางย่อย" | **ไม่มี** — ชื่อช่องทางทำหน้าที่แทนอยู่ | — |
| ref cookie + consent gate + recovery หลังกด accept | **มีครบแล้ว ทำงานถูก** อย่าไปรื้อ | `src/proxy.ts` (`applyRefCookie`), `src/lib/ref-cookie.ts`, `src/app/api/ref/route.ts`, `src/components/site/ref-consent-capture.tsx` |
| resolve ref → Lead | **มีแล้ว** (`autoSourceChannelId` / `autoSourceExecutiveId`) | `src/lib/ref-attribution.ts` |
| e2e ของ ref/consent | **มีแล้ว** ต่อยอด ไม่ต้องเขียนใหม่ | `scripts/e2e-channel-tracking.mts` |
| UTM ทุกส่วน | **ไม่มีเลย** — ไม่มีคอลัมน์ ไม่มีโค้ดอ่าน | — |
| ตัวสร้าง refCode | **มี 2 ที่ และพังกับ prefix ใหม่ทั้งคู่** `Number(last.refCode.replace("CH",""))` เจอ `FB001` → NaN→0 → สร้าง `CH001` ชนกับของเดิม | `src/actions/channels.ts:43`, `prisma/seed.ts:75` |
| `promoLink()` ชี้หน้าแรก `${siteUrl}/?ref=` | ต้องแก้ให้เลือก landing ได้ | `src/app/admin/(dashboard)/channels/channels-client.tsx:58` |
| 301 www→non-www รักษา query string | **ทดสอบแล้ววันนี้ ใช้ได้ ไม่ต้องแก้** | `.htaccess` (host-only, commit ff8de0d) |
| production data | Lead=0, SurveyBooking=0, ChannelExecutive=0, PromoChannel เหลือ 6 ช่องจริง | **จังหวะที่ดีที่สุดที่จะเปลี่ยน refCode scheme — ไม่มีข้อมูลให้ migrate** |

Note: หัวตารางในชีตสะกดตก 2 จุด ("ประเภทช่งทางย่อย", "ชือช่องทาง") — แจ้ง SA ตอนส่งกลับ ไม่ทำเป็น task

---

## Default ที่ตัดสินใจแล้ว (ไม่ block ถามผู้ใช้)

1. **สองระบบคู่กัน ตามที่ผู้ใช้เคาะ** — `kkd_ref` = attribution รายคน/รายช่องทาง (ของเดิม, เขียนลง `autoSourceChannelId`/`autoSourceExecutiveId`), UTM = campaign tracking (ของใหม่, คอลัมน์แยกบน `Lead`) **ไม่ยุบรวม** และเมื่อมาพร้อมกัน **`ref` ชนะสำหรับการนับช่องทางในรายงาน** — `effectiveChannel()` (`src/lib/reports/aggregate.ts:144`) คงเดิมทุกบรรทัด UTM ไม่เข้าไปแย่งลำดับ ไม่งั้นรายงานช่องทางจะนับซ้ำ (ตรงกับข้อกังวลใน issue #24)
2. **เก็บ "ประเภทช่องทางย่อย" เป็นคอลัมน์ `subType String @db.VarChar(4)` บน `PromoChannel`** (เก็บรหัสตัวย่อ `TE`/`LN`/… ตรง ๆ) + ตารางนิยามใน `src/lib/channel-taxonomy.ts` (prefix → ชื่อ TH/EN + ChannelType ที่ถูกต้อง + UTM default triple) validate ด้วย `zodEnum` ตาม pattern `src/lib/enums.ts`
   - **ไม่เลือก Prisma enum** เพราะ production ไม่มี SSH — เพิ่มค่าที่ 11 ทีหลังจะกลายเป็น `ALTER TABLE … MODIFY` ที่ต้องทำมือผ่าน phpMyAdmin ทุกครั้ง; `VarChar(4)` + zod ให้ผลบังคับเท่ากันที่ชั้นแอปโดยไม่ต้องแตะ DDL อีก
   - **ไม่เลือก self-relation (channel เป็นแม่ของ channel)** เพราะ `refCode @unique` + relation `leads`/`autoLeads` จะกำกวมทันทีว่าผูกกับแม่หรือลูก และ `effectiveChannel()` ต้องรื้อ
   - **ไม่เลือกตาราง lookup แยก** เพราะได้ CRUD + audit surface เพิ่มมาเพื่อข้อมูลที่เปลี่ยนปีละครั้ง
3. **UTM เก็บเป็นคอลัมน์แยก 5 ตัวบน `Lead`** (`utmSource`, `utmMedium`, `utmCampaign`, `utmContent`, `utmTerm` — `String? @db.VarChar(120)`) + `landingPath String?` — ไม่ใช่ JSON ก้อนเดียว เพราะปลายทางคือ filter + export เป็นคอลัมน์ (`src/lib/reports/export-rows.ts`) ซึ่ง JSON ทำให้ query ฝั่ง MySQL ยุ่งโดยไม่ได้อะไรคืน (ต่างจาก `interestedSystems` ที่เป็น array ไม่เคยถูก filter)
4. **UTM ใช้ last-touch เหมือน `kkd_ref`** — เขียนทับเมื่อมี utm ชุดใหม่เข้ามา และเขียนทั้งชุดพร้อมกัน (ไม่ผสมชุดเก่ากับใหม่) เพื่อไม่ให้ได้ `utm_source` ของแคมเปญหนึ่งคู่กับ `utm_campaign` ของอีกแคมเปญ
5. **UTM ใช้ cookie ก้อนเดียว `kkd_utm` (JSON, 30 วัน, httpOnly, maxAge เท่า `REF_COOKIE_MAX_AGE`)** ไม่ใช่ 5 cookie — เขียน/อ่านที่เดียวกับ `kkd_ref` ทุกจุด
6. **landing page ของลิงก์โปรโมทเลือกได้จาก dropdown แบบจำกัดรายการ** (`/th/packages` เป็นค่า default ตามชีต, ตัวเลือกอื่น: `/th`, `/th/booking`, `/th/calculator`) — ไม่เปิดให้พิมพ์ URL อิสระ เพราะ URL ที่พิมพ์ผิดจะ 404 เงียบ ๆ หลังแจกลิงก์ออกไปแล้ว; เก็บเป็น `landingPath` บน `PromoChannel`
7. **ปุ่ม copy จะให้ลิงก์ที่มี UTM ครบชุดมาแล้ว** (`?ref=…&utm_source=…&utm_medium=…&utm_campaign=…&utm_content=<รหัส>`) โดย UTM default มาจาก `subType` — admin แก้ `utm_campaign` ได้รายช่องทาง (`package_info`/`always_on`) ส่วน source/medium ล็อกตาม subType เพื่อกันข้อมูลรายงานเละจากการพิมพ์เอง
8. **`utm_content` เติมอัตโนมัติเป็นรหัสช่องทาง/รหัสพนักงานของแถวนั้น** ตรงตามชีต — admin ไม่ต้องกรอก
9. **แสดง UTM ในหลังบ้านที่ lead detail + คอลัมน์ใน export** แต่ **ยังไม่ทำหน้า dashboard แคมเปญแยก** — รอดูข้อมูลจริงสัก 1 เดือนก่อนค่อยตัดสินว่าต้องมีกราฟอะไร
10. **ไม่ย้าย/ไม่ rename refCode ของ 6 ช่องทางเดิมโดยอัตโนมัติ** — ให้ admin เป็นคนตัดสินทีละช่องผ่าน UI ในสปรินต์ 1 (ข้อมูล lead = 0 จึงไม่มีอะไรพัง) ระบบเก่า `CH###` ยังอ่านได้ตลอดเพราะ resolve ด้วยการ lookup ตรง ๆ ไม่ได้ parse รูปแบบ

---

## คำตอบจากผู้ใช้ (2026-08-15) — Sprint 0 ปิดแล้ว ไม่มีอะไร block

| คำถาม | คำตอบที่เลือก | ผลต่อการทำงาน |
|---|---|---|
| **Q1** รูปแบบรหัสช่องทาง | **ตัวเลือก A** — prefix + running 3 หลัก **แยกนับต่อ prefix** (`TE001`, `FB001`, `CP001`, `AG001`) | ตัวสร้างโค้ดต้องนับ max ของ prefix นั้น ๆ ไม่ใช่ทั้งตาราง; ไม่ใช้ปี พ.ศ. ที่ไหนเลย ต่างจากชีตในกลุ่ม CP/RF/EF/AG — **แจ้ง SA ตอนส่งกลับ** |
| **Q1b** รหัสพนักงาน | **`TE00101`** — ต่อท้ายรหัสช่องทางด้วย running 2 หลัก ตามชีต | ต้องแก้ `nextExecutiveRefCode()` (`src/actions/channels.ts:96`) ให้เลิกใส่ `-EX`; รหัสเดิม `CH018-EX01` ของ เจนจิรา ตะลุง ยัง resolve ได้ เพราะ lookup ตรง ไม่ได้ parse รูปแบบ |
| **Q2** consent gate ของ UTM | **gate เหมือน `kkd_ref` ทุกประการ** | `kkd_utm` เขียนใน `applyRefCookie()` ตัวเดิมหลังผ่าน `hasAdvertisementConsent()` และกู้คืนผ่าน route เดิม — มาตรฐาน PDPA เดียวทั้งเว็บ ยอมเสียข้อมูลจาก visitor ที่ไม่กดยอมรับ |
| **Q3** deadline แคมเปญ | **ไม่มี** | ทำเรียง Sprint 1→5 ตามลำดับ ไม่ต้องตัด Sprint 4 ออกไปหลัง go-live |

---

## คำถามที่ต้องตอบก่อนเริ่ม (ตอบครบแล้ว — เก็บไว้เป็นบันทึกเหตุผล)

**Q1 — spec รหัสช่องทาง (block Sprint 1 ทั้งสปรินต์)**
ชีตใช้ 2 รูปแบบปนกัน ต้องเลือก **หนึ่ง** ก่อนเขียนตัวสร้างโค้ด:

| ตัวเลือก | หน้าตา | ข้อดี | ข้อเสีย |
|---|---|---|---|
| **A. prefix + running 3 หลัก แยกนับต่อ prefix** (แนะนำ) | `TE001`, `FB001`, `CP001`, `AG001` | สั้น เดาได้ นับแยกต่อช่องทางย่อย ตัวสร้างโค้ดง่ายและชนกันไม่ได้ | ต่างจากที่ชีตเขียนไว้ในกลุ่ม CP/RF/EF/AG |
| **B. ตามชีตเป๊ะ** | `TE001` แต่กลุ่มบุคคล/บริษัทเป็น `CP69001`, `RF69002`, `EF69003`, `AG69004` | ตรงเอกสาร SA ไม่ต้องอธิบายลูกค้า | ผสมสองกติกาในระบบเดียว (บางกลุ่มมีปี พ.ศ. บางกลุ่มไม่มี) + running number ในกลุ่มหลังนับรวมข้าม prefix (69001→69004) แปลว่าเลขไม่ผูกกับ prefix ตัวเอง ทำให้ตัวสร้างโค้ดต้อง lock ทั้งตารางตอน insert |
| **C. ใส่ปีทุกกลุ่ม** | `TE69001`, `FB69001`, `CP69001` | กติกาเดียวทั้งระบบ + รู้ปีที่เปิดช่องทาง | รหัสยาวขึ้น ลิงก์โปรโมทอ่านยากขึ้นเล็กน้อย |

**และรหัสพนักงาน:** ชีตใช้ `TE00101` (ต่อท้ายเลย) ระบบปัจจุบันใช้ `CH001-EX01` (`nextExecutiveRefCode()`, `src/actions/channels.ts:96`)
→ เลือก `TE00101` ตามชีต หรือคง `-EX` ไว้? (ผู้ใช้ตัดสิน — `TE00101` อ่านง่ายกว่าในลิงก์แต่แยกส่วนรหัสด้วยตาไม่ออก)

**Q2 — consent gate ของ UTM (block Sprint 3)**
`kkd_ref` เป็น marketing cookie จึงถูก gate ด้วย `hasAdvertisementConsent()` อยู่แล้ว (`src/lib/ref-cookie.ts`) UTM เป็นข้อมูลชนิดเดียวกัน
- **แนะนำ: gate เหมือนกันทุกประการ** — ผ่าน `applyRefCookie()` ตัวเดิมและ recovery route เดิม แปลว่า visitor ที่ไม่กด accept จะไม่มีข้อมูลแคมเปญ (ยอมเสียข้อมูลเพื่อ PDPA compliance ที่สม่ำเสมอ ไม่ต้องอธิบายสองมาตรฐานให้ DPO)
- ทางเลือกอื่น: เก็บ UTM โดยไม่ขอ consent โดยอ้างว่าเป็น analytics ของตัวเอง — **ไม่แนะนำ** เพราะ CookieYes บนเว็บนี้แยกหมวด advertisement ไว้แล้ว การเก็บสวนหมวดที่ visitor ปฏิเสธคือความเสี่ยงตรง ๆ
→ ต้องการคำยืนยันจากผู้ใช้ก่อนเขียนโค้ด เพราะกระทบ % ข้อมูลที่เก็บได้จริงอย่างมีนัยสำคัญ

**Q3 — deadline / จังหวะ deploy**
production ว่างเปล่าตอนนี้ (Lead=0) ถ้าจะเปลี่ยน refCode scheme ควรขึ้นก่อนเริ่มยิงแอดรอบหน้า — มี deadline ของแคมเปญที่ต้องล็อกไหม? ถ้ามี ให้ตัด Sprint 4 (รายงาน/export) ไปหลัง go-live ได้

---

## Sprint 0 — เคาะ spec (ผู้ใช้ + PM, ~0.5 ชม.)

0.1 ตอบ Q1/Q2/Q3 ด้านบน | ผู้รับผิดชอบ: **ผู้ใช้** | ⏳ block ทุกอย่าง
0.2 comment คำตอบ Q2 ลง GitHub issue **#24** และติด label `ready-for-agent` (ปิด issue เป็นการตัดสินใจของผู้ใช้ — PM แค่เสนอ) | ผู้รับผิดชอบ: **pm-expert** | ⏳ รอ #0.1

---

## Sprint 1 — Taxonomy + refCode scheme (ขนาด: M, ~1 วัน)

เป้า: มีชั้น "ประเภทช่องทางย่อย" จริงในระบบ และตัวสร้าง refCode ที่ไม่พังกับ prefix ใหม่

1.1 `src/lib/channel-taxonomy.ts` (**ไฟล์ใหม่**) — ตาราง 10 subType: `{ code, nameTh, nameEn, channelType, utmSource, utmMedium }` + `CHANNEL_SUB_TYPES` array + helper `subTypeOf(code)` | **nextjs-dev** | ✅ ขนานได้
1.2 `prisma/schema.prisma` — `PromoChannel`: `subType String? @db.VarChar(4)`, `landingPath String @default("/th/packages")`, `utmCampaign String? @db.VarChar(60)` (`Lead` ยังไม่แตะ — ไปแตะ Sprint 3) | **nextjs-dev** | ⏳ รอ #0.1
1.3 `prisma/migrations/` — รัน `npx prisma migrate dev` และ **เก็บ SQL ที่ได้ไว้ส่ง phpMyAdmin** เขียนเป็น `ADD COLUMN IF NOT EXISTS` ตาม runbook | **nextjs-dev** | ⏳ รอ #1.2 — ✅ ทำแล้ว: `prisma/migrations/20260815105843_add_channel_subtype_utm/migration.sql` (dev, ผ่าน `prisma migrate dev`); phpMyAdmin-safe version ด้านล่างสำหรับ Sprint 5.3

```sql
-- Sprint 1 — apply via phpMyAdmin SQL tab (database: kkdprop1_kkdproperty)
ALTER TABLE `PromoChannel` ADD COLUMN IF NOT EXISTS `subType` VARCHAR(4) NULL;
ALTER TABLE `PromoChannel` ADD COLUMN IF NOT EXISTS `landingPath` VARCHAR(191) NOT NULL DEFAULT '/th/packages';
ALTER TABLE `PromoChannel` ADD COLUMN IF NOT EXISTS `utmCampaign` VARCHAR(60) NULL;
-- Verify: SHOW COLUMNS FROM `PromoChannel`;
```

3.4 (Sprint 3) `prisma/migrations/20260815121403_add_utm_lead_columns/migration.sql` — dev, ผ่าน `prisma migrate dev`; phpMyAdmin-safe version ด้านล่างสำหรับ Sprint 5.3

```sql
-- Sprint 3 — apply via phpMyAdmin SQL tab (database: kkdprop1_kkdproperty)
ALTER TABLE `Lead` ADD COLUMN IF NOT EXISTS `utmSource` VARCHAR(120) NULL;
ALTER TABLE `Lead` ADD COLUMN IF NOT EXISTS `utmMedium` VARCHAR(120) NULL;
ALTER TABLE `Lead` ADD COLUMN IF NOT EXISTS `utmCampaign` VARCHAR(120) NULL;
ALTER TABLE `Lead` ADD COLUMN IF NOT EXISTS `utmContent` VARCHAR(120) NULL;
ALTER TABLE `Lead` ADD COLUMN IF NOT EXISTS `utmTerm` VARCHAR(120) NULL;
ALTER TABLE `Lead` ADD COLUMN IF NOT EXISTS `landingPath` VARCHAR(200) NULL;
-- Verify: SHOW COLUMNS FROM `Lead`;
```
1.4 `src/actions/channels.ts:43` `nextChannelRefCode()` — รับ `subType` แล้วสร้าง `<PREFIX><running>` โดย query `where: { refCode: { startsWith: prefix } }` และ parse เฉพาะส่วนตัวเลข (แก้บั๊ก NaN→0 ที่ทำให้ชน unique) + เพิ่ม `subType`/`landingPath`/`utmCampaign` เข้า `channelSchema` | **nextjs-dev** | ⏳ รอ #1.1,#1.2
1.5 `src/actions/channels.ts:96` `nextExecutiveRefCode()` — ปรับรูปแบบตามคำตอบ Q1 (ค่าเริ่มต้นสมมติ `TE00101`) | **nextjs-dev** | ⏳ รอ #0.1
1.6 `prisma/seed.ts:75` — ตัว `nextChannelRefCode()` ก๊อบซ้ำอยู่ในไฟล์นี้ ต้องแก้พร้อมกัน ไม่งั้น seed จะสร้างโค้ดคนละสกีมกับ runtime; อัปเดต 6 ช่องทาง seed ให้มี `subType` และคง idempotent | **nextjs-dev** | ⏳ รอ #1.4
1.7 `src/app/admin/(dashboard)/channels/channels-client.tsx` — dialog สร้าง/แก้ช่องทาง: dropdown "ประเภทช่องทางย่อย" (auto-set `type` ตาม taxonomy), dropdown landing page, ช่อง `utm_campaign`; ตารางเพิ่มคอลัมน์แสดง subType | **nextjs-dev** (ถ้า layout ต้องรื้อ ให้ **ux-ui-expert** วางก่อน) | ⏳ รอ #1.4
1.8 `src/app/admin/(dashboard)/channels/page.tsx` — ส่ง field ใหม่ลง client props | **nextjs-dev** | ⏳ รอ #1.7
1.9 ตรวจ `createChannel`/`updateChannel` ยังขึ้นต้นด้วย `requireRole("ADMIN")` และผ่าน `auditedEntity` ครบ field ใหม่ ไม่มี secret หลุด snapshot | **audit-compliance-reviewer** (คนละตัวกับคนเขียน) | ⏳ รอ #1.8

---

## Sprint 2 — ลิงก์โปรโมท + UTM builder (ขนาด: S, ~0.5 วัน)

2.1 `src/lib/promo-link.ts` (**ไฟล์ใหม่** — ย้ายตรรกะออกจาก client component เพราะ Sprint 4 ต้องใช้ฝั่ง server ด้วย) — `buildPromoLink({ siteUrl, refCode, landingPath, subType, utmCampaign })` คืน URL พร้อม `?ref=` + utm 4 ตัว; `utm_content` = refCode ของแถวนั้น | **nextjs-dev** | ✅ ทำแล้ว — ช่องทางที่ `subType` เป็น null หรือไม่มี utm default (CP/RF/EF/AG) ได้ลิงก์แบบมีแค่ `?ref=` ไม่มี utm ว่าง ๆ
2.2 `src/app/admin/(dashboard)/channels/channels-client.tsx:58` — ลบ `promoLink()` ตัวเดิม (`${siteUrl}/?ref=`) เรียก `buildPromoLink()` แทน ทั้งแถวช่องทาง (บรรทัด ~220) และแถวพนักงาน (~388) | **nextjs-dev** | ✅ ทำแล้ว — ลิงก์พนักงานสืบทอด `landingPath`/`subType`/`utmCampaign` จากช่องทางแม่ ใช้ refCode ตัวเอง
2.3 หน้า `/admin/channels` — แสดงลิงก์ยาวขึ้นมาก (มี utm 4 ตัว) ต้องไม่ทำตารางแตก: ตัดด้วย `truncate` + tooltip เต็ม, ปุ่ม copy คัดลอกตัวเต็มเสมอ | **nextjs-dev** | ✅ ทำแล้ว — ใช้ native `title` attribute แทน tooltip component (ไม่มี Tooltip primitive ใน shadcn setup ของโปรเจกต์ และงานเล็กเกินคุ้มรอบออกแบบเต็มของ **ux-ui-expert** ตามที่ตัดสินระหว่างทาง) ตรวจกับ render จริงแล้ว ตารางไม่แตก
2.4 ตรวจ `?ref=` ยังทำงานเมื่อมี utm ต่อท้าย และ landing `/th/packages` ไม่โดน locale middleware กินพารามิเตอร์ — ต่อยอด `scripts/e2e-channel-tracking.mts` เพิ่มเคส `/th/packages?ref=…&utm_*` | **nextjs-dev** | ✅ ทำแล้ว — Case 12

---

## Sprint 3 — UTM capture → Lead (ขนาด: M, ~1 วัน) — **block ด้วย Q2**

3.1 `src/lib/utm.ts` (**ไฟล์ใหม่**) — `UTM_COOKIE = "kkd_utm"`, `parseUtmParams(searchParams)` (ตัดที่ 120 ตัวอักษร, whitelist 5 คีย์, ทิ้งทั้งชุดถ้าไม่มี `utm_source`), `serializeUtm`/`parseUtmCookie` | **nextjs-dev** | ✅ ทำแล้ว
3.2 `src/proxy.ts` — เพิ่ม `applyUtmCookie()` ข้าง `applyRefCookie()` **ใช้ `hasAdvertisementConsent()` ตัวเดียวกัน** (ตามคำตอบ Q2) เขียนทั้งชุดพร้อมกัน last-touch; ห้ามแตะ matcher และห้ามแตะตรรกะ `applyRefCookie` เดิม | **nextjs-dev** | ✅ ทำแล้ว — ตรวจซ้ำอิสระแล้วว่า `applyRefCookie()`/`matcher` ไม่ถูกแก้แม้แต่บรรทัดเดียว
3.3 `src/app/api/ref/route.ts` + `src/components/site/ref-consent-capture.tsx` — ขยาย recovery path ให้ส่ง utm ไปด้วย (visitor ที่กด accept ทีหลัง จะเสีย utm เหมือนที่เคยเสีย ref — บั๊กเดิมที่วัดจริงบน production 2026-08-13) พร้อม re-check consent ฝั่ง server เหมือนเดิม | **nextjs-dev** | ✅ ทำแล้ว — `landingPath` มาจาก `req.nextUrl.pathname` (proxy) หรือ `Referer` header (recovery route)
3.4 `prisma/schema.prisma` `Lead` — `utmSource/utmMedium/utmCampaign/utmContent/utmTerm String? @db.VarChar(120)` + `landingPath String? @db.VarChar(200)` + comment อธิบายว่าอยู่คนละระบบกับ `autoSourceChannelId` (ตาม default #1) | **nextjs-dev** | ✅ ทำแล้ว — `prisma/migrations/20260815121403_add_utm_lead_columns/migration.sql`; SQL สำหรับ phpMyAdmin อยู่ท้ายไฟล์นี้ (Sprint 5.3)
3.5 `src/lib/ref-attribution.ts` — เพิ่ม `resolveUtmAttribution()` แยกฟังก์ชัน **ห้ามแก้ `resolveRefAttribution()`** (สองระบบคู่กัน ไม่ปนกัน) | **nextjs-dev** | ✅ ทำแล้ว — ตรวจซ้ำอิสระแล้วว่า `resolveRefAttribution()`/`resolveRefReferrerName()` ไม่ถูกแก้; ห่อ try/catch คืน null ทั้งชุดถ้า parse ล้มเหลว
3.6 `src/actions/submit-quote.ts` + `src/actions/submit-survey-booking.ts` — เขียน utm ลง Lead ตอน create; UTM ที่อ่านไม่ได้/ว่าง ต้องไม่ทำให้ submit ล้ม (lead สำคัญกว่า attribution — หลักเดียวกับ `notifyNewLead()`) | **nextjs-dev** | ✅ ทำแล้ว
3.7 `scripts/e2e-channel-tracking.mts` — เพิ่มเคส: (a) มี utm อย่างเดียว, (b) มี ref+utm พร้อมกัน → ต้องได้ทั้ง `autoSourceChannelId` และคอลัมน์ utm, (c) ไม่ consent → ไม่มี utm ในฐานข้อมูล, (d) accept ทีหลังแล้ว recovery ติด | **nextjs-dev** | ✅ ทำแล้ว — Case 13–16, `verify-all` เขียวทั้งชุด (ตรวจซ้ำอิสระแล้ว)
3.8 `src/app/[locale]/cookie-policy/page.tsx` + `src/messages/th.json` + `en.json` — เพิ่ม `kkd_utm` ลงตารางคุกกี้ (ชื่อ/วัตถุประสงค์/อายุ) **ทั้งสองภาษา** | **nextjs-dev** | ✅ ทำแล้ว — คีย์ `utmPurpose`/`utmDuration`, category advertisement เหมือน `kkd_ref`
3.9 ตรวจ key parity ของ #3.8 | **i18n-parity-checker** | ✅ PASS — `cookiePolicy.utmPurpose`/`utmDuration` มีครบทั้ง TH/EN (27 คีย์เท่ากัน) ไม่มี key ที่หน้าอ้างถึงแล้วขาด

---

## Sprint 4 — แสดงผล + รายงาน/export (ขนาด: S–M, ~0.5–1 วัน)

4.1 `src/app/admin/(dashboard)/leads/` (หน้า lead detail) — บล็อก "ข้อมูลแคมเปญ (UTM)" แสดง 5 ค่า + landing path, ขึ้น "-" เมื่อว่าง | **nextjs-dev** | ✅ ทำแล้ว — บล็อกทั้งก้อนซ่อนถ้าไม่มี utm data เลย (ตาม pattern `interestedPackageSlug` ที่มีอยู่แล้วในหน้านี้)
4.2 `src/lib/reports/export-rows.ts` — เพิ่มคอลัมน์ utm 5 ตัว + landingPath **เฉพาะใน `FullExportRow`/`FULL_EXPORT_COLUMNS`/`getFullExportRows()`** (sheet "ข้อมูลเต็ม") | **nextjs-dev** | ✅ ทำแล้ว — sheet "รายงาน" (`EXPORT_COLUMNS`, contract §4.5) ยืนยันแล้วว่ายังคง 13 คอลัมน์เท่าเดิม ไม่ถูกแตะ
4.3 `src/lib/reports/aggregate.ts` — **ยืนยันว่า `effectiveChannel()` (บรรทัด 144) ไม่ถูกแก้** และ channelBreakdown ยังนับเท่าเดิม (กันการนับซ้ำตาม default #1) | **nextjs-dev** | ✅ ยืนยันแล้ว — ไฟล์นี้มี diff ว่างเปล่า (ไม่ถูกแตะเลย); `campaignBreakdown` **ตัดสินใจไม่ทำ** เพราะต้องมี UI ใหม่มาแสดงผลถึงจะไม่ใช่ dead code ซึ่งเกินขอบเขต 4.1/4.2 ของสปรินต์นี้ (ตรงกับ default #9 — รอข้อมูลจริงก่อนค่อยตัดสินใจเรื่อง dashboard แคมเปญ)
4.4 ตรวจว่าไม่มี mutation ใหม่ที่หลุด `requireAdmin()`/`withAudit()` และ export ไม่รั่วข้อมูลเกิน role (CHANNEL_EXECUTIVE เห็นเฉพาะช่องตัวเอง) | **audit-compliance-reviewer** | ⏳ รอ #4.3
4.5 รีวิวหน้า `/admin/channels` + lead detail บน render จริง (ไม่ใช่ mockup) — ลิงก์ยาวไม่ทำ layout แตก, subType อ่านออก, ปุ่ม copy ชัด | **design-business-reviewer** | ⏳ รอ #4.1, #2.3

---

## Sprint 5 — Verify + Deploy (ขนาด: S, ~0.5 วัน)

5.1 Verify ตาม `.claude/skills/verify/SKILL.md`:
```bash
npm run build                          # ต้องได้ ✓ Compiled + Finished TypeScript ไม่มี error
npx prisma migrate dev && npx prisma db seed   # migration ผ่าน, seed ยัง idempotent
npx tsx scripts/verify-all.mts         # build → prod server → booking → admin → admin-crud
npx tsx scripts/e2e-channel-tracking.mts       # เคสใหม่ทั้ง 4 ต้อง ✓
```
เปิดดูจริง: `/th/packages?ref=<code>&utm_source=facebook&utm_medium=social&utm_campaign=package_info`, `/en/packages?...`, `/th/cookie-policy`, `/en/cookie-policy`, `/admin/channels`, lead detail ที่เพิ่ง submit | **nextjs-dev** | ✅ ทำแล้ว — build/migrate dev/seed/verify-all/e2e-channel-tracking (20/20 ✓) รันจริงบนเครื่อง ไม่ใช่แค่อ้าง
5.2 อ่าน `docs/plans/kkd-shared-hosting-redeploy-runbook.md` ให้จบก่อนแตะ production (กฎ "schema first, always verified") | **hosting-deploy-specialist** | ✅ ทำแล้ว
5.3 **DDL ก่อน deploy** — apply SQL จาก #1.3 และ #3.4 ผ่าน **phpMyAdmin** (production ไม่มี SSH/Prisma migrate ไม่ถึง) เขียนแบบ `ADD COLUMN IF NOT EXISTS` แล้วยืนยันด้วย `SHOW COLUMNS FROM \`PromoChannel\`;` และ `SHOW COLUMNS FROM \`Lead\`;` | **ผู้ใช้ (ผ่าน phpMyAdmin) + ตรวจซ้ำ** | ✅ ทำแล้ว — ยืนยันด้วย screenshot จริง 2 ตาราง ครบทั้ง 9 คอลัมน์ ก่อน restart
5.4 ตรวจ Dockerfile/`.htaccess`/build script ว่าไม่ต้องแก้จากงานนี้ (ไม่มี env ใหม่) | **deploy-verify** | ✅ ทำแล้ว — `git diff` เทียบ Dockerfile/fly.toml/firebase.json/.dockerignore/deploy/ ว่างเปล่า
5.5 deploy + `npx tsx scripts/smoke-test-production.mts` เพิ่ม `--check "/th/packages?ref=TE001&utm_source=telesale"` ยืนยัน 200 และ query string ไม่หายหลัง 301 www→non-www | **ผู้ใช้ (FTP upload ผ่าน `!`) + agent (extract/restart/verify)** | ✅ ทำแล้ว — BUILD_ID `EOjTCOf-4YbxMTbJQjAP2` ตรง, smoke-test 3/3 ✓, `ref`+`utm` รอด 301 www→non-www query ไม่หาย
5.6 หลัง deploy: admin สร้าง/แก้ 6 ช่องทางเดิมให้มี subType + refCode ใหม่ผ่าน UI (ข้อมูล lead=0 จึงไม่มีความเสี่ยง) แล้วแจกลิงก์ชุดใหม่กลับให้ SA | **ผู้ใช้/admin** | ✅ ทำแล้วบางส่วน — Facebook→FB, LINE→LO, เพื่อนแนะนำ→RF (ตามที่ผู้ใช้ยืนยัน) ยืนยันแล้วว่าลิงก์มี utm ครบ; **ยังไม่จัด**: Google ค้นหา, อื่น ๆ / Walk-in (ไม่มี subType ตรงในชีต SA 10 ค่า — ทิ้งว่างไว้ตามที่ตกลง ไม่ใช่งานค้าง); refCode เดิม (CH015-CH019) ยังไม่เปลี่ยนเป็นสกีมใหม่ (TE/FB/…) เพราะ default #10 ห้าม auto-migrate — เปลี่ยนเองทีหลังผ่าน UI ได้ถ้าต้องการ; ยังไม่ได้แจกลิงก์ชุดใหม่กลับให้ SA (ผู้ใช้ดำเนินการเอง)

**Commit convention:** `feat(channels): …` สำหรับ taxonomy/ลิงก์, `feat(booking): …` หรือ scope ใหม่ `tracking` สำหรับ UTM capture, `fix(channels): …` แยกคอมมิตสำหรับบั๊ก `nextChannelRefCode()` (หนึ่ง type ต่อหนึ่งคอมมิต — อย่ารวม feat กับ fix)

---

## Out of scope (จงใจไม่ทำ)

- **`gclid` / `fbclid`** — issue #24 ถามถึงด้วย แต่คนละกลไก (ต้องคู่กับ Google Ads/Meta conversion API ถึงจะมีประโยชน์) → #24 ยังเปิดค้างต่อหลังแผนนี้จบ
- **Google Analytics 4 / Facebook Pixel** — คนละขนาดงาน ต้องคุยเรื่อง consent category และ DPA แยก
- **HTTP referrer capture** — เก็บ `landingPath` พอสำหรับรอบนี้
- **หน้า dashboard แคมเปญพร้อมกราฟ** — ตาม default #9 รอข้อมูลจริงก่อน
- **แก้ `effectiveChannel()` ให้รู้จัก UTM** — ตั้งใจไม่แตะ ป้องกันรายงานช่องทางนับซ้ำ
- **rename คอลัมน์ `notes` → `internalNotes` ใน DB หรือ refactor `channels-client.tsx` ทั้งไฟล์** — งานข้างเคียง ขัดกฎ surgical changes ของ `AGENTS.md`
- **migrate refCode เดิมอัตโนมัติ** — ทำมือผ่าน UI (#5.6) ปลอดภัยกว่าและถูกกว่าเพราะมีแค่ 6 แถว
- **แก้คำสะกดในชีต SA** — แจ้ง SA ปากเปล่า ไม่ใช่งานโค้ด
