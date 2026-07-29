# Sprint 5b — แก้ Gap รายงานที่พบจาก PDF spec ต้นฉบับ: Task Breakdown

อ้างอิงจาก `docs/plans/kkd-spec-remediation.md` — ส่วน "## Sprint 5b" (บรรทัด 183-193) และผลลัพธ์ Sprint 5 (`docs/plans/sprint-5-reports-tasks.md`) ที่พบ gap นี้ระหว่างตรวจ PDF cross-check

## ยืนยันจาก PDF ต้นฉบับ (§4.5 "โมดูลรายงานและส่งออกข้อมูล", อ่านตรงด้วย `pdftoppm`/Read tool รอบนี้)

- **Field list export มี 13 คอลัมน์เป๊ะ** ตามลำดับในเอกสาร: `ชื่อลูกค้า, เบอร์โทร, ที่อยู่, ประเภทระบบ, ประเภท Lead (สอบถาม/นัด), ช่องทางที่มา, ผู้ดำเนินการช่องทาง, เซลส์ที่รับผิดชอบ, สถานะปัจจุบัน, วันที่ส่งฟอร์ม, วันที่ปิดการขาย, เข้าสำรวจแล้วหรือไม่, ส่งของขวัญแล้วหรือไม่` — **"วันที่ปิดการขาย" อยู่ระหว่าง "วันที่ส่งฟอร์ม" กับ "เข้าสำรวจแล้วหรือไม่"** ตำแหน่งนี้สำคัญสำหรับ Task 7 ด้านล่าง ("ประเภทระบบ" ยังคงเลื่อนไป Sprint 6 ตามเดิม ไม่ใช่ scope ของ sprint นี้)
- **แดชบอร์ด breakdown**: ตาราง "มิติการวิเคราะห์" ในเอกสารระบุ 3 แถวที่เกี่ยวข้อง — ตามช่องทาง: "จำนวน Lead นัด ปิดการขาย **อัตราปิดการขาย** ของแต่ละช่องทาง" (มีคำว่า "อัตราปิดการขาย" ชัดเจน); ตามผู้ดำเนินการ: "จำนวน Lead นัด ปิดการขาย ของแต่ละผู้ดำเนินการ" (ไม่มีคำว่า "อัตรา" เขียนตรงๆ); ตามเซลส์: "จำนวน Lead ปิดการขาย ของแต่ละเซลส์" (ไม่มี "นัด"/"อัตรา" เขียนตรงๆ) — PDF เขียนไม่สม่ำเสมอ 3 แถว แต่ scope ที่ตกลงไว้แล้วใน `kkd-spec-remediation.md` (ก่อน task file นี้) ระบุชัดว่าจะเพิ่ม % ให้ทั้ง 3 มิติเพื่อความสม่ำเสมอ — **ไม่ re-litigate ข้อนี้** เดินหน้าตามที่ตกลงแล้ว
- **ตามช่วงเวลา**: "เดือนนี้ เดือนที่แล้ว กำหนดเองได้" — ยืนยัน month-preset ตรงตามที่ scope เดิมระบุ (nice-to-have, priority ต่ำสุด)
- **รายได้จากการนัด**: "จำนวนนัดที่ยืนยัน × 199 บาท" — ตรงกับสิ่งที่ Sprint 5 implement ไปแล้ว (`SUM(amountThb)` ของ booking ที่ไม่ใช่ `PENDING_CONFIRMATION`/`CANCELLED`) **ไม่มี gap ใหม่ตรงนี้** ไม่ต้องแตะ
- **Flow เปลี่ยนสถานะ Lead** (§4.3, อ่านเทียบด้วย): `ใหม่ (รอมอบหมาย) → มอบหมายแล้ว → กำลังติดตาม → เสนอราคาแล้ว → เซ็นสัญญาแล้ว (ยืนยันโครงการ) → กำลังติดตั้ง → เสร็จสิ้น (ส่งมอบโครงการแล้ว)`, แยก `Lead ไม่มีคุณภาพ` เป็น dead-end — **"เซ็นสัญญาแล้ว" (= `LeadStatus.SIGNED` ในโค้ด) คือขั้นตอนที่ตรงกับความหมาย "ปิดการขาย"** ("ยืนยันโครงการ" = ลูกค้าตกลงเซ็นสัญญาแล้ว) ไม่ใช่ `COMPLETED` (ซึ่งหมายถึงส่งมอบโครงการเสร็จ เป็นขั้นถัดไปหลังปิดการขายไปแล้ว) — นี่คือ grounding หลักของ Task 1/2 ด้านล่าง

## สิ่งที่มีอยู่แล้ว (ไม่ต้องสร้างใหม่)

- **Pattern "denormalized timestamp set on a specific status transition"** — `Lead.lastFollowUpAt` (Sprint 4) เป็นตัวอย่างตรงเป๊ะของสิ่งที่ต้องทำกับ `closedAt`: เพิ่มคอลัมน์ nullable, เซ็ตเฉพาะใน action ที่เกี่ยวข้อง (ไม่แตะ action อื่น), มี e2e เช็คว่า "เซ็ตตอนไหน/ไม่เซ็ตตอนไหน" คู่กัน — reuse pattern เดียวกันนี้ ไม่ต้องคิดของใหม่
- **Pattern "single source of truth constant array" สำหรับนิยาม business rule** — `CONFIRMED_BOOKING_STATUSES`/`isConfirmedBookingStatus()` ใน `src/lib/reports/aggregate.ts` (Sprint 5) คือแม่แบบสำหรับ `CLOSED_LEAD_STATUSES`/`isClosedLeadStatus()` ที่ต้องเพิ่มใน Task 6 — ต้อง export จากไฟล์เดียว ให้ทั้ง aggregate และ (ถ้าต้องใช้) export-rows import แทนการเขียนซ้ำ เหมือนที่ Sprint 5 บังคับไว้แล้วกับ revenue logic
- `buildLeadWhere()`, `effectiveChannel()`, `parseReportFilters()` ใน `aggregate.ts` — ใช้ร่วมกันอยู่แล้วทั้ง `aggregate.ts`/`export-rows.ts`/ทั้งสอง API route ไม่ต้องแก้ ไม่ต้องเขียนซ้ำ
- โครงตาราง breakdown ใน `reports-client.tsx` (3 การ์ด: ช่องทาง/ผู้ดำเนินการ/เซลส์) — แค่เพิ่มคอลัมน์ใหม่ 2 คอลัมน์ต่อการ์ด ไม่ต้อง restructure
- `EXPORT_COLUMNS`/`ExportRow` ใน `export-rows.ts` — แค่เพิ่ม 1 entry ในตำแหน่งที่ถูกต้องตาม PDF (ระหว่าง `createdAt` กับ `surveyed`) ไม่ต้อง restructure
- `requireRole("ADMIN","FINANCE")`, scope filter pattern, `withAudit()` — ครบอยู่แล้วจาก Sprint 5, ไม่มี mutation ใหม่นอกเหนือจาก `updateLeadStatus()` ที่มีอยู่แล้ว (แค่เพิ่ม side-effect เซ็ต `closedAt`)

## สิ่งที่ยังไม่มี (ต้องเพิ่ม)

- ไม่มี field ใดใน `Lead` model บันทึก "วันที่ปิดการขาย" ตรงๆ เลย (มีแค่ `updatedAt` ซึ่งไม่แม่นยำ — ดู Task 1)
- ไม่มี "อัตราปิดการขาย"/"จำนวน Lead ปิดการขาย" เป็นตัวเลขแยกในทั้ง `ReportAggregate` type และ UI เลย (แดชบอร์ดปัจจุบันมีแค่ leadCount/bookingCount/revenueThb ต่อกลุ่ม)
- ไม่มี month-preset UI ในตัวกรองช่วงเวลา (มีแค่ date-range `from`/`to` ธรรมดา)

## คำถามที่ต้องเคลียร์ก่อนเริ่ม (พร้อม default ที่แนะนำ)

### คำถามหลัก: `Lead.closedAt` เป็น field ใหม่ในสคีมา หรือ derive จาก `AuditLog`?

**คำแนะนำ: เพิ่ม field ใหม่ `Lead.closedAt DateTime?` ใน schema — ไม่ derive จาก AuditLog**

เหตุผล:
1. **Query pattern ที่ต้องใช้จริงคือ aggregate ข้าม lead จำนวนมาก พร้อม filter อื่น (ช่องทาง/เซลส์/ช่วงวันที่)** — คอลัมน์ธรรมดา query ได้ตรงๆ ผ่าน Prisma client ที่ type-safe เหมือนฟิลด์อื่นทุกตัวในระบบ ในขณะที่ derive จาก AuditLog ต้องเลือกทางใดทางหนึ่ง: (a) query `AuditLog` ทุกแถวของทุก lead ที่ match filter แล้วมา group/parse `after` (Json) ใน JS — คือ N+1 หรือ full-table-ish scan ทุกครั้งที่เปิดหน้ารายงาน หรือ (b) เขียน `$queryRaw` ด้วย SQLite `json_extract(after, '$.status')` — หลุดจาก Prisma type-safety ที่ทั้งโปรเจกต์ยึดอยู่ ทั้งสองทางแพงกว่าและเปราะบางกว่าคอลัมน์ตรงๆ อย่างชัดเจน
2. **`AuditLog.after` เป็น `Json?` ที่ไม่มีสคีมาบังคับรูปร่าง** (ดู `src/lib/audit.ts`) — การพึ่งพา shape ของมันสำหรับ business logic (ไม่ใช่แค่ audit trail สำหรับ compliance) ผูก correctness ของรายงานเข้ากับความสมบูรณ์ของ audit log ทางอ้อม เช่น ถ้ามีการแก้ข้อมูลผ่าน DB โดยตรง (migration fix, seed) ที่ไม่ผ่าน `withAudit()` ค่า derive จะเงียบๆ ผิดโดยไม่มีใครรู้ ในขณะที่คอลัมน์ตรงๆ ผูกกับ business action เดียว (`updateLeadStatus()`) ที่คุมง่ายกว่า
3. **`AuditLog` มีไว้เป็น forensic/compliance trail** (before/after diff สำหรับหน้า audit log) — การเอามาทำหน้าที่สองเป็น queryable projection สำหรับ reporting เพิ่ม coupling ที่ไม่จำเป็นระหว่างสองความรับผิดชอบที่ต่างกัน
4. **ตรงกับ pattern ที่เคยยืนยันแล้วและรีวิวแล้วในโปรเจกต์นี้พอดี** — `Lead.lastFollowUpAt` (Sprint 4) คือ field แบบเดียวกันเป๊ะ (denormalized timestamp เซ็ตตอน action เฉพาะ) และผ่าน e2e/verification มาแล้ว reuse pattern ที่พิสูจน์แล้วดีกว่าคิดกลไก derive ใหม่
5. **ต้นทุนต่ำมาก** — เพิ่ม nullable column เดียว + migration + ไม่กี่บรรทัดใน `updateLeadStatus()` เทียบเท่าความพยายามตอนเพิ่ม `lastFollowUpAt` ไม่มีเหตุผลด้าน proportionality ที่เอียงไปทาง derive

**Backfill ข้อมูลเก่า:** lead ที่มีสถานะ `SIGNED`/`INSTALLING`/`COMPLETED` อยู่แล้วก่อน sprint นี้จะมี `closedAt = null` (คอลัมน์ใหม่เริ่มเป็น null เสมอ) — **default: ไม่ backfill** ปล่อยเป็น `null`/`-` ในหน้ารายงานสำหรับ lead เก่ากลุ่มนี้ เพราะ (ก) ยังไม่มี production deployment จริง (`docs/plans/kkd-spec-remediation.md` Decision ข้อ 8 — deploy provider ยังไม่ตัดสินใจ) ข้อมูลปัจจุบันทั้งหมดเป็นข้อมูลทดสอบใน `prisma/dev.db`, (ข) การ derive แบบ one-time backfill จาก AuditLog เพื่อความสวยงามของ dev data ไม่คุ้มความซับซ้อนที่เพิ่ม ถ้าผู้ใช้ต้องการ backfill ก่อน production จริง ค่อยทำเป็น one-off script ตอนนั้น (ใช้ AuditLog ได้แบบ one-time ปลอดภัยกว่าใช้เป็น runtime dependency)

### คำถามรอง: นิยาม "ปิดการขายแล้ว" สำหรับตัวนับ close-rate

**คำแนะนำ: นับจาก `status` ปัจจุบันของ lead ที่อยู่ใน `{SIGNED, INSTALLING, COMPLETED}` — ไม่ใช่ `closedAt IS NOT NULL`**

เหตุผล: `updateLeadStatus()` ปัจจุบัน**ไม่มี state-machine guard** (เช็คแค่ว่าค่าที่ส่งมาอยู่ใน enum 8 ค่า ไม่เช็คว่า transition ถูกต้องตาม flow หรือไม่ — ดู `src/actions/leads.ts` บรรทัด 48) ดังนั้นทางทฤษฎี admin สามารถเปลี่ยน lead จาก `SIGNED` ย้อนไป `DISQUALIFIED` ได้ (แก้ไขข้อผิดพลาด) ถ้านิยาม "ปิดแล้ว" จาก `closedAt IS NOT NULL` เพียงอย่างเดียว lead ตัวนี้จะยังถูกนับเป็น "ปิดการขายแล้ว" ในอัตราปิดการขาย ทั้งที่สถานะจริงตอนนี้คือ "ไม่มีคุณภาพ" ซึ่งผิด — ใช้ `status ∈ {SIGNED, INSTALLING, COMPLETED}` ตรงกับที่ `leadStatusBreakdown` ใช้อยู่แล้วในโค้ดปัจจุบัน (สอดคล้อง ไม่ต้องคิดนิยามคู่ขนาน) ส่วน `closedAt` ทำหน้าที่แค่ "วันที่" สำหรับคอลัมน์ export เท่านั้น แยกอิสระจากตัวนับ rate — ถ้า lead ย้อนกลับไป `DISQUALIFIED` ทีหลัง `closedAt` เดิมจะยังค้างอยู่เป็นหลักฐานว่า "เคยปิดแล้ว ณ วันที่นี้" (สมเหตุสมผลในเชิงประวัติศาสตร์) แต่จะไม่ถูกนับใน close-rate เพราะ status ปัจจุบันไม่ใช่ 3 ค่านั้นแล้ว

### คำถามที่ตกลงแล้ว (ไม่ต้องถามซ้ำ) — เมื่อไหร่ที่ `closedAt` ถูกเซ็ต

`updateLeadStatus()`: ถ้า `status` ใหม่ `=== "SIGNED"` และ `before.status !== "SIGNED"` → เซ็ต `closedAt = new Date()` — เซ็ตครั้งแรกที่เข้าสู่ `SIGNED` เท่านั้น ไม่ clear ทิ้งเมื่อ status เดินหน้าต่อไป `INSTALLING`/`COMPLETED` (เพราะ "วันที่ปิดการขาย" ควรคงที่ตั้งแต่วันเซ็นสัญญา ไม่ใช่ขยับทุกครั้งที่มี update อื่น) ถ้า lead กลับเข้า `SIGNED` อีกครั้งหลังถูกแก้ไขย้อนสถานะ (edge case หายาก) จะเซ็ต `closedAt` ใหม่ทับของเดิม (ถือว่าปิดการขายรอบใหม่)

### คำถามที่ priority ต่ำสุด (nice-to-have, ตามที่ตกลงในแผนหลักแล้ว)

Month-preset filter — default: ทำถ้าเวลาเหลือหลัง Task 1-9 เสร็จ ไม่ block sprint ถ้าไม่ทัน (ประกาศไว้ชัดในแผนหลักแล้วว่า priority ต่ำกว่า 2 gap หลัก)

## Task List

| # | Task | Priority | Dependency | ขนานได้ไหม | ประมาณเวลา | ผู้รับผิดชอบที่เหมาะ |
|---|------|----------|------------|-------------|-------------|----------------------|
| 1 | **ยืนยัน**: default ข้างต้นทั้งสองข้อ (schema field ไม่ derive จาก AuditLog, close-rate นับจาก `status` ไม่ใช่ `closedAt`) — เดินหน้าตาม default ถ้าไม่มี feedback | สูง | ไม่มี | ✅ | 0.1 วัน (ยืนยัน) | ผู้ใช้ (auto-proceed ถ้าเงียบ) → nextjs-dev |
| 2 | แก้ `prisma/schema.prisma`: เพิ่ม `Lead.closedAt DateTime?` (nullable, ไม่มี default) — วางถัดจาก `lastFollowUpAt` เพื่อให้กลุ่ม "timestamp เซ็ตตาม business event" อยู่ด้วยกัน | สูง | Task 1 | ✅ | 0.15 วัน | nextjs-dev |
| 3 | `npx prisma migrate dev` — สร้าง migration ใหม่, verify `src/generated/prisma` regenerate ถูกต้อง (ไม่ backfill ข้อมูลเก่าตาม default ที่ยืนยันแล้ว) | สูง | Task 2 | ⏳ | 0.1 วัน | nextjs-dev |
| 4 | แก้ `src/actions/leads.ts` `updateLeadStatus()`: เพิ่ม logic เซ็ต `closedAt = new Date()` เมื่อ `status === "SIGNED" && before.status !== "SIGNED"` (ไม่แตะ `updateLeadNotes()`/`assignLeadSales()`/`updateLeadSourceChannel()` อื่นเลย ตรงตามหลัก "แก้เฉพาะจุด") พร้อมคอมเมนต์อธิบายเหตุผล (มิเรอร์สไตล์คอมเมนต์ที่มีอยู่แล้วเรื่อง `lastFollowUpAt`) | สูง | Task 3 | ⏳ | 0.3 วัน | nextjs-dev |
| 5 | แก้ `src/lib/reports/aggregate.ts`: เพิ่ม `CLOSED_LEAD_STATUSES: LeadStatus[] = ["SIGNED", "INSTALLING", "COMPLETED"]` + `isClosedLeadStatus()` (มิเรอร์ `CONFIRMED_BOOKING_STATUSES`/`isConfirmedBookingStatus()` เป๊ะ), เพิ่ม `closedLeadCount`/`closeRatePercent` เข้า `ChannelAgg`/`ExecutiveAgg`/`SalesAgg` type + logic คำนวณ (`closeRatePercent = leadCount > 0 ? (closedLeadCount / leadCount) * 100 : 0`, ปัดเศษ 1 ตำแหน่งตอนคำนวณหรือตอน format ฝั่ง UI ก็ได้ — เลือกให้สอดคล้องกับที่ทำใน Task 7) | สูง | Task 1 (ไม่ต้องรอ schema — ใช้ `status` field ที่มีอยู่แล้ว) | ✅ (ขนานกับ Task 2-4 ได้ — คนละไฟล์ ไม่พึ่ง `closedAt`) | 0.75 วัน | nextjs-dev |
| 6 | แก้ `src/lib/reports/export-rows.ts`: เพิ่ม `closedAt` เข้า `select` (ดึงจาก `Lead.closedAt` ที่เพิ่มใน Task 2-3), เพิ่ม `closedAt: string` เข้า `ExportRow` type + `EXPORT_COLUMNS` **ในตำแหน่งระหว่าง `createdAt` กับ `surveyed`** (ตาม PDF ยืนยันแล้วด้านบน) header ภาษาไทย `"วันที่ปิดการขาย"`, format เหมือน `createdAt` (`toLocaleDateString("th-TH")`), แสดง `"-"` ถ้า `null` | สูง | Task 3 | ⏳ (รอ schema แต่ขนานกับ Task 5 ได้ — คนละไฟล์) | 0.4 วัน | nextjs-dev |
| 7 | แก้ `src/hooks/admin/use-reports.ts`: อัปเดต `ReportAggregate` type ให้ตรงกับ shape ใหม่จาก Task 5 (`closedLeadCount`/`closeRatePercent` ใน 3 breakdown array) | สูง | Task 5 | ⏳ | 0.15 วัน | nextjs-dev |
| 8 | แก้ `src/app/admin/(dashboard)/reports/reports-client.tsx`: เพิ่มคอลัมน์ `"ปิดการขาย"` (นับ) + `"อัตราปิดการขาย (%)"` เข้าทั้ง 3 การ์ด breakdown (ช่องทาง/ผู้ดำเนินการ/เซลส์) มิเรอร์ pattern คอลัมน์อื่นในตารางเดิมเป๊ะ, format % ด้วย 1 ตำแหน่งทศนิยม (เช่น `toFixed(1)`) | สูง | Task 7 | ⏳ | 0.5 วัน | nextjs-dev |
| 9 | (Nice-to-have, priority ต่ำสุด) แก้ `reports-client.tsx`: เพิ่มปุ่ม preset `"เดือนนี้"`/`"เดือนที่แล้ว"`/`"กำหนดเอง"` เหนือ/ข้าง input `from`/`to` เดิม (คลิก preset แล้ว set `from`/`to` ให้ตรงช่วงเดือนนั้นอัตโนมัติ, "กำหนดเอง" คงพฤติกรรม input เดิมไว้ทั้งหมด — ไม่ต้องแก้ `use-reports.ts`/API เลย เพราะ `from`/`to` ยังเป็น shape เดิม) | ต่ำ | ไม่มี (แยกอิสระจาก 1-8 ทั้งหมด) | ✅ (ขนานได้กับทุก task อื่นแม้แต่ Task 2-8) | 0.5 วัน | nextjs-dev |
| 10 | ขยาย `scripts/e2e-admin-crud.mts` ส่วน REPORTS เดิม (DB-level, มิเรอร์ pattern `lastFollowUpAt` ของ Sprint 4): (ก) `closedAt` เป็น `null` ก่อน lead เข้าสถานะ `SIGNED`, (ข) `closedAt` ถูกเซ็ตตอน `updateLeadStatus` → `SIGNED` ครั้งแรก, (ค) `closedAt` **ไม่เปลี่ยน** ตอน status เดินหน้าต่อไป `INSTALLING`/`COMPLETED`, (ง) export `.xlsx` มี header `"วันที่ปิดการขาย"` อยู่ตำแหน่งถูกต้อง (ระหว่าง `"วันที่"` กับ `"เข้าสำรวจแล้วหรือไม่"`), (จ) `closeRatePercent`/`closedLeadCount` ต่อ channel/executive/sales บน API summary ตรงกับสูตร ground-truth ที่คำนวณตรงจาก DB แยกต่างหาก (เหมือนที่ทำกับ revenue ใน Sprint 5) | สูง | Task 4, 6, 8 | ⏳ | 1 วัน | nextjs-dev |
| 11 | รัน `npm run build && npm run start` + e2e จาก Task 10 + `npx tsx scripts/e2e-rbac-sprint2.mts` (ยืนยัน RBAC เดิมไม่พัง — sprint นี้ไม่แตะ RBAC เลย ควรผ่านโดยไม่มีการเปลี่ยนแปลง) เพื่อปิด sprint | สูง | ทุก task ก่อนหน้า (รวม Task 9 ถ้าทำ) | ⏳ | 0.25 วัน | nextjs-dev (หรือ `deploy-verify` ถ้าต้องการ second check) |

ลำดับ critical path: 1 (ยืนยัน) → 2,3 (schema/migration) → 4 (action), ขนานกับ 5 (aggregate ไม่ต้องรอ schema) → 6 (export-rows รอ schema) → 7 → 8 → 10 → 11 (Task 9 ขนานได้ตลอดทั้งเส้น ไม่บล็อกใคร)

**หมายเหตุเรื่อง i18n parity:** Reports เป็นหน้า admin-only ภาษาไทยล้วนตาม AGENTS.md เหมือน Sprint 5 เดิม ไม่มีข้อความ public-facing ใหม่ **ไม่ต้องรัน `i18n-parity-checker`**

**หมายเหตุเรื่อง reviewer เสริม:** Sprint นี้ไม่แตะ RBAC/scope filter ใดๆ (แก้แค่ 1 field ใหม่ + คำนวณ aggregate เพิ่ม + UI แสดงผล) ความเสี่ยง data-leak ไม่เพิ่มจากที่มีอยู่แล้ว — ไม่จำเป็นต้องบังคับผ่าน `audit-compliance-reviewer` รอบนี้ ปล่อยไปรวมที่ Sprint 9 ตามแผนเดิม

## ความเสี่ยง / จุดต้องระวัง

| ความเสี่ยง | ผลกระทบ | Mitigation |
|---|---|---|
| `updateLeadStatus()` ไม่มี state-machine guard — lead ย้อนจาก `SIGNED` กลับไปสถานะก่อนหน้า (หรือ `DISQUALIFIED`) แล้วเข้า `SIGNED` ใหม่ทำให้ `closedAt` ถูกเขียนทับ (ไม่ใช่ append ประวัติ) | ต่ำ (edge case หายาก, ไม่ใช่ flow ปกติตาม §4.3) | ยอมรับ behavior "เก็บแค่ครั้งล่าสุดที่ปิด" ตามที่ตัดสินใจแล้ว (ไม่ implement audit trail ของ `closedAt` เอง เพราะ `AuditLog` ที่มีอยู่แล้วครอบคลุม before/after ของทุก update รวมถึงฟิลด์นี้อยู่แล้ว ถ้าต้องการประวัติเต็มดูได้จากหน้า audit log) |
| Close-rate นับจาก `status` ปัจจุบัน แต่ `closedAt` เซ็ตตาม event — สอง field นี้อาจดู "ไม่ตรงกัน" ในสายตาผู้ใช้ที่ไม่รู้ nuance (เช่น lead ที่ `closedAt` มีค่าแต่ status ปัจจุบันเป็น `DISQUALIFIED` จะไม่ถูกนับใน close-rate) | ต่ำ-กลาง | Comment ในโค้ดอธิบาย nuance ชัดเจน (เหมือนที่ทำกับ `effectiveChannel()`/`CONFIRMED_BOOKING_STATUSES`) เผื่อ FINANCE ถามในอนาคต — ไม่ใช่บั๊ก เป็นการตัดสินใจที่มีเหตุผลรองรับ |
| Lead เก่าก่อน migration นี้ (ถ้ามี) จะมี `closedAt = null` แม้ status เป็น `SIGNED`/`INSTALLING`/`COMPLETED` อยู่แล้ว — export คอลัมน์ "วันที่ปิดการขาย" จะโชว์ `-` ให้ lead กลุ่มนี้ทั้งที่ปิดการขายไปแล้วจริง | ต่ำ (ยังไม่มี production data จริง ตาม decision ข้อ 8 ของแผนหลัก) | Flag เป็น known limitation ในผลลัพธ์ sprint, ไม่ backfill ตาม default ที่ยืนยันแล้ว — ถ้าจะ deploy production ก่อนมี lead จริงจำนวนมาก ไม่กระทบ |
| Aggregate (`aggregate.ts`) กับ export (`export-rows.ts`) ต้องใช้นิยาม "ปิดการขาย" เดียวกัน (สถานะ 3 ค่าเดียวกัน) ถ้า derive แยกกันจะเบี้ยว เหมือนความเสี่ยงเดิมที่ Sprint 5 เจอกับ revenue | กลาง | บังคับ export `CLOSED_LEAD_STATUSES`/`isClosedLeadStatus()` จาก `aggregate.ts` แล้ว import ใช้ที่อื่นถ้าจำเป็น (มิเรอร์ pattern `isConfirmedBookingStatus` ที่ `export-rows.ts` import อยู่แล้ว) ไม่เขียนซ้ำ |
| Task 9 (month-preset) เป็น UI เพิ่มเติมที่แตะไฟล์เดียวกับ Task 8 (`reports-client.tsx`) แม้จะขนานได้ตาม dependency graph แต่ถ้าทำพร้อมกันจริงอาจ merge conflict ในไฟล์เดียว | ต่ำ (ผลกระทบแค่ workflow ไม่ใช่ความถูกต้อง) | ถ้าใช้ agent เดียวทำทั้งหมดตามลำดับใน task list ไม่มีปัญหา — ระบุ note นี้ไว้เฉพาะกรณี dispatch คนละ agent ขนานกันจริง |

## Verification ก่อนปิด Sprint 5b

1. `npx prisma migrate dev` — มี migration ใหม่ 1 ตัวสำหรับ `Lead.closedAt`, ไม่มี pending migration อื่นค้าง
2. `npm run build && npm run start` ผ่าน
3. e2e coverage ใหม่จาก Task 10 ผ่านทั้ง 5 จุดที่ระบุ (closedAt ตอนก่อน/หลัง SIGNED, ไม่เปลี่ยนตอน INSTALLING/COMPLETED, export header ตำแหน่งถูกต้อง, close-rate ตรง ground truth)
4. `npx tsx scripts/e2e-rbac-sprint2.mts` ผ่าน (ยืนยันว่า sprint นี้ไม่กระทบ RBAC เดิมเลย ควรผ่าน 100% เหมือนก่อนเริ่ม)
5. Manual/self-check: เปิดหน้า `/admin/reports` เทียบเลข "ปิดการขาย"/"อัตราปิดการขาย (%)" ต่อช่องทาง/ผู้ดำเนินการ/เซลส์ กับข้อมูลจริงใน `prisma/dev.db` อย่างน้อย 1 กลุ่มด้วยตา, เปิดไฟล์ export เทียบ header 13 คอลัมน์กับ PDF §4.5 ทีละคอลัมน์ให้ตรงเป๊ะทั้งชื่อและลำดับ
6. `git status` — ไม่ควรมีการแก้ `src/messages/*.json` (ไม่มี public-facing string ใหม่ใน sprint นี้)
