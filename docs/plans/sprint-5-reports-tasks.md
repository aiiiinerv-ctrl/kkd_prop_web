# Sprint 5 — แดชบอร์ด/รายงาน + Export Excel: Task Breakdown

อ้างอิงจาก `docs/plans/kkd-spec-remediation.md` บรรทัด 144-147 (scope) และ Sprint 3/4 — ผลลัพธ์ (pattern `withAudit()`/`requireRole()`/scope filter ที่ Sprint 5 นำมาใช้ซ้ำทั้งหมด ไม่สร้างใหม่)

## สิ่งที่มีอยู่แล้ว (ไม่ต้องสร้างใหม่)

- `requireRole("ADMIN", "FINANCE")` ใน `src/lib/auth/index.ts` — ใช้ gate หน้า/API รายงานได้ตรงตาม scope Sprint 5 ("ADMIN+FINANCE เข้าถึงได้") ไม่ต้องเขียน role check ใหม่
- `getLeadScopeFilter()` และ `getBookingScopeFilter()` **คืนค่า `{}` (unrestricted) ให้ทั้ง ADMIN และ FINANCE อยู่แล้ว** (ดู `src/lib/auth/index.ts` บรรทัด 70-72, 99-101) — เพราะ Reports เปิดให้แค่สอง role นี้ และทั้งคู่ไม่ถูกจำกัด scope เลย จึง **ไม่ต้องสร้าง `getReportScopeFilter()` ใหม่** เรียก `getLeadScopeFilter()`/`getBookingScopeFilter()` ตรงๆ ได้เลย (จะได้ `{}` เสมอในบริบทนี้) เพื่อความสม่ำเสมอกับ pattern เดิม
- `SurveyBooking.amountThb` (Int, `@default(199)`, ดู `prisma/schema.prisma` บรรทัด 162) — **นี่คือฟิลด์ "199" ที่ scope ระบุอยู่แล้ว ไม่ใช่ตัวเลขที่ต้อง hardcode ใหม่** ทุกจุดที่มี "199" ในโค้ด (`th.json`: `common.bookSurvey`, `booking.tabSurveyTitle`, `booking.fieldSlip`, `booking.submitSurvey` ฯลฯ) สอดคล้องกับ default ของฟิลด์นี้ — ดู "คำถามที่ต้องเคลียร์" ข้อ 1 เรื่องการคำนวณรายได้จากฟิลด์นี้แทนการคูณค่าคงที่ตรงๆ
- `SurveyBooking.status` (7 ค่า, ไม่ใช่ 8 — เบี่ยงที่ flag ไว้แล้วใน Sprint 3), `SurveyBooking.giftSent` (Boolean), `Lead.status` (8 ค่า), `Lead.type` (`QUOTE`/`SURVEY`), `Lead.assignedSales`, `PromoChannel`/`ChannelExecutive` — ครบใน schema แล้ว **ไม่ต้องแก้ schema/migration ใน sprint นี้**
- Pattern filter+scope ใน `src/app/api/admin/leads/route.ts` และ `src/app/api/admin/bookings/route.ts` (AND ระหว่าง scope filter กับ query param filter, `include` แบบ select เฉพาะ field ที่ต้องโชว์) — ใช้เป็นต้นแบบเขียน aggregation query ของหน้า reports
- `src/app/admin/(dashboard)/admin-sidebar.tsx` — pattern เพิ่มเมนูใหม่พร้อม `roles` array (ดู item "การจองสำรวจ"/"ตั้งค่าระบบ" เป็นตัวอย่าง) — เพิ่มเมนู "รายงาน" ตาม pattern เดียวกัน

## สิ่งที่ยังไม่มี (ต้องเพิ่ม)

- ไม่มี `exceljs` หรือเทียบเท่าใน `package.json` ปัจจุบัน — ต้องเพิ่ม dependency ใหม่
- ไม่มี field ใดใน schema แทน "ระบบ (ที่ลูกค้าสนใจ)" เลย — `Lead` ไม่มีคอลัมน์ระบบที่สนใจ (On-Grid/Hybrid/Off-Grid ฯลฯ) จะถูกเพิ่มใน **Sprint 6** ("เพิ่ม multi-select 'ระบบที่สนใจ' ในฟอร์ม quote" — ดูบรรทัด 151 ของแผนหลัก) ดู "คำถามที่ต้องเคลียร์" ข้อ 2
- ไม่มี route/UI สำหรับ dashboard/report ใดๆ เลยตอนนี้ — ทุกไฟล์ใน Task List ด้านล่างเป็นไฟล์ใหม่ทั้งหมด

## Task List

| # | Task | Priority | Dependency | ขนานได้ไหม | ประมาณเวลา | ผู้รับผิดชอบที่เหมาะ |
|---|------|----------|------------|-------------|-------------|----------------------|
| 1 | **ตัดสินใจ**: นิยาม "นัดยืนยันแล้ว" สำหรับคำนวณรายได้ — `BookingStatus` มี 7 ค่า (`PENDING_CONFIRMATION, CONFIRMED, PREPARED, SURVEYED, DESIGNED, SIGNED, CANCELLED`) นับสถานะไหนบ้างว่า "ยืนยันแล้ว" และคำนวณด้วย `SUM(amountThb)` (ตรงกับ field จริง, future-proof ถ้าค่าธรรมเนียมเปลี่ยน) หรือ `COUNT × 199` (ตรงกับ wording ในแผนเป๊ะแต่ hardcode ค่าคงที่ซ้ำกับ field ที่มีอยู่แล้ว) | สูง | ไม่มี | ✅ | 0.25 วัน (ตัดสินใจ) | ผู้ใช้ยืนยัน แล้ว nextjs-dev ทำตาม |
| 2 | **ตัดสินใจ**: คอลัมน์ export "ระบบ" — schema ยังไม่มีฟิลด์นี้ (จะมาใน Sprint 6) จะ (a) ข้ามคอลัมน์นี้ไปก่อนใน Sprint 5 แล้วเพิ่มทีหลัง หรือ (b) ใส่คอลัมน์เปล่า/`-` ไว้ก่อนเพื่อให้ field header ครบตาม spec ทันที รอ backfill data ทีหลัง | สูง | ไม่มี | ✅ | 0.25 วัน (ตัดสินใจ) | ผู้ใช้ยืนยัน แล้ว nextjs-dev ทำตาม |
| 3 | **ตัดสินใจ**: ขอบเขต export — ครอบคลุม Lead ทั้ง `QUOTE`+`SURVEY` (LEFT JOIN `SurveyBooking`, field ที่ผูกกับ booking เช่น "เข้าสำรวจแล้วหรือไม่"/"ส่งของขวัญแล้วหรือไม่"/"ที่อยู่" ว่างสำหรับ lead ประเภท `QUOTE` ที่ไม่มี booking) หรือเฉพาะ lead ที่มี booking เท่านั้น | สูง | ไม่มี | ✅ | 0.25 วัน (ตัดสินใจ) | ผู้ใช้ยืนยัน แล้ว nextjs-dev ทำตาม |
| 4 | เพิ่ม `exceljs` ใน `dependencies` ของ `package.json`, ติดตั้ง | สูง | ไม่มี | ✅ | 0.1 วัน | nextjs-dev |
| 5 | สร้าง `src/lib/reports/aggregate.ts`: ฟังก์ชัน query breakdown ตามช่องทาง (`PromoChannel`)/ผู้ดำเนินการ (`ChannelExecutive`)/เซลส์ (`AdminUser` role SALES)/ช่วงเวลา (`createdAt`/`preferredDate` range) รวมนับจำนวน lead/booking ต่อ status และคำนวณรายได้ตามผลตัดสินใจ Task 1 — คืนค่าเป็น shape เดียวที่ทั้งหน้า dashboard และ export ใช้ร่วมกัน ไม่ query ซ้ำสองที่ | สูง | Task 1 | ✅ | 1 วัน | nextjs-dev |
| 6 | สร้าง `src/lib/reports/export-rows.ts`: ฟังก์ชัน query row-level data สำหรับ export ตาม field list เต็ม (ชื่อ/เบอร์/ที่อยู่/ระบบ/ประเภทlead/ช่องทาง/ผู้ดำเนินการ/เซลส์/สถานะ/วันที่/เข้าสำรวจแล้วหรือไม่/ส่งของขวัญแล้วหรือไม่) ตามผลตัดสินใจ Task 2, 3 — แยกจาก Task 5 เพราะเป็น row-level ไม่ใช่ aggregate | สูง | Task 2, 3 | ✅ (ขนานกับ Task 5 ได้ — คนละไฟล์) | 1 วัน | nextjs-dev |
| 7 | สร้าง `src/app/api/admin/reports/summary/route.ts`: GET รับ query param ช่วงวันที่/channelId/executiveId/salesId, `requireRole("ADMIN","FINANCE")`, เรียก `aggregate.ts` จาก Task 5, คืน JSON breakdown + ยอดรายได้รวม | สูง | Task 5 | ⏳ | 0.5 วัน | nextjs-dev |
| 8 | สร้าง `src/app/api/admin/reports/export/route.ts`: GET รับ query param filter เดียวกับ Task 7, `requireRole("ADMIN","FINANCE")`, เรียก `export-rows.ts` จาก Task 6, สร้างไฟล์ `.xlsx` ด้วย `exceljs` แบบ stream response (`Content-Disposition: attachment`), field header ภาษาไทยตรงตาม spec | สูง | Task 4, 6 | ⏳ (ขนานกับ Task 7 ได้ — คนละไฟล์ คนละ helper) | 0.75 วัน | nextjs-dev |
| 9 | สร้าง `src/app/admin/(dashboard)/reports/page.tsx` (server component, `requireRole("ADMIN","FINANCE")`) + client component: ฟิลเตอร์ (ช่วงวันที่/ช่องทาง/ผู้ดำเนินการ/เซลส์), ตาราง/การ์ดสรุป breakdown, ยอดรายได้รวม, ปุ่ม "Export Excel" เรียก Task 8 | สูง | Task 7 | ⏳ | 1.5 วัน | nextjs-dev |
| 10 | เพิ่มเมนู "รายงาน" ใน `admin-sidebar.tsx` (`roles: ["ADMIN", "FINANCE"]`, มิเรอร์ pattern item อื่นเป๊ะ) | กลาง | Task 9 | ⏳ | 0.1 วัน | nextjs-dev |
| 11 | ขยาย `scripts/e2e-admin-crud.mts` (หรือสร้าง `scripts/e2e-reports.mts` ใหม่ถ้าแยกโมดูลชัดเจนกว่า): ADMIN/FINANCE เข้าหน้า `/admin/reports` ได้ (200), SALES/CHANNEL_EXECUTIVE ถูกเด้งออก (`requireRole` reject), เรียก export API ได้ไฟล์ `.xlsx` ที่ parse ได้จริงและมี field header/จำนวนแถวตรงกับข้อมูลใน DB, ยอดรายได้ตรงกับผลตัดสินใจ Task 1 | สูง | Task 8, 9, 10 | ⏳ | 1 วัน | nextjs-dev |
| 12 | รัน `npm run build && npm run start` + e2e จาก Task 11 + `npx tsx scripts/e2e-rbac-sprint2.mts` (ยืนยัน RBAC เดิมไม่พัง) เพื่อปิด sprint | สูง | ทุก task ก่อนหน้า | ⏳ | 0.25 วัน | nextjs-dev (หรือ `deploy-verify` ถ้าต้องการ second check) |

ลำดับ critical path: 1,2,3 (ตัดสินใจคู่ขนาน) → 4,5,6 (ขนานกัน) → 7,8 (ขนานกัน) → 9 → 10 → 11 → 12

**หมายเหตุเรื่อง i18n parity:** Reports เป็นหน้า admin-only ภาษาไทยล้วนตาม AGENTS.md (เหมือน Sprint 3/4) ไม่มีข้อความ public-facing ใหม่ จึง **ไม่ต้องรัน `i18n-parity-checker`** เว้นแต่มีการเพิ่มข้อความในฟอร์มสาธารณะ (ไม่มีในสโคป Sprint 5 นี้)

**หมายเหตุเรื่อง reviewer เสริม:** Reports เป็น read-only + export เท่านั้น ไม่มี mutation ใหม่ ความเสี่ยง data-leak หลักคือ "ใครเห็น/export อะไรได้" ซึ่งถูกจำกัดแค่ ADMIN/FINANCE ทั้งคู่ unrestricted scope อยู่แล้วตาม pattern เดิม (ไม่มีการรั่วข้าม role เพิ่มจากที่มีอยู่) จึงยังไม่จำเป็นต้องบังคับผ่าน `audit-compliance-reviewer` รอบนี้ — ปล่อยไปรวมที่ Sprint 9 ตามแผนเดิม เว้นแต่ผู้ใช้ต้องการ quick-check ก่อนหน้านั้น

## คำถามที่ต้องเคลียร์ก่อนเริ่ม

1. (Task 1) รายได้คำนวณจาก `SUM(SurveyBooking.amountThb)` ของ booking ที่ "ยืนยันแล้ว" หรือ `COUNT × 199` แบบ hardcode — และสถานะไหนนับเป็น "ยืนยันแล้ว" (เช่น ทุกสถานะยกเว้น `PENDING_CONFIRMATION`/`CANCELLED`, หรือเฉพาะ `CONFIRMED` เป๊ะๆ)?
2. (Task 2) คอลัมน์ export "ระบบ" ที่ยังไม่มี field ใน schema — ข้ามไปก่อนหรือใส่คอลัมน์เปล่าไว้รอ Sprint 6?
3. (Task 3) Export ครอบคลุม lead ทุกประเภท (`QUOTE`+`SURVEY`) หรือเฉพาะที่มี booking?

**ถ้าไม่ตอบ:** ใช้ default สมเหตุสมผลแล้วเดินหน้าทันที —
- ข้อ 1: **`SUM(amountThb)`** ของ booking ที่สถานะ **ไม่ใช่ `PENDING_CONFIRMATION` และไม่ใช่ `CANCELLED`** (คือ `CONFIRMED, PREPARED, SURVEYED, DESIGNED, SIGNED` ทั้งหมดถือว่า "ยืนยันแล้ว" เพราะผ่านขั้นตอนยืนยันเริ่มต้นไปแล้ว ไม่ใช่แค่สถานะ `CONFIRMED` เดียว) — เลือก `SUM` แทน `COUNT × 199` เพราะ field `amountThb` มีอยู่แล้วในทุก record (ไม่ต้อง derive ค่าคงที่ซ้ำ) แม้ปัจจุบันทุก booking จะมีค่าเท่ากับ 199 พอดี (ไม่มี admin UI แก้ field นี้) ผลลัพธ์ตัวเลขจึงเหมือนกันทั้งสองวิธีในทางปฏิบัติ แต่ `SUM` ถูกต้องเชิงโครงสร้างกว่าและทนต่อการเปลี่ยนแปลงในอนาคต
- ข้อ 2: **(a) ข้ามคอลัมน์นี้ไปก่อน** ใน Sprint 5 (ไม่ใส่ column header เปล่าที่อาจทำให้ finance/ผู้ใช้เข้าใจผิดว่ามีข้อมูลแต่ query คืนค่าว่างเสมอ) — เพิ่มกลับเข้ามาเป็นส่วนหนึ่งของ Sprint 6 เมื่อ field จริงถูกสร้างแล้ว บันทึกเป็น follow-up ชัดเจนในผลลัพธ์ sprint นี้
- ข้อ 3: **รวมทั้ง `QUOTE`+`SURVEY`** (Lead LEFT JOIN SurveyBooking) เพราะ field "ประเภทlead" อยู่ในลิสต์ field ที่ต้อง export อยู่แล้ว ซึ่งมีความหมายก็ต่อเมื่อมีทั้งสองประเภทให้แยกแยะ — field ที่ผูกกับ booking (ที่อยู่/เข้าสำรวจแล้วหรือไม่/ส่งของขวัญแล้วหรือไม่) แสดง `-` สำหรับ lead ประเภท `QUOTE` ที่ไม่มี booking

## ความเสี่ยง / จุดต้องระวัง

| ความเสี่ยง | ผลกระทบ | Mitigation |
|---|---|---|
| Field "ระบบ" ไม่มีใน schema จริง — ถ้าผู้ใช้คาดหวังว่า export ต้องมีข้อมูลนี้ครบตั้งแต่ Sprint 5 (ก่อน Sprint 6 เสร็จ) จะดูเหมือนงานไม่ครบ | สูง | Flag ชัดเจนในผลลัพธ์ sprint นี้ว่าคอลัมน์นี้ตั้งใจเลื่อนไป Sprint 6 ตามที่ scope เดิมระบุไว้แล้วว่า field นี้เพิ่มใน Sprint 6 |
| `amountThb` ไม่มี admin UI ให้แก้ค่าต่อ booking เลย (เห็นแค่ default 199 เสมอ) — ถ้ามีความต้องการจริงที่ต้องปรับราคาต่อรายในอนาคต ระบบยังไม่รองรับ | ต่ำ | นอกสโคป Sprint 5 (ไม่ใช่ gap ของ report เอง แต่ของ booking module) บันทึกเป็น tech debt ไม่ block sprint นี้ |
| PDF ต้นฉบับ (`docs/stuffs/KKD_เอกสารความต้องการเว็บไซต์_V1.2.pdf`) และไฟล์ Excel คำนวณใน `docs/stuffs/` **อ่านไม่ได้ในการวางแผนนี้** (ไม่มี `poppler-utils` สำหรับแปลง PDF และไม่มี tool list ไดเรกทอรีเพื่อยืนยันชื่อไฟล์ Excel ที่แน่ชัด) จึงไม่สามารถ cross-check field list/สูตรรายได้กับเอกสารต้นฉบับได้โดยตรง — อาศัย inference จากโค้ดจริง (`amountThb` field + ข้อความ "199" ที่ปรากฏสม่ำเสมอทั่วระบบ) แทน | กลาง | ก่อนเริ่ม implement จริง แนะนำให้ผู้ใช้เปิด PDF/Excel เองอีกรอบเทียบ field list export กับ Task 6 หนึ่งครั้ง (ใช้เวลาไม่นาน) เพื่อลดความเสี่ยง field ขาด/เกิน |
| Export ข้อมูลจำนวนมาก (ทุก lead ทุกประเภทไม่มี pagination) โหลดทั้งหมดเข้าหน่วยความจำก่อนสร้าง `.xlsx` — ถ้าข้อมูลโตมากในอนาคตอาจช้า/กิน memory | ต่ำ (ปริมาณ lead ปัจจุบันยังน้อย) | ยอมรับความเสี่ยงใน sprint นี้ (ไม่ block) บันทึกเป็น known limitation — ถ้าข้อมูลโตมากในอนาคตค่อย stream แบบ chunk |
| Dashboard breakdown กับ export ต้องให้ตัวเลขตรงกันเป๊ะ (เช่น ยอดรายได้รวมบนหน้าจอ vs ในไฟล์ Excel) ถ้า Task 5/6 ไม่ได้ derive สูตรจากที่เดียวกัน อาจเบี้ยว | กลาง | บังคับให้ Task 5/6 ใช้นิยาม "ยืนยันแล้ว" และสูตรรายได้เดียวกันจาก Task 1 (constant/helper เดียว ไม่ copy สูตรซ้ำสองที่) |
| `exceljs` เพิ่ม dependency ใหม่เข้า bundle — ถ้า import แบบ static ที่ระดับบนของไฟล์ page.tsx อาจทำให้ client bundle บวมโดยไม่จำเป็น | ต่ำ | ใช้ `exceljs` เฉพาะใน route handler (`export/route.ts`, server-only) เท่านั้น ไม่ import จาก client component ใดๆ |

## Verification ก่อนปิด Sprint 5

1. `npx prisma migrate dev` — ไม่ควรมี pending migration ใหม่ (schema ไม่แก้ใน sprint นี้ตามที่ยืนยันแล้วว่าทุก field ที่ต้องใช้มีอยู่แล้ว ยกเว้น "ระบบ" ที่ถูกเลื่อนไป Sprint 6 อย่างตั้งใจ)
2. `npm run build && npm run start` ผ่าน
3. e2e coverage ใหม่จาก Task 11 ผ่าน (ADMIN/FINANCE เข้าถึงได้, SALES/CHANNEL_EXECUTIVE ถูกปฏิเสธ, export ได้ไฟล์ `.xlsx` ที่ parse ได้และตัวเลขตรงกับ DB)
4. `npx tsx scripts/e2e-rbac-sprint2.mts` ผ่าน (ยืนยัน RBAC เดิมไม่พังจากเมนู/route ใหม่)
5. Manual/self-check: ยอดรายได้บนหน้า dashboard กับในไฟล์ export ตรงกันทุกตัวเลข (ดูความเสี่ยงข้อ 4 ด้านบน)
