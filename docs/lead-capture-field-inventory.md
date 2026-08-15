# Lead capture — field inventory ครบวงจร

> ผลของ ticket [ทำ field inventory ครบวงจร](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/11)
> ภายใต้ [Map: Lead capture เก็บข้อมูลครบทุก field ทุกช่องทาง](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/10)
>
> ตรวจกับ commit `68e7bcf` (2026-08-12)
>
> **อัปเดต 2026-08-16 (ปิด [#39](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/39)):**
> G1, G2, G3, G4, G6, G7 ด้านล่างยืนยันแล้วว่าแก้จริงในโค้ดปัจจุบัน ด้วย commit
> `2f4de89` (feat(booking): capture every field and link context the lead forms collect),
> `5158f68` (fix(booking): read package and service slugs through the content module),
> `16dd64e` (feat(booking): prefill the referrer field from a promo ref link) —
> ดูหมายเหตุ ✅ ต่อท้ายแต่ละ gap ด้านล่างสำหรับหลักฐานอ้างอิงไฟล์/บรรทัดปัจจุบัน ตารางด้านบน (A/B/C)
> เป็น snapshot ของสถานะ ณ วันที่ตรวจครั้งแรกและ **ไม่ได้อัปเดตซ้ำ** — อย่าอ้างอิงตารางเป็นสถานะปัจจุบัน
> ให้ยึดหมายเหตุ ✅/สถานะเดิมท้าย gap แต่ละอันแทน

เอกสารนี้ตอบคำถามเดียว: **field ไหนบ้างที่ลูกค้ากรอก/ระบบรู้ แล้วหายไประหว่างทาง และหายที่ชั้นไหน**

---

## 6 ชั้นที่ไล่ตรวจ

| # | ชั้น | ไฟล์อ้างอิง |
|---|---|---|
| 1 | ช่องในฟอร์ม | `src/app/[locale]/booking/booking-forms.tsx` |
| 2 | zod validation | `src/lib/validations/lead.ts` (`quoteSchema` / `surveySchema`) |
| 3 | server action → DB | `src/actions/submit-quote.ts`, `src/actions/submit-survey-booking.ts` |
| 4 | column ใน DB | `prisma/schema.prisma` (`Lead`, `SurveyBooking`) |
| 5 | แสดงใน admin | `src/app/admin/(dashboard)/leads/[id]/`, `bookings/[id]/` |
| 6 | export + notification | `src/lib/reports/export-rows.ts`, `src/lib/notifications/format.ts` |

**สัญลักษณ์:** ✅ ถึง · ❌ ไม่ถึง · ⚠️ ถึงแต่มีเงื่อนไข/ข้อบกพร่อง · — ไม่เกี่ยวข้องกับชั้นนี้

---

## ตาราง A — field ที่ลูกค้ากรอก (`model Lead`)

| field | 1 ฟอร์ม quote | 1 ฟอร์ม survey | 2 zod | 3 action | 4 DB | 5 admin | 6 export | 6 notif |
|---|---|---|---|---|---|---|---|---|
| `name` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `phone` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `lineId` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **❌** | ⚠️ เฉพาะเมื่อมีค่า |
| `referrerName` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **❌** | **❌** |
| `province` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **❌** | ✅ |
| `buildingType` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **❌** | ⚠️ label `OTHER` ขาด |
| `buildingTypeOtherText` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **❌** | **❌** |
| `avgMonthlyBill` | ⚠️ ตกจาก URL | **❌ ไม่มีช่อง** | ⚠️ quote เท่านั้น | ⚠️ quote เท่านั้น | ✅ | ✅ | **❌** | ⚠️ เฉพาะเมื่อมีค่า |
| `interestedSystems` | ✅ | **❌ ไม่มีช่อง** | ⚠️ quote เท่านั้น | ⚠️ quote เท่านั้น | ✅ | ✅ | ✅ | **❌** |
| `notes` (ข้อความจากลูกค้า) | ✅ | ✅ | ✅ | ✅ | ✅ | **⚠️ ถูกทับ** | **❌** | **❌** |
| `sourceChannelId` | ⚠️ ซ่อนถ้าไม่มี channel | ⚠️ เหมือนกัน | ✅ | ✅ | ✅ | ✅ | ✅ | **❌** |
| `locale` | ✅ auto | ✅ auto | ✅ | ✅ | ✅ | ✅ | **❌** | **❌** |
| `autoSourceChannelId` | ✅ จาก cookie | ✅ จาก cookie | — | ✅ | ✅ | ✅ | ✅ | **❌** |
| `autoSourceExecutiveId` | ✅ จาก cookie | ✅ จาก cookie | — | ✅ | ✅ | ✅ | ✅ | **❌** |

## ตาราง B — field ของการนัดสำรวจ (`model SurveyBooking`)

| field | 1 ฟอร์ม | 2 zod | 3 action | 4 DB | 5 admin | 6 export | 6 notif |
|---|---|---|---|---|---|---|---|
| `address` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `preferredDate` | ✅ | ✅ | ✅ | ✅ | ✅ | **❌** | ✅ |
| `timeSlot` | ✅ | ✅ | ✅ | ✅ | ✅ | **❌** | ✅ |
| `paymentSlipKey` | ✅ upload | — | ✅ | ✅ | ✅ | ✅ ไม่ควรมี | ⚠️ บอกแค่ "รอตรวจสอบ" |
| `bookingNumber` | — | — | ✅ gen | ✅ | ⚠️ เฉพาะหน้า bookings | **❌** | **❌** |
| `amountThb` | — | — | ✅ default 199 | ✅ | ✅ | **❌** | — |
| `paymentStatus` | — | — | ✅ default | ✅ | ✅ | **❌** | — |
| `status` (สถานะนัด) | — | — | ✅ default | ✅ | ✅ | ✅ ผ่าน "เข้าสำรวจแล้ว" | — |
| `giftSent` | — | — | ✅ default | ✅ | ✅ | ✅ | — |

## ตาราง C — query param ที่ลิงก์ต้นทางส่งมา

| param | ต้นทาง | 1 อ่านที่ `booking/page.tsx` | 2–4 ถึง DB | 5–6 ถึงปลายทาง |
|---|---|---|---|---|
| `tab` | 7 จุด | ✅ บรรทัด 26 | — | **⚠️ UI ไม่ sync** |
| `bill` | `calculator-client.tsx:180` | ✅ บรรทัด 26 | **❌ ตก 2 ชั้น** | ❌ |
| `package` | `packages/page.tsx:89`, `packages/[slug]/page.tsx:85`, `calculator/page.tsx:100` | **❌ ไม่อ่าน** | **❌ ไม่มี column** | ❌ |
| `service` | `services/page.tsx:69` | **❌ ไม่อ่าน** | **❌ ไม่มี column** | ❌ |
| `ref` | ลิงก์โปรโมท | ✅ `src/proxy.ts:17` → cookie | ✅ | ✅ |

---

## Gap ที่ยืนยันแล้ว — เรียงตามความรุนแรง

### G1 · ข้อความจากลูกค้าใน `notes` ถูกแอดมินเขียนทับถาวร 🔴 — ✅ แก้แล้ว (`2f4de89`)

Column `Lead.notes` ตัวเดียวรับสองหน้าที่คนละเรื่อง:

- ชั้น 1 — ช่อง **"ข้อความเพิ่มเติม"** ที่ลูกค้ากรอก (`booking-forms.tsx:276-284`)
- ชั้น 5 — กล่อง **"บันทึกภายใน"** ที่แอดมินพิมพ์ (`lead-detail-client.tsx:355-375`)

`updateLeadNotes()` (`src/actions/leads.ts:108`) เขียนทับด้วย `notes: notes.trim()...` ตรง ๆ **แอดมินกดบันทึกครั้งแรก = ข้อความที่ลูกค้ากรอกหายจากค่าปัจจุบันทันที** (ยังกู้ได้จาก `AuditLog` snapshot แต่ไม่มี UI ให้ดู) นี่คือ gap เดียวในชุดนี้ที่ข้อมูล **หายหลังจากเก็บสำเร็จแล้ว** ไม่ใช่แค่ไม่ถูกเก็บ

**หลักฐานว่าแก้แล้ว (ตรวจ 2026-08-16):** `prisma/schema.prisma` แยก `Lead.customerMessage`
(เขียนครั้งเดียวตอน submit สาธารณะ) ออกจาก `Lead.internalNotes` (`@map("notes")`, เขียนเฉพาะโดย
`updateLeadNotes()`) เป็นสอง column คนละความหมายแล้ว — `src/actions/leads.ts:108` (`updateLeadNotes`)
เขียนทับเฉพาะ `internalNotes` ไม่แตะ `customerMessage` อีกต่อไป ข้อความลูกค้าจึงไม่หายเมื่อแอดมินบันทึก

### G2 · `?package=` / `?service=` ถูกทิ้ง 100% 🔴 — ✅ แก้แล้ว (`2f4de89`, `5158f68`)

`booking/page.tsx:23` รับแค่ `{ tab, bill }` และ `model Lead` ไม่มี column รองรับ ลิงก์ 4 จุดจาก 9 จุดส่ง context นี้มาแล้วไม่มีใครรับ — analyst ตอบไม่ได้เลยว่า lead มาจากแพ็กเกจ/บริการไหน
*(ตัดสินแล้วตอนตั้ง map: เก็บเป็น column ใหม่)*

**หลักฐานว่าแก้แล้ว (ตรวจ 2026-08-16):** `src/lib/booking-links.ts` มี `bookingLinkParamsSchema`
(`.strict()`) รับ `package`/`service` เป็น single source of truth ของทุกลิงก์เข้า `/booking`
`prisma/schema.prisma` เพิ่ม `Lead.interestedPackageSlug` / `Lead.interestedServiceSlug`
`src/app/[locale]/booking/page.tsx:40-51` อ่าน param แล้ว validate สล็อกจริงผ่าน
`getPackageBySlug`/`getServiceBySlug` (`src/lib/content/index.ts`, กรอง `isPublished` ตาม `5158f68`)
ก่อน prefill — slug ที่ไม่รู้จัก/ไม่ publish เก็บเป็น `null` ไม่ใช่ค่าดิบจาก query string

### G3 · `?bill=` ตกหล่น 2 ชั้นซ้อน 🔴 — ✅ แก้แล้ว (`2f4de89`)

1. calculator ส่งค่าดิบจาก slider (เช่น `4200`) แต่ `<select>` มีแค่ 5 option ตายตัว `1500/3500/7500/15000/25000` (`booking-forms.tsx:47-53`) → ค่าที่ไม่ตรง option ใด browser fallback เป็นค่าว่าง
2. ต่อให้ตรง `useEffect` บรรทัด 359-363 เรียก `reset(draft)` ทับค่าทั้งฟอร์มรวมค่าที่เพิ่ง prefill มา

*(ตัดสินแล้ว: dropdown + ช่อง "อื่นๆ" — รายละเอียด precedence อยู่ที่ ticket เรื่อง draft)*

**หลักฐานว่าแก้แล้ว (ตรวจ 2026-08-16):** `BillAndSystemsFields` ใน `booking-forms.tsx` (~บรรทัด
412-483) มี option `"OTHER"` พร้อมช่อง number input สำรอง — ค่าที่ไม่ตรง bucket ใดสลับเป็นโหมด "อื่นๆ"
อัตโนมัติแทนตกเป็นค่าว่าง draft merge เขียนคอมเมนต์ในโค้ดระบุลำดับ shared base → tab เดิม → param
จากลิงก์ที่เพิ่งคลิกชนะ ไม่ทับกันทื่อ ๆ เหมือนก่อน

### G4 · tab survey ไม่มี `avgMonthlyBill` / `interestedSystems` 🟠 — ✅ แก้แล้ว (`2f4de89`)

ขาดตั้งแต่ชั้น 1 — ไม่มีช่องให้กรอก ผลคือ lead ประเภทสำรวจ (lead ที่จ่ายเงินแล้ว = ร้อนกว่า) ให้ข้อมูลเชิงเทคนิคน้อยกว่า lead ขอใบเสนอราคา และคอลัมน์ "ประเภทระบบ" ใน export เป็น `-` เสมอ
*(ตัดสินแล้ว: เพิ่มให้ survey ด้วย)*

**หลักฐานว่าแก้แล้ว (ตรวจ 2026-08-16):** `src/lib/validations/lead.ts` ยก `avgMonthlyBill` /
`interestedSystems` ขึ้นไปที่ `baseLeadSchema` ที่ทั้ง `quoteSchema` และ `surveySchema` สืบทอด —
`BillAndSystemsFields` component (คอมเมนต์ในโค้ดอ้างถึง gap G4 ตรง ๆ) ถูก render ทั้งใน `QuoteForm`
(`booking-forms.tsx:652`) และ `SurveyForm` (`booking-forms.tsx:988`)

### G5 · export ขาด 10 คอลัมน์ที่มีข้อมูลอยู่ใน DB แล้ว 🟠 — ✅ แก้แล้ว (`d585167`, นอกชุด #39)

`EXPORT_COLUMNS` (`export-rows.ts:38-56`) มี 13 คอลัมน์ ขาด:

`lineId` · `referrerName` · `province` · `buildingType` · `buildingTypeOtherText` · `avgMonthlyBill` · `notes` · `locale` · `preferredDate` · `timeSlot` · `bookingNumber` · `amountThb` · `paymentStatus`

ทั้งหมดเก็บลง DB ครบแล้ว เป็น gap ชั้นปลายทางล้วน ๆ — แก้ได้โดยไม่ต้อง migrate
*(รายละเอียดว่าเอาตัวไหนบ้าง อยู่ที่ ticket ตัดสินคอลัมน์ export)*

**หลักฐานว่าแก้แล้ว (ตรวจ 2026-08-16):** commit `d585167` (feat(admin): add a full-data sheet to the
report export, 2026-08-12 หลัง `68e7bcf`) เพิ่ม `FULL_EXPORT_COLUMNS`/`FullExportRow` ใน
`src/lib/reports/export-rows.ts` ครบทุกคอลัมน์ที่ระบุ (รวม `buildingTypeOtherText` →
`customerMessage`/`internalNotes` แทน `notes` เดิม ตาม G1) นี่เป็น commit คนละชุดกับที่ issue #39 อ้างถึง
(`2f4de89`/`5158f68`/`16dd64e`) — พบระหว่างตรวจ ไม่ได้อยู่ในรายการที่ issue ระบุไว้

### G6 · tab ไม่ sync กับ URL 🟠 — ✅ แก้แล้ว (`2f4de89`)

`booking-forms.tsx:116` `useState<Tab>(initialTab)` อ่าน prop ครั้งเดียว การกดลิงก์ขณะอยู่หน้า booking เป็น soft navigation ที่ไม่ remount → URL เปลี่ยนแต่ UI ค้าง tab เดิม state `success` (บรรทัด 117) ค้างแบบเดียวกัน
*(ticket แยกแล้ว)*

**หลักฐานว่าแก้แล้ว (ตรวจ 2026-08-16):** `tab` ไม่ใช่ `useState` อีกต่อไป — คำนวณสดจาก
`useSearchParams().get("tab")` ทุก render (คอมเมนต์ในโค้ดระบุ "URL is the single source of truth for
the active tab") `setTab()` ใช้ `window.history.replaceState` อัปเดต URL ตรง ๆ และมี
`useEffect(() => setSuccess(null), [tab])` เคลียร์ success state เมื่อสลับ tab แล้ว

### G7 · notification ขาด 6 field 🟡 — ✅ แก้แล้ว (`2f4de89`)

`formatLeadSummary()` ไม่ส่ง `interestedSystems`, `referrerName`, `notes` (ข้อความลูกค้า), `buildingTypeOtherText`, `sourceChannel`, `bookingNumber` — ทีมที่รับแจ้งเตือนทาง LINE/อีเมลต้องเปิดหลังบ้านทุกครั้งเพื่อดูสิ่งที่ลูกค้าเขียนมา

เพิ่มเติม: `BUILDING_LABELS` (`format.ts:4-8`) มีแค่ 3 key ขาด `OTHER` → แจ้งเตือนขึ้นคำว่า `OTHER` ดิบ ๆ แทนคำไทย

**หลักฐานว่าแก้แล้ว (ตรวจ 2026-08-16):** `src/lib/notifications/format.ts` ครบทั้ง 6 field —
`referrerName` (บรรทัด 43), `buildingTypeOtherText` (46-48), `interestedSystems` (52-58),
`channelName`/sourceChannel ที่ resolve แล้ว (59), `customerMessage` ตัดที่ 300 ตัวอักษร (60-62),
`bookingNumber` (65) `BUILDING_LABELS` (บรรทัด 4-9) มี key `OTHER: "อื่นๆ"` แล้ว

### G8 · draft ใน localStorage เก็บ PII ไม่มีวันหมดอายุ 🟡 — ✅ แก้แล้ว (`2f4de89`, นอกชุด #39)

`saveDraft()` (`src/lib/form-draft.ts:6`) เก็บ **ทุกค่าในฟอร์ม** รวม ชื่อ / เบอร์ / LINE ID / ที่อยู่ ลง `localStorage` เคลียร์เฉพาะตอน submit สำเร็จ — เครื่องที่ใช้ร่วมกันเห็นข้อมูลคนก่อนได้
*(ticket แยกแล้ว)*

**หลักฐานว่าแก้แล้ว (ตรวจ 2026-08-16):** `src/lib/form-draft.ts` เพิ่ม `DRAFT_TTL_MS = 24 * 60 * 60 * 1000`
— `loadDraft()` เช็ก `Date.now() - parsed.savedAt > DRAFT_TTL_MS` แล้วลบทิ้งถ้าเกินอายุ ก่อน return ค่า
ไม่ได้อยู่ในรายการ gap ที่ issue #39 ระบุชัดเจน (G1/G2/G3/G4/G6/G7) แต่พบว่าแก้ไปพร้อมกันใน commit เดียวกัน
(`2f4de89`) ระหว่างตรวจ

### G9 · `sourceChannelId` หายเงียบเมื่อไม่มี active channel 🟢 — ยังไม่แก้ (ตรวจ 2026-08-16)

`SourceChannelField` (`booking-forms.tsx:298`) `return null` เมื่อ `channels.length === 0` — ฟอร์มไม่ถามเลยว่า "รู้จักเราจากช่องทางไหน" โดยไม่มีร่องรอย ไม่ใช่บั๊กในตัวเอง แต่ทำให้สถิติช่องทางขาดช่วงโดยไม่มีใครรู้ว่าขาดเพราะอะไร

**สถานะปัจจุบัน:** `SourceChannelField` (`booking-forms.tsx:504-513`) ยัง `return null` เมื่อ
`channels.length === 0` เหมือนเดิม — gap นี้ยังไม่ถูกแก้ ไม่อยู่ในชุด commit ของ issue #39

---

## ข้อสังเกตสำหรับงานถัดไป

- **`redactLeadPII`** (`src/app/api/admin/leads/route.ts:69`) ตัด PII ออกก่อนส่งให้ role `CHANNEL_EXECUTIVE` — column ใหม่ทุกตัวต้องผ่านการพิจารณาว่าต้อง redact ไหม ไม่งั้นเปิดช่องรั่วโดยไม่ตั้งใจ
- **`withAudit()`** ครอบ mutation ฝั่ง admin อยู่แล้ว แต่ **การ submit จากฝั่ง public ไม่ผ่าน audit** (`submit-quote.ts` / `submit-survey-booking.ts` เขียน `prisma.lead.create` ตรง) — เป็นไปตามดีไซน์ (`withAudit` ผูกกับ session แอดมิน) แต่แปลว่าค่าที่ลูกค้ากรอกครั้งแรกมี snapshot เก็บไว้ก็ต่อเมื่อแอดมินแก้ครั้งแรกเท่านั้น ซึ่งเป็นเหตุผลที่ G1 กู้คืนยาก
- **`quoteSchema` / `surveySchema` ใช้ `baseLeadSchema` ร่วมกัน** — การเพิ่ม field เข้า base ทำให้ทั้ง 2 tab ได้พร้อมกัน เป็นจุดที่ควรใช้แก้ G4
- ค่าใน `BILL_BUCKETS` เป็นค่ากลางของช่วง (1500 = "ต่ำกว่า 2,000") ไม่ใช่ขอบช่วง — ถ้าจะ map ค่าจาก calculator เข้า bucket ต้องรู้ข้อนี้ก่อน
