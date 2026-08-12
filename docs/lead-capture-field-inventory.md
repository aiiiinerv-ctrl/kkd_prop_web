# Lead capture — field inventory ครบวงจร

> ผลของ ticket [ทำ field inventory ครบวงจร](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/11)
> ภายใต้ [Map: Lead capture เก็บข้อมูลครบทุก field ทุกช่องทาง](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/10)
>
> ตรวจกับ commit `68e7bcf` (2026-08-12)

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

### G1 · ข้อความจากลูกค้าใน `notes` ถูกแอดมินเขียนทับถาวร 🔴

Column `Lead.notes` ตัวเดียวรับสองหน้าที่คนละเรื่อง:

- ชั้น 1 — ช่อง **"ข้อความเพิ่มเติม"** ที่ลูกค้ากรอก (`booking-forms.tsx:276-284`)
- ชั้น 5 — กล่อง **"บันทึกภายใน"** ที่แอดมินพิมพ์ (`lead-detail-client.tsx:355-375`)

`updateLeadNotes()` (`src/actions/leads.ts:108`) เขียนทับด้วย `notes: notes.trim()...` ตรง ๆ **แอดมินกดบันทึกครั้งแรก = ข้อความที่ลูกค้ากรอกหายจากค่าปัจจุบันทันที** (ยังกู้ได้จาก `AuditLog` snapshot แต่ไม่มี UI ให้ดู) นี่คือ gap เดียวในชุดนี้ที่ข้อมูล **หายหลังจากเก็บสำเร็จแล้ว** ไม่ใช่แค่ไม่ถูกเก็บ

### G2 · `?package=` / `?service=` ถูกทิ้ง 100% 🔴

`booking/page.tsx:23` รับแค่ `{ tab, bill }` และ `model Lead` ไม่มี column รองรับ ลิงก์ 4 จุดจาก 9 จุดส่ง context นี้มาแล้วไม่มีใครรับ — analyst ตอบไม่ได้เลยว่า lead มาจากแพ็กเกจ/บริการไหน
*(ตัดสินแล้วตอนตั้ง map: เก็บเป็น column ใหม่)*

### G3 · `?bill=` ตกหล่น 2 ชั้นซ้อน 🔴

1. calculator ส่งค่าดิบจาก slider (เช่น `4200`) แต่ `<select>` มีแค่ 5 option ตายตัว `1500/3500/7500/15000/25000` (`booking-forms.tsx:47-53`) → ค่าที่ไม่ตรง option ใด browser fallback เป็นค่าว่าง
2. ต่อให้ตรง `useEffect` บรรทัด 359-363 เรียก `reset(draft)` ทับค่าทั้งฟอร์มรวมค่าที่เพิ่ง prefill มา

*(ตัดสินแล้ว: dropdown + ช่อง "อื่นๆ" — รายละเอียด precedence อยู่ที่ ticket เรื่อง draft)*

### G4 · tab survey ไม่มี `avgMonthlyBill` / `interestedSystems` 🟠

ขาดตั้งแต่ชั้น 1 — ไม่มีช่องให้กรอก ผลคือ lead ประเภทสำรวจ (lead ที่จ่ายเงินแล้ว = ร้อนกว่า) ให้ข้อมูลเชิงเทคนิคน้อยกว่า lead ขอใบเสนอราคา และคอลัมน์ "ประเภทระบบ" ใน export เป็น `-` เสมอ
*(ตัดสินแล้ว: เพิ่มให้ survey ด้วย)*

### G5 · export ขาด 10 คอลัมน์ที่มีข้อมูลอยู่ใน DB แล้ว 🟠

`EXPORT_COLUMNS` (`export-rows.ts:38-56`) มี 13 คอลัมน์ ขาด:

`lineId` · `referrerName` · `province` · `buildingType` · `buildingTypeOtherText` · `avgMonthlyBill` · `notes` · `locale` · `preferredDate` · `timeSlot` · `bookingNumber` · `amountThb` · `paymentStatus`

ทั้งหมดเก็บลง DB ครบแล้ว เป็น gap ชั้นปลายทางล้วน ๆ — แก้ได้โดยไม่ต้อง migrate
*(รายละเอียดว่าเอาตัวไหนบ้าง อยู่ที่ ticket ตัดสินคอลัมน์ export)*

### G6 · tab ไม่ sync กับ URL 🟠

`booking-forms.tsx:116` `useState<Tab>(initialTab)` อ่าน prop ครั้งเดียว การกดลิงก์ขณะอยู่หน้า booking เป็น soft navigation ที่ไม่ remount → URL เปลี่ยนแต่ UI ค้าง tab เดิม state `success` (บรรทัด 117) ค้างแบบเดียวกัน
*(ticket แยกแล้ว)*

### G7 · notification ขาด 6 field 🟡

`formatLeadSummary()` ไม่ส่ง `interestedSystems`, `referrerName`, `notes` (ข้อความลูกค้า), `buildingTypeOtherText`, `sourceChannel`, `bookingNumber` — ทีมที่รับแจ้งเตือนทาง LINE/อีเมลต้องเปิดหลังบ้านทุกครั้งเพื่อดูสิ่งที่ลูกค้าเขียนมา

เพิ่มเติม: `BUILDING_LABELS` (`format.ts:4-8`) มีแค่ 3 key ขาด `OTHER` → แจ้งเตือนขึ้นคำว่า `OTHER` ดิบ ๆ แทนคำไทย

### G8 · draft ใน localStorage เก็บ PII ไม่มีวันหมดอายุ 🟡

`saveDraft()` (`src/lib/form-draft.ts:6`) เก็บ **ทุกค่าในฟอร์ม** รวม ชื่อ / เบอร์ / LINE ID / ที่อยู่ ลง `localStorage` เคลียร์เฉพาะตอน submit สำเร็จ — เครื่องที่ใช้ร่วมกันเห็นข้อมูลคนก่อนได้
*(ticket แยกแล้ว)*

### G9 · `sourceChannelId` หายเงียบเมื่อไม่มี active channel 🟢

`SourceChannelField` (`booking-forms.tsx:298`) `return null` เมื่อ `channels.length === 0` — ฟอร์มไม่ถามเลยว่า "รู้จักเราจากช่องทางไหน" โดยไม่มีร่องรอย ไม่ใช่บั๊กในตัวเอง แต่ทำให้สถิติช่องทางขาดช่วงโดยไม่มีใครรู้ว่าขาดเพราะอะไร

---

## ข้อสังเกตสำหรับงานถัดไป

- **`redactLeadPII`** (`src/app/api/admin/leads/route.ts:69`) ตัด PII ออกก่อนส่งให้ role `CHANNEL_EXECUTIVE` — column ใหม่ทุกตัวต้องผ่านการพิจารณาว่าต้อง redact ไหม ไม่งั้นเปิดช่องรั่วโดยไม่ตั้งใจ
- **`withAudit()`** ครอบ mutation ฝั่ง admin อยู่แล้ว แต่ **การ submit จากฝั่ง public ไม่ผ่าน audit** (`submit-quote.ts` / `submit-survey-booking.ts` เขียน `prisma.lead.create` ตรง) — เป็นไปตามดีไซน์ (`withAudit` ผูกกับ session แอดมิน) แต่แปลว่าค่าที่ลูกค้ากรอกครั้งแรกมี snapshot เก็บไว้ก็ต่อเมื่อแอดมินแก้ครั้งแรกเท่านั้น ซึ่งเป็นเหตุผลที่ G1 กู้คืนยาก
- **`quoteSchema` / `surveySchema` ใช้ `baseLeadSchema` ร่วมกัน** — การเพิ่ม field เข้า base ทำให้ทั้ง 2 tab ได้พร้อมกัน เป็นจุดที่ควรใช้แก้ G4
- ค่าใน `BILL_BUCKETS` เป็นค่ากลางของช่วง (1500 = "ต่ำกว่า 2,000") ไม่ใช่ขอบช่วง — ถ้าจะ map ค่าจาก calculator เข้า bucket ต้องรู้ข้อนี้ก่อน
