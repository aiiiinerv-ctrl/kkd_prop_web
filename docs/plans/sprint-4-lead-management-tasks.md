# Sprint 4 — อัปเดตโมดูล Lead Management: Task Breakdown

อ้างอิงจาก `docs/plans/kkd-spec-remediation.md` บรรทัด 115-118 (scope) และ Sprint 3 — ผลลัพธ์ (บรรทัด 86-113, โดยเฉพาะ pattern ของ `resolveAssignee()`/`canMutateBooking()` ใน `src/actions/bookings.ts` ที่ Sprint 4 นำมาเทียบเคียง)

## สิ่งที่มีอยู่แล้ว (ไม่ต้องสร้างใหม่)

- **`LeadStatus` enum ตรวจสอบแล้วว่ามีครบ 8 ค่าจริงตาม brief** (`NEW, ASSIGNED, CONTACTED, QUOTED, SIGNED, INSTALLING, COMPLETED, DISQUALIFIED` — ดู `prisma/schema.prisma` บรรทัด 22-31) — **ต่างจากกรณี `BookingStatus` ใน Sprint 3 ที่เจอ 7-vs-8 mismatch จริง** กรณีนี้ไม่มี mismatch ไม่ต้องแก้ schema หรือ flag เพิ่มเติม
- `Lead.assignedSalesId` และ `Lead.lastFollowUpAt` มีอยู่ใน schema แล้ว (Sprint 0) — ไม่ต้องแก้ schema
- `getLeadScopeFilter()` และ `canMutateLead()` ใน `src/lib/auth/index.ts` (Sprint 2) — ใช้ scoping ตาม `assignedSalesId` อยู่แล้ว **แต่ปัจจุบันไม่มี action ไหนเซ็ตค่า `assignedSalesId` เลยสักที่** (ดู gap หลักด้านล่าง) ทำให้ scoping ของ SALES ยังใช้งานจริงไม่ได้จนกว่าจะมี action มอบหมาย
- Pattern `resolveAssignee()` ใน `src/actions/bookings.ts` (บรรทัด 29-38) — validate ว่า AdminUser id ที่เลือกมี `isActive=true` จริง — ใช้เป็นต้นแบบ แต่ต้องเพิ่มเงื่อนไข `role === "SALES"` เพราะ brief ระบุ "เลือกจาก AdminUser role=SALES" ชัดเจน (ต่างจาก `assignBookingEngineer` ที่ไม่จำกัด role)
- `updateLeadStatus()`/`updateLeadNotes()` ใน `src/actions/leads.ts` **ปัจจุบัน (ตามโค้ดที่แก้ค้างอยู่ใน git diff) เซ็ต `lastFollowUpAt` ทุกครั้งที่เรียกทั้งสองฟังก์ชัน** — กว้างเกินสโคปที่ brief ต้องการ ("เฉพาะตอนเซลส์บันทึกการติดตาม ไม่ใช่ทุก update ทั่วไป") ต้องตัดให้แคบลง (ดู Task 2)
- `updateLeadSourceChannel()` (ADMIN-only, ไม่แตะ `lastFollowUpAt`) เป็น pattern ที่ถูกต้องอยู่แล้วสำหรับ "การเปลี่ยน attribution ไม่ใช่ follow-up" — ใช้เทียบเคียงกับ action มอบหมายเซลส์ใหม่
- Sidebar เมนู "ลูกค้า (Leads)" มีอยู่แล้วครบทุก role ไม่ต้องแก้ (`src/app/admin/(dashboard)/admin-sidebar.tsx` บรรทัด 38)
- Admin UI เป็นภาษาไทยล้วนตาม AGENTS.md (ยืนยันแล้วจาก Sprint 3) — Sprint 4 ไม่แตะ public-facing strings เลย จึง **ไม่ต้องรัน `i18n-parity-checker`** (ไม่มีข้อความ TH/EN คู่ใหม่เกิดขึ้น)

## Task List

| # | Task | Priority | Dependency | ขนานได้ไหม | ประมาณเวลา | ผู้รับผิดชอบที่เหมาะ |
|---|------|----------|------------|-------------|-------------|----------------------|
| 1 | **ตัดสินใจ**: ใครมีสิทธิ์มอบหมาย/เปลี่ยนเซลส์ผู้รับผิดชอบ lead — ADMIN-only (เทียบเคียง `updateLeadSourceChannel`) หรือ ADMIN+SALES (เทียบเคียง `assignBookingSales`) | สูง | ไม่มี | ✅ | 0.25 วัน (ตัดสินใจ) | ผู้ใช้ยืนยัน แล้ว nextjs-dev ทำตาม |
| 2 | **ตัดสินใจ**: `lastFollowUpAt` ควรอัปเดตตอนไหน — (a) เฉพาะ `updateLeadNotes` (บันทึกภายใน = การบันทึกการติดตาม, ตัด logic ออกจาก `updateLeadStatus`) หรือ (b) สร้าง action ใหม่ `logLeadFollowUp()` แยกต่างหาก แล้วตัดออกจากทั้ง `updateLeadStatus`/`updateLeadNotes` | สูง | ไม่มี | ✅ | 0.25 วัน (ตัดสินใจ) | ผู้ใช้ยืนยัน แล้ว nextjs-dev ทำตาม |
| 3 | แก้ `src/actions/leads.ts`: เพิ่ม `assignLeadSales(id, salesId)` — ผ่าน `withAudit()`+`requireRole()` ตามผลตัดสินใจ Task 1, validate ผู้ใช้ที่เลือกต้องมี `role === "SALES"` และ `isActive === true` (ต่างจาก `resolveAssignee()` เดิมใน bookings.ts ที่ไม่จำกัด role — เขียน helper แยกในไฟล์นี้ ไม่ import ของ bookings.ts ข้ามโมดูล) | สูง | Task 1 | ⏳ | 0.5 วัน | nextjs-dev |
| 4 | แก้ `src/actions/leads.ts`: ตัด `lastFollowUpAt` ออกจากฟังก์ชันที่ไม่ควรแตะตามผลตัดสินใจ Task 2 — คอมเมนต์อธิบายเหตุผล (เทียบ pattern คอมเมนต์ที่มีอยู่แล้วใน `updateLeadSourceChannel`/`updatePaymentStatus` ของ bookings.ts) | สูง | Task 2 | ⏳ (ทำพร้อม Task 3 ได้ในไฟล์เดียวกัน) | 0.25 วัน | nextjs-dev |
| 5 | แก้ `src/app/admin/(dashboard)/leads/[id]/page.tsx`: query เพิ่ม `assignedSales: {select: {id, name}}` และ `lastFollowUpAt` ใน `prisma.lead.findUnique`, query รายชื่อ `AdminUser` ที่ `role === "SALES"` และ `isActive === true` ส่งเป็น prop `salesUsers`, เพิ่ม prop `canAssignSales` (ตามผลตัดสินใจ Task 1 — ถ้า ADMIN-only ให้ใช้ `session.user.role === "ADMIN"` ตรงแบบ `canEditChannel` ที่มีอยู่แล้ว) | สูง | Task 1 | ✅ (ขนานกับ Task 3/4 ได้ — คนละไฟล์) | 0.5 วัน | nextjs-dev |
| 6 | แก้ `src/app/admin/(dashboard)/leads/[id]/lead-detail-client.tsx`: เพิ่ม dropdown มอบหมายเซลส์ (มิเรอร์ pattern dropdown `sourceChannel` ที่มีอยู่แล้วบรรทัด 186-210 — โชว์ select ถ้า `canAssignSales`, โชว์ badge/text อ่านอย่างเดียวถ้าไม่ใช่), เพิ่มแสดงผล `lastFollowUpAt` (format `th-TH`, ข้อความ "ยังไม่เคยติดตาม" ถ้าเป็น `null`) | สูง | Task 3, 5 | ⏳ | 0.75 วัน | nextjs-dev |
| 7 | แก้ `src/app/api/admin/leads/route.ts` + `src/hooks/admin/use-leads.ts` (type `LeadListItem`): เพิ่ม `select`/`include` ของ `assignedSales: {select: {name: true}}` และ `lastFollowUpAt` ในผลลัพธ์ list API | กลาง | ไม่มี | ✅ (ขนานกับ Task 3-6 ได้) | 0.5 วัน | nextjs-dev |
| 8 | แก้ `src/app/admin/(dashboard)/leads/leads-client.tsx`: เพิ่มคอลัมน์ "เซลส์ที่รับผิดชอบ" และ "ติดตามล่าสุด" ในตาราง list (ซ่อนสำหรับ `isChannelExecutive` เหมือนคอลัมน์ชื่อ/เบอร์โทรที่มีอยู่แล้ว เพราะ CHANNEL_EXECUTIVE เห็นแค่ aggregate) | กลาง | Task 7 | ⏳ | 0.5 วัน | nextjs-dev |
| 9 | ขยาย `scripts/e2e-admin-crud.mts`: เพิ่ม coverage เรียก `assignLeadSales` (กรณีสำเร็จตาม role ที่อนุญาตจาก Task 1, กรณีถูกปฏิเสธถ้า role ไม่ผ่าน), ตรวจว่า `lastFollowUpAt` เปลี่ยนเฉพาะตอนเรียก action ที่ถูกต้องตามผลตัดสินใจ Task 2 (ไม่เปลี่ยนตอนเรียก action อื่นที่ไม่ควรแตะ) | สูง | Task 3, 4, 6, 8 | ⏳ | 0.75 วัน | nextjs-dev |
| 10 | รัน `npm run build && npm run start` + `npx tsx scripts/e2e-admin-crud.mts` (รวม coverage ใหม่จาก Task 9) + `npx tsx scripts/e2e-rbac-sprint2.mts` (ยืนยัน RBAC เดิมไม่พัง) เพื่อปิด sprint | สูง | ทุก task ก่อนหน้า | ⏳ | 0.25 วัน | nextjs-dev (หรือ deploy-verify ถ้าต้องการ second check) |

ลำดับ critical path: 1,2 (ตัดสินใจคู่ขนาน) → 3,4 (ไฟล์เดียวกัน) + 5,7 (ขนานได้) → 6 → 8 → 9 → 10

**หมายเหตุเรื่อง reviewer เสริม:** งาน Sprint 4 แตะ RBAC-adjacent logic (การมอบหมายเซลส์กระทบ scoping ว่าใครเห็น lead ไหน) แต่ยังอยู่ในกรอบ pattern เดิมที่ Sprint 2 วางไว้แล้ว (ไม่ได้เปลี่ยนกฎ scoping เอง) จึงยังไม่จำเป็นต้องบังคับผ่าน `audit-compliance-reviewer` รอบนี้ — ปล่อยให้การรีวิว RBAC เต็มรูปแบบไปรวมที่ Sprint 9 ตามแผนเดิม (เช่นเดียวกับที่ Sprint 3 ทำ) ถ้าต้องการความมั่นใจเพิ่มก่อนหน้านั้นสามารถขอ `audit-compliance-reviewer` เป็น optional quick-check หลัง Task 3/4 ได้

## คำถามที่ต้องเคลียร์ก่อนเริ่ม

1. (Task 1) ใครมอบหมาย/เปลี่ยนเซลส์ผู้รับผิดชอบ lead ได้ — ADMIN-only หรือ ADMIN+SALES?
2. (Task 2) `lastFollowUpAt` ควรผูกกับ action ไหน — ผูกกับ `updateLeadNotes` เดิม (ง่ายกว่า ไม่เพิ่ม action ใหม่) หรือแยก action `logLeadFollowUp()` ใหม่ (ชัดเจนกว่าเชิงความหมาย แต่เพิ่ม UI element ใหม่)?
3. คอลัมน์ "ติดตามล่าสุด"/"เซลส์ที่รับผิดชอบ" ใน list table (Task 8) — brief ระบุแค่ `src/app/admin/leads/` กว้างๆ ไม่ได้เจาะจงว่าต้องอยู่ทั้ง list และ detail หรือแค่ detail

**ถ้าไม่ตอบ:** ใช้ default สมเหตุสมผลแล้วเดินหน้าทันที —
- ข้อ 1: **ADMIN-only** เพราะการมอบหมาย "ใครดูแล lead นี้" เป็นการกำหนด ownership/attribution เหมือน `updateLeadSourceChannel` ที่เป็น ADMIN-only อยู่แล้ว (ต่างจาก `assignBookingSales` ที่ปล่อยให้ SALES เปลี่ยนได้ เพราะ booking assignment เป็นงานปฏิบัติการรายวัน ไม่ใช่การกำหนดความเป็นเจ้าของลูกค้า) — ใช้ `canAssignSales = role === "ADMIN"` เหมือน `canEditChannel`
- ข้อ 2: **(a) ผูกกับ `updateLeadNotes`** — การบันทึกโน้ตภายในคือการบันทึกการติดตามอยู่แล้วในทางปฏิบัติ ไม่ต้องเพิ่ม action/UI ใหม่ ลดความซับซ้อน ตัด `lastFollowUpAt` ออกจาก `updateLeadStatus` เท่านั้น
- ข้อ 3: ใส่ทั้ง list และ detail (แสดงในหน้า list ช่วย sales manager ไล่ดูว่า lead ไหนถูกทิ้งไว้นานเกิน)

## ความเสี่ยง / จุดต้องระวัง

| ความเสี่ยง | ผลกระทบ | Mitigation |
|---|---|---|
| SALES scoping (`getLeadScopeFilter`) ใช้งานจริงไม่ได้เลยจนกว่า Task 3 เสร็จ — ตอนนี้ไม่มีทางเซ็ต `assignedSalesId` เลย ถ้า sprint นี้ทำไม่เสร็จ SALES account ทุกคนจะไม่เห็น lead อะไรเลย | สูง | จัดลำดับ Task 3 เป็น critical-path แรกสุดหลังตัดสินใจ Task 1 |
| ถ้าเลือก default ข้อ 1 (ADMIN-only) ผิดจากที่ผู้ใช้ต้องการจริง (เช่น อยากให้ SALES ที่ถือ lead อยู่ reassign ให้เพื่อนร่วมทีมได้เอง) ต้องแก้ permission ย้อนหลัง | กลาง | Flag ชัดเจนในสรุปให้ผู้ใช้ยืนยัน/ปฏิเสธ default นี้ได้ทันทีหลังอ่านแผน |
| Duplicate `STATUS_LABELS`/`LEAD_STATUS_LABELS` object อยู่ 2 ที่ (`leads-client.tsx` และ `lead-detail-client.tsx`) — ถ้าแก้ label ที่เดียวจะ inconsistent (เจอระหว่างสำรวจโค้ด ไม่ใช่บั๊กใหม่จาก sprint นี้) | ต่ำ | ไม่ block sprint นี้ (นอกสโคป) แต่ flag ไว้เป็น tech debt ให้พิจารณา consolidate เป็น shared constant ในโอกาสถัดไป |
| CHANNEL_EXECUTIVE เห็นคอลัมน์ "เซลส์ที่รับผิดชอบ" ใน list ถ้า Task 8 ไม่ระวัง — ข้อมูลนี้ไม่ใช่ customer PII ตาม `redactLeadPII()` (name/phone/lineId/notes เท่านั้น) แต่ยังอาจไม่เหมาะให้ role นี้เห็นรายละเอียดการดำเนินงานภายใน | ต่ำ-กลาง | ซ่อนคอลัมน์ใหม่ทั้งสองสำหรับ `isChannelExecutive` เหมือนที่ทำกับคอลัมน์ชื่อ/เบอร์โทรอยู่แล้ว |
| Race/UX: ถ้าเลือก default ข้อ 2(a) แล้วผู้ใช้จริงคาดหวังว่า "เปลี่ยนสถานะ" ก็ควรนับเป็นการติดตามด้วย (เช่น เปลี่ยนเป็น CONTACTED ควรอัปเดต `lastFollowUpAt`) จะทำให้ field นี้ไม่สะท้อนความจริง | กลาง | Flag ชัดในคำถามที่ต้องเคลียร์ — ถ้าผู้ใช้แก้ทิศทางหลังเห็นแผนนี้ ปรับ Task 4 ตามนั้นได้ทันทีโดยไม่กระทบ task อื่น |

## Verification ก่อนปิด Sprint 4

1. `npx prisma migrate dev` — ไม่ควรมี pending migration ใหม่ (schema ไม่แก้ในสปรินต์นี้ตามที่ยืนยันแล้วว่า `LeadStatus` ตรงกับ brief อยู่แล้ว) ถ้ามีการแก้ schema เพิ่มต้อง flag ให้ผู้ใช้ทราบว่าทำไมเกินขอบเขตเดิม
2. `npm run build && npm run start` ผ่าน
3. `npx tsx scripts/e2e-admin-crud.mts` ผ่าน (รวม coverage ใหม่จาก Task 9: assignLeadSales + lastFollowUpAt narrowing)
4. `npx tsx scripts/e2e-rbac-sprint2.mts` ผ่าน (ยืนยัน SALES scoping ยังทำงานถูกต้องหลังเพิ่ม `assignLeadSales`)
5. Manual/self-check: SALES session ไม่เห็นปุ่ม/dropdown มอบหมายเซลส์ถ้า default ข้อ 1 (ADMIN-only) ถูกยืนยัน — server-side ต้อง reject ด้วยไม่ใช่แค่ซ่อน UI
