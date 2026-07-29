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
| 5 — แดชบอร์ด/รายงาน + Export Excel | ✅ เสร็จแล้ว (2026-07-29) | ดูรายละเอียดผลลัพธ์ท้าย Sprint 5 ด้านล่าง |
| 5b — แก้ Gap รายงาน (วันที่ปิดการขาย + อัตราปิดการขาย) | ✅ เสร็จแล้ว (2026-07-29) | ดูรายละเอียดผลลัพธ์ท้าย Sprint 5b ด้านล่าง |
| 6 — แก้ฟิลด์ฟอร์มสาธารณะ + PromptPay QR | ✅ เสร็จแล้ว (2026-07-29) | ดูรายละเอียดผลลัพธ์ท้าย Sprint 6 ด้านล่าง |
| 7 — แก้เนื้อหา/ตัวเลขให้ตรง Spec | ✅ เสร็จสมบูรณ์ (2026-07-29) | ดูรายละเอียดผลลัพธ์ท้าย Sprint 7 ด้านล่าง |
| 8-9 | ⏳ ยังไม่เริ่ม | ตามลำดับเดิมในแผนนี้ |

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

**สถานะ:** เสร็จสมบูรณ์ (2026-07-29) — ดู task breakdown แบบละเอียดที่ `docs/plans/sprint-5-reports-tasks.md`

- `src/app/admin/reports/` (หน้าใหม่, ADMIN+FINANCE เข้าถึงได้): breakdown ตามช่องทาง/ผู้ดำเนินการ/เซลส์/ช่วงเวลา, คำนวณรายได้ (นัดยืนยันแล้ว × 199)
- เพิ่ม dependency `exceljs` หรือเทียบเท่า, export field ตามที่ spec ระบุครบ (ชื่อ/เบอร์/ที่อยู่/ระบบ/ประเภทlead/ช่องทาง/ผู้ดำเนินการ/เซลส์/สถานะ/วันที่/เข้าสำรวจแล้วหรือไม่/ส่งของขวัญแล้วหรือไม่)

### Sprint 5 — ผลลัพธ์ (2026-07-29)

งานตาม task breakdown ใน `docs/plans/sprint-5-reports-tasks.md` (Task 4-12) เสร็จครบ ตามค่า default ที่ผู้ใช้ยืนยันแล้วสำหรับ Task 1-3 (revenue = `SUM(amountThb)` ของ booking สถานะไม่ใช่ `PENDING_CONFIRMATION`/`CANCELLED`, ข้ามคอลัมน์ "ระบบ" ไปก่อน, export รวมทั้ง `QUOTE`+`SURVEY`) สรุป:

- เพิ่ม dependency `exceljs` ใน `package.json`
- `src/lib/reports/labels.ts` (ใหม่) — label map ไทยกลาง (`LEAD_STATUS_LABELS_TH`/`BOOKING_STATUS_LABELS_TH`/`LEAD_TYPE_LABELS_TH`) ใช้ร่วมกันทั้ง server (export) และ client (dashboard)
- `src/lib/reports/aggregate.ts` (ใหม่) — `CONFIRMED_BOOKING_STATUSES`/`isConfirmedBookingStatus()`/`sumConfirmedRevenue()` เป็นนิยาม "นัดยืนยันแล้ว" จุดเดียว, `buildLeadWhere()`/`buildBookingWhere()`/`parseReportFilters()`/`effectiveChannel()` ใช้ร่วมกันกับ `export-rows.ts` (ไม่ query/นิยามซ้ำสองที่ตามความเสี่ยงที่ระบุไว้ในแผน), `getReportAggregate()` คืน breakdown ตามช่องทาง/ผู้ดำเนินการ/เซลส์/สถานะ + ยอดรวม
- `src/lib/reports/export-rows.ts` (ใหม่) — `getExportRows()` query Lead ทั้ง `QUOTE`+`SURVEY` พร้อม `include: booking` (LEFT JOIN-equivalent), field ที่ผูกกับ booking (ที่อยู่/เข้าสำรวจแล้วหรือไม่/ส่งของขวัญแล้วหรือไม่) แสดง `-` เมื่อไม่มี booking, import `isConfirmedBookingStatus`/`buildLeadWhere`/`effectiveChannel` จาก `aggregate.ts` แทนการเขียนซ้ำ
- `src/app/api/admin/reports/summary/route.ts`, `src/app/api/admin/reports/export/route.ts` (ใหม่ทั้งคู่) — `requireRole` เทียบเท่า (manual role check คืน JSON 401/403 เหมือน pattern `/api/admin/leads`/`/api/admin/bookings` เดิม ไม่ใช้ `redirect()`), เรียก `getLeadScopeFilter()`/`getBookingScopeFilter()` แม้จะคืน `{}` เสมอสำหรับสอง role นี้ (เพื่อความสม่ำเสมอตามที่ระบุในแผน), `export/route.ts` import `exceljs` เฉพาะในไฟล์นี้ (server-only route handler) ไม่มีการ import จาก client component ใดๆ
- `src/app/admin/(dashboard)/reports/page.tsx` + `reports-client.tsx`, `src/hooks/admin/use-reports.ts` (ใหม่ทั้งหมด) — filter (ช่วงวันที่/ช่องทาง/ผู้ดำเนินการ/เซลส์), การ์ดสรุป (ลูกค้าเป้าหมาย/นัดสำรวจ/นัดยืนยันแล้ว/รายได้รวม), ตาราง breakdown 4 มิติ (ช่องทาง/ผู้ดำเนินการ/เซลส์/สถานะนัดสำรวจ), ปุ่ม "Export Excel" ลิงก์ตรงไปยัง `/api/admin/reports/export` พร้อม filter params ปัจจุบัน
- `src/app/admin/(dashboard)/admin-sidebar.tsx` — เพิ่มเมนู "รายงาน" (`roles: ["ADMIN", "FINANCE"]`) มิเรอร์ pattern item อื่นเป๊ะ
- `scripts/e2e-admin-crud.mts` — เพิ่มส่วน REPORTS: หน้าโหลดได้, breakdown card render, summary API 200, **ยอดรายได้ตรงกับสูตร `SUM(amountThb)` ที่คำนวณตรงจาก DB แยกต่างหาก** (ground truth ไม่พึ่ง aggregate.ts), ยอดบนหน้า dashboard ตรงกับ API, export API 200 พร้อม `Content-Disposition: attachment`, header ไฟล์ Excel ตรงกับ field list ที่ implement, ไม่มีคอลัมน์ "ระบบ" หลอกๆ, จำนวนแถว export ตรงกับจำนวน Lead ทั้งหมดใน DB
- `scripts/e2e-rbac-sprint2.mts` — เพิ่มเช็ค: SALES/CHANNEL_EXECUTIVE ถูกเด้งจาก `/admin/reports` และ API คืน 403, FINANCE เข้าถึง `/admin/reports` + ทั้งสอง API ได้ (200) — ยืนยันว่า RBAC ใหม่ของ Sprint 5 ไม่รั่วข้าม role และไม่พัง RBAC เดิม

**PDF cross-check (Task ที่ผู้ใช้ขอให้ตรวจสอบ):** ตอนวางแผน Sprint 5 ไม่สามารถเปิด `docs/stuffs/KKD_เอกสารความต้องการเว็บไซต์_V1.2.pdf` ได้ (ไม่มี `poppler-utils`) — รอบนี้ติดตั้ง `poppler` ผ่าน Homebrew ได้สำเร็จและเปิดอ่านได้จริง (หัวข้อ 4.5 "โมดูลรายงานและส่งออกข้อมูล") พบ 2 จุดที่ field list ที่ implement ไปแล้ว (ตาม task breakdown เดิม) **ไม่ครบ 100% เทียบกับ PDF ต้นฉบับ** — ทั้งสองจุดมีอยู่ใน task breakdown ตั้งแต่ต้นแล้ว (ไม่ใช่บั๊กที่เกิดจากรอบ implement นี้) จึง **ไม่ได้แก้ระหว่าง sprint นี้** (นอกสโคปที่ตกลงไว้ + ต้องมีการตัดสินใจเพิ่มเพราะไม่มี field รองรับตรงๆ ใน schema) บันทึกเป็น follow-up ชัดเจนสำหรับ Sprint 6/9:
  1. **ขาดคอลัมน์ export "วันที่ปิดการขาย"** — PDF ระบุ field list เต็ม 13 field: `ชื่อลูกค้า, เบอร์โทร, ที่อยู่, ประเภทระบบ, ประเภท Lead, ช่องทางที่มา, ผู้ดำเนินการช่องทาง, เซลส์ที่รับผิดชอบ, สถานะปัจจุบัน, วันที่ส่งฟอร์ม, วันที่ปิดการขาย, เข้าสำรวจแล้วหรือไม่, ส่งของขวัญแล้วหรือไม่` — ที่ implement ไปมี 11 field ตรงตาม task breakdown (ขาด "ประเภทระบบ" ตามที่ตกลงเลื่อนไป Sprint 6 อย่างตั้งใจ + ขาด **"วันที่ปิดการขาย" ที่ task breakdown ไม่ได้ระบุไว้เลย** ไม่ใช่การตัดสินใจที่ผู้ใช้ยืนยันแล้ว) — Lead/SurveyBooking schema ปัจจุบันไม่มี timestamp ที่บันทึก "วันที่ปิดการขาย" ตรงๆ (มีแค่ `updatedAt` ซึ่งเป็น proxy ไม่แม่นยำ เพราะเปลี่ยนทุกครั้งที่แก้ field ใดก็ได้ ไม่ใช่แค่ตอนปิดการขาย) ต้องตัดสินใจก่อนว่าจะเพิ่ม field ใหม่ (เช่น `Lead.closedAt`) หรือ derive จาก audit log
  2. **แดชบอร์ดขาด "อัตราปิดการขาย" (close rate %)** — PDF ระบุมิติ "ตามช่องทาง"/"ตามผู้ดำเนินการ" ต้องมี "จำนวน Lead นัด ปิดการขาย **อัตราปิดการขาย**" แต่ task breakdown Task 5 เขียนแค่ "รวมนับจำนวน lead/booking ต่อ status และคำนวณรายได้" ไม่ได้พูดถึง % — dashboard ที่ implement ไปมีจำนวน lead/booking/revenue ต่อช่องทางแต่ไม่มี % ปิดการขายเป็นคอลัมน์แยก (คำนวณได้เองจากตัวเลขที่มีอยู่ แต่ยังไม่ได้ทำเป็น UI element ชัดเจน)
  3. Task breakdown ระบุ "ตามช่วงเวลา" เป็น "เดือนนี้/เดือนที่แล้ว/กำหนดเองได้" (quick preset) แต่ implement เป็น date-range ปกติ (`from`/`to`) เท่านั้น ไม่มีปุ่ม preset — ใช้งานได้เหมือนกัน (`from`/`to` ครอบคลุม custom range ทุกกรณี) เพียงแต่ขาด quick-select UX

  ทั้งสามข้อไม่ block sprint นี้ (revenue formula/scope ที่ยืนยันแล้วยังถูกต้องตรงกับ PDF 100%: "จำนวนนัดที่ยืนยัน × 199 บาท" ตรงกับ `SUM(amountThb)` ของ booking ที่ไม่ใช่ `PENDING_CONFIRMATION`/`CANCELLED` พอดี) แต่ควรหยิบไปพิจารณาก่อนปิด Sprint 9 (verification รอบสุดท้าย)

**เบี่ยงจาก plan ที่ต้อง flag:** ไม่มีในส่วนที่ตกลงกันไว้แล้ว (ดู "PDF cross-check" ด้านบนสำหรับ gap ที่พบใหม่นอกเหนือจาก decision ที่ยืนยันแล้ว)

**Verification (รอบสุดท้าย, ผ่านทั้งหมด):**
- `npm run build` — `✓ Compiled successfully` + `Finished TypeScript` + exit code 0 (แก้ type error เล็กน้อยใน `scripts/e2e-admin-crud.mts` ระหว่างพัฒนา — `Buffer<ArrayBufferLike>` vs `Buffer` จาก playwright's `response.body()` เข้ากับ `exceljs`'s `.load()`)
- `npx tsx scripts/verify-all.mts` (build → production server → `e2e-booking.mts` → `e2e-admin.mts` → `e2e-admin-crud.mts`) — ผ่านทั้งหมด รวมส่วน REPORTS ใหม่ทั้ง 10 เช็ค (revenue ตรง DB ground truth, export headers/row count ถูกต้อง)
- `npx tsx scripts/e2e-rbac-sprint2.mts` (รันแยกกับ production server ตัวเดียวกัน) — ผ่านทุกเช็คทั้งเดิมและใหม่ (SALES/CE ถูกปฏิเสธจาก reports, FINANCE เข้าถึงได้, RBAC เดิม Sprint 2-4 ไม่พัง)
- `npx prisma migrate dev` — ไม่รัน เพราะไม่มีการแก้ schema ใน sprint นี้ (ยืนยันตามแผนว่าทุก field ที่ต้องใช้มีอยู่แล้ว ยกเว้น "ระบบ"/"วันที่ปิดการขาย" ที่เลื่อนออกไปตามที่ระบุข้างต้น)
- `git status` — ไม่มีการแก้ `src/messages/*.json` (หน้า reports เป็น admin-only ภาษาไทยล้วนตาม AGENTS.md ไม่มี string สาธารณะใหม่) จึงไม่ต้องรัน i18n parity check เพิ่ม

## Sprint 5b — แก้ Gap รายงานที่พบจาก PDF spec ต้นฉบับ

**สถานะ:** เริ่มงานแล้ว (2026-07-29)

ระหว่างตรวจ Sprint 5 เทียบกับ `docs/stuffs/KKD_เอกสารความต้องการเว็บไซต์_V1.2.pdf` (§4.5) โดยตรง (อ่านได้จริงรอบนี้หลังติดตั้ง poppler-utils) พบว่า field list export มี **13 คอลัมน์ ไม่ใช่ 11** ตามที่วางแผนไว้ตอน Sprint 5 — เพิ่มเป็น sprint แยกแทนที่จะรอไปรวมกับ Sprint 9 ตามที่ผู้ใช้ตัดสินใจ

- เพิ่มคอลัมน์ export **"วันที่ปิดการขาย"** — ปัจจุบันไม่มี field นี้ใน schema เลย (มีแค่ `updatedAt` ซึ่งไม่แม่นยำเพราะถูก touch โดย update อื่นที่ไม่ใช่การปิดการขาย) ต้องตัดสินใจว่าจะเพิ่ม field ใหม่ (เช่น `Lead.closedAt`, เซ็ตอัตโนมัติตอนสถานะเปลี่ยนเป็น `SIGNED`/`COMPLETED`) หรือ derive จาก `AuditLog` (หา entry แรกที่เปลี่ยนสถานะเป็นค่านั้น)
- เพิ่ม **"อัตราปิดการขาย" (close-rate %)** ใน dashboard breakdown ต่อช่องทาง/ผู้ดำเนินการ/เซลส์ — สูตร: จำนวน lead ที่ปิดการขายแล้ว ÷ จำนวน lead ทั้งหมดในกลุ่มนั้น × 100
- (Nice-to-have, ไม่บังคับ) เปลี่ยนตัวเลือกช่วงเวลาจาก date-range ธรรมดาเป็น month-preset ตาม spec เดิม — ฟังก์ชันเดิมทำงานถูกต้องอยู่แล้ว จึงเป็น priority ต่ำกว่า 2 ข้อบน

Task breakdown ฉบับเต็มที่ `docs/plans/sprint-5b-reports-gap-tasks.md`

### Sprint 5b — ผลลัพธ์ (2026-07-29)

งานตาม task breakdown ใน `docs/plans/sprint-5b-reports-gap-tasks.md` (Task 2-11) เสร็จครบ ตามค่า default ทั้งสองข้อที่ผู้ใช้ยืนยันแล้ว (Task 1): `Lead.closedAt` เป็น field ใหม่ nullable ไม่ derive จาก `AuditLog`, close-rate นับจาก `status` ปัจจุบันของ lead ∈ `{SIGNED, INSTALLING, COMPLETED}` ไม่ใช่ `closedAt IS NOT NULL` สรุป:

- `prisma/schema.prisma` — เพิ่ม `Lead.closedAt DateTime?` ถัดจาก `lastFollowUpAt` พร้อมคอมเมนต์อธิบาย (มิเรอร์สไตล์ที่มีอยู่แล้ว); `npx prisma migrate dev --name add_lead_closed_at` สร้าง migration ใหม่ 1 ตัว, ไม่มี backfill ข้อมูลเก่าตามที่ยืนยันแล้ว (lead เก่าที่เคย `SIGNED`/`INSTALLING`/`COMPLETED` อยู่แล้วจะมี `closedAt = null`); `npx prisma generate` ต้องรันแยกเพิ่ม (สังเกตว่า `migrate dev` ไม่ regenerate client บางกรณี — ตรวจพบจาก TypeScript error ที่ `LeadSelect` ไม่มี `closedAt` จนกว่าจะรัน `generate` เอง) ยืนยัน `src/generated/prisma` มี field ครบหลังรัน
- `src/actions/leads.ts` `updateLeadStatus()` — เซ็ต `closedAt = new Date()` เฉพาะเมื่อ `status === "SIGNED" && before.status !== "SIGNED"` (เข้า SIGNED ครั้งแรกเท่านั้น) พร้อมคอมเมนต์อธิบาย nuance (ทำไมนับจาก SIGNED ไม่ใช่ COMPLETED, ทำไมไม่ clear ตอนเดินหน้าต่อ, edge case ย้อนกลับเข้า SIGNED ใหม่) ไม่แตะ `updateLeadNotes()`/`assignLeadSales()`/`updateLeadSourceChannel()` เลย
- `src/lib/reports/aggregate.ts` — เพิ่ม `CLOSED_LEAD_STATUSES`/`isClosedLeadStatus()` มิเรอร์ `CONFIRMED_BOOKING_STATUSES`/`isConfirmedBookingStatus()` เป๊ะ, เพิ่ม `closedLeadCount`/`closeRatePercent` เข้า `ChannelAgg`/`ExecutiveAgg`/`SalesAgg` + `ReportAggregate` type และ logic คำนวณ (`closeRatePercent = leadCount > 0 ? (closedLeadCount / leadCount) * 100 : 0`, คำนวณหลังวน loop ครบทั้ง lead+booking ต่อกลุ่มเพื่อไม่พึ่งลำดับ loop)
- `src/lib/reports/export-rows.ts` — เพิ่ม `closedAt` เข้า `select`, `ExportRow` type และ `EXPORT_COLUMNS` **ในตำแหน่งระหว่าง `createdAt` ("วันที่") กับ `surveyed` ("เข้าสำรวจแล้วหรือไม่")** ตรงตาม PDF §4.5 ที่ยืนยันแล้ว, header "วันที่ปิดการขาย", format เหมือน `createdAt` (`toLocaleDateString("th-TH")`), แสดง `-` เมื่อ `null` — **field list export ตอนนี้ครบ 13 คอลัมน์ตรงกับ PDF ทุกตำแหน่ง ยกเว้น "ประเภทระบบ" ที่ยังคงเลื่อนไป Sprint 6 ตามที่ตกลงไว้ตั้งแต่ Sprint 5 อย่างตั้งใจ**
- `src/hooks/admin/use-reports.ts` — อัปเดต `ReportAggregate` type ให้ตรงกับ shape ใหม่ (`closedLeadCount`/`closeRatePercent` ใน 3 breakdown array)
- `src/app/admin/(dashboard)/reports/reports-client.tsx` — เพิ่มคอลัมน์ "ปิดการขาย" (นับ) + "อัตราปิดการขาย (%)" เข้าทั้ง 3 การ์ด breakdown (ช่องทาง/ผู้ดำเนินการ/เซลส์), format % ด้วย `toFixed(1)`; **Task 9 (nice-to-have) ทำสำเร็จ** — เพิ่มปุ่ม preset "เดือนนี้"/"เดือนที่แล้ว"/"กำหนดเอง" เหนือ input `from`/`to` เดิม (คำนวณช่วงเดือนแบบ client-side ล้วน, ไม่แตะ `use-reports.ts`/API เลยเพราะ `from`/`to` ยังเป็น string shape เดิม; แก้ไข input ด้วยมือหลัง preset จะสลับกลับเป็น "กำหนดเอง" อัตโนมัติผ่าน `set()`)
- `scripts/e2e-admin-crud.mts` — ขยายส่วน REPORTS เดิม: (ก) `closedAt` เป็น `null` ก่อนเข้า `SIGNED`, (ข) เซ็ตตอนเข้า `SIGNED` ครั้งแรก, (ค) ไม่เปลี่ยนตอนเดินหน้าไป `INSTALLING`/`COMPLETED`, (ง) export header "วันที่ปิดการขาย" อยู่ตำแหน่งถูกต้อง (ระหว่าง "วันที่" กับ "เข้าสำรวจแล้วหรือไม่"), (จ) `closedLeadCount`/`closeRatePercent` ต่อ channel/executive/sales จาก summary API ตรงกับ ground truth ที่คำนวณตรงจาก DB แยกต่างหาก (มิเรอร์ style ที่ Sprint 5 ทำกับ revenue), เพิ่มเช็ค month-preset button คลิกแล้ว fill ค่า from-date ได้จริง

**เบี่ยงจาก plan ที่ต้อง flag:**
- ระหว่าง Task 3 พบว่า `npx prisma migrate dev` ไม่ได้ regenerate `src/generated/prisma` ให้มี field ใหม่โดยอัตโนมัติในรอบนี้ (TypeScript ฟ้อง `closedAt` ไม่มีใน `LeadSelect`) ต้องรัน `npx prisma generate` แยกต่างหากเพิ่มเติม — ไม่ใช่การเบี่ยงจาก scope งาน เป็นแค่ขั้นตอนเสริมที่ AGENTS.md ระบุไว้อยู่แล้ว ("After schema changes: `npx prisma migrate dev` regenerates it") แต่รอบนี้ไม่เกิดอัตโนมัติจริง จึงบันทึกไว้เผื่อ sprint ถัดไปเจอซ้ำ
- ไม่มีการเบี่ยงอื่นจากค่า default/decision ที่ยืนยันแล้วใน task breakdown

**Known limitation (ตามที่ระบุไว้ในแผนแล้ว ไม่ใช่บั๊ก):** lead ที่มีสถานะ `SIGNED`/`INSTALLING`/`COMPLETED` อยู่แล้วก่อน migration นี้จะมี `closedAt = null` — export คอลัมน์ "วันที่ปิดการขาย" โชว์ `-` ให้กลุ่มนี้แม้ปิดการขายไปแล้วจริง ยอมรับได้เพราะยังไม่มี production data จริง

**Verification (ผ่านทั้งหมด):**
- `npm run build` — `✓ Compiled successfully` + `Finished TypeScript` ผ่าน, ไม่มี error
- `npm run start` + `npx tsx scripts/e2e-admin-crud.mts` — ผ่านทุกเช็ครวมส่วนใหม่ 4 เช็ค closedAt (null ก่อน SIGNED / เซ็ตตอนเข้า SIGNED ครั้งแรก / ไม่เปลี่ยนตอน INSTALLING / ไม่เปลี่ยนตอน COMPLETED), เช็ค month-preset, เช็ค `closedLeadCount`/`closeRatePercent` ตรง DB ground truth ทั้ง 3 มิติ, เช็คตำแหน่งคอลัมน์ export "วันที่ปิดการขาย" ถูกต้อง — รวม 40 เช็ค ผ่านครบ (revenue ground truth ยังตรง 597 === 597 เหมือน Sprint 5 ยืนยันว่าไม่พังของเดิม)
- `npx tsx scripts/e2e-rbac-sprint2.mts` — ผ่านทุกเช็คไม่มีการเปลี่ยนแปลง (ยืนยันว่า sprint นี้ไม่กระทบ RBAC เลยตามที่คาดไว้ในแผน)
- `npx prisma migrate dev` — มี migration ใหม่ 1 ตัว (`20260729054021_add_lead_closed_at`) ไม่มี pending migration อื่นค้าง
- `git status` — ไม่มีการแก้ `src/messages/*.json` (ไม่มี public-facing string ใหม่ใน sprint นี้ตามที่คาดไว้)

## Sprint 6 — แก้ฟิลด์ฟอร์มสาธารณะ + PromptPay QR

**สถานะ:** เสร็จสมบูรณ์ (2026-07-29) — ดู task breakdown แบบละเอียดที่ `docs/plans/sprint-6-public-forms-promptpay-tasks.md`

- `booking-forms.tsx`: จังหวัดเปลี่ยนเป็น dropdown 77 จังหวัด, เพิ่มตัวเลือก "อื่นๆ" ในประเภทอาคาร, เพิ่ม multi-select "ระบบที่สนใจ" ในฟอร์ม quote, ค่าไฟเปลี่ยนเป็น dropdown ช่วง, เพิ่มฟิลด์ "หมายเหตุ" ทั้งสองฟอร์ม
- เพิ่ม PromptPay QR generation library, สร้าง component แสดง QR แบบ dynamic
- `src/app/admin/settings/`: field ตั้งค่า PromptPay ID + ข้อมูลบัญชีธนาคาร (admin-configurable แทน hardcode ใน messages)

### Sprint 6 — ผลลัพธ์ (2026-07-29)

งานตาม task breakdown ใน `docs/plans/sprint-6-public-forms-promptpay-tasks.md` (Task 1-11) เสร็จครบ ตามค่า default ที่ผู้ใช้ยืนยันแล้ว 3 ข้อ (ตัวเลือก "ระบบที่สนใจ" = On-Grid/Hybrid/Off-Grid, อาคาร "อื่นๆ" มี free-text field เพิ่ม, ค่าไฟ 5 ช่วง) สรุป:

- `prisma/schema.prisma` — `BuildingType.OTHER`, `Lead.buildingTypeOtherText`, `Lead.interestedSystems Json?`, โมเดลใหม่ `PaymentSettings` (singleton มิเรอร์ `BookingCapacitySetting`); migration `20260729062555_sprint6_public_forms`; `prisma/seed.ts` seed `PaymentSettings` ด้วยข้อมูลปลอมชุดเดิมที่เคย hardcode ใน messages
- `src/lib/data/provinces.ts` (ใหม่) — 77 จังหวัด TH/EN
- `src/lib/validations/lead.ts` — เพิ่ม `buildingTypeOtherText`/`notes`/`interestedSystems` (quote เท่านั้น), `superRefine` บังคับกรอก `buildingTypeOtherText` เมื่อเลือก OTHER
- `src/actions/submit-quote.ts`, `submit-survey-booking.ts` — persist ฟิลด์ใหม่ครบ
- `src/lib/promptpay.ts` (ใหม่) — `generatePromptPayQrDataUrl()` ผ่าน `promptpay-qr`+`qrcode` ไม่มี network call ภายนอก
- `src/actions/payment-settings.ts` (ใหม่) — `getPaymentSettings()` (public read, ไม่ requireRole เพราะ RSC หน้า booking เรียกตรง), `updatePaymentSettings()` (ADMIN-only ผ่าน `requireRole`+`withAudit`, มิเรอร์ `updateBookingCapacitySetting`); `src/actions/promptpay-preview.ts` (ใหม่) — live QR preview ฝั่ง admin settings
- `src/app/admin/(dashboard)/settings/`, `booking/booking-forms.tsx`+`page.tsx` — UI ครบตาม task breakdown, แทนที่ `slipBankInfo` hardcode เดิมด้วยข้อมูล dynamic จาก `PaymentSettings`
- `src/messages/th.json`/`en.json` — key parity ยืนยันแล้ว (ตรวจด้วย key-diff script, ไม่มี key ขาดฝั่งใดฝั่งหนึ่ง)
- `src/app/admin/(dashboard)/leads/[id]/` — แสดง `buildingTypeOtherText`/`interestedSystems` (badge) ใหม่ในหน้า detail กันข้อมูล write-only
- `src/lib/reports/export-rows.ts` — เพิ่มคอลัมน์ "ประเภทระบบ" (ปิด gap ที่ Sprint 5 ค้างไว้ — ตอนนี้ export ครบ 14 คอลัมน์)
- `scripts/e2e-booking.mts`, `e2e-admin-crud.mts`, `e2e-rbac-sprint2.mts` — ขยายครอบคลุมฟิลด์ใหม่ทั้งหมด + payment settings RBAC (SALES/FINANCE/CHANNEL_EXECUTIVE โดน 403)

**เบี่ยงจาก plan ที่ต้อง flag:**
- `BuildingType` enum ใช้ร่วมกับ `PortfolioProject.category` — การเพิ่ม `OTHER` ทำให้ type ของ `PortfolioProject.category` กว้างขึ้นไปด้วย (ไม่ได้อยู่ใน task breakdown ตรงๆ) ต้องแก้ `ProjectRow.category` ใน `src/app/admin/(dashboard)/portfolio/portfolio-client.tsx` ให้รองรับ `"OTHER"` (ไม่มีทางเลือกนี้ในฟอร์ม portfolio จริง) ไม่งั้น build fail — จำเป็นต้องแก้ ไม่ใช่ scope creep

**Verification (ผ่านทั้งหมด):**
- `npx tsc --noEmit` — clean
- `npm run build` — `✓ Compiled successfully` + `Finished TypeScript` ผ่าน, ไม่มี error
- `npx prisma migrate dev` + `npx prisma db seed` — ผ่าน (seed idempotent)
- i18n key-parity script — `th-only: []`, `en-only: []`
- `npx tsx scripts/verify-all.mts` (build → production server → e2e-booking → e2e-admin → e2e-admin-crud) — ผ่านทั้งหมด
- `npx tsx scripts/e2e-rbac-sprint2.mts` — ผ่านทุกเช็ครวม payment-settings ADMIN-only ใหม่
- ตรวจ manual: `/th/booking`, `/en/booking` render province select/bank info dynamic/PromptPay QR ถูกต้อง

## Sprint 7 — แก้เนื้อหา/ตัวเลขให้ตรง Spec

- `prisma/seed.ts` (`seasonal()`): เปลี่ยนจากค่าเดียวเป็นช่วงตาม spec (summer ~20, early-rainy 16-17, rainy 12-14, winter 15-17), แก้ payback ให้ตรง (on-grid 6-7yr, hybrid 6-8yr, off-grid 8-12yr)
- `packages/page.tsx`: แสดงแบรนด์ครบ 4 ยี่ห้อ (LONGi/Trina/Jinko/JA Solar) ทุกแพ็กเกจ, แสดงช่วงคืนทุน, เพิ่มปุ่ม/หน้า "ดูรายละเอียด" (`packages/[slug]/page.tsx`)
- `about/page.tsx`: wire `StatsRow` (มีอยู่แล้วแต่ไม่ได้ใช้) ด้วยตัวเลขจาก DB จริง (project count, won-lead count)
- `contact/page.tsx`: เพิ่ม Google Maps embed + ลิงก์ Facebook จริง (รอข้อมูลจากลูกค้า)
- `home-content.tsx`: เพิ่มแถวไอคอนติดต่อด่วน (โทร/LINE/Facebook) ที่หน้าแรกเอง ไม่ใช่แค่ใน footer

### Sprint 7 — ผลลัพธ์ (2026-07-29)

งานตาม task breakdown ใน `docs/plans/sprint-7-content-numbers-tasks.md` เสร็จครบ ตัวเลขยืนยันตรงจาก PDF ผ่าน `pdftotext -layout` โดยตรงรอบนี้ (ก่อนหน้านี้เปิด PDF ไม่ได้จนกว่าจะติดตั้ง poppler ใน Sprint 5) สรุป:

- `prisma/seed.ts` — `seasonal()` เปลี่ยนจากค่าเดียวเป็น `unitsPerDayMin`/`unitsPerDayMax` ตามตัวเลขจาก PDF (ฤดูร้อน 20/20, ต้นฤดูฝน 16/17, กลางฤดูฝน 12/14, ฤดูหนาว 15/17 คูณ scale ตามขนาดระบบ); `featuresTh`/`featuresEn` ทั้ง 3 แพ็กเกจขึ้นต้นด้วย 4 แบรนด์เดียวกัน (LONGi/Trina/Jinko/JA Solar); เปลี่ยน `Package` upsert จาก `update: {}` เป็น `update: p` — จำเป็นเพื่อให้ reseed แก้ข้อมูลแพ็กเกจเดิมใน `dev.db` จริง (ไม่มี admin edit UI สำหรับแพ็กเกจ, seed.ts คือ source of truth)
- `src/lib/packages-seasonal.ts`, `src/components/site/seasonal-production-table.tsx` (ใหม่ทั้งคู่) — shared types/component ระหว่างหน้า list กับหน้า detail (ไม่ query/render ซ้ำสองที่)
- `src/app/[locale]/packages/page.tsx` — แสดงช่วงตัวเลขผลิตไฟ, เพิ่มกล่องระยะคืนทุน 3 ประเภท (ออนกริด 6-7ปี/ไฮบริด 6-8ปี/ออฟกริด 8-12ปี — ไม่ผูกกับแพ็กเกจใดเพราะ schema ไม่มี field แยกประเภทระบบ), เพิ่มปุ่ม "ดูรายละเอียด"
- `src/app/[locale]/packages/[slug]/page.tsx` (ใหม่) — หน้ารายละเอียดแพ็กเกจ, `notFound()` ถ้า slug ไม่พบ/`isPublished:false`
- `src/components/site/stats-row.tsx` — เพิ่ม `overrides` prop, เปลี่ยน `statsSatisfaction` (วัดไม่ได้จริง) เป็น `statsCustomers`
- `src/app/[locale]/about/page.tsx` — render `<StatsRow>` จริง (ก่อนหน้านี้ import ไว้แต่ไม่เคยใช้เลย) ผูกกับ `portfolioProject.count()` และ `lead.count()` (status ∈ `CLOSED_LEAD_STATUSES` — import จาก `src/lib/reports/aggregate.ts` แทนนิยามซ้ำ)
- `src/app/[locale]/contact/page.tsx` — เพิ่มไอเทม Facebook + Google Maps iframe embed (placeholder, query จาก `addressValue`)
- `src/app/[locale]/home-content.tsx`, `src/components/site/icon-facebook.tsx` (ใหม่) — แถวไอคอนติดต่อด่วน (โทร/LINE/Facebook) ใต้ hero CTA
- `src/messages/th.json`/`en.json` — key parity ยืนยันแล้ว (313 key เท่ากันทั้งสองไฟล์), เพิ่ม key ใหม่สำหรับกล่องคืนทุน/หน้ารายละเอียด/quick-contact/Facebook/Maps ครบคู่ TH/EN

**เบี่ยงจาก plan ที่ต้อง flag:** การเปลี่ยน `update: {}` → `update: p` ใน seed ไม่ได้อยู่ใน task list เดิมตรงๆ แต่จำเป็นเพื่อให้ค่าที่แก้ไปมีผลจริงกับข้อมูลที่ seed ไปแล้วก่อนหน้า

**Verification (ผ่านทั้งหมด):**
- `npx tsc --noEmit` — clean
- `npm run build` — `✓ Compiled successfully` + `Finished TypeScript`, exit 0
- i18n key-parity script — `th-only: []`, `en-only: []`
- `npx prisma db seed` — idempotent, ผ่าน
- Manual: `/th/packages`, `/en/packages`, `/th/packages/5kw` (200), `/th/packages/does-not-exist` (404), `/th/about`, `/th/contact`, `/th` — ทั้งหมด render ถูกต้อง; ตัวเลข seasonal บน `/th/packages/5kw` ตรง PDF เป๊ะ (~20 / 16-17 / 12-14 / 15-17); `/th/about` แสดงตัวเลขจริงจาก DB (ไม่ใช่ `—` placeholder อีกต่อไป)
- `npx tsx scripts/e2e-booking.mts`, `npx tsx scripts/e2e-admin-crud.mts` — ผ่านทั้งหมด ไม่มี regression

## Sprint 8 — สคริปต์ Backup

**สถานะ:** เสร็จสมบูรณ์ (2026-07-29)

- `scripts/backup-db.mts` (ใหม่): copy SQLite file + storage/private ไปยัง timestamped snapshot, พร้อม instruction สำหรับผูก cron ตอน deploy จริง

### Sprint 8 — ผลลัพธ์ (2026-07-29)

- `scripts/backup-db.mts` (ใหม่) — resolve `DATABASE_URL`/`STORAGE_ROOT` จาก env (fallback ตาม `.env.example`), copy ไฟล์ SQLite + `${STORAGE_ROOT}/private` ทั้งโฟลเดอร์ (ข้าม `public` เพราะ reproducible จาก seed) ไปยัง `backups/<ISO-timestamp>/`, handle error กรณี SQLite ไม่มี (hard fail) และ `storage/private` ไม่มี (warn แล้วทำ DB-only backup ต่อ), retention แบบ opt-in ผ่าน `BACKUP_RETENTION_DAYS` (ไม่ตั้งค่า = ไม่ลบอะไรอัตโนมัติ), comment หัวไฟล์อธิบายวิธีผูก cron จริงบน production (`0 3 * * * cd /path/to/app && npx tsx scripts/backup-db.mts >> /var/log/kkd-backup.log 2>&1`)
- `.gitignore` — เพิ่ม `/backups/`
- ทดสอบรันจริงกับ `prisma/dev.db` + `storage/private` จริง — snapshot สร้างสำเร็จ ครบทั้ง DB (644.0 KB) และ private storage (23 slip folders ตรงกับต้นฉบับเป๊ะ)
- **ไม่ผูก cron จริง** ตามที่ยืนยันไว้ในแผนเดิม — เป็น manual step ของผู้ใช้บน production host จริง (แยกจาก session นี้)

**Verification (ผ่านทั้งหมด):** `npx tsc --noEmit` clean, `npm run build` ผ่าน — ไม่ต้องรัน e2e scripts เพราะเป็นสคริปต์ ops แบบ standalone ไม่แตะ `src/`/schema/runtime app

## Sprint 9 — Verification รอบสุดท้าย

**สถานะ:** เสร็จสมบูรณ์ (2026-07-29)

- **เช็คก่อนอื่น**: เทียบ `BookingStatus` enum (ปัจจุบัน 7 ค่าในโค้ด) กับ `docs/stuffs/KKD_เอกสารความต้องการเว็บไซต์_V1.2.pdf` ว่า spec ต้องการ 8 ค่าจริงหรือไม่ และค่าที่ขาดคืออะไร (ดู note ที่ท้าย Sprint 3 ด้านบน) — ตัดสินใจว่าต้อง migrate schema เพิ่มหรือแก้เอกสารแผนให้ตรงของจริง
- `i18n-parity-checker` — TH/EN parity หลังเพิ่มฟิลด์/หน้าใหม่จำนวนมาก
- `audit-compliance-reviewer` — ตรวจ role scoping ใหม่ทั้งหมด (จุดเสี่ยงสูงสุดของ sprint นี้คือ data leak ข้าม role)
- E2E: ขยาย `scripts/e2e-admin-crud.mts` ให้ครอบคลุม booking module ใหม่, เพิ่ม script ทดสอบ channel-tracking (`?ref=` → cookie → lead attribution)
- `design-business-reviewer` — real render ของหน้าใหม่ (reports, bookings, PromptPay QR)

### Sprint 9 — ผลลัพธ์ (2026-07-29)

**1. BookingStatus enum — เช็คแล้ว, ไม่ต้อง migrate schema:** เปิด `docs/stuffs/KKD_เอกสารความต้องการเว็บไซต์_V1.2.pdf` ด้วย `pdftotext -layout` (หัวข้อ "การเปลี่ยนสถานะการนัด") พบว่า spec ระบุ **7 สถานะพอดี** ตรงกับ enum ปัจจุบันในโค้ด (`PENDING_CONFIRMATION, CONFIRMED, PREPARED, SURVEYED, DESIGNED, SIGNED, CANCELLED`) 1:1 — **สรุป: ตัวเลข "8 ค่า" ในแผน Sprint 0/note ท้าย Sprint 3 เป็นการพิมพ์ผิด/สับสนกับ `LeadStatus`** (ซึ่งมี 8 ค่าจริง) ไม่ใช่บั๊ก ไม่มีการแก้ schema ในรอบนี้ — ถือว่าปิด open question นี้แล้ว

**2. E2E coverage ขยายเพิ่ม:**
- `scripts/e2e-admin-crud.mts` — เพิ่มเช็ค booking status-filter dropdown + รูปแบบ `bookingNumber` (`KKD-YYYYMMDD-NNN`)
- `scripts/e2e-channel-tracking.mts` (ใหม่) — ทดสอบ `?ref=` → cookie → lead attribution ครบ 6 เคส (executive-code attribution, channel-only attribution, no-ref fallback, unknown-ref handling, 30-day cookie stickiness)

**3. Reviewer chain:**
- `i18n-parity-checker` — **PASS** (357 key เท่ากันทั้งสอง locale, DB paired columns ครบ, ไม่มี orphaned key reference)
- `audit-compliance-reviewer` — **PASS, ไม่พบ violation** ตรวจครบ 13 action files: ทุก mutation เรียก `requireAdmin()`/`requireRole()` ก่อนเสมอ, `withAudit()` wrap ครบ, ไม่มี secret รั่วเข้า audit snapshot, storage discipline ถูกต้อง, role-scoping (SALES/FINANCE/CHANNEL_EXECUTIVE) fail-closed ทุกจุด (จุดเดียวที่เจอ: comment ค้างที่ `src/app/files/[...key]/route.ts:6` ไม่ตรงกับโค้ดจริงแล้ว — cosmetic ไม่กระทบความปลอดภัย)
- `design-business-reviewer` (รอบแรก, source-only เพราะ screenshot เดิม stale ก่อน Sprint 3/6) — พบ **บั๊ก severity สูง 5 จุด**: PromptPay QR ไม่ฝังจำนวนเงิน 199 บาท, ข้อความไทย hardcode บนหน้า `/en/booking`, QR เล็กเกินไป (112px), `/admin/bookings` ไม่มีคอลัมน์/filter สถานะการชำระเงิน, ตาราง reports คอลัมน์ "อัตราปิดการขาย" หลุดจอที่ 1440px — ผู้ใช้ยืนยันให้แก้ทั้งหมดก่อนปิด sprint

**4. แก้บั๊ก 5 จุด (nextjs-dev):**
- `src/lib/promptpay.ts` — `generatePromptPayQrDataUrl()` รับ `amount` parameter, `src/app/[locale]/booking/page.tsx` เรียกด้วย `amount: 199`
- `src/app/[locale]/booking/booking-forms.tsx` + `src/messages/{th,en}.json` — เพิ่ม key `bankAccountNoLabel`/`bankAccountNameLabel`/`downloadQrLabel` แทน string literal ไทย hardcode
- QR ขยายจาก `size-28` (112px) → `size-40 sm:size-48` (192px ที่ desktop) พร้อมเพิ่มปุ่มดาวน์โหลด QR
- `src/app/admin/(dashboard)/bookings/bookings-client.tsx` + `use-bookings.ts` + `src/app/api/admin/bookings/route.ts` — เพิ่มคอลัมน์ + filter dropdown "สถานะการชำระเงิน"
- `src/app/admin/(dashboard)/reports/reports-client.tsx` — การ์ด breakdown เปลี่ยนเป็นเต็มความกว้าง แก้ปัญหา scroll แนวนอนที่ 1440px

**5. ขยาย screenshot script + ถ่ายภาพใหม่:** `scripts/screenshot-pages.mts` เพิ่ม login flow (มิเรอร์ `e2e-admin.mts`) + shot หน้า `/admin/reports`, `/admin/bookings` (list+detail), `/admin/settings`, `/th/booking?tab=survey`, `/en/booking?tab=survey` — ถ่ายที่ 1440×900 พร้อมข้อมูลจริงจาก DB (ไม่ใช่ empty state)

**6. Real-render re-review (design-business-reviewer รอบ 2):** **PASS ทั้ง 5/5 finding เดิม** ยืนยันจาก screenshot จริง — พบ regression ใหม่เล็กน้อย 2 จุด (medium): badge สถานะชำระเงินแยก "รอตรวจสลิป"/"สลิปไม่ผ่าน" ไม่ออกด้วยสี (ทั้งคู่เป็น `destructive`), label สถานะชำระเงินไม่ตรงกัน 3 จุด (list/booking-detail/lead-detail คนละคำ) + 1 จุด (low): การ์ด "สถานะนัดสำรวจ" ในหน้า reports ค้างครึ่งจอ

**7. แก้ regression 3 จุด (nextjs-dev):**
- `src/lib/payment-status-labels.ts` (ใหม่) — รวม label + badge variant เป็นจุดเดียว (`PENDING_REVIEW` → outline / `VERIFIED` → default / `REJECTED` → destructive) ใช้ร่วมกันทั้ง `bookings-client.tsx`, `booking-detail-client.tsx`, `lead-detail-client.tsx` แทนที่ label map แยก 3 ชุดเดิม
- `reports-client.tsx` — grid เปลี่ยนเป็น `grid-cols-1` ทุกการ์ดเต็มความกว้างเสมอ ลบ `lg:col-span-2` ที่ไม่จำเป็นออก

**Deviation จากแผนเดิมที่ต้อง flag:** ไม่มี — ทุกอย่างอยู่ในสโคปที่ผู้ใช้ยืนยันแล้วระหว่างทาง (แก้บั๊ก severity สูง 5 จุด + regression ที่เกิดจากการแก้เอง)

**Known low-priority gap ที่ยังไม่แก้ (นอกสโคปรอบนี้ตามที่ผู้ใช้ตัดสินใจ):** badge สถานะ booking (7 ค่า, 6 ใน 7 สีเดียวกัน), container style drift ระหว่าง reports กับหน้า admin อื่น, ปุ่ม "กำหนดเอง" ใน reports เป็น dead control เมื่อ disabled, ปุ่ม "Export Excel" เป็นภาษาอังกฤษกลางหน้าไทยล้วน, คอลัมน์ตาราง breakdown ไม่เท่ากันระหว่างช่องทาง/ผู้ดำเนินการ/เซลส์, ประโยค EN ของข้อมูลบัญชีธนาคารไม่มีตัวคั่นระหว่าง field

**Verification (ผ่านทั้งหมด, รวมทุกรอบแก้):**
- `npx tsc --noEmit` — clean ทุกรอบ
- `npm run build` — `✓ Compiled successfully` + `Finished TypeScript` ทุกรอบ, exit 0
- i18n key-parity — PASS (357 key คงเดิมทั้งสอง locale หลังเพิ่ม key ใหม่)
- `npx tsx scripts/e2e-booking.mts`, `e2e-channel-tracking.mts`, `e2e-admin.mts`, `e2e-admin-crud.mts` (52 เช็ค), `e2e-rbac-sprint2.mts` — ผ่านทั้งหมด ไม่มี regression
- `audit-compliance-reviewer` — PASS (clean)
- `design-business-reviewer` — PASS ทั้งรอบ source-review (นำไปสู่การแก้บั๊ก) และรอบ real-render re-review (ยืนยัน 5/5 fix ถูกต้อง + regression ที่ตามมาได้รับการแก้แล้ว)

## Verification (ทุก sprint)

- `npm run build && npm run start` ต้องผ่านก่อนถือว่า sprint เสร็จ
- `npx prisma migrate dev` หลังแก้ schema
- รัน e2e scripts ที่เกี่ยวข้องกับ sprint นั้นๆ ก่อนขึ้น sprint ถัดไป
- Sprint 2 (RBAC) และ Sprint 9 ต้องผ่าน `audit-compliance-reviewer` ก่อนถือว่าเสร็จ เพราะเป็นจุดเสี่ยง data leak สูงสุด
