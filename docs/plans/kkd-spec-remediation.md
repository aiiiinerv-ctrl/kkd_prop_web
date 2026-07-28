# แผนปรับปรุงเว็บไซต์ให้ตรงตามเอกสารความต้องการ V1.2

## Context

ลูกค้าส่งเอกสารความต้องการเว็บไซต์ (`docs/stuffs/KKD_เอกสารความต้องการเว็บไซต์_V1.2.pdf`) มาให้ตรวจสอบว่าเว็บไซต์ที่ทำอยู่ตอนนี้ตรงตาม spec แล้วหรือไม่ Investigate เต็มรูปแบบ (frontend/database/technical) พบว่า **หน้าเว็บสาธารณะทั้ง 8 หน้ามีครบและถูกต้องในระดับโครงสร้าง** แต่ **ระบบหลังบ้านขาดองค์ประกอบสำคัญของ spec ไปเกือบทั้งหมด** โดยเฉพาะ 2 objective หลักของโครงการ (ข้อ 3-4 ในเอกสาร): "ติดตามช่องทางที่มาของลูกค้า" และ "สร้างความสัมพันธ์ที่ชัดเจนระหว่างลูกค้า-ช่องทาง-เซลส์"

Gap หลักที่พบ (รายละเอียดเต็มอยู่ในบทสนทนาที่นำไปสู่แผนนี้):
- ไม่มีกลไกติดตามช่องทาง `?ref=`+cookie อัตโนมัติเลย (ใช้ dropdown ให้ลูกค้าเลือกเองแทน — ขัดกับ spec)
- Role มีแค่ 2 (ADMIN/EDITOR) ไม่ใช่ 4 ตามที่ spec ต้องการ (Admin/Sales/Finance/Channel Executive) ไม่มีการจำกัดสิทธิ์ตาม role
- โมดูลนัดสำรวจไม่ใช่ entity แยก, status มีแค่ 3 ค่าไม่ใช่ 8, ไม่มีเลขที่นัดอัตโนมัติ, ไม่มีช่อง "ส่งของขวัญแล้ว"
- สถานะ Lead มีแค่ 5 ค่าไม่ใช่ 8, ไม่มีฟิลด์มอบหมายเซลส์
- ไม่มีแดชบอร์ด/รายงาน, ไม่มี export Excel, ไม่มี PromptPay QR, ฟอร์มสาธารณะขาดหลายฟิลด์ตาม spec
- เนื้อหา/ตัวเลข (ระยะคืนทุน, ผลิตไฟตามฤดูกาล, แบรนด์อุปกรณ์) ขัดกับ spec ในบางจุด

**ที่ทำถูกต้องแล้ว ไม่ต้องแตะ:** ครบ 8 หน้า, ฟอร์ม 2 เส้นทางในหน้าเดียวถูกต้อง, ข้อความหลังส่งฟอร์มตรงเป๊ะ, portfolio filter ครบ, เลข DBD ถูกต้อง, ไม่มีข้อมูลส่วนตัวลูกค้ารั่วบนหน้าสาธารณะ, ไม่มีฟีเจอร์นอกขอบเขตที่ spec ห้ามเลยสักอย่าง, notification ทำงานครบ (LINE Messaging API แทน LINE Notify เพราะ LINE Notify เลิกให้บริการไปแล้ว — ถูกต้องแล้ว)

## Decision ที่ยืนยันกับผู้ใช้แล้ว

1. ปรับปรุงเต็มรูปแบบตรง spec ทั้งหมด ไม่ใช่แค่ patch เฉพาะจุด
2. เก็บ manual channel dropdown ไว้คู่กับ auto `?ref=`+cookie tracking (ไม่ลบของเดิม)
3. Role EDITOR เดิม → map เป็น SALES เมื่อขยายเป็น 4 roles
4. ข้อมูลชำระเงิน (บัญชี/PromptPay) เป็น placeholder ปลอม — ทำเป็น **admin-configurable** ไม่ hardcode เพื่อรอข้อมูลจริงโดยไม่ต้อง deploy ใหม่
5. PromptPay QR สร้างแบบ dynamic จากเลข PromptPay ID (ไม่ใช่อัปโหลดรูปสำเร็จรูป)
6. ตัวเลขเนื้อหาที่ขัดกันระหว่าง spec กับ code (ระยะคืนทุน, ผลิตไฟตามฤดูกาล, แบรนด์อุปกรณ์) — ใช้ตัวเลขใน spec PDF เป็นหลักทันที
7. สถิติหน้า About (จำนวนโครงการ/ลูกค้า) — ดึงจาก DB จริง ไม่ hardcode
8. Backup — เขียนสคริปต์ไว้ก่อน ยังไม่ต้องผูก cron/infra จริงเพราะ production deploy ยังไม่ตัดสินใจ provider
9. วันว่างนัดสำรวจ — จำกัดจำนวนนัดสูงสุดต่อวัน/ช่วงเวลา ตั้งค่าได้จาก admin
10. หลังบ้านคงเป็นภาษาไทย (ไม่ทำเป็นจีนตามที่ spec แนะนำ)
11. แยกโมดูล Lead กับ Booking เป็นหน้า admin คนละหน้าตาม spec
12. รหัสช่องทาง (`CH001`, `CH001-EX01`) auto-generate เรียงลำดับ
13. หน้า `/testimonials` (ไม่มีใน spec) เก็บไว้เป็น bonus

## สิ่งที่ต้องขอจากลูกค้าเพิ่ม (ไม่ block sprint แรกๆ)

- PromptPay ID จริง (เบอร์โทร/เลขบัตร ปชช./e-wallet ID)
- เลขบัญชี/ชื่อบัญชี/ธนาคารจริง (fallback แสดงคู่กับ QR)
- ที่อยู่บริษัทแบบละเอียด + พิกัดสำหรับ Google Maps embed
- ลิงก์ Facebook Page จริง
- รูปทีมงานจริง (ถ้ายังไม่มี ใช้ไอคอนเดิมไปก่อนได้ ไม่ block)

## สถานะสปรินต์

| Sprint | สถานะ | หมายเหตุ |
|---|---|---|
| 0 — Schema & Role Foundation | ✅ เสร็จแล้ว | ยืนยันจากโค้ดจริง: `Role` 4 ค่า, `LeadStatus`/`BookingStatus` เต็มรูปแบบ, `ChannelExecutive`, `BookingCapacitySetting` มีอยู่ใน schema แล้วก่อนเริ่ม Sprint 3 |
| 1 — Channel Tracking อัตโนมัติ | ✅ เสร็จแล้ว | `?ref=` cookie mechanism ยืนยันแล้วจากโค้ดจริงก่อนเริ่ม Sprint 3 |
| 2 — RBAC | ✅ เสร็จแล้ว | `getBookingScopeFilter()`/`canMutateBooking()`/`requireRole()` มีอยู่แล้ว; ยืนยันซ้ำรอบนี้ผ่าน `npx tsx scripts/e2e-rbac-sprint2.mts` (ทุกเช็ค role ผ่าน) |
| 3 — แยกโมดูล Booking Management | ✅ เสร็จแล้ว (2026-07-28) | ดูรายละเอียดผลลัพธ์ท้าย Sprint 3 ด้านล่าง |
| 4 — อัปเดตโมดูล Lead Management | ✅ เสร็จแล้ว (2026-07-29) | ดูรายละเอียดผลลัพธ์ท้าย Sprint 4 ด้านล่าง |
| 5-9 | ⏳ ยังไม่เริ่ม | ตามลำดับเดิมในแผนนี้ |

## Sprint 0 — Schema & Role Foundation

**ทำไมต้องมาก่อน:** ทุก sprint ถัดไปพึ่งพา schema นี้ (role scoping, channel executive entity, booking status flow)

- `prisma/schema.prisma`:
  - `Role` enum: `ADMIN | EDITOR` → `ADMIN | SALES | FINANCE | CHANNEL_EXECUTIVE` (migration แปลงค่าเดิม `EDITOR` → `SALES`)
  - `LeadStatus` enum ขยายเป็น 8 ค่า: `NEW → ASSIGNED → CONTACTED → QUOTED → SIGNED → INSTALLING → COMPLETED`, แยก `DISQUALIFIED` เป็น dead-end จากทุกสถานะ
  - `Lead` model: เพิ่ม `assignedSalesId` (FK → AdminUser), เพิ่ม `lastFollowUpAt` แยกจาก `updatedAt`
  - `PromoChannel`: เพิ่ม `type` (INDIVIDUAL/COMPANY/PLATFORM), เพิ่ม `refCode` (auto `CH00N`)
  - โมเดลใหม่ `ChannelExecutive`: `id, channelId (FK), name, phone, refCode (CH00N-EXNN), createdAt`
  - `SurveyBooking`: เปลี่ยน `PaymentStatus` (3 ค่า) เป็น `BookingStatus` เต็ม 8 ค่า (`PENDING_CONFIRMATION → CONFIRMED → PREPARED → SURVEYED → DESIGNED → SIGNED`, แยก `CANCELLED` dead-end), เพิ่ม `bookingNumber` (auto `KKD-YYYYMMDD-NNN`), เพิ่ม `giftSent` (Boolean), เพิ่ม `assignedEngineerId`/`assignedSalesId`
  - โมเดลใหม่ `BookingCapacitySetting`: กำหนดจำนวนนัดสูงสุดต่อวัน/ช่วงเวลา (ตั้งค่าได้จาก admin)
- `prisma/seed.ts`: ปรับให้ seed ตาม schema ใหม่ (ไม่มีข้อมูลจริงต้องย้าย ปลอดภัยที่จะ reseed)
- `npx prisma migrate dev` + verify build

## Sprint 1 — กลไก Channel Tracking อัตโนมัติ

- `src/proxy.ts`: อ่าน `?ref=` param, ตั้ง cookie อายุ 30 วัน (ไม่ overwrite ถ้ามี cookie เดิมอยู่แล้วภายในอายุ)
- `src/actions/submit-quote.ts`, `submit-survey-booking.ts`: อ่าน cookie → resolve เป็น Channel/ChannelExecutive → fallback "เข้าโดยตรง" ถ้าไม่มี ref เลย; เก็บคู่กับ `sourceChannelId` ที่ลูกค้าเลือกเองจาก dropdown (ทั้งสองฟิลด์อยู่คู่กัน)
- `src/actions/channels.ts`: CRUD `ChannelExecutive`, auto-generate `refCode`, ฟังก์ชันสร้างลิงก์โปรโมท (channel-level + executive-level) พร้อมปุ่มคัดลอก
- `src/app/admin/channels/`: UI จัดการผู้ดำเนินการช่องทาง (เพิ่ม/แก้ไข/ระงับ), แสดงลิงก์โปรโมท

## Sprint 2 — Role-Based Access Control

- `src/lib/auth/index.ts`: ขยาย `requireRole` รองรับ 4 roles, เพิ่ม helper สำหรับ scope query ตาม role
- `src/actions/leads.ts`, `bookings.ts` (ใหม่): SALES เห็นเฉพาะ lead/booking ที่ตัวเองรับผิดชอบ, FINANCE read-only ทุกอย่าง+export, CHANNEL_EXECUTIVE เห็นแค่จำนวน/สถานะในช่องทางตัวเอง ไม่เห็นข้อมูลส่วนตัวลูกค้า
- `src/app/admin/users/`: ฟอร์มสร้าง/แก้ผู้ใช้รองรับ 4 roles

## Sprint 3 — แยกโมดูล Booking Management

- `src/app/admin/bookings/` (หน้าใหม่ แยกจาก leads): ตาราง booking, filter ตาม status 8 ค่า, เลขที่นัดอัตโนมัติ, checkbox "ส่งของขวัญแล้ว", มอบหมายวิศวกร/เซลส์
- `src/actions/bookings.ts` (ใหม่): mutation แยกจาก leads actions, ทุกตัวผ่าน `withAudit()`+`requireRole` ตามเดิม
- `src/app/admin/settings/` (ใหม่ หรือรวมใน channels): ตั้งค่าจำนวนนัดสูงสุด/วัน/ช่วงเวลา
- `src/app/[locale]/booking/booking-forms.tsx`: date picker เรียก API เช็ควันที่เต็มแล้ว (จาก `BookingCapacitySetting` + จำนวนนัดที่มีอยู่)

### Sprint 3 — ผลลัพธ์ (2026-07-28)

งานตาม task breakdown ใน `docs/plans/sprint-3-booking-tasks.md` (Task 1-9, 11) เสร็จครบ, ตรวจสอบโดยละเอียดใน task file นั้น สรุปสั้น:

- `src/lib/bookings/booking-number.ts`, `capacity.ts` (ใหม่) — shared `nextBookingNumber()`/`isDateFull()`
- `src/actions/bookings.ts` (ใหม่) — mutation ครบ (status/gift/assign engineer-sales/payment/capacity setting) ผ่าน `withAudit()`+`requireRole()`+`canMutateBooking()`; `updatePaymentStatus` ย้ายจาก `leads.ts`
- `src/app/api/bookings/availability/route.ts` (public), `src/app/api/admin/bookings/route.ts`, `src/app/admin/(dashboard)/bookings/`, `src/app/admin/(dashboard)/settings/` (ใหม่ทั้งหมด)
- Sidebar เพิ่มเมนู "การจองสำรวจ"/"ตั้งค่าระบบ" (ADMIN/SALES/FINANCE ตาม scope; ตั้งค่าระบบ ADMIN เท่านั้น)
- `booking-forms.tsx` เช็ควันเต็มผ่าน API ใหม่, ข้อความ TH/EN คู่กัน (`booking.dateFull`/`booking.slotFull`)
- `scripts/e2e-admin-crud.mts` ขยายครอบคลุม booking module

**เบี่ยงจาก spec/default ที่ต้อง flag:**
- `BookingStatus` มี 7 ค่าจริงใน schema ไม่ใช่ 8 ตามที่ระบุใน task brief — ไม่ได้แก้ schema, ใช้ 7 ค่าตามจริง
- Admin sidebar คงเป็นภาษาไทยล้วนตาม AGENTS.md (admin UI Thai-only ที่ยืนยันแล้ว) ไม่เพิ่ม EN แม้ task brief จะขอ

**⚠️ Not yet specified — ต้องเช็คก่อน Sprint 9:** `BookingStatus` enum ใน schema (Sprint 0) มีแค่ 7 ค่า (`PENDING_CONFIRMATION, CONFIRMED, PREPARED, SURVEYED, DESIGNED, SIGNED, CANCELLED`) แต่แผน Sprint 0 เดิม (บรรทัดด้านบน) และ task brief ของ Sprint 3 ระบุว่าควรมี 8 ค่า — ไม่ชัดเจนว่าค่าที่ 8 หายไปคืออะไร (เช่น สถานะย่อยเพิ่มเติมระหว่าง flow, หรือแค่พิมพ์ผิดตอนเขียนแผน) ยืนยันแล้วว่าไม่ใช่บั๊กที่เกิดจาก Sprint 3 (เป็น schema เดิมจาก Sprint 0) จึง**ไม่แก้ schema กลาง Sprint 3** เพื่อลดความเสี่ยง — ต้องเปิด `docs/stuffs/KKD_เอกสารความต้องการเว็บไซต์_V1.2.pdf` เทียบกับ list สถานะจริงก่อนเข้า Sprint 9 (Verification รอบสุดท้าย) ว่าต้องเพิ่ม enum ค่าที่ 8 หรือแก้เอกสารแผนให้ตรง 7 ค่าตามจริง

**บั๊กที่เจอและแก้ระหว่างตรวจสอบ (นอกขอบเขต Sprint 3 เดิม แต่บล็อก build gate ของทุกสปรินต์):**
- `scripts/e2e-rbac-sprint2.mts:244` import path ลงท้าย `.ts` ทำให้ `npm run build` fail ที่ TypeScript step เสมอ (ยืนยันว่าเป็นบั๊กเดิมตั้งแต่ commit `054d350` ก่อน Sprint 3) — แก้โดยตัด `.ts` ออกจาก import path ตามคำสั่ง ไม่แตะ `tsconfig.json`
- `scripts/e2e-booking.mts` hardcode วันที่ "พรุ่งนี้" ชนกับ capacity feature ใหม่ (ข้อมูลทดสอบสะสมใน `prisma/dev.db` เกิน `maxPerSlot`/`maxPerDay` ของวันนั้นไปแล้ว) — แก้เป็นวันที่ dynamic กระจาย 2-301 วันข้างหน้า ตาม convention unique-suffix ที่ `e2e-admin-crud.mts` ใช้อยู่แล้ว

**Verification (รอบสุดท้าย, ผ่านทั้งหมด):**
- `npm run build` — `✓ Compiled successfully` + `Finished TypeScript` + exit code 0
- `npm run start` — ขึ้นสำเร็จ, `/th`, `/th/booking`, `/en/booking` ตอบ 200, `/api/bookings/availability` ตอบ JSON ถูกต้อง
- `npx tsx scripts/e2e-rbac-sprint2.mts` — ผ่านทุกเช็ค (RBAC ยังไม่แตกจาก Sprint 3)
- `npx tsx scripts/e2e-admin-crud.mts` — ผ่านทุกเช็ครวมส่วน booking/settings ใหม่
- `npx tsx scripts/e2e-booking.mts` — ผ่านหลังแก้วันที่ dynamic
- i18n parity — **ไม่ได้รัน subagent `i18n-parity-checker` จริง** (ไม่มี tool เรียก subagent ในเซสชันนี้) ใช้สคริปต์ตรวจ key parity + placeholder consistency แทน: `th.json`/`en.json` มี 289 key เท่ากันทั้งสองไฟล์ ไม่มี key ขาดฝั่งใดฝั่งหนึ่ง, ไม่มี `{placeholder}` ไม่ตรงกัน — แนะนำให้รัน `i18n-parity-checker` ตัวจริงเพิ่มถ้าต้องการความมั่นใจระดับ semantic/phrasing เพราะ script นี้เช็คแค่โครงสร้าง key ไม่ใช่คุณภาพคำแปล

## Sprint 4 — อัปเดตโมดูล Lead Management

**สถานะ:** เสร็จสมบูรณ์ (2026-07-29)

- `src/app/admin/leads/`: UI status flow 8 ค่า, มอบหมายเซลส์ (dropdown เลือกจาก AdminUser role=SALES), แสดง `lastFollowUpAt`
- `src/actions/leads.ts`: อัปเดต `lastFollowUpAt` เฉพาะตอนเซลส์บันทึกการติดตาม ไม่ใช่ทุก update ทั่วไป

### Sprint 4 — ผลลัพธ์ (2026-07-29)

งานตาม task breakdown ใน `docs/plans/sprint-4-lead-management-tasks.md` (Task 3-10) เสร็จครบ ตามค่า default ที่ผู้ใช้ยืนยันแล้วสำหรับ Task 1/2 (ADMIN-only sales assignment, `lastFollowUpAt` ผูกกับ `updateLeadNotes` เท่านั้น) สรุป:

- `src/actions/leads.ts` — เพิ่ม `assignLeadSales(id, salesId)` (ADMIN-only ผ่าน `requireRole("ADMIN")`, ผ่าน `withAudit()`) พร้อม `resolveSalesAssignee()` helper ในไฟล์เดียวกัน (validate `role === "SALES"` และ `isActive === true` — ไม่ import ข้าม `bookings.ts` ตามที่ระบุในแผน เพราะ `resolveAssignee()` ของ bookings ไม่จำกัด role); ตัด `lastFollowUpAt: new Date()` ออกจาก `updateLeadStatus()` (คงไว้เฉพาะ `updateLeadNotes()`) พร้อมคอมเมนต์อธิบายเหตุผล
- `src/app/admin/(dashboard)/leads/[id]/page.tsx` — query เพิ่ม `assignedSales: {select: {id, name}}`, `lastFollowUpAt`, รายชื่อ `AdminUser` ที่ `role === "SALES" && isActive === true` ส่งเป็น prop `salesUsers`, เพิ่ม `canAssignSales = session.user.role === "ADMIN"` (มิเรอร์ `canEditChannel`)
- `src/app/admin/(dashboard)/leads/[id]/lead-detail-client.tsx` — เพิ่ม dropdown มอบหมายเซลส์ (id `lead-sales` เพื่อให้ e2e เจาะจงได้ มิเรอร์ pattern dropdown `sourceChannel` เดิม — โชว์ select ถ้า `canAssignSales`, โชว์ข้อความอ่านอย่างเดียวถ้าไม่ใช่) และแสดง `lastFollowUpAt` (format `th-TH`, "ยังไม่เคยติดตาม" ถ้าเป็น `null`)
- `src/app/api/admin/leads/route.ts` + `src/hooks/admin/use-leads.ts` (type `LeadListItem`) — เพิ่ม `assignedSales: {select: {name: true}}` และ `lastFollowUpAt` ในผลลัพธ์ list API (ไม่ต้อง redact เพิ่มใน `redactLeadPII()` เพราะ field ทั้งสองไม่อยู่ใน `LEAD_PII_FIELDS`)
- `src/app/admin/(dashboard)/leads/leads-client.tsx` — เพิ่มคอลัมน์ "เซลส์ที่รับผิดชอบ" และ "ติดตามล่าสุด" ทั้งในตาราง list และหน้า detail (ตามค่า default ข้อ 3 ที่ยืนยันแล้ว), ซ่อนสองคอลัมน์ใหม่สำหรับ `isChannelExecutive` เหมือนคอลัมน์ชื่อ/เบอร์โทร (ปรับ `colSpan` ของแถว "ไม่พบข้อมูล" จาก 8 เป็น 10 ตามจำนวนคอลัมน์ใหม่)
- `scripts/e2e-admin-crud.mts` — เพิ่ม prisma client (better-sqlite3 adapter) เพื่อตรวจ DB-level: `lastFollowUpAt` ไม่เปลี่ยนตอน `updateLeadStatus`, เปลี่ยนตอน `updateLeadNotes`, และ `assignLeadSales` เซ็ต FK ไปยัง AdminUser ที่ `role === "SALES" && isActive === true` จริง
- `scripts/e2e-rbac-sprint2.mts` — เพิ่มเช็คว่า SALES session ไม่เห็น `#lead-sales` dropdown บน lead ของตัวเอง (มิเรอร์ pattern "no status-edit dropdown" ที่มีอยู่แล้วสำหรับ FINANCE) — พิสูจน์ว่า `canAssignSales` คำนวณถูกต้องระดับ UI; การบังคับฝั่ง server อยู่แล้วผ่าน `requireRole("ADMIN")` ใน action (ตรวจสอบโค้ดตรงแล้ว ไม่ได้เขียนสคริปต์ replay server-action request เพราะไม่มี pattern นี้ในโค้ดเดิมและจะเปราะบางต่อการเปลี่ยนแปลง implementation detail ของ Next.js Server Actions protocol)

**เบี่ยงจาก plan ที่ต้อง flag:** ไม่มี — implement ตรงตาม default ที่ผู้ใช้ยืนยันทั้ง 3 ข้อ (ADMIN-only assignment, `lastFollowUpAt` ผูกกับ `updateLeadNotes` เท่านั้น, คอลัมน์ใหม่ทั้ง list และ detail)

**Verification (รอบสุดท้าย, ผ่านทั้งหมด):**
- `npm run build` — `✓ Compiled successfully` + `Finished TypeScript` + exit code 0
- `npm run start` — ขึ้นสำเร็จ, `/th` ตอบ 200
- `npx tsx scripts/e2e-admin-crud.mts` — ผ่านทุกเช็ครวมส่วนใหม่: `LEAD DETAIL: lastFollowUpAt untouched by updateLeadStatus ✓`, `LEAD DETAIL: lastFollowUpAt set by updateLeadNotes ✓`, `LEAD DETAIL: sales assigned, FK resolves to an active SALES user ✓`
- `npx tsx scripts/e2e-rbac-sprint2.mts` — ผ่านทุกเช็ค รวม `SALES detail: no sales-assignment dropdown rendered ✓` ใหม่, SALES/CHANNEL_EXECUTIVE/FINANCE scoping เดิมยังไม่พัง
- ไม่ได้รัน `npx prisma migrate dev` แยก เพราะไม่มีการแก้ schema ใน sprint นี้ (ยืนยันตามแผนว่า `LeadStatus`/`assignedSalesId`/`lastFollowUpAt` มีอยู่แล้วครบตั้งแต่ Sprint 0) — build/e2e ผ่านโดยไม่มี pending migration error ยืนยันทางอ้อมว่า schema ตรงกับ client ที่ generate ไว้แล้ว

## Sprint 5 — แดชบอร์ด/รายงาน + Export Excel

- `src/app/admin/reports/` (หน้าใหม่, ADMIN+FINANCE เข้าถึงได้): breakdown ตามช่องทาง/ผู้ดำเนินการ/เซลส์/ช่วงเวลา, คำนวณรายได้ (นัดยืนยันแล้ว × 199)
- เพิ่ม dependency `exceljs` หรือเทียบเท่า, export field ตามที่ spec ระบุครบ (ชื่อ/เบอร์/ที่อยู่/ระบบ/ประเภทlead/ช่องทาง/ผู้ดำเนินการ/เซลส์/สถานะ/วันที่/เข้าสำรวจแล้วหรือไม่/ส่งของขวัญแล้วหรือไม่)

## Sprint 6 — แก้ฟิลด์ฟอร์มสาธารณะ + PromptPay QR

- `booking-forms.tsx`: จังหวัดเปลี่ยนเป็น dropdown 77 จังหวัด, เพิ่มตัวเลือก "อื่นๆ" ในประเภทอาคาร, เพิ่ม multi-select "ระบบที่สนใจ" ในฟอร์ม quote, ค่าไฟเปลี่ยนเป็น dropdown ช่วง, เพิ่มฟิลด์ "หมายเหตุ" ทั้งสองฟอร์ม
- เพิ่ม PromptPay QR generation library, สร้าง component แสดง QR แบบ dynamic
- `src/app/admin/settings/`: field ตั้งค่า PromptPay ID + ข้อมูลบัญชีธนาคาร (admin-configurable แทน hardcode ใน messages)

## Sprint 7 — แก้เนื้อหา/ตัวเลขให้ตรง Spec

- `prisma/seed.ts` (`seasonal()`): เปลี่ยนจากค่าเดียวเป็นช่วงตาม spec (summer ~20, early-rainy 16-17, rainy 12-14, winter 15-17), แก้ payback ให้ตรง (on-grid 6-7yr, hybrid 6-8yr, off-grid 8-12yr)
- `packages/page.tsx`: แสดงแบรนด์ครบ 4 ยี่ห้อ (LONGi/Trina/Jinko/JA Solar) ทุกแพ็กเกจ, แสดงช่วงคืนทุน, เพิ่มปุ่ม/หน้า "ดูรายละเอียด" (`packages/[slug]/page.tsx`)
- `about/page.tsx`: wire `StatsRow` (มีอยู่แล้วแต่ไม่ได้ใช้) ด้วยตัวเลขจาก DB จริง (project count, won-lead count)
- `contact/page.tsx`: เพิ่ม Google Maps embed + ลิงก์ Facebook จริง (รอข้อมูลจากลูกค้า)
- `home-content.tsx`: เพิ่มแถวไอคอนติดต่อด่วน (โทร/LINE/Facebook) ที่หน้าแรกเอง ไม่ใช่แค่ใน footer

## Sprint 8 — สคริปต์ Backup

- `scripts/backup-db.mts` (ใหม่): copy SQLite file + storage/private ไปยัง timestamped snapshot, พร้อม instruction สำหรับผูก cron ตอน deploy จริง

## Sprint 9 — Verification รอบสุดท้าย

- **เช็คก่อนอื่น**: เทียบ `BookingStatus` enum (ปัจจุบัน 7 ค่าในโค้ด) กับ `docs/stuffs/KKD_เอกสารความต้องการเว็บไซต์_V1.2.pdf` ว่า spec ต้องการ 8 ค่าจริงหรือไม่ และค่าที่ขาดคืออะไร (ดู note ที่ท้าย Sprint 3 ด้านบน) — ตัดสินใจว่าต้อง migrate schema เพิ่มหรือแก้เอกสารแผนให้ตรงของจริง
- `i18n-parity-checker` — TH/EN parity หลังเพิ่มฟิลด์/หน้าใหม่จำนวนมาก
- `audit-compliance-reviewer` — ตรวจ role scoping ใหม่ทั้งหมด (จุดเสี่ยงสูงสุดของ sprint นี้คือ data leak ข้าม role)
- E2E: ขยาย `scripts/e2e-admin-crud.mts` ให้ครอบคลุม booking module ใหม่, เพิ่ม script ทดสอบ channel-tracking (`?ref=` → cookie → lead attribution)
- `design-business-reviewer` — real render ของหน้าใหม่ (reports, bookings, PromptPay QR)

## Verification (ทุก sprint)

- `npm run build && npm run start` ต้องผ่านก่อนถือว่า sprint เสร็จ
- `npx prisma migrate dev` หลังแก้ schema
- รัน e2e scripts ที่เกี่ยวข้องกับ sprint นั้นๆ ก่อนขึ้น sprint ถัดไป
- Sprint 2 (RBAC) และ Sprint 9 ต้องผ่าน `audit-compliance-reviewer` ก่อนถือว่าเสร็จ เพราะเป็นจุดเสี่ยง data leak สูงสุด
