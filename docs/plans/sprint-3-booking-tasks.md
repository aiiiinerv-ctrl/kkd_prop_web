# Sprint 3 — แยกโมดูล Booking Management: Task Breakdown

อ้างอิงจาก `docs/plans/kkd-spec-remediation.md` บรรทัด 69-74 (scope) และ 41-67 (context Sprint 0-2 ที่ทำเสร็จแล้ว: `Role` 4 ค่า, `BookingStatus` 8 ค่า, `SurveyBooking.bookingNumber`/`giftSent`/`assignedEngineerId`/`assignedSalesId`, `BookingCapacitySetting`, `getBookingScopeFilter()`/`canMutateBooking()` ใน `src/lib/auth/index.ts` มีอยู่แล้วจาก Sprint 2)

## สิ่งที่มีอยู่แล้ว (ไม่ต้องสร้างใหม่)

- Schema เต็มรูปแบบสำหรับ booking (Sprint 0) — **ห้ามแก้ schema ในสปรินต์นี้เว้นแต่พบ gap จริง**
- `getBookingScopeFilter()` และ `canMutateBooking()` ใน `src/lib/auth/index.ts` (Sprint 2) — ใช้ตรงนี้ ไม่ต้องเขียน scoping logic ใหม่
- `nextBookingNumber()` ใน `src/actions/submit-survey-booking.ts` (บรรทัด 16-26) มี comment `TODO(sprint 3): move to a shared bookings helper` — **ต้องย้ายออกมาเป็น shared helper** ใน sprint นี้ ไม่ใช่ copy-paste ซ้ำ
- `updatePaymentStatus()` ใน `src/actions/leads.ts` (บรรทัด 125-161) จัดการ `SurveyBooking.paymentStatus` อยู่แล้ว — ทับซ้อนกับ scope ของ `bookings.ts` ใหม่ ต้องตัดสินใจว่าย้ายมาไว้ใน `bookings.ts` หรือปล่อยไว้ (ดู "จุดต้องระวัง" ด้านล่าง)

## Task List

| # | Task | Priority | Dependency | ขนานได้ไหม | ประมาณเวลา | ผู้รับผิดชอบที่เหมาะ |
|---|------|----------|------------|-------------|-------------|----------------------|
| 1 | สร้าง `src/lib/bookings/booking-number.ts` (หรือ path เทียบเท่า): ย้าย `nextBookingNumber()` ออกจาก `submit-survey-booking.ts` มาเป็น shared helper, แก้ `submit-survey-booking.ts` ให้ import ใช้ของเดิม | สูง | ไม่มี | ✅ | 0.5 วัน | nextjs-dev |
| 2 | สร้าง `src/lib/bookings/capacity.ts`: ฟังก์ชัน `isDateFull(date, timeSlot)` อ่าน `BookingCapacitySetting` (แถวเดียว/global setting) + นับ `SurveyBooking` ที่มี `preferredDate`+`timeSlot` ตรงกัน เทียบกับ `maxPerDay`/`maxPerSlot` | สูง | ไม่มี | ✅ | 0.5 วัน | nextjs-dev |
| 3 | สร้าง `src/actions/bookings.ts`: `updateBookingStatus`, `updateGiftSent`, `assignBookingEngineer`, `assignBookingSales` — ทุกตัวผ่าน `withAudit()` + `requireRole("ADMIN","SALES")` + `canMutateBooking()` ตาม pattern ใน `src/actions/leads.ts` | สูง | Task 2 (ใช้ capacity ตอนเปลี่ยนวันนัดถ้ามี), ไม่ต้องรอ Task 1 | ⏳ (รอ pattern คอนเฟิร์มจาก Task 1 เพื่อความสอดคล้อง แต่ทำขนานได้จริงถ้าตกลง pattern ล่วงหน้า) | 1 วัน | nextjs-dev |
| 4 | **ตัดสินใจ**: ย้าย `updatePaymentStatus()` จาก `leads.ts` ไป `bookings.ts` หรือคงไว้ที่เดิม (payment status ผูกกับ booking โดยตรง ไม่ใช่ lead) — แนะนำย้ายเพื่อความสอดคล้องกับ "mutation แยกจาก leads actions" ตาม scope Sprint 3 | สูง | ไม่มี (ตัดสินใจก่อน implement Task 3 เพื่อไม่ต้องแก้ซ้ำ) | ✅ | 0.25 วัน (ตัดสินใจ) | ผู้ใช้ยืนยัน แล้ว nextjs-dev ทำตาม |
| 5 | สร้าง API `src/app/api/bookings/availability/route.ts` (public, ไม่ต้อง auth): รับ `date` query param คืนค่าว่าเต็มหรือไม่ต่อ time slot โดยเรียก `isDateFull()` จาก Task 2 | สูง | Task 2 | ✅ (ขนานกับ Task 3) | 0.5 วัน | nextjs-dev |
| 6 | สร้าง `src/app/admin/settings/` (หน้าใหม่, `requireRole("ADMIN")`): ฟอร์มแก้ `BookingCapacitySetting.maxPerDay`/`maxPerSlot`, mutation ผ่าน `withAudit()` | กลาง | ไม่มี (ใช้ schema ที่มีอยู่แล้ว) | ✅ | 1 วัน | nextjs-dev |
| 7 | สร้าง `src/app/admin/bookings/page.tsx` + `[id]/page.tsx`: ตาราง booking พร้อม filter สถานะ 8 ค่า, แสดง `bookingNumber`, checkbox "ส่งของขวัญแล้ว" (`giftSent`), dropdown มอบหมายวิศวกร/เซลส์ (จาก `AdminUser` role SALES สำหรับ sales, ต้องเช็คว่ามี role/field แยกสำหรับวิศวกรหรือใช้ SALES เดียวกัน — ดู "คำถามที่ต้องเคลียร์") — ใช้ `getBookingScopeFilter()` กรองตาม role ผู้ล็อกอิน | สูง | Task 3 (ต้องมี action ก่อนถึงจะ wire UI) | ⏳ | 1.5 วัน | nextjs-dev |
| 8 | เพิ่มลิงก์เมนู "การจองสำรวจ" (bookings) แยกจาก "ลูกค้าเป้าหมาย" (leads) ใน admin nav/sidebar | กลาง | Task 7 | ⏳ | 0.25 วัน | nextjs-dev |
| 9 | แก้ `src/app/[locale]/booking/booking-forms.tsx`: date picker (`type="date"` ปัจจุบัน บรรทัด 361-366) เรียก API จาก Task 5 เมื่อเลือกวันที่ — ถ้าเต็มให้ disable/แจ้งเตือนและบังคับเลือกวันอื่น, ต้องมีข้อความ TH/EN ใหม่ (เช่น "วันที่นี้เต็มแล้ว กรุณาเลือกวันอื่น") ใน `src/messages/th.json`+`en.json` namespace `booking` | สูง | Task 5 | ⏳ | 1 วัน | nextjs-dev |
| 10 | ตรวจ TH/EN parity ของทุกข้อความใหม่ (หน้า bookings, settings, ข้อความเตือนวันเต็มในฟอร์มสาธารณะ) | สูง | Task 6, 7, 9 เสร็จ | ⏳ | 0.25 วัน | i18n-parity-checker |
| 11 | ขยาย `scripts/e2e-admin-crud.mts` ให้ครอบคลุม booking module: เปลี่ยนสถานะ booking, toggle giftSent, มอบหมาย engineer/sales, ตั้งค่า capacity | สูง | Task 3, 6, 7 | ⏳ | 0.75 วัน | nextjs-dev |
| 12 | รัน `npm run build && npm run start` + `npx tsx scripts/e2e-admin-crud.mts` (รวม e2e ใหม่จาก Task 11) เพื่อปิด sprint | สูง | ทุก task ก่อนหน้า | ⏳ | 0.25 วัน | nextjs-dev (หรือ deploy-verify ถ้าต้องการ second check) |

ลำดับ critical path: 1/2 → 3(+4) → 5 → 6,7 (ขนานกัน) → 8,9 → 10 → 11 → 12

## คำถามที่ต้องเคลียร์ก่อนเริ่ม (ผลกระทบต่อ Task 7)

1. "มอบหมายวิศวกร" ใช้ `AdminUser` role อะไร — ระบบมีแค่ 4 roles (`ADMIN/SALES/FINANCE/CHANNEL_EXECUTIVE`) ไม่มี role "วิศวกร" แยก ดังนั้น `assignedEngineerId` ต้องเลือกจาก AdminUser role อะไร (เช่น SALES เดียวกันแต่คนละคนจาก assignedSalesId, หรือ ADMIN ก็เลือกได้) — เอกสาร spec ไม่ได้ระบุ role วิศวกรแยกใน RBAC ต้องยืนยันว่า "วิศวกร" ในที่นี้คือ subset ของ SALES/ADMIN หรือแค่ label ในตาราง ไม่ผูก role restriction เพิ่ม
2. `updatePaymentStatus` ย้ายจาก `leads.ts` → `bookings.ts` หรือคงเดิม (Task 4)

**ถ้าไม่ตอบ:** ใช้ default สมเหตุสมผล — ข้อ 1: ให้ dropdown "วิศวกร" ดึงจาก AdminUser ทุก role ที่ isActive=true (ไม่จำกัด role) เพราะ schema ไม่ผูก role restriction ไว้; ข้อ 2: ย้ายมาไว้ที่ `bookings.ts` ตาม scope ของ sprint ("mutation แยกจาก leads actions") แล้วเดินหน้าทันทีตามหลัก decisive execution

## ความเสี่ยง / จุดต้องระวัง

| ความเสี่ยง | ผลกระทบ | Mitigation |
|---|---|---|
| Duplicate `nextBookingNumber()` logic ถ้าไม่ทำ Task 1 ก่อน — public form กับ admin (ถ้ามีการสร้าง booking จาก admin ในอนาคต) จะ generate เลขไม่ตรงกัน | กลาง | บังคับ Task 1 เป็น dependency ของ Task 3/7 ก่อนเขียน action ใหม่ใดๆ ที่แตะ `bookingNumber` |
| ชนกับ field/scope ที่ Sprint 0-2 สร้างไว้แล้ว (schema, `getBookingScopeFilter`, `canMutateBooking`) ถ้า nextjs-dev ไม่ได้ตรวจก่อนเขียนโค้ดใหม่ซ้ำ | สูง | ระบุชัดในสรุป "สิ่งที่มีอยู่แล้ว" ด้านบน — ห้ามเขียน scoping logic ใหม่ ให้ import ของเดิม |
| TH/EN parity หลุดเพราะหน้า UI ใหม่ทั้งหมด (bookings list/detail, settings, ข้อความวันเต็ม) มีข้อความเยอะ | สูง | บังคับรัน `i18n-parity-checker` (Task 10) หลังทำ UI เสร็จทุกหน้า ก่อนเข้า e2e |
| Capacity check API เป็น public endpoint (ไม่ auth) — ถ้า query ไม่ระวังอาจรั่วข้อมูลจำนวนนัดจริง/pattern ธุรกิจ | ต่ำ-กลาง | คืนแค่ boolean เต็ม/ไม่เต็มต่อวัน+slot ไม่คืนตัวเลขจำนวนที่นั่งจริงหรือรายชื่อลูกค้า |
| Race condition: สองคนจองพร้อมกันในวัน/ช่วงเวลาเดียวกันจนเกิน capacity เพราะ check-then-create ไม่ atomic | ต่ำ (ปริมาณ booking ต่ำ, SQLite single-writer) | ยอมรับความเสี่ยงในสปรินต์นี้ (SQLite serializes writes อยู่แล้วในระดับหนึ่ง) ไม่ block sprint แต่บันทึกเป็น known limitation |
| `updateGiftSent`/`assignBookingEngineer` ให้ SALES role มีสิทธิ์ทำได้กับ booking ของตัวเองเท่านั้นตาม `canMutateBooking()` — ต้องเช็คว่า UI ไม่โชว์ปุ่มมอบหมายให้ role ที่ไม่มีสิทธิ์ (แต่ server-side ต้อง enforce เสมอ ไม่พึ่ง UI hide) | กลาง | ทุก action เช็ค `canMutateBooking()` ที่ server เหมือน pattern `leads.ts` เป๊ะ ไม่ trust client |
| Sprint 3 ไม่ได้บังคับผ่าน `audit-compliance-reviewer` ตามแผน (มีแค่ Sprint 2/9) แต่ทุก mutation ยังต้องมี `withAudit`+`requireRole` | ต่ำ | nextjs-dev self-check ตาม pattern ที่มีอยู่แล้วใน `leads.ts`/`channels.ts`; ปล่อยให้ audit เต็มรูปแบบไปทำใน Sprint 9 ตามแผนเดิม |

## Verification ก่อนปิด Sprint 3

1. `npx prisma migrate dev` — ควรไม่มี pending migration ใหม่ (schema ไม่แก้ในสปรินต์นี้ตามที่ระบุ) ถ้ามีการแก้ schema เพิ่ม ต้อง flag ให้ user ทราบว่าทำไมเกินขอบเขตเดิม
2. `npm run build && npm run start` ผ่าน
3. `npx tsx scripts/e2e-admin-crud.mts` ผ่าน (รวม coverage ใหม่จาก Task 11)
4. `i18n-parity-checker` ผ่าน (ไม่มี key ขาดคู่ TH/EN)
