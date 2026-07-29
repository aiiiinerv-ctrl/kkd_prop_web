# Sprint 6 — แก้ฟิลด์ฟอร์มสาธารณะ + PromptPay QR (Task Breakdown)

อ้างอิงสโคปเดิมจาก `docs/plans/kkd-spec-remediation.md` § Sprint 6

## Decisions ที่ยืนยันกับผู้ใช้แล้ว (2026-07-29)

1. **"ระบบที่สนใจ" multi-select (ฟอร์ม quote เท่านั้น)** — ตัวเลือก On-Grid / Hybrid / Off-Grid ตรงกับ `Service` ที่ seed ไว้แล้ว (slug `on-grid`/`hybrid`/`off-grid`) ไม่รวม maintenance เก็บเป็น `Lead.interestedSystems Json?` (array of enum string) — ฟิลด์นี้คือคอลัมน์ export **"ประเภทระบบ"** ที่ Sprint 5 ข้ามไปเพราะไม่มี field รองรับ (ดู PDF cross-check ท้าย Sprint 5 ใน `kkd-spec-remediation.md`)
2. **อาคารประเภท "อื่นๆ"** — เพิ่ม `BuildingType.OTHER` + free-text field ใหม่ `Lead.buildingTypeOtherText String?` (required เฉพาะตอนเลือก OTHER, validate ด้วย zod `superRefine`)
3. **ค่าไฟเฉลี่ย/เดือน → dropdown 5 ช่วง** — UI เปลี่ยนจาก number input เป็น `<select>`, ไม่แก้ schema (`Lead.avgMonthlyBill` ยังเป็น `Int?` เดิม) แต่ละตัวเลือก submit เป็นค่าตัวแทนกึ่งกลางช่วง:
   - `<2,000` → `1500`
   - `2,000-5,000` → `3500`
   - `5,000-10,000` → `7500`
   - `10,000-20,000` → `15000`
   - `>20,000` → `25000`
4. **PromptPay QR** — `promptpay-qr` (payload ตามมาตรฐาน EMV QR ของ ธปท.) + `qrcode` (render เป็น data URL ฝั่ง server) ไม่มี network call ภายนอก

## หมายเหตุ: `notes` มีอยู่แล้วใน schema

`Lead.notes String?` มีอยู่แล้ว (ใช้จากฝั่ง admin) — งานที่เหลือคือเปิดให้กรอกจากฟอร์มสาธารณะเท่านั้น ไม่ต้อง migrate schema ส่วนนี้

## Task 1 — Schema

`prisma/schema.prisma`:
- `enum BuildingType`: เพิ่ม `OTHER`
- `model Lead`: เพิ่ม `buildingTypeOtherText String?` (ถัดจาก `buildingType`), เพิ่ม `interestedSystems Json?` (ถัดจาก `avgMonthlyBill`) — คอมเมนต์อธิบาย: array of `"ON_GRID"|"HYBRID"|"OFF_GRID"`, quote-form only, ใช้เป็น "ประเภทระบบ" ใน export
- โมเดลใหม่ `PaymentSettings` (singleton, มิเรอร์ `BookingCapacitySetting`): `id, promptpayId String?, bankName String?, bankAccountNumber String?, bankAccountName String?, updatedAt DateTime @updatedAt`
- `npx prisma migrate dev --name sprint6_public_forms` แล้ว `npx prisma generate` แยก (ตามที่เจอปัญหาซ้ำจาก Sprint 5b — `migrate dev` ไม่ regenerate client อัตโนมัติเสมอไป)
- `prisma/seed.ts`: seed แถว `PaymentSettings` singleton (placeholder เดิม เช่น PromptPay ID ปลอม + bank info ปลอมที่ตรงกับ `slipBankInfo` เดิมใน messages เพื่อไม่ให้ค่าที่โชว์ลูกค้าเปลี่ยนจนกว่าแอดมินจะแก้จริง)

## Task 2 — Provinces data

`src/lib/data/provinces.ts` (ใหม่) — array 77 จังหวัด `{ value: string; th: string; en: string }` (ใช้ชื่อจังหวัดเป็น `value` เหมือนเดิมที่ field เป็น free string — ไม่กระทบ query/report เดิมที่ query ด้วยชื่อจังหวัด)

## Task 3 — Validation

`src/lib/validations/lead.ts`:
- `baseLeadSchema`: `buildingType` enum เพิ่ม `"OTHER"`, เพิ่ม `buildingTypeOtherText` optional, เพิ่ม `notes` optional (`max(1000)`) — ทั้งสองฟอร์มใช้ `baseLeadSchema` อยู่แล้วจึงได้ทั้งคู่อัตโนมัติ
- ใช้ `.superRefine()` บน `baseLeadSchema`: ถ้า `buildingType === "OTHER"` ต้องมี `buildingTypeOtherText` ไม่ว่าง
- `quoteSchema`: เพิ่ม `interestedSystems: z.array(z.enum(["ON_GRID","HYBRID","OFF_GRID"])).optional()`
- `avgMonthlyBill` คง `z.coerce.number().int().min(0).max(1_000_000).optional()` เดิม (dropdown ส่งค่าตัวแทนมาเป็น string ตัวเลขอยู่แล้ว ไม่ต้องแก้ zod)

## Task 4 — Submit actions

`src/actions/submit-quote.ts`: parse เพิ่ม `buildingTypeOtherText`, `notes`, `interestedSystems` (formData multi-value — ใช้ `formData.getAll("interestedSystems")`); create เพิ่ม 3 field ใหม่ (`interestedSystems` เก็บเป็น Json array หรือ `null` ถ้าว่าง)

`src/actions/submit-survey-booking.ts`: parse/create เพิ่ม `buildingTypeOtherText`, `notes` (ไม่มี `interestedSystems` — เฉพาะ quote form)

## Task 5 — PromptPay QR lib

`src/lib/promptpay.ts` (ใหม่) — `generatePromptPayQrDataUrl(promptpayId: string): Promise<string>` ใช้ `promptpay-qr` สร้าง payload + `qrcode`'s `toDataURL()` คืน PNG data URL; เพิ่ม dependency `promptpay-qr` และ `qrcode` (+ `@types/qrcode` ถ้าจำเป็น) ใน `package.json`

## Task 6 — Admin: Payment Settings

- `src/actions/payment-settings.ts` (ใหม่) — `getPaymentSettings()` (ไม่ต้อง requireRole เพราะฝั่ง public booking page เรียกใช้ผ่าน RSC โดยตรงได้ ไม่ใช่ server action), `updatePaymentSettings(data)` (ADMIN-only ผ่าน `requireRole("ADMIN")`, ผ่าน `withAudit()`, มิเรอร์ `updateBookingCapacitySetting` ใน `src/actions/bookings.ts`)
- `src/app/admin/(dashboard)/settings/page.tsx`: query เพิ่ม `paymentSettings` singleton, ส่ง prop เพิ่มให้ `SettingsClient`
- `src/app/admin/(dashboard)/settings/settings-client.tsx`: เพิ่มฟอร์มส่วน "ข้อมูลการชำระเงิน" (PromptPay ID, ชื่อธนาคาร, เลขบัญชี, ชื่อบัญชี) แสดง QR preview แบบ dynamic (เรียก `generatePromptPayQrDataUrl` ผ่าน client fetch ไป API เล็กๆ หรือคำนวณใน server action ที่คืนค่า data URL กลับมาแสดง — เลือกวิธีที่ตรงกับ pattern async form ที่มีอยู่แล้วในไฟล์นี้)

## Task 7 — Public booking form UI

`src/app/[locale]/booking/booking-forms.tsx`:
- `province`: `<input>` → `<select>` จาก `provinces.ts` (label ตาม locale ผ่าน `useLocale()`)
- `buildingType`: เพิ่ม `<option value="OTHER">`, เมื่อเลือกแล้วโชว์ `<input>` free-text `buildingTypeOtherText` (required) ต่อท้ายทันที (conditional render ด้วย `watch("buildingType")`)
- เพิ่ม `<textarea>` "หมายเหตุ" (`notes`, optional) ใน `CommonFields` หรือท้ายฟอร์มทั้งสอง (ทั้ง quote/survey ใช้ `CommonFields` ร่วมกันอยู่แล้ว)
- `QuoteForm`: `avgMonthlyBill` number input → `<select>` 5 ช่วงตาม Task ค่าตัวแทนด้านบน; เพิ่ม checkbox group "ระบบที่สนใจ" (`interestedSystems`, `register("interestedSystems")` ซ้ำ 3 checkbox ตาม react-hook-form array pattern)
- `SurveyForm`: ลบ hardcoded `t("slipBankInfo")` ธนาคารปลอม แทนที่ด้วยข้อมูลจาก `PaymentSettings` (ส่งมาจาก page.tsx เป็น prop) + แสดง PromptPay QR (`<img src={qrDataUrl}>`) เป็นทางเลือกโอนคู่กับเลขบัญชี

`src/app/[locale]/booking/page.tsx` (server component): query `getPaymentSettings()` + เรียก `generatePromptPayQrDataUrl()` ถ้ามี `promptpayId`, ส่ง prop ใหม่ (`bankInfo`, `promptpayQrDataUrl`) ลงไปที่ `<BookingForms>`

## Task 8 — i18n (TH/EN คู่กันเสมอ)

`src/messages/th.json` + `en.json` (namespace `booking`) เพิ่ม key ใหม่ทั้งหมด: `fieldBuildingTypeOtherPlaceholder`, `buildingOther`, `fieldNotes`, `fieldNotesPlaceholder`, `fieldInterestedSystems`, `systemOnGrid`, `systemHybrid`, `systemOffGrid`, `billBucketUnder2k`...`billBucketOver20k` (5 label), `promptpayLabel`, `bankTransferLabel` — ปรับ/ลบ key `slipBankInfo` เดิมถ้าไม่ใช้ static text แล้ว (เปลี่ยนความหมายเป็น label นำหน้าข้อมูล dynamic แทน)

## Task 9 — Admin visibility (จำเป็น ไม่ใช่ scope creep)

ฟิลด์ใหม่ที่ลูกค้ากรอกจากฟอร์มสาธารณะ (`buildingTypeOtherText`, `interestedSystems`, `notes` จากฟอร์มสาธารณะ) ต้องมองเห็นได้จากฝั่งแอดมิน ไม่งั้นข้อมูลที่เก็บไปจะเป็น write-only:
- `src/app/admin/(dashboard)/leads/[id]/page.tsx` + `lead-detail-client.tsx`: query/แสดง `buildingTypeOtherText` (เมื่อ `buildingType === "OTHER"`), `interestedSystems` (แปลงเป็น label ไทยแสดงเป็น badge/list), `notes` (ถ้ายังไม่ได้แสดงอยู่แล้ว — เช็คโค้ดเดิมก่อน อาจมีอยู่แล้วเพราะ field เดิม)

## Task 10 — Export "ประเภทระบบ" (ปิด gap ที่ Sprint 5 ค้างไว้)

`src/lib/reports/export-rows.ts`: เพิ่มคอลัมน์ "ประเภทระบบ" ใน `EXPORT_COLUMNS` ตำแหน่งตาม PDF §4.5 (ถัดจาก "ประเภท Lead"), format `interestedSystems` Json array → comma-joined Thai labels (On-Grid/Hybrid/Off-Grid), แสดง `-` ถ้า `null`/ว่าง (survey-type lead ไม่มีฟิลด์นี้เลย) — ตอนนี้ export ครบ 14 คอลัมน์ (13 เดิม + "ประเภทระบบ")

## Task 11 — E2E

`scripts/e2e-booking.mts`: ส่งค่าฟิลด์ใหม่ (province จาก dropdown, buildingType=OTHER+text, avgMonthlyBill จาก bucket value, interestedSystems array, notes) ยืนยันว่า Lead ที่สร้างมี field ครบตรงกับที่ส่ง

`scripts/e2e-admin-crud.mts`: เพิ่มเช็ค PAYMENT SETTINGS (ADMIN แก้ได้ผ่าน withAudit, ค่าที่บันทึกตรงกับ DB), เช็ค export คอลัมน์ "ประเภทระบบ" ตำแหน่ง/ค่าตรง, เช็ค lead detail แสดง field ใหม่ครบ

`scripts/e2e-rbac-sprint2.mts`: เช็คว่า non-ADMIN ไม่เห็น/แก้ payment settings ไม่ได้ (403)

## Verification (ตาม convention เดิมทุก sprint)

- `npm run build && npm run start`
- `npx prisma migrate dev` (มี migration ใหม่)
- `npx tsx scripts/verify-all.mts`
- `npx tsx scripts/e2e-rbac-sprint2.mts`
- `git status` — ต้องมีการแก้ `src/messages/*.json` รอบนี้ (มี public-facing string ใหม่จริง) → รัน i18n key-parity check ก่อนปิด sprint
