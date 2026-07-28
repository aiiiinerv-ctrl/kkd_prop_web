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

## Sprint 4 — อัปเดตโมดูล Lead Management

- `src/app/admin/leads/`: UI status flow 8 ค่า, มอบหมายเซลส์ (dropdown เลือกจาก AdminUser role=SALES), แสดง `lastFollowUpAt`
- `src/actions/leads.ts`: อัปเดต `lastFollowUpAt` เฉพาะตอนเซลส์บันทึกการติดตาม ไม่ใช่ทุก update ทั่วไป

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

- `i18n-parity-checker` — TH/EN parity หลังเพิ่มฟิลด์/หน้าใหม่จำนวนมาก
- `audit-compliance-reviewer` — ตรวจ role scoping ใหม่ทั้งหมด (จุดเสี่ยงสูงสุดของ sprint นี้คือ data leak ข้าม role)
- E2E: ขยาย `scripts/e2e-admin-crud.mts` ให้ครอบคลุม booking module ใหม่, เพิ่ม script ทดสอบ channel-tracking (`?ref=` → cookie → lead attribution)
- `design-business-reviewer` — real render ของหน้าใหม่ (reports, bookings, PromptPay QR)

## Verification (ทุก sprint)

- `npm run build && npm run start` ต้องผ่านก่อนถือว่า sprint เสร็จ
- `npx prisma migrate dev` หลังแก้ schema
- รัน e2e scripts ที่เกี่ยวข้องกับ sprint นั้นๆ ก่อนขึ้น sprint ถัดไป
- Sprint 2 (RBAC) และ Sprint 9 ต้องผ่าน `audit-compliance-reviewer` ก่อนถือว่าเสร็จ เพราะเป็นจุดเสี่ยง data leak สูงสุด
