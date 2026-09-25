# Calculator Excel import (On-grid) — sprint plan

Date: 2026-09-25
GitHub map: [#143](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/143) · plan ticket [#149](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/149)
Backlog: [`backlogs/done/ISSUE_143_calculator_excel_import_map/PLAN.md`](../../backlogs/done/ISSUE_143_calculator_excel_import_map/PLAN.md)
Precedent: [`calculator-config-sprints.md`](calculator-config-sprints.md) (map #102 — `CalculatorConfig` singleton + ADMIN-only tab)

อ้างอิงการตัดสินใจ (sources ชนะแผนนี้ถ้าขัดกัน):

| Ticket | เรื่อง | ใช้ใน sprint |
|---|---|---|
| [#144](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/144) | baseline admin/public, bug "5kw kW", upload ไม่มี magic check, storage ไม่รู้จัก xlsx | S0, S4, S6 |
| [#145](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/145) + [`research-145`](../../backlogs/done/ISSUE_143_calculator_excel_import_map/research-145-excel-read-contract.md) | import contract (header label), guards, edge-case catalog §4 | S2 |
| [#146](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/146) | กติกาแนะนำ: เล็กสุดที่ `billMax > บิล`, รวม 1φ/3φ, Excel เป็นตัวจริงรายแถว, ลบ threshold | S1, S2, S6, S7 |
| [#147](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/147) | public UI = layout prod เดิม + ปรับเท่าที่จำเป็น, "ครอบคลุมค่าไฟเต็ม 100%" | S7 |
| [#148](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/148) + [`research-148`](../../backlogs/done/ISSUE_143_calculator_excel_import_map/research-148-data-model-impact.md) | data model, action flow, security F1–F6, impact table §4, deploy order §5 | S3–S9 |
| [#150](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/150) | default = ตาราง legacy 3 แถว (ตัวเลขเท่า prod), ตารางใหม่ขึ้นเมื่อ ADMIN upload+ยืนยันบน prod; ไม่มี template | S1, S6, S9, S10 |

ข้อเท็จจริงที่ห้ามแก้ (quote จาก #150):

| kW | phases | sun/days/price | panels | roofM2 | billMin | billMax |
|---|---|---|---|---|---|---|
| 3 | 1 | 5 / 30 / 4.5 | 6 | 16.2 | 2,000 | 3,000 |
| 5 | 1,3 | 5 / 30 / 4.5 | 10 | 27 | 3,000 | 6,000 |
| 10 | 1,3 | 5 / 30 / 4.5 | 18 | 48.6 | 6,000 | 10,000 |

> "default table ให้ผลเท่ากับ `calculateSavings` เดิมทุก 100 ฿ ในช่วง 500–8,000 (ก่อนลบโค้ดเก่า)" — #150
> Prod baseline 2026-09-25: slider `min=500 max=8000 step=100`, params 5 h / 4.5 ฿ / ×10 / thresholds 3000/6000, Packages 3/5/10 kW = ฿99,000 / ฿155,000 / ฿285,000, `CalculatorConfig.version=5`.

---

## Status

**Planned 2026-09-25** — ยังไม่เริ่ม implement. อัปเดตตาราง tracker + "สรุปหลังแก้" ทุก sprint ทันทีที่จบ

## Sprint tracker

| Sprint | เป้าหมาย | Implement | Reviewer อิสระ | ขนาน/รอ | Est. | Status |
|---:|---|---|---|---|---:|---|
| **S0** | Live baseline ใหม่ + ignore `/stuffs/` (F1) | `nextjs-dev` (browser/curl) | — | เริ่มก่อน | 0.25 d | done 2026-09-26 |
| **S1** | Pure lib: `SizeRow`, `DEFAULT_SIZE_TABLE` legacy, `recommendFromTable()` + equality proof | `nextjs-dev` | — (script = reviewer) | ⏳ S0 | 0.5 d | pending |
| **S2** | Pure parser + guards + diff + `verify-calculator-import.mts` (fixture สังเคราะห์) | `nextjs-dev` | `audit-compliance-reviewer` (อ่าน guards เป็น security review) | ⏳ S1 (type) | 1 d | pending |
| **S3** | Schema additive + migration + prod DDL asset + storage-engine contract + audit type | `nextjs-dev` | `deploy-verify` (DDL/InnoDB) | ✅ ขนานกับ S2 (⏳ S1) | 0.5 d | pending |
| **S4** | `/files` hardening: `private/calculator-imports/` ADMIN-only + xlsx/attachment/nosniff | `nextjs-dev` | `audit-compliance-reviewer` | ✅ ขนานกับ S1–S3 (⏳ S0) | 0.5 d | pending |
| **S5** | Server actions preview/apply + reset ล้าง `sizeTable` + `getCalculatorConfig` คืนตาราง | `nextjs-dev` | `audit-compliance-reviewer` | ⏳ S2, S3, S4 | 1 d | pending |
| **S6a** | Admin UI spec การ์ด "ตารางขนาดระบบ (Excel)" | `ux-ui-expert` (read-only) | — | ✅ ขนานกับ S1–S5 | 0.5 d | pending |
| **S6** | Admin tab: ลบ threshold/sun/price fields, preview ใช้ตาราง (แก้ "5kw kW"), การ์ด upload/preview/diff/ยืนยัน/ประวัติ + e2e | `nextjs-dev` | `audit-compliance-reviewer`, `design-business-reviewer` (admin real render) | ⏳ S5, S6a | 1.5 d | pending |
| **S7** | Public calculator ใช้ตาราง: ลบ tier markers, พิมพ์เกิน slider, tiles 3 ช่อง, สถานะพิเศษ, 100%, messages TH/EN | `nextjs-dev` | `i18n-parity-checker`, `design-business-reviewer` (TH/EN + mobile) | ⏳ S5 (✅ ขนานกับ S6 ได้ ถ้าคนละ agent) | 1.5 d | pending |
| **S8** | Cleanup โค้ด legacy (`calculateSavings`, `systemKey`, threshold, sun/days/price ใน schema/zod/seed) | `nextjs-dev` | `audit-compliance-reviewer` (actions/zod) | ⏳ S6, S7 | 0.5 d | pending |
| **S9** | Release prod: snapshot → DDL additive → deploy → smoke → ตัวเลขเท่า baseline S0 | `hosting-deploy-specialist` + human FTP (`!`) | `deploy-verify` (ก่อน upload) | ⏳ S8 | 0.5 d | pending |
| **S10** | Post-deploy go-live ข้อมูล: ADMIN upload `คำนวณติดตั้ง.xlsx` บน prod → preview/diff → ยืนยัน | owner/ADMIN (human) + agent browser ตรวจ | `design-business-reviewer` (render หลังเปลี่ยนตัวเลข, optional) | ⏳ S9 + owner พร้อม | 0.25 d | pending |

**รวม ~8.5 dev-days** (critical path S0→S1→S2→S5→S6→S8→S9→S10 ≈ 6.5 d เมื่อ S3/S4/S6a/S7 ขนาน)

ทุก sprint ปิดแล้ว main ต้อง shippable: S1–S5 เพิ่มของที่ยังไม่มีใครเรียก (public ยังใช้โค้ดเดิม), S6 เปลี่ยน admin อย่างเดียว, S7 เปลี่ยน public ด้วยตัวเลขเท่าเดิม (default table), S8 ลบของตาย, S9 ขึ้น prod ตัวเลขเท่าเดิม, S10 เปลี่ยนตัวเลขด้วยข้อมูล ไม่ใช่โค้ด

---

## Default ที่ตัดสินใจแล้ว (ไม่ block ถามผู้ใช้ — ค้านเป็นข้อได้)

1. **ถอดฟิลด์ออกจาก Prisma schema แต่ไม่ DROP บน prod** — S8 ลบ `billThreshold3To5Kw`, `billThreshold5To10Kw`, `sunHoursPerDay`, `daysPerMonth`, `pricePerKwhThb` ออกจาก `schema.prisma`; `prisma migrate dev` จะสร้าง migration ที่มี `DROP COLUMN` — **commit ได้ แต่ห้ามรัน SQL นั้นบน prod ใน S9** (DDL asset ของ S9 มีเฉพาะส่วน additive). คอลัมน์บน prod มี `DEFAULT` ครบ (ดู `docs/plans/assets/calculator-config-phase-a-production-ddl-idempotent.sql`) → Prisma insert/update ไม่ชน. เหตุผล: rollback code ไป build ก่อน S9 ต้องยังอ่านคอลัมน์เดิมได้ (expand/contract F5). ทางที่ไม่เลือก: คงฟิลด์ใน schema เป็น deprecated — ขัดกับ #146/#148 ที่ให้ลบจาก schema/zod
2. **ลำดับ additive ก่อน, ลบทีหลัง (S3 vs S8)** — S3 เพิ่ม `sizeTable`/`sizeTableImportId`/`CalculatorImport` อย่างเดียว; โค้ดเก่ายังใช้ฟิลด์เดิมจนถึง S7 → ทุก sprint build ผ่าน shippable
3. **Equality proof คงอยู่ถาวร** — S1 เทียบ `recommendFromTable(DEFAULT_SIZE_TABLE)` กับ `calculateSavings` จริงทุก 100 ฿ (500–8,000: size, monthlySaving, afterBill, paybackYears). S8 ลบ `calculateSavings` → ย้ายสูตรเดิม (≈10 บรรทัด: threshold 3000/6000 + `kW×5×30×4.5` cap บิล + payback) เป็น `legacyReference()` ภายใน `scripts/verify-calculator.mts` เพื่อให้ proof ยังรันได้หลังลบโค้ด
4. **Fixture ทั้งหมดสังเคราะห์ตอนรัน** (F1, repo PUBLIC) — `scripts/lib/calculator-import-fixtures.ts` สร้าง xlsx ใน memory ด้วย exceljs/jszip ใช้เฉพาะคอลัมน์ที่ import (ไม่มีราคา/ยี่ห้อ). ไฟล์จริง `stuffs/คำนวณติดตั้ง.xlsx` / `docs/stuffs/…` ใช้เป็น optional check ถ้ามีในเครื่อง (skip ถ้าไม่มี) ไม่เคยถูก commit
5. **`jszip` ประกาศเป็น direct dependency** (`^3.10.1` = เวอร์ชันที่อยู่ใน lockfile แล้วผ่าน exceljs) — code ใหม่ import ตรง จึงไม่ควรพึ่ง transitive dep (hoisting เปลี่ยนแล้วพังเงียบ). ไม่เพิ่ม code ใน bundle
6. **Admin UI = ภาษาไทยอย่างเดียว** (admin root layout Thai-only) — error/warning ของ parser เป็น string TH ในโค้ด `src/lib/calculator-import/messages.ts` ไม่เข้า `messages/*.json`; กฎ TH/EN ใช้กับข้อความ **public** เท่านั้น (S7)
7. **ประวัติ import อ่านผ่าน RSC prop** (`page.tsx` → `findMany take 20 orderBy createdAt desc`) ไม่ทำ `/api/admin/*` + TanStack — ไม่ใช่ list ที่ filter ได้ (AGENTS.md: API route สำหรับ filterable lists). หลัง apply ใช้ `router.refresh()`
8. **ดาวน์โหลดต้นฉบับผ่าน `/files/private/calculator-imports/<id>.xlsx`** (S4 ทำให้ ADMIN-only + attachment) — ไม่สร้าง route ใหม่
9. **Package matching ใช้ `Package.sizeKw === row.kw`** (Float ทั้งคู่ ค่าเป็นจำนวนเต็ม/ทศนิยมจาก MW×1000 — เทียบตรงได้; ถ้า parser ได้ทศนิยมยาว ให้ round 3 ตำแหน่งตอน parse)
10. **CTA ส่ง `bill` ไป booking เฉพาะเมื่อ ≤ 1,000,000** — ข้อค้นพบใหม่: `avgMonthlyBill` ใน `src/lib/validations/lead.ts` จำกัด `max(1_000_000)` และช่อง "อื่น ๆ" ใน `booking-forms.tsx` `max={1_000_000}`; ตารางใหม่ไปถึง 3,000,000 ฿ → ถ้าส่ง bill 1.5M ไป form จะ submit ไม่ผ่าน = เสีย lead. เลือก: ไม่ส่ง param เมื่อเกิน (ลูกค้ากรอกเองได้). export `AVG_MONTHLY_BILL_MAX` จาก `lead.ts` ให้ calculator ใช้ค่าเดียวกัน (ไม่เปลี่ยนพฤติกรรม lead). ทางที่ไม่เลือก: ขยาย max ของ lead — แตะ lead validation/booking form นอก scope
11. **ป้าย "(ยอดนิยม)" มาจาก `Package.isPopular`** (ตัดสินกับ user 2026-09-25) — ป้ายขนาดสร้างจากตาราง "{kW} kW (1 หรือ 3 เฟส)" และต่อท้าย "(ยอดนิยม)" / "(Popular)" เมื่อมี Package `sizeKw === row.kw` ที่ `isPublished && isPopular` — ไม่ hardcode, admin คุมได้จากหน้า Package เดิม; key ใหม่ใน th/en.json (S7)
12. **Keys ที่ตายอยู่แล้ว (`billRange*`, `methodology*`, `colBillRange`, `disclaimer`) ไม่แตะ** — ตาม #148 §4 + surgical rule (ลบเฉพาะ key ที่งานนี้ทำให้ตาย: `system3kw/5kw/10kw`, `tierZone*`). ดู "ข้อขัดแย้ง" ด้านล่าง
13. **Preview warning เพิ่ม**: slider `maxBill` ≥ `billMax` แถวสุดท้าย → warn "ช่วง slider บางส่วนจะแสดง 'ระบบเกิน…'" (ไม่ block); Package ที่ `sizeKw` ไม่อยู่ในตาราง → warn (#146)
14. **อัพไฟล์ sha256 ซ้ำ → คืน import เดิม** + ข้อความ "ไฟล์นี้เคย upload แล้ว" (#148 §1.3); ไม่มีปุ่มลบ import ใน v1
15. **Commit type**: sprint ที่เพิ่ม lib ที่ยังไม่มีผู้ใช้ใช้ `feat` เมื่อเป็นส่วนของฟีเจอร์ที่ผู้ใช้จะเห็น; test/verify script แยก commit `test(...)` ตามกฎ one type per commit

## ข้อขัดแย้งระหว่าง sources (บันทึกไว้ ไม่ได้แก้เงียบ)

| # | ขัดกัน | ใช้อะไรในแผนนี้ | เหตุผล |
|---|---|---|---|
| C1 | `research-148` §3 ให้ `DEFAULT_SIZE_TABLE` = 31 แถวจาก Excel และ §5.4 บอกหน้า public เปลี่ยนทันทีหลัง deploy | **#150: legacy 3 แถว** | #150 ตัดสินทีหลังกับ user โดยเฉพาะ |
| C2 | #147 resolution: "ลบ keys `tierZone*`, `system3kw/5kw/10kw`, **`billRange*`** ที่ไม่ใช้แล้ว" vs `research-148` §4: "`billRange*` … **ไม่แตะ** — ไม่ใช่ผลของงานนี้" | **ไม่แตะ `billRange*`** | `grep` ยืนยัน `billRange*` ไม่ถูกใช้ใน `src/` ตั้งแต่ก่อนงานนี้ → ลบ = adjacent refactor (surgical rule). ถ้า owner อยากลบ ทำเป็น chore แยก |
| C3 | #146/#148 "ลบ threshold จาก schema" + "ไม่ DROP คอลัมน์ deploy นี้" — Prisma `migrate dev` จะสร้าง `DROP COLUMN` อัตโนมัติเมื่อลบจาก schema | Default #1: commit migration ได้ แต่ S9 ไม่ apply บน prod | ทั้งสองคำตัดสินยังเป็นจริง; ต้องมีวินัยตอน release (deploy-verify เช็ค) |
| C4 | `research-148` §1.1 บอก sun/days/price "ลบจาก schema **ได้**" (optional) ส่วน brief ระบุชัดเฉพาะ threshold | ลบทั้ง 5 ฟิลด์จาก schema ใน S8 | #146 ข้อ 4 ให้ Excel เป็นตัวจริงรายแถว → ฟิลด์ config 3 ตัวนี้ไม่มีผู้อ่านเหลือ เก็บไว้ = dead field ที่ admin/คนอ่านโค้ดสับสน |
| C5 | `research-145` §4.3 เสนอ "ช่วงซ้อน/ขาด → Warn", "ขนาดซ้ำต่าง phase → Warn" | ใช้กติกา **#146**: billMax ต้องเพิ่มเคร่งครัด (Reject), 1φ/3φ ค่าไม่ตรง (Reject), billMax หาย (Reject); ช่วงซ้อน/ขาดตาม billMin ไม่เกี่ยว (กติกาใช้แค่ billMax) → ไม่ warn | #146 เป็นคำตัดสินหลัง research |

## Risk table

| # | ความเสี่ยง | โอกาส | ผลกระทบ | ลดความเสี่ยง | Sprint |
|---|---|---|---|---|---|
| R1 | ตัวเลขหน้า public เปลี่ยนหลัง deploy โดยไม่ตั้งใจ | ต่ำ | สูง (ลูกค้าเห็นคืนทุนต่าง) | S1 equality sweep 76 จุด; S9 smoke เทียบ baseline S0 ที่บิลตัวอย่าง | S1, S9 |
| R2 | Excel จริง (ราคายี่ห้อ) หลุดขึ้น repo PUBLIC | กลาง (มี `stuffs/` untracked อยู่ตอนนี้) | สูง | S0 ignore `/stuffs/`; fixture สังเคราะห์; reviewer เช็ค `git diff --stat` ไม่มี `.xlsx` | S0, S2 |
| R3 | ไฟล์ร้าย (zip bomb/macro/XXE) ทำ server ล่มบน shared hosting | ต่ำ | สูง (ทั้งเว็บล่ม) | guards ก่อน exceljs; ≤2 MB; rowCount/colCount cap; parse หลัง `requireRole("ADMIN")` | S2, S5 |
| R4 | FINANCE/role อื่นโหลดไฟล์ต้นทุนผ่าน `/files` | กลาง (F2 มีอยู่จริง) | กลาง | S4 prefix rule + e2e | S4 |
| R5 | DDL บน prod ไม่ลง แต่ code ขึ้น → 500 หน้า calculator/admin | กลาง (เคยเกิด 2026-08-12) | สูง | runbook rule #2: `SHOW CREATE TABLE` ก่อน restart; `getCalculatorConfig` fallback default เมื่อ `sizeTable` parse ไม่ผ่าน | S3, S9 |
| R6 | มีคนรัน migration `DROP COLUMN` บน prod ใน S9 | กลาง | กลาง (rollback code เก่าพัง) | DDL asset แยกเฉพาะ additive; deploy-verify ตรวจ; ระบุใน PR/release note | S8, S9 |
| R7 | Design ถูก reject ที่ real render (ประวัติเว็บนี้) | กลาง | กลาง | S7 ใช้ layout เดิม (#147), design-business-reviewer TH/EN + mobile เป็น gate | S6, S7 |
| R8 | CTA prefill bill > 1,000,000 ทำ lead form ไม่ผ่าน | สูงหลัง S10 ถ้าไม่แก้ | สูง (เสีย lead) | Default #10 | S7 |
| R9 | Restore snapshot ก่อน S8 เข้ากับ code หลัง S8 (มีฟิลด์ที่ schema ไม่รู้จัก) | ต่ำ | กลาง | rollback = revert code คู่กับ snapshot; S8 รัน `restore-db.mts` dry-run กับ snapshot S0 และบันทึกผล | S8, S9 |
| R10 | exceljs อ่านไฟล์ที่ save จาก Excel เวอร์ชันอื่น/Google Sheets ไม่ได้ (ไม่มี cached result) | กลาง | ต่ำ (reject พร้อมข้อความ) | fixture "สูตรไม่มี cached result" → Reject message ชัด; กล่องคำอธิบายบอกให้ save จาก Excel | S2, S6 |

---

## S0 — Live baseline + repo hygiene

**สรุปก่อนแก้**
- ทำไม: live-verify ก่อนแก้ (user rule) — baseline 2026-09-25 อาจเก่าเมื่อเริ่มจริง; และ F1: `git status` ตอนนี้มี `?? stuffs/` (Excel มีราคาแบรนด์) บน repo PUBLIC
- ไฟล์: `.gitignore` (+ `/stuffs/` ใต้บรรทัด `/docs/stuffs/`); แผนนี้ (บันทึกผล baseline ในหัวข้อ "สรุปหลังแก้" ของ S0)
- Baseline ที่ต้องบันทึก:
  1. Prod public: `curl -s https://<prod>/th/calculator` และ `/en/calculator` → status 200, `<input type="range">` attr `min/max/step`, ข้อความขนาดระบบ + ประหยัด + คืนทุน ที่บิล 500, 2,500, 2,999, 3,000, 5,999, 6,000, 8,000 (เปิด browser จริงลาก/พิมพ์ เพราะเป็น client state) — screenshot desktop + mobile TH/EN
  2. Prod Packages 3/5/10 kW ราคา (`/th/packages`)
  3. Admin (local, login ADMIN): tab "ตัวเลขการคำนวณ" screenshot + `CalculatorConfig.version`; (prod admin ถ้า owner login ให้ได้ — ถ้าไม่ได้ ระบุว่า skip)
  4. `git log --oneline -1` ของ artifact ที่อยู่บน prod (จาก runbook / deploy log)
- Screenshot เก็บในเครื่อง dev ไม่ commit (อาจมีข้อมูล admin)

**DoD**
- [x] `git check-ignore stuffs/คำนวณติดตั้ง.xlsx` คืน path (ignored); `git status` ไม่มี `stuffs/`
- [x] ตาราง baseline 7 บิล × TH/EN อยู่ใน "สรุปหลังแก้" ด้านล่าง
- Commit: `chore(calculator): ignore root stuffs dir holding private pricing excel`

**Rollback:** revert `.gitignore` (ไม่มีความเสี่ยง)

**สรุปหลังแก้ (2026-09-26):**
- `.gitignore`: เพิ่ม `/stuffs/` ใต้ `/docs/stuffs/` → `git check-ignore -v` ชี้ `.gitignore:63:/stuffs/`; `git status` ไม่มี `stuffs/` แล้ว
- **Prod public** (`https://kkdproperty.co.th`, browser จริง, ตั้งค่าในช่องบิลแล้วอ่านผล): `/th/calculator` + `/en/calculator` → 200, slider `min=500 max=8000 step=100`

  | บิล ฿ | ขนาด (TH / EN) | หลังติดตั้ง | ประหยัด/เดือน | คืนทุน |
  |---:|---|---:|---:|---:|
  | 500 | ระบบ 3KW / 3KW System | ฿0 | ฿500 | ~19.8 ปี |
  | 2,500 | ระบบ 3KW / 3KW System | ฿475 | ฿2,025 | ~4.9 ปี |
  | 2,999 | ระบบ 3KW / 3KW System | ฿974 | ฿2,025 | ~4.9 ปี |
  | 3,000 | ระบบ 5KW (ยอดนิยม) / 5KW System (Popular) | ฿0 | ฿3,000 | ~5.2 ปี |
  | 5,999 | ระบบ 5KW (ยอดนิยม) / 5KW System (Popular) | ฿2,624 | ฿3,375 | ~4.6 ปี |
  | 6,000 | ระบบ 10KW หรือมากกว่า / 10KW System or larger | ฿0 | ฿6,000 | ~4.8 ปี |
  | 8,000 | ระบบ 10KW หรือมากกว่า / 10KW System or larger | ฿1,250 | ฿6,750 | ~4.2 ปี |

  TH กับ EN ตรงกันทุกจุด; tier labels 3KW / 5KW / 10KW+ ใต้ slider ยังอยู่
- **Prod Packages** (`/th/packages`): 3KW ฿99,000 · 5KW ฿155,000 · 10KW ฿285,000
- **Admin (local DB)**: `CalculatorConfig.version = 5`, updatedAt 2026-08-28, thresholds 3,000/6,000, slider 500/8,000/100 — screenshot tab "ตัวเลขการคำนวณ" จาก 2026-09-25 (#144) ยังใช้ได้ (ไม่มี commit แตะ calculator ตั้งแต่นั้น); **prod admin: skip** (ไม่มี credential prod ในมือ agent — owner login ได้ถ้าต้องการ)
- **Code บน prod**: deploy log (#142, 2026-09-25) ไม่บันทึก hash — code commit ล่าสุดก่อน log คือ `fd740cd` (อนุมาน)
- **ต่างจาก 2026-09-25**: ไม่มี — ค่าทั้งหมดเท่าเดิม; ตัวเลขชุดนี้คือ target ของ equality sweep S1 และ smoke S9

---

## S1 — Pure domain lib: size table + recommendation (ยังไม่มีผู้เรียก)

**สรุปก่อนแก้**
- ทำไม: แยก logic ที่ทดสอบได้โดยไม่มี DB/UI ออกมาก่อน และพิสูจน์ว่า default table = พฤติกรรม prod (#150) **ก่อน** มีใครพึ่งมัน
- ไฟล์:
  - `src/lib/calculator-size-table.ts` (ใหม่) — `type SizeRow = { kw; phases: (1|3)[]; sunHours; days; pricePerKwh; panels; roofM2; billMin; billMax }`; `sizeTableSchema` (zod: array ≥1, kw>0, sun 1–12, days 28–31, price 0.01–50, panels int ≥1, billMin<billMax, `billMax` เพิ่มเคร่งครัดตาม kw ที่เรียงแล้ว, kw ไม่ซ้ำ); `DEFAULT_SIZE_TABLE` = 3 แถว legacy ตามตาราง #150 (ไม่มีราคา); `resolveSizeTable(json: unknown): { table: SizeRow[]; source: "default" | "import" }` — parse ไม่ผ่าน → default + `console.error` (public ไม่พัง)
  - `src/lib/calculator.ts` — **เพิ่ม** `recommendFromTable(bill: number, table: SizeRow[], packages: CalcPackage[], multiplier: number)` คืน union `{kind:"empty"} | {kind:"tooLarge"; lastRow} | {kind:"ok"; row; belowFirstRow; monthlySaving; afterBill; coversFullBill; kwhPerMonth; paybackYears: number|null}` ตาม #146 (smallest `billMax > bill`; `belowFirstRow = bill < table[0].billMin`; `coversFullBill = theoretical ≥ bill`; `kwhPerMonth = kw×sun×days`; payback เฉพาะเมื่อมี Package ขนาดเดียวกันและ saving>0). **ไม่ลบ** ของเดิม
  - `scripts/verify-calculator.mts` — เพิ่ม section: (a) equality sweep 500→8,000 ทุก 100 ฿ `recommendFromTable(DEFAULT_SIZE_TABLE, packages, 10)` vs `calculateSavings` (kW, monthlySaving, afterBill, paybackYears) = 76 จุด; (b) กติกาตารางด้วย table ทดสอบ (import columns only): 2,500→3 kW, 3,000→5 kW, 25,500→40 kW + coversFullBill, 110,000→115 kW, 1,500 → belowFirstRow, ≥ last billMax → tooLarge, kW ไม่มี Package → payback null; (c) `resolveSizeTable` กับ JSON เสีย → default
  - `CONTEXT.md` — ศัพท์ "ตารางขนาดระบบ (Size table)", "Import (ชุดตาราง)", "ตาราง legacy"
- Security/maintainability: ไม่มี I/O; ไม่มีราคาแบรนด์ใน TS; zod schema เดียวใช้ทั้ง parser (S2), apply (S5), read (S5)

**DoD**
- [ ] `npx tsx scripts/verify-calculator.mts` — ✓ ทั้งหมด รวม "equality sweep 76/76"
- [ ] `npm run build` ✓ Compiled + Finished TypeScript
- Commits: `feat(calculator): add size table model and table-based recommendation` · `test(calculator): prove legacy default table matches current tiers` · `docs(calculator): add size table terms to context`

**Rollback:** revert commits — ไม่มีผู้เรียก ไม่กระทบ runtime

**สรุปหลังแก้:** _(กรอกหลังทำ)_

---

## S2 — Excel parser + guards + diff (pure, server-only)

**สรุปก่อนแก้**
- ทำไม: จุดรับไฟล์จากภายนอกคือพื้นผิว security หลัก — ทำเป็น pure function + script test ครบ catalog ก่อนต่อ action
- ไฟล์ (ใหม่ทั้งหมดใต้ `src/lib/calculator-import/`):
  - `validate-xlsx.ts` — `validateXlsxBuffer(buf, fileName)`: นามสกุล `.xlsx`, magic `504B0304` (ปฏิเสธ OLE `D0CF11E0` = xls/มีรหัสผ่าน), ≤ 2 MB, jszip: entries ≤ 200, Σ uncompressed ≤ 20 MB, reject `xl/vbaProject.bin` / `macroEnabled` ใน `[Content_Types].xml`, warn `xl/externalLinks/*`. **ไม่ trust `file.type`**
  - `parse-on-grid.ts` — `parseOnGridSheet(buf)` ตาม `research-145` §2: sheet `/^on[\s-]?grid$/i`, header row `ผลิตพลังงานต่อวัน` ใน 20 แถวแรก, label ผ่าน `cell.master`, อ่าน block แรกหยุดที่ขนาดว่าง, MW×1000, cached result เท่านั้น (ไม่ evaluate สูตร), roof `panels×2.7` + warn ถ้าไม่มี cached, cap rowCount 1000 / colCount 100; รวม 1φ/3φ → `phases`; guards #146 (billMax หาย = Reject, 1φ/3φ ค่าไม่ตรง = Reject, billMax ไม่เพิ่มเคร่งครัด = Reject); ผลลัพธ์ผ่าน `sizeTableSchema` (S1). ไม่เก็บ category/ราคา
  - `diff.ts` — `diffSizeTables(current, next, packages, sliderMaxBill)`: เพิ่ม/ลบ/เปลี่ยน field ต่อ kW, warn Package ไม่อยู่ในตาราง, warn slider max ≥ last billMax (Default #13), ผลต่อบิลตัวอย่าง (1,500 / 3,000 / 3,500 / 6,000 / 8,000: ขนาดเดิม → ใหม่)
  - `messages.ts` — ข้อความ TH (admin-only) ตาม `research-145` §4; exceljs error → "อ่านไฟล์ไม่ได้" (ไม่ส่ง stack)
  - `index.ts` — export รวม; repo ไม่มี package `server-only` (ตรวจ 2026-09-25) → ใส่ comment หัวไฟล์ห้าม import จาก client component; ไม่เพิ่ม dep เพื่อเรื่องนี้
- `package.json` — `jszip: ^3.10.1` เป็น direct dependency (Default #5); `npm install` ต้องไม่เปลี่ยน version ใน lockfile
- `scripts/lib/calculator-import-fixtures.ts` (ใหม่) — builder สร้าง xlsx ใน memory: ไฟล์ดี (คอลัมน์แบบใหม่มี "ประเภท"), คอลัมน์เลื่อน (แบบเดิม), ไม่มี sheet, header หาย, คอลัมน์บังคับหาย, OLE magic, นามสกุลผิด, macro, zip entries 201, ใหญ่ > 2 MB, สูตรไม่มี cached result, billMax ไม่เพิ่ม, 1φ/3φ ขัดกัน, billMax หาย, หน่วย `W`, DOCTYPE/XXE, มีตารางที่ 2 ด้านล่าง
- `scripts/verify-calculator-import.mts` (ใหม่) — assert Reject/Warn/Accept ทุก fixture + optional: ถ้ามี `stuffs/คำนวณติดตั้ง.xlsx` → expect Accept 31 แถว (33 ก่อนรวม), ถ้ามี `docs/stuffs/คำนวณติดตั้ง.xlsx` → expect Reject (billMax หาย 4 แถว); ไม่มีไฟล์ → พิมพ์ `- skipped (file not present)`
- UX: ข้อความ reject บอก "ต้องทำอะไร" (เช่น "บันทึกเป็น .xlsx ธรรมดา") และระบุแถว/คอลัมน์

**DoD**
- [ ] `npx tsx scripts/verify-calculator-import.mts` — ✓ ทุก fixture (บันทึกจำนวน ✓), real-file checks ✓ หรือ skipped แสดงชัด
- [ ] `npx tsx scripts/verify-calculator.mts` ยังเขียวทั้งหมด
- [ ] `npm run build` ✓
- [ ] `git diff --stat` ไม่มีไฟล์ `.xlsx`
- [ ] `audit-compliance-reviewer` อ่าน `validate-xlsx.ts`/`parse-on-grid.ts` เทียบ `research-145` §4.1 (ยังไม่มี action — review เชิง guard)
- Commits: `feat(calculator): parse on-grid excel sheet into size table with file guards` · `build(calculator): declare jszip as direct dependency` · `test(calculator): cover excel import guards with synthesized fixtures`

**Rollback:** revert — ยังไม่มีผู้เรียก

**สรุปหลังแก้:** _(กรอกหลังทำ)_

---

## S3 — Schema additive + migration + prod DDL + contracts  ✅ ขนานกับ S2

**สรุปก่อนแก้**
- ทำไม: เตรียมที่เก็บ `sizeTable` และประวัติ import แบบ additive ล้วน (F4/F5) — โค้ดเก่าไม่รู้สึก
- ไฟล์:
  - `prisma/schema.prisma` — `CalculatorConfig` + `sizeTable Json?`, `sizeTableImportId String? @db.VarChar(40)`; model `CalculatorImport` ตาม `research-148` §1.3 (`fileName VarChar(120)`, `fileKey VarChar(120)`, `sha256 Char(64)`, `sizeBytes Int`, `rows Json`, `warnings Json`, `uploadedById VarChar(40)` → `AdminUser` (default Restrict — ผู้ใช้ถูก deactivate ไม่ถูกลบ เหมือน `AuditLog.actor`), `createdAt`, `@@index([createdAt])`, `@@index([sha256])`); back-relation บน `AdminUser`. **ยังไม่ลบ** ฟิลด์เดิม (Default #2)
  - `prisma/migrations/<ts>_add_calculator_size_table_import/migration.sql` — จาก `npx prisma migrate dev`
  - `docs/plans/assets/calculator-excel-import-production-ddl.sql` (ใหม่) — idempotent เท่าที่ MySQL ทำได้: `ALTER TABLE CalculatorConfig ADD COLUMN sizeTable JSON NULL, ADD COLUMN sizeTableImportId VARCHAR(40) NULL;` + `CREATE TABLE IF NOT EXISTS CalculatorImport (...) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci` + FK + index; ท้ายไฟล์มี query verify (`SHOW CREATE TABLE`, `SHOW COLUMNS`). คัดลอกคอลัมน์/ชนิดจาก migration.sql ที่ Prisma สร้าง ห้ามเขียนเดา
  - `scripts/lib/storage-engine-contract.ts` — + `{ table: "CalculatorImport", delegate: "calculatorImport" }` หลัง `AdminUser` (F6)
  - `src/lib/audit.ts` — `AuditEntityType` + `"CalculatorImport"`; `src/lib/enum-labels.ts` + `CalculatorImport: "ชุดตารางคำนวณ (Excel)"`
  - `prisma/seed.ts` — ไม่ต้องแก้ (null = default) — ยืนยันว่ายัง idempotent

**DoD**
- [ ] `npx prisma migrate dev` apply ได้; `npx prisma db seed` รันซ้ำ 2 ครั้งไม่ error
- [ ] `npx tsx scripts/verify-storage-engine.mts` ✓ (ไม่มี "missing tables"); `npx tsx scripts/backup-db.mts` แล้ว `npx tsx scripts/restore-db.mts` (dry-run) ✓
- [ ] `npm run build` ✓; `npx tsx scripts/verify-calculator.mts` ✓; `npx tsx scripts/e2e-calculator-config.mts` (server รัน) ✓ — ของเดิมไม่พัง
- [ ] `deploy-verify` ตรวจ DDL asset: ENGINE=InnoDB, utf8mb4, ชนิดตรง migration, ไม่มี DROP
- Commits: `feat(calculator): add size table columns and calculator import history model` · `docs(deploy): add production ddl for calculator excel import`

**Rollback (local):** `git revert` + `npx prisma migrate reset` บน dev DB. **Prod:** ยังไม่เกี่ยว (DDL รันใน S9)

**สรุปหลังแก้:** _(กรอกหลังทำ)_

---

## S4 — `/files` hardening สำหรับไฟล์ต้นฉบับ  ✅ ขนานกับ S1–S3

**สรุปก่อนแก้**
- ทำไม: F2 — `isAuthorizedForPrivate()` ให้ FINANCE อ่าน `private/` ทุกไฟล์; F3 — ไม่มี xlsx content-type/attachment/nosniff. ต้องปิดก่อนมีไฟล์ต้นทุนเข้าระบบ
- ไฟล์:
  - `src/app/files/[...key]/route.ts` — ใน `isAuthorizedForPrivate(key)`: ถ้า `key.startsWith("private/calculator-imports/")` → `role === "ADMIN"` เท่านั้น (เช็คก่อน branch ADMIN/FINANCE เดิม); response สำหรับ prefix นี้เพิ่ม `Content-Disposition: attachment; filename="calculator-import-<id>.xlsx"` (ASCII, ไม่ใช้ชื่อไฟล์ผู้ใช้ตรง ๆ), `X-Content-Type-Options: nosniff`, `Cache-Control: private, no-store`. **ไม่แตะ** พฤติกรรม slips เดิม (surgical)
  - `src/lib/storage/local.ts` — `CONTENT_TYPES` + `".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"`
  - `scripts/e2e-admin.mts` — เพิ่ม: วางไฟล์ทดสอบ `private/calculator-imports/e2e-test.xlsx` ผ่าน storage driver → anonymous 401, ADMIN 200 + header attachment/nosniff, และ FINANCE 401 **ถ้า** script มี/สร้าง FINANCE user ได้ (ถ้าไม่มี ให้เพิ่มแบบ idempotent เหมือน user ทดสอบอื่นใน `e2e-admin-crud.mts`); ลบไฟล์ทดสอบตอนจบ

**DoD**
- [ ] `npx tsx scripts/e2e-admin.mts` — ✓ ทุกบรรทัดเดิม (รวม slip 200) + ✓ บรรทัดใหม่ 3 บรรทัด
- [ ] `npm run build` ✓
- [ ] `audit-compliance-reviewer`: prefix rule อยู่ก่อน role shortcut, ไม่มีทางอ่านผ่าน FINANCE/SALES, header ครบ
- Commit: `fix(admin): restrict calculator import files to admin and serve as attachment` (security fix ของ path ที่มีอยู่) + `test(e2e): cover calculator import file access by role`

**Rollback:** revert — slip เดิมไม่ถูกแตะ จึงไม่มีผลข้างเคียง

**สรุปหลังแก้:** _(กรอกหลังทำ)_

---

## S5 — Server actions: preview / apply / reset + read path

**สรุปก่อนแก้**
- ทำไม: จุด mutation + upload; ต้อง `requireRole("ADMIN")` + `withAudit()` + ไม่มี rows ก้อนใหญ่/ข้อมูลอ่อนไหวใน snapshot preview
- ไฟล์:
  - `src/actions/calculator-import.ts` (ใหม่)
    - `previewCalculatorImport(formData)` → `requireRole("ADMIN")` → `file instanceof File && file.size > 0` → `Buffer` → `validateXlsxBuffer` → `parseOnGridSheet` → dedupe sha256 (คืน import เดิม) → `storage.put("private/calculator-imports/<id>.xlsx")` → `auditedEntity("CalculatorImport").create` snapshot projection `{id,fileName,sha256,sizeBytes,rowCount,warningCount}` → คืน `{ok, importId, rows, warnings, diff, configVersion}`. Reject → `{error, messages}` **ไม่บันทึกอะไร**. fileName: basename + strip control chars + ตัด 120
    - `applyCalculatorImport({importId, version})` → `requireRole("ADMIN")` → load import → **`sizeTableSchema.parse(rows)` ซ้ำ** → optimistic `version` (`{conflict:true}` เหมือน `updateCalculatorConfig`) → `auditedEntity("CalculatorConfig").update({sizeTable, sizeTableImportId, version+1})` (snapshot full) → revalidate `/admin/pages/calculator`, `/th/calculator`, `/en/calculator` ผ่าน option `revalidate: () => [...]` แบบเดียวกับ `src/actions/calculator-config.ts`
    - ลำดับถ้า storage.put สำเร็จแต่ DB create fail → ลบไฟล์ (best-effort) เพื่อไม่ให้มีไฟล์กำพร้า
  - `src/actions/calculator-config.ts` — `resetCalculatorConfigToDefaults` เพิ่ม `sizeTable: null, sizeTableImportId: null` (ยังอยู่ใน `withAudit` เดิม)
  - `src/lib/content/index.ts` `getCalculatorConfig` — คืน `{ params, sizeTable, sizeTableSource }` ผ่าน `resolveSizeTable`; แก้ caller เดียว `src/app/[locale]/calculator/page.tsx` ให้ใช้ `.params` (พฤติกรรม public ไม่เปลี่ยนใน sprint นี้)
  - `src/lib/calculator-config.ts` — `rowToCalculatorParams` รับ row ใหม่ (ยังคงฟิลด์เดิมจนถึง S8)

**DoD**
- [ ] `npm run build` ✓; `verify-calculator.mts` ✓; `verify-calculator-import.mts` ✓; `e2e-calculator-config.mts` ✓ (reset ยังทำงาน); `e2e-admin-crud.mts` ✓ (audit ไม่พัง)
- [ ] `/th/calculator` + `/en/calculator` (production mode) ตัวเลขเท่า baseline S0 ที่ 7 บิล
- [ ] `audit-compliance-reviewer`: ทุก export ใน `calculator-import.ts` เริ่ม `requireRole("ADMIN")`, ห่อ audit, projection ไม่มี `rows`/path ภายใน, error ไม่รั่ว stack
- หมายเหตุ: e2e ของ action ผ่าน UI อยู่ใน S6 (action ต้องมี session) — ระบุใน report ว่า skip เพราะเหตุนี้
- Commits: `feat(calculator): add admin excel import preview and apply actions` · `feat(calculator): expose resolved size table from calculator config`

**Rollback:** revert — ยังไม่มี UI เรียก action; reset ที่เพิ่มฟิลด์ null ไม่มีผลเมื่อฟิลด์ว่างอยู่แล้ว

**สรุปหลังแก้:** _(กรอกหลังทำ)_

---

## S6a — Admin UI spec (ux-ui-expert, read-only)  ✅ ขนานกับ S1–S5

**สรุปก่อนแก้**
- ทำไม: การ์ด upload/preview/diff/ประวัติเป็น component ใหม่ (ไม่ได้ครอบใน #147 ซึ่งเป็น public) — ต้องมี spec ก่อน `nextjs-dev` สร้าง
- Output: `docs/plans/calculator-excel-import-admin-ui-spec.md` — layout ใน tab "ตัวเลขการคำนวณ": (1) กลุ่มฟิลด์ที่เหลือ (×10 + slider min/max/step), (2) การ์ด "ตารางขนาดระบบ (Excel)": สรุปชุดที่ใช้ (ที่มา default/ไฟล์, วันที่, ผู้อัพ, จำนวนขนาด), กล่องคำอธิบาย (ข้อความตาม #150 §2 ครบ), ปุ่มเลือกไฟล์ + อัพโหลด, preview (ตารางแถว, warnings, diff, บิลตัวอย่าง), ยืนยัน/ยกเลิก, ประวัติ 20 รายการ (ใช้ชุดนี้ / ดาวน์โหลดต้นฉบับ / badge "ใช้อยู่"), empty state "ยังไม่มีไฟล์ในระบบ — ใช้ไฟล์ Excel ของฝ่ายขาย"; reuse pattern การ์ด FAQ background (`1df28f6`) — inline confirm, toast, loading state; mobile
- ห้าม: dark-tech aesthetic (ดู design taste); รูปแบบใหม่ที่ไม่มีใน admin

**DoD:** spec ครบทุก state (idle / uploading / reject / preview มี warning / conflict / applied / history empty) · ไม่มี commit โค้ด · Commit: `docs(admin): add calculator excel import card ui spec`

**สรุปหลังแก้:** _(กรอกหลังทำ)_

---

## S6 — Admin tab: ลดฟิลด์ + การ์ด Excel import

**สรุปก่อนแก้**
- ทำไม: #146 ข้อ 4 — tab เหลือ ×10 + slider; #150 — การ์ด upload + คำอธิบาย + ดาวน์โหลด; #144 — บั๊ก "5kw kW"
- ไฟล์:
  - `src/app/admin/(dashboard)/pages/calculator/calculator-config-client.tsx` — ลบช่อง `sunHoursPerDay`, `pricePerKwhThb`, `daysPerMonth` (ถ้ามี), `billThreshold3To5Kw`, `billThreshold5To10Kw` + tick marks ในตัวอย่างสไลด์; ตัวอย่างผลคำนวณใช้ `recommendFromTable(activeTable, …)` แสดง `{kw} kW` + เฟส (แก้บรรทัด 341 `systemKey.replace("system","") kW`)
  - `src/lib/validations/calculator-config.ts` — schema เหลือ `annualSavingMonthsMultiplier`, `minBill`, `maxBill`, `stepBill` (ลบ superRefine threshold; คง min<max, step>0)
  - `src/actions/calculator-config.ts` — `updateCalculatorConfig` เขียนเฉพาะ 4 ฟิลด์ (ฟิลด์เก่าใน DB คงค่าเดิม → public เดิมยังได้ค่าเดิมจนถึง S7)
  - `src/app/admin/(dashboard)/pages/calculator/calculator-size-table-card.tsx` (ใหม่) — ตาม spec S6a; เรียก `previewCalculatorImport` / `applyCalculatorImport`; conflict → toast เดิม "มีคนแก้ก่อนคุณ" + ให้ preview ใหม่; ลิงก์ดาวน์โหลด `/files/private/calculator-imports/<id>.xlsx`; ข้อความ reject แสดงเป็น list
  - `src/app/admin/(dashboard)/pages/calculator/page.tsx` — โหลด active table + ประวัติ 20 รายการ (`select` เฉพาะ id, fileName, createdAt, uploadedBy.name, rowCount จาก rows length, warnings) ส่งเป็น prop; การ์ดแสดงเฉพาะ `canManageConfig` (ADMIN)
  - `scripts/e2e-calculator-config.mts` — เขียนใหม่ส่วน threshold: save ×10/slider; upload fixture ดี (จาก `scripts/lib/calculator-import-fixtures.ts` เขียนลง scratch temp) → เห็น preview + warning → ยืนยัน → summary แสดงไฟล์; upload fixture macro → เห็น reject; upload ไฟล์เดิมซ้ำ → "เคย upload แล้ว"; conflict 2 tab; rollback ใช้ชุดก่อน; reset → default; audit page มี `CalculatorImport` CREATE + `CalculatorConfig` UPDATE
- UX: ปุ่มยืนยันใช้ไม่ได้ระหว่าง pending; ไฟล์ > 2 MB เตือนฝั่ง client ก่อนส่ง (server ยังเป็นตัวจริง); `noValidate` ตาม convention

**DoD**
- [ ] `npm run build` ✓; `npx tsx scripts/e2e-calculator-config.mts` ✓ ทุกบรรทัด; `npx tsx scripts/e2e-admin-crud.mts` ✓; `npx tsx scripts/e2e-admin.mts` ✓
- [ ] Production mode: login ADMIN → `/admin/pages/calculator` ทำ flow ครบ; login role อื่น (MARKETING/EDITOR) → ไม่เห็นการ์ด และเรียก action ตรงได้ `{error}`
- [ ] "5kw kW" ไม่ปรากฏ (screenshot ตัวอย่างผล)
- [ ] `audit-compliance-reviewer` (มีการแก้ `src/actions/calculator-config.ts`)
- [ ] `design-business-reviewer` บน admin real render desktop + mobile (ตัดสิน clarity ของ preview/diff/คำอธิบาย)
- Commits: `feat(admin): add calculator excel import card with preview, diff and history` · `refactor(admin): drop per-row calculator params and tier thresholds from config tab` · `fix(admin): show recommended size without duplicated kw unit` · `test(e2e): cover calculator excel import upload, apply, rollback and reset`

**Rollback:** revert commits ของ S6 — DB ยังมีคอลัมน์เดิม, `sizeTable` ที่ apply ไว้ public ยังไม่อ่าน (จนถึง S7) → ไม่กระทบลูกค้า

**สรุปหลังแก้:** _(กรอกหลังทำ)_

---

## S7 — Public calculator ใช้ตาราง  (⏳ S5; ขนานกับ S6 ได้)

**สรุปก่อนแก้**
- ทำไม: #146/#147 — แนะนำจากตาราง, ลบ 3 โซน, พิมพ์บิลเกิน slider, tiles, สถานะพิเศษ; ตัวเลขยังเท่า prod เพราะ default table (#150)
- อ้างอิง markup: prototype branch `prototype/147-calculator-size-table` @ `afaa96c` (variant 0 + tile ของ variant A) — **ห้าม merge branch**, ดูเป็นแบบเท่านั้น
- ไฟล์:
  - `src/app/[locale]/calculator/page.tsx` — ส่ง `sizeTable` + packages `{sizeKw, priceThb, isPopular}` + params ให้ client
  - `src/app/[locale]/calculator/calculator-client.tsx` —
    1. ใช้ `recommendFromTable`; ลบ tier labels (`tierZone*`) + tick marks (บรรทัด ~95–155) และ `billToPercent` ถ้าไม่มีผู้ใช้เหลือ
    2. ช่องพิมพ์: clamp เฉพาะ `>= minBill` และ `<= lastRow.billMax` (ไม่ใช่ `config.maxBill`); slider คง `min/max/step` เดิม ค้างที่ปลายเมื่อเกิน; hint ใต้ slider
    3. ผลลัพธ์: บรรทัด "ขนาดระบบที่แนะนำ: {kw} kW" (+ "(1 หรือ 3 เฟส)" เมื่อ phases มีทั้งสอง) + tiles 3 ช่อง (แผง / หลังคา ตร.ม. / kWh ต่อเดือน) — ตัวเลข format ตาม locale
    4. สถานะ: `belowFirstRow` → หมายเหตุ; `tooLarge` → การ์ด "ระบบเกิน {lastKw} kW ปรึกษาทีมงาน" + CTA (ไม่มีตัวเลข); ไม่มี Package → ซ่อนคืนทุน + "ขอใบเสนอราคาเพื่อดูระยะคืนทุน"; `coversFullBill` → "ครอบคลุมค่าไฟเต็ม 100%" + บรรทัดย่อยแนะนำปรึกษา แทน ฿0
    5. CTA quote: ส่ง `bill` เฉพาะเมื่อ `bill <= AVG_MONTHLY_BILL_MAX` (Default #10)
    6. ป้าย "(ยอดนิยม)"/"(Popular)" ต่อท้ายขนาดเมื่อ Package ขนาดเดียวกัน `isPublished && isPopular` (Default #11) — `page.tsx` ต้องส่ง `isPopular` มาด้วย
  - `src/lib/validations/lead.ts` — export `AVG_MONTHLY_BILL_MAX = 1_000_000` และใช้แทน literal ใน `avgMonthlyBill` (ไม่เปลี่ยนพฤติกรรม)
  - `src/messages/th.json` **และ** `src/messages/en.json` namespace `calculator` — เพิ่ม: `resultSystemSize` ({kw}), `phaseBoth`, `tilePanels`, `tileRoofArea`, `tileKwhPerMonth`, `unitSqm`, `unitKwh`, `billTypeHint` (พิมพ์ได้ถึง {max}), `belowFirstRowNote`, `tooLargeTitle` ({size}), `tooLargeBody`, `noPaybackCta`, `coversFullBill`, `coversFullBillSub`, `popularSuffix`; ลบ `system3kw/5kw/10kw`, `tierZone3kw/5kw/10kw` หลัง `grep` ยืนยันไม่มีผู้ใช้ (ชื่อ key สุดท้ายให้ nextjs-dev ปรับได้แต่ต้องเหมือนกันทั้งสองไฟล์). **ไม่แตะ** `billRange*` (C2), FAQ `a1`
  - `scripts/e2e-calculator-config.mts` — ต่อท้าย: หลัง apply fixture ที่มีหลายขนาด → `/th/calculator` + `/en/calculator` พิมพ์บิลตัวอย่างแล้วเห็นขนาดใหม่, tooLarge, 100%; reset → กลับเป็น 3/5/10
- Copy EN: ให้ `nextjs-dev` ร่าง, `design-business-reviewer` ตัดสิน tone (ไม่ใช่แปลตรงตัว)

**DoD**
- [ ] `npm run build` ✓; `verify-calculator.mts` ✓; `e2e-calculator-config.mts` ✓; `npx tsx scripts/e2e-booking.mts` ✓ (CTA prefill)
- [ ] Production mode `/th/calculator` + `/en/calculator` ที่ 7 บิล baseline → ขนาด/ประหยัด/คืนทุน **เท่า S0**; บิล 1,500 → หมายเหตุ; 10,000 (พิมพ์) → "ระบบเกิน 10 kW"; 500–2,000 → "ครอบคลุมค่าไฟเต็ม 100%"
- [ ] `grep` key ใหม่ทุกตัวอยู่ทั้ง th.json/en.json; `i18n-parity-checker` ✓
- [ ] `design-business-reviewer` บน real render TH/EN × desktop/mobile (gate — ถ้า reject กลับ `nextjs-dev` ก่อนไป S8)
- Commits: `feat(site): recommend calculator system size from size table` · `refactor(site): share lead bill max with calculator cta` · `test(e2e): cover public calculator size table states`

**Rollback:** revert commits S7 — public กลับไปใช้ params เดิม (คอลัมน์ยังอยู่จนถึง S8)

**สรุปหลังแก้:** _(กรอกหลังทำ)_

---

## S8 — Cleanup legacy code + schema contract

**สรุปก่อนแก้**
- ทำไม: หลัง S6/S7 ไม่มีผู้อ่านโค้ดเก่า; ลบให้เหลือ source of truth เดียว. **เงื่อนไขเข้า:** equality sweep S1 เขียวบน main ล่าสุด
- ไฟล์:
  - `src/lib/calculator.ts` — ลบ `recommendSystemSizeKw`, `CalcResult.systemKey`, `SYSTEM_KEY_BY_SIZE_KW`, `calculateSavings`, `BILL_THRESHOLD_*`, `SUN_HOURS_PER_DAY`/`DAYS_PER_MONTH`/`PRICE_PER_KWH_THB` exports, ฟิลด์ใน `CalculatorParams`/`CALCULATOR_DEFAULTS` ที่เลิกใช้; คง `calculateTheoretical*` เฉพาะถ้ายังมีผู้ใช้ (grep)
  - `src/lib/calculator-config.ts`, `prisma/seed.ts` — ลบฟิลด์เก่า
  - `prisma/schema.prisma` — ลบ 5 ฟิลด์จาก `CalculatorConfig` → `npx prisma migrate dev --name drop_legacy_calculator_params` (migration มี `DROP COLUMN` — **Default #1: ห้ามรันบน prod ใน S9**; ใส่ comment หัวไฟล์ `-- DEFERRED: apply on prod only in the cleanup follow-up`)
  - `scripts/verify-calculator.mts` — แทน `calculateSavings` ด้วย `legacyReference()` inline (Default #3) — sweep 76 จุดยังรัน
  - `CONTEXT.md` — ลบคำอธิบาย threshold ถ้ามี
- ไม่แตะ: `docs/plans/assets/calculator-config-phase-a-*.sql` (ประวัติ)

**DoD**
- [ ] `grep -rn "calculateSavings\|systemKey\|billThreshold\|BILL_THRESHOLD\|recommendSystemSizeKw" src scripts prisma --include='*.ts' --include='*.tsx' --include='*.mts'` → ว่าง (ยกเว้น `src/generated/` หลัง regenerate และ migration เก่า)
- [ ] `npx prisma migrate dev` + `npx prisma db seed` ×2 ✓; `npm run build` ✓
- [ ] `npx tsx scripts/verify-all.mts` ✓ + `verify-calculator.mts` ✓ (sweep 76/76) + `verify-calculator-import.mts` ✓ + `e2e-calculator-config.mts` ✓
- [ ] `npx tsx scripts/restore-db.mts` dry-run กับ snapshot ที่ถ่ายก่อน S8 → บันทึกผล (R9)
- [ ] `audit-compliance-reviewer` (แตะ `src/actions/`/zod)
- Commits: `refactor(calculator): remove legacy tier thresholds and global sun/price params` · `test(calculator): keep legacy equality proof after removing old tiers`

**Rollback:** revert — migration DROP กระทบแค่ dev DB (`prisma migrate reset`)

**สรุปหลังแก้:** _(กรอกหลังทำ)_

---

## S9 — Production release (โค้ด; ตัวเลขยังเท่าเดิม)

**สรุปก่อนแก้**
- ทำไม: ขึ้นโค้ดทั้งหมดด้วย default legacy table → ลูกค้าเห็นตัวเลขเดิม (#150); แยกจากการเปลี่ยนตัวเลข (S10)
- ขั้นตอน (ตามลำดับ ห้ามข้าม):
  1. **อ่าน `docs/plans/kkd-shared-hosting-redeploy-runbook.md` ทั้งไฟล์** (non-negotiable rules: FTP โดย human `!`, schema first verified)
  2. `deploy-verify` ตรวจ: build artifact, DDL asset S3 (additive only, InnoDB), ยืนยันว่า migration `drop_legacy_calculator_params` **ไม่อยู่** ในรายการ SQL ที่จะรัน
  3. Snapshot prod ตาม runbook (DB + private) ก่อนแตะอะไร
  4. phpMyAdmin: รัน `docs/plans/assets/calculator-excel-import-production-ddl.sql` → `SHOW CREATE TABLE CalculatorImport` (ENGINE=InnoDB) + `SHOW COLUMNS FROM CalculatorConfig` เห็น `sizeTable`, `sizeTableImportId` — ตรวจเองก่อนไปต่อ
  5. Build (`scripts/build-shared-hosting-deploy.mts`) → human FTP upload (`!`) → extract → restart Passenger (touch) — `hosting-deploy-specialist`
  6. ตรวจว่า `STORAGE_ROOT/private/` เขียนได้ (โฟลเดอร์ `calculator-imports/` สร้างเองด้วย `mkdir recursive` ตอน upload แรก)
  7. Smoke: `npx tsx scripts/smoke-test-production.mts --check /th/calculator --expect-text "คำนวณ" --check /en/calculator --expect-text "<EN title>"` (4 standard ✓ + 2 custom ✓)
  8. เปิด browser จริง `/th|en/calculator` ที่ 7 บิล baseline → ตัวเลขเท่า S0; mobile 1 viewport
  9. Admin prod login ADMIN → tab แสดง ×10/slider + การ์ด Excel (summary = "ค่าเริ่มต้น"); **ยังไม่ upload**
- Release note: DB มีคอลัมน์เก่า 5 ตัวค้าง (ตั้งใจ) → follow-up DROP

**DoD**
- [ ] หลักฐานข้อ 4, 7, 8, 9 (output/screenshot) ใน "สรุปหลังแก้"
- [ ] อัปเดต Status ของแผนนี้ + runbook "Last deploy" ถ้า runbook มีส่วนนั้น
- Commit: `docs(deploy): record calculator excel import release evidence`

**Rollback:** (a) โค้ดพัง → upload artifact ก่อนหน้า (runbook) — คอลัมน์เดิมยังอยู่จึงทำงานได้ทันที; คอลัมน์/ตารางใหม่ปล่อยไว้ได้ (additive ไม่กระทบโค้ดเก่า). (b) DDL ผิด → restore snapshot ข้อ 3 ตาม runbook

**สรุปหลังแก้:** _(กรอกหลังทำ)_

---

## S10 — Post-deploy: เปิดใช้ตาราง Excel จริง (ขั้นตอนข้อมูล ไม่ใช่ deploy)

**สรุปก่อนแก้**
- ทำไม: #150 — ตาราง 31 ขนาดขึ้นเว็บเมื่อ ADMIN upload + ดู preview + ยืนยันบน prod เท่านั้น; การเปลี่ยนนี้ทำให้ช่วง 4,000–6,999 ฿ ได้ 6/8 kW ที่ไม่มี Package (คืนทุนหาย → CTA) — owner ต้องรู้ก่อนกด
- ขั้นตอน:
  1. Owner/ADMIN login prod → `/admin/pages/calculator` → upload `stuffs/คำนวณติดตั้ง.xlsx` (จากเครื่อง owner — ไม่ผ่าน repo)
  2. Screenshot preview: จำนวนขนาด (คาด 31), warnings (คาด: Package ที่ไม่มี?, slider), diff บิลตัวอย่าง — ส่งให้ owner อนุมัติ
  3. ยืนยัน → `/th|en/calculator`: 2,500→3 kW, 3,000→5 kW, 4,500→ขนาดไม่มี Package + CTA, 25,500→40 kW 100%, พิมพ์ 3,000,000→"ระบบเกิน 3000 kW/3 MW…" (ตรวจ format ขนาด MW ด้วยตา)
  4. ดาวน์โหลดต้นฉบับจากประวัติ (ADMIN) ได้ไฟล์เดิม (sha256 ตรง)
  5. Audit page: `CalculatorImport` CREATE + `CalculatorConfig` UPDATE โดยผู้ใช้ owner
  6. (optional) `design-business-reviewer` ดู render หลังเปลี่ยนตัวเลข — ช่วง 4,000–6,999 ที่ไม่มีคืนทุน อ่านแล้วยังชวนขอใบเสนอราคา
- **ไม่ต้อง deploy / restart** (apply ใช้ `revalidatePath`)

**DoD:** หลักฐานข้อ 2–5 · owner ยืนยันในแชท/issue · Commit (docs only): `docs(calculator): record excel size table go-live on production`

**Rollback:** กด "คืนค่าเริ่มต้น" (sizeTable null → legacy) หรือ "ใช้ชุดนี้" กับชุดก่อนหน้า — มีผลทันที ไม่ต้อง deploy

**สรุปหลังแก้:** _(กรอกหลังทำ)_

---

## Verification (รวม)

```bash
npm run build
npx tsx scripts/verify-calculator.mts           # รวม equality sweep 76/76
npx tsx scripts/verify-calculator-import.mts    # guards + fixtures สังเคราะห์
npx tsx scripts/verify-storage-engine.mts
npm run start &                                 # production mode
npx tsx scripts/e2e-calculator-config.mts
npx tsx scripts/e2e-admin.mts                   # /files calculator-imports ADMIN-only
npx tsx scripts/verify-all.mts                  # booking + admin + admin-crud
npx tsx scripts/smoke-test-production.mts --check /th/calculator --expect-text "คำนวณ"   # หลัง deploy
```
หน้าที่ต้องเปิดดู: `/th/calculator`, `/en/calculator` (desktop + mobile), `/admin/pages/calculator` (ADMIN + role อื่น), `/admin/audit`

## Out of scope / follow-ups

- **DROP คอลัมน์** `billThreshold3To5Kw`, `billThreshold5To10Kw`, `sunHoursPerDay`, `daysPerMonth`, `pricePerKwhThb` บน prod — deploy ถัดไปหลังฟีเจอร์นิ่ง (อย่างน้อยหลัง S10 + 1 สัปดาห์) ใช้ migration จาก S8 + snapshot ก่อน → เปิด issue แยก
- FAQ `a1` copy ที่พูดถึง "5KW / 1,500–3,000 บาท" — copy การตลาด แจ้ง owner แยก
- ลบ i18n keys ที่ตายอยู่แล้ว (`billRange*`, `methodology*`, `colBillRange`, `disclaimer`) — chore แยก (C2)
- ~~ป้าย "(ยอดนิยม)"~~ — ตัดสินแล้ว: ใช้ `Package.isPopular` (Default #11, อยู่ใน S7)
- Sheet Hybrid, formula engine, ราคายี่ห้อ/ราคาจาก Excel, template export (#143 Out of scope, #150)
- ปุ่มลบ import / retention policy — ทบทวนเมื่อประวัติ > 100 แถว
- ขยาย `avgMonthlyBill` max ของ lead เกิน 1,000,000 — ถ้า owner ต้องการ lead ระดับ MW พร้อมบิล (Default #10)
