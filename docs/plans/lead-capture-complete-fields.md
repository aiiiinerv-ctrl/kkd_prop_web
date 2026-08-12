# แผน: เก็บข้อมูล lead ให้ครบทุก field ทุกช่องทาง

> ปิดงานแล้ว 2026-08-12 · Map: [Lead capture เก็บข้อมูลครบทุก field ทุกช่องทาง](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/10)
> Inventory ดิบ: [`docs/lead-capture-field-inventory.md`](../lead-capture-field-inventory.md)

เอกสารนี้เขียน **หลัง** ลงมือ ไม่ใช่ก่อน — เพราะการตัดสินใจปิดเร็วกว่าที่คาดและ execution เดินแซงแผนไป (บันทึกเหตุผลไว้ใน [#15](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/15)) จึงเป็นบันทึกสำหรับคนถัดไป ไม่ใช่ใบสั่งงาน

---

## โจทย์ตั้งต้น

ผู้ใช้แจ้งสองเรื่องที่ฟังเหมือนคนละเรื่อง แต่มีรากเดียวกัน:

1. เก็บข้อมูลไม่ครบทุก field
2. หน้าขอใบเสนอราคา/นัดสำรวจมีทางเข้าหลายช่องทาง บางช่องแยก argument บางช่องไม่มี บางช่องกดแล้วยังเป็น argument เดิม

**ขอบเขตที่ตกลง:** ทุก field ที่ลูกค้ากรอกและทุก context ที่ลิงก์ต้นทางส่งมา ต้องถึงมือ analyst ครบ ผ่านหน้า admin และไฟล์ export

---

## Root cause — 9 gap ที่ยืนยันแล้ว

ไล่ทุก field ผ่าน 6 ชั้น (ฟอร์ม → zod → server action → Prisma → admin → export/notification) รายละเอียดเต็มอยู่ใน inventory

| # | Gap | ตกที่ชั้น | อ้างอิงตอนพบ |
|---|---|---|---|
| G1 🔴 | `Lead.notes` ตัวเดียวรับสองหน้าที่ — ข้อความลูกค้า กับ บันทึกภายในแอดมิน `updateLeadNotes()` เขียนทับตรง ๆ **ข้อมูลหายหลังเก็บสำเร็จแล้ว** | admin | `src/actions/leads.ts:108` |
| G2 🔴 | `?package=` / `?service=` ถูกทิ้ง 100% — หน้า booking รับแค่ `{tab, bill}` และไม่มี column รองรับ | ฟอร์ม + DB | `booking/page.tsx:23` |
| G3 🔴 | `?bill=` ตกสองชั้น — ค่าดิบจาก calculator ไม่ตรง 5 option ของ `<select>` แล้วยังโดน `reset(draft)` ทับ | ฟอร์ม + zod | `booking-forms.tsx:47-53`, `:355`, `:359-363` |
| G4 🟠 | tab นัดสำรวจไม่มีช่องค่าไฟ/ระบบที่สนใจเลย | ฟอร์ม | `surveySchema` |
| G5 🟠 | export ขาด field ที่มีใน DB แล้วกว่าสิบตัว | export | `export-rows.ts:38-56` |
| G6 🟠 | tab ไม่ sync กับ URL — `useState(initialTab)` อ่าน prop ครั้งเดียว soft navigation ไม่ remount | ฟอร์ม | `booking-forms.tsx:116` |
| G7 🟡 | แจ้งเตือนขาด 6 field + `BUILDING_LABELS` ไม่มี key `OTHER` → ส่งคำว่า `OTHER` ดิบให้คนไทยอ่าน | notification | `format.ts:4-8` |
| G8 🟡 | draft เก็บ PII ใน localStorage ไม่มีวันหมดอายุ | ฟอร์ม | `src/lib/form-draft.ts` |
| G9 🟢 | `sourceChannelId` หายเงียบเมื่อไม่มี active channel | ฟอร์ม | `booking-forms.tsx:298` |

**สามข้อที่ไม่รู้ตอนตั้ง map และโผล่จากการทำ inventory: G1 (รุนแรงสุด), G7, G9**

---

## การตัดสินใจ

| ประเด็น | ตัดสิน | ทำไม |
|---|---|---|
| [แยกข้อความลูกค้าออกจากบันทึกภายใน](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/16) | เพิ่ม `customerMessage` (เขียนครั้งเดียวตอน create **ไม่มี action ให้แก้**) + เปลี่ยนชื่อ field เป็น `internalNotes @map("notes")` | ค่าเก่าในฐานส่วนใหญ่เป็นบันทึกแอดมินอยู่แล้ว ปล่อยไว้ที่เดิมจึงไม่ต้อง migrate ข้อมูล ; `@map` ทำให้ column ใน DB ไม่ต้อง rename → migration ไม่แตะข้อมูล ความเสี่ยงเป็นศูนย์ ; ตัด `LeadNote` แบบ append-only ออกเพราะเป็นฟีเจอร์ CRM คนละก้อน |
| backfill ข้อความที่ถูกทับไปแล้ว | กู้จาก `AuditLog.before` แถวเก่าสุดของแต่ละ lead + ด่าน dry-run | `auditedEntity` ของ Lead ตั้ง `snapshot: "full"` จึงมีทั้งแถวเก็บไว้ ; ไม่เดินตาม precedent `closedAt` ที่ไม่ backfill เพราะนั่นคือข้อมูลที่ไม่เคยมี ส่วนนี่คือข้อมูลที่ลูกค้าพิมพ์แล้วถูกลบ และเรารู้ว่ากู้ได้ |
| [entry point + tab/URL](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/13) | URL เป็นแหล่งความจริงเดียว ปุ่มใช้ `window.history.replaceState` + helper `bookingHref()` ที่ type บังคับ | แหล่งความจริงเดียวปิดทั้งคลาสของปัญหา ไม่ใช่แค่เคสที่รายงาน ; `?package=` มาจาก 3 ไฟล์คนละที่ สะกดตรงกันโดยบังเอิญ ไม่มีอะไรค้ำ |
| [draft vs URL](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/14) | merge รายช่อง: base → tab → URL (ทับเฉพาะช่องที่ส่งมา) · TTL 24 ชม. · แยก 3 key ใช้ base ร่วมข้าม tab | สิ่งที่เพิ่งกดควรชนะสิ่งที่ค้าง แต่ชนะเฉพาะที่มันพูดถึง ; 24 ชม. ครอบเคสจริงหมดแล้วและตัดความเสี่ยงเครื่องที่ใช้ร่วมกัน |
| ช่องค่าไฟ | คง dropdown + เพิ่ม option "อื่นๆ (ระบุ)" | แก้ที่ต้นเหตุ: `<select>` ไม่มีที่ให้ค่าที่ไม่ตรง option ยืน — ไม่ต้อง migrate เพราะ `avgMonthlyBill` ยังเป็น `Int?` |
| [export + notification](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/12) | ไฟล์เดียว 2 sheet — `"รายงาน"` คงเดิมตาม §4.5 + `"ข้อมูลเต็ม"` ทุก field ยกเว้น `paymentSlipKey` ; แจ้งเตือนใส่เฉพาะที่ช่วยตัดสินใจโทรกลับ | ลูกค้าตกลงหน้าตาไฟล์ตาม §4.5 ไว้แล้ว ; `paymentSlipKey` เป็น path เข้าสลิปใน `private/` และ xlsx forward ง่ายกว่า session ; `internalNotes` ไม่เข้าแจ้งเตือนเพราะลงกลุ่ม LINE ร่วม |
| [marker ฟิลด์ optional](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/20) | mark เฉพาะ "บังคับ" เลิก mark optional ทั้งหมด + legend บรรทัดเดียว | ฟอร์ม mark ฝั่งบังคับครบทั้ง 8 ตัวอยู่แล้ว การไล่ mark ฝั่ง optional ให้ครบคือเพิ่ม noise เพื่อแก้ปัญหาที่เกิดจาก noise เอง |

---

## สิ่งที่แก้จริง

### Sprint 0 — แยก customerMessage ([#17](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/17))

`prisma/schema.prisma` (+`customerMessage`, `internalNotes @map`) · migration `20260812070939` · `submit-quote.ts` · `submit-survey-booking.ts` · `leads.ts` · `lib/auth/index.ts` (`LEAD_PII_FIELDS`) · หน้า admin leads/bookings · `scripts/backfill-customer-message.mts`

audit-compliance-reviewer: no findings · e2e-booking 12/12 · e2e-admin-crud 70/70

### Sprint 1 — รื้อ booking-forms ([#18](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/18))

ไฟล์ใหม่ `src/lib/booking-links.ts` (`bookingHref()` + schema `.strict()`) และ `src/lib/lead-interest-slugs.ts` (`resolveInterestSlugs()` validate slug กับ DB) · migration `20260812072713` · `booking-forms.tsx` (tab ผูก URL, draft 3 key, `BillAndSystemsFields` ใช้ร่วม, bucket "OTHER") · `booking/page.tsx` (+`<Suspense>`) · `form-draft.ts` (TTL, `mergeDraftForForm()`, `clearDrafts()`) · `validations/lead.ts` (ย้าย 2 field ขึ้น base schema) · ลิงก์ 12 จุด · `messages/{th,en}.json` · `e2e-booking.mts`

ด่านตรวจครบสาม ไม่มี blocker · design-business-reviewer ยืนยันบน render จริงว่า QR PromptPay ขยับขึ้นราว 230px ไม่มีฟิลด์ qualify ขวางทางจ่ายเงินแล้ว

### Sprint 2 — export + notification ([#19](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/19))

`export-rows.ts` (+`FULL_EXPORT_COLUMNS`, `getFullExportRows()` — ของเดิมไม่ถูกแตะ) · `reports/export/route.ts` (+sheet `"ข้อมูลเต็ม"`) · `notifications/format.ts` + `types.ts` · `submit-*.ts` (ส่ง `channelName`)

### เก็บงาน UX ([#20](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/20))

`booking-forms.tsx` (legend, label+ดอกจันให้ `buildingTypeOtherText`, contrast tab, ปุ่มอัปโหลด + thumbnail preview, หัวข้อคั่นก่อนฟิลด์ qualify) · `messages/{th,en}.json`

### Commit บน main

```
aacfe1c fix(booking): mark only what the booking form actually requires
d852d48 feat(booking): tell the lead notification what the customer said
d585167 feat(admin): add a full-data sheet to the report export
c5391ac chore(booking): add a dry-run backfill for customerMessage
2f4de89 feat(booking): capture every field and link context the lead forms collect
f53b8a5 chore(agents): let design-business-reviewer render what it reviews
56a2a1e docs: record the lead-capture field inventory
```

---

## ยังไม่ได้ทำ

1. **backfill `--commit` บน production** — รันแค่ dev (43 candidate / เขียน 22 / กู้ไม่ได้ 0) ต้องรัน **บนเครื่อง host** เพราะ production เข้า MySQL จากข้างนอกไม่ได้ และต้องรัน **หลัง migration ลง** — *ยิ่งช้ายิ่งเสีย*: ทุกวันที่ยังไม่รัน แอดมินแก้ lead เก่าใบไหน ข้อความลูกค้าใบนั้นก็ถูกทับเพิ่ม
2. **deploy** ตาม `docs/plans/kkd-shared-hosting-redeploy-runbook.md` — มี migration 2 ตัวรอลง
3. **รีวิวซ้ำ Sprint 2 และงาน UX** — orchestrator ตายกลาง Sprint 2 เพราะชน session limit ของบัญชี จึงไม่ได้ผ่าน audit-compliance-reviewer และ #20 ไม่ได้ผ่าน design-business-reviewer ; ตรวจ invariant และ render เองไปแล้ว แต่ **ไม่ใช่การรีวิวเชิงปฏิปักษ์**
4. **G9** (`sourceChannelId` หายเงียบเมื่อไม่มี active channel) ยังอยู่ใน fog ของ map ไม่ได้แก้

---

## ข้อควรรู้สำหรับคนถัดไป

- **`prisma migrate dev` ไม่ regenerate client เสมอไป** ต้องรัน `npx prisma generate` แยกอีกรอบ (เจอซ้ำตั้งแต่ Sprint 5b)
- **เปิดไฟล์ migration อ่านก่อนรันเสมอ** การ rename field ใน Prisma อาจกลายเป็น `DROP` + `ADD` ซึ่งลบข้อมูลทั้ง column — เหตุผลที่เลือก `@map()` แทนการ rename column จริง
- **`useSearchParams()` ในหน้า static ที่ไม่มี `<Suspense>` พังเฉพาะตอน production build** dev ดูเหมือนทำงานปกติ (`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-search-params.md:178`) — verify ด้วย `npm run build` เท่านั้น
- **`BILL_BUCKETS` เป็นค่ากลางช่วง ไม่ใช่ขอบช่วง** (`1500` = "ต่ำกว่า 2,000") เขียน mapping ผิดง่ายมาก
- **column ใหม่ทุกตัวต้องพิจารณา `LEAD_PII_FIELDS`** ใน `src/lib/auth/index.ts` — `redactLeadPII()` ใช้กับ role `CHANNEL_EXECUTIVE` ลืมแล้วเปิดช่องรั่วโดยไม่ตั้งใจ
- **การ submit จากฝั่ง public ไม่ผ่าน `withAudit()`** (ตามดีไซน์ — `withAudit` ผูกกับ session แอดมิน) แปลว่าค่าที่ลูกค้ากรอกครั้งแรกมี snapshot ก็ต่อเมื่อแอดมินแก้ครั้งแรกเท่านั้น นี่คือเหตุผลที่ G1 กู้คืนยาก
- **snapshot key เปลี่ยนตาม field name** หลัง rename เป็น `internalNotes` แล้ว AuditLog ที่เกิดหลัง deploy เก็บ key ใหม่ — สคริปต์ backfill จึงอ่านทั้ง `notes` และ `internalNotes` ถ้าเช็คแค่ key เดียวจะตัด lead ที่กู้ได้ทิ้งเป็น "unrecoverable"
- **`git add -p` ใช้ในสภาพแวดล้อม agent ไม่ได้** เมื่อ sprint หลายรอบแก้ไฟล์เดียวกัน การแยก commit ตาม type ตามกติกา repo จะทำไม่ได้ — ถ้าต้องการ history ที่สะอาด ให้ commit ทีละ sprint ก่อนเริ่ม sprint ถัดไป
