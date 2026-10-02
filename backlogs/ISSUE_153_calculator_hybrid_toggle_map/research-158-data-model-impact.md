# Research: data model, หลังบ้าน import 2 ชีต, lead fields และ impact analysis

> **Asset ของ ticket #158 (map #153) วันที่ 2026-10-02**
>
> **อิงการตัดสินจาก ticket เหล่านี้:**
> - #154 สัญญาการอ่านชีต Hybrid
> - #156 กติกาแนะนำขนาดและตัวเลือกแบต
> - #155 นิยามราคาต่ำสุด
> - #161 การแก้ตารางเองเทียบกับการ import
>
> **ต่อยอดจาก:** `backlogs/done/ISSUE_143_calculator_excel_import_map/research-148-data-model-impact.md` (data model ของ On-grid ที่ขึ้น prod แล้ว)
>
> **ข้อเสนอเชิงสถาปัตยกรรม + รายการไฟล์ที่กระทบ ยังไม่มีการแก้โค้ด**

## 0. ข้อค้นพบที่ต้องระวัง

| # | ข้อค้นพบ | หลักฐาน | ผลต่อแผน |
|---|---|---|---|
| H1 | **หน้า public ส่งทั้งตารางไปที่ browser:** ถ้าเพิ่มราคายี่ห้อลงใน JSON เดียวกันแล้วส่งต่อ ราคาแยกยี่ห้อจะหลุดไปใน RSC payload ซึ่งขัดกับการตัดสินใน #155 | `calculator/page.tsx` ส่ง `sizeTable={calculatorConfigResult.sizeTable}` ให้ `CalculatorClient` | ต้องมี **projection ฝั่ง server** (§3) และ test ว่า payload ไม่มีชื่อยี่ห้อหรือราคาแยก |
| H2 | **audit ของ `CalculatorConfig` เป็น `snapshot: "full"`:** ถ้าเก็บตาราง Hybrid บน config ทุก save/apply จะเก็บ before/after ที่มีราคาทุกยี่ห้อ | `src/actions/calculator-import.ts` `calculatorConfigEntity` | ยอมรับได้ เพราะ audit อ่านได้เฉพาะ admin และราคาไม่ใช่ secret ตาม `auditView()` ขนาดราว 52 แถว × 15 ฟิลด์ต่อด้าน ถ้าอยากลดให้เปลี่ยนเป็น projection (ดูข้อเสนอ D2) |
| H3 | **ประวัติตาราง (`CalculatorImport`) ผูกกับไฟล์:** `fileName`/`fileKey`/`sha256`/`sizeBytes` เป็น NOT NULL แต่เวอร์ชันที่แก้เองไม่มีไฟล์ | `prisma/schema.prisma:695-710`, การ์ดประวัติใช้ `fileName` และ `uploadedBy` | ต้อง `MODIFY … NULL` และเพิ่ม `source` (§1.2) **กระทบ rollback ของ code:** ถ้ามีแถว MANUAL แล้ว rollback ไป build เก่า Prisma client เก่าจะ throw เมื่อเจอ null (ดู §6 R2) |
| H4 | **lead มีระบบที่สนใจอยู่แล้ว:** `Lead.interestedSystems` (JSON array `ON_GRID`/`HYBRID`/`OFF_GRID`) และ booking page รู้จักการ prefill จาก service slug | `prisma/schema.prisma:188-191`, `booking/page.tsx:84-88` | เพิ่มแค่**ขนาดแบต** 1 คอลัมน์ ส่วนประเภทระบบใช้ฟิลด์เดิม |
| H5 | **backup เป็นแบบ table-level และอ่านคอลัมน์แบบ dynamic** | `scripts/lib/create-backup.ts:83` `Object.keys(rows[0])` | ถ้า**ไม่สร้างตารางใหม่** ก็ไม่ต้องแตะ `storage-engine-contract.ts` (ข้อเสนอนี้ไม่สร้างตารางใหม่) |
| H6 | **round-trip ของ export ทำได้จริง:** spike เขียนชีต On-grid ด้วย ExcelJS (สูตร + `result`) แล้วอ่านกลับด้วย `parseOnGridSheet` ได้ `DEFAULT_SIZE_TABLE` ตรงทุกค่า 0 warning | spike แบบใช้แล้วทิ้ง (ลบแล้ว) | export ต้องเขียน**สูตรพร้อม `result`** ไม่งั้นช่องหลังคา (สูตร) จะไม่มี cached value แล้วได้ warning |

## 1. Data model (ข้อเสนอ)

### 1.1 `CalculatorConfig` เพิ่ม 1 คอลัมน์
```prisma
model CalculatorConfig {
  // เดิม: annualSavingMonthsMultiplier, minBill, maxBill, stepBill, sizeTable, sizeTableImportId, version
  hybridSizeTable Json?   // ใหม่: HybridRow[] ที่ใช้งานอยู่ (null = ไม่มีตาราง Hybrid → ซ่อน toggle)
}
```
- `sizeTableImportId` ยังเป็น**ตัวชี้เวอร์ชันที่ใช้งานอยู่** ซึ่งตอนนี้หมายถึง "ชุด" ที่มีทั้ง On-grid และ Hybrid (ไม่เปลี่ยนชื่อคอลัมน์ เพื่อเลี่ยง DDL rename บน prod)
- apply และ save ยังเป็น `calculatorConfig.update()` ครั้งเดียว ได้ทั้ง 2 ตารางแบบ atomic (เหตุผลเดียวกับ F4 ของ research-148)
- **D1:** `hybridSizeTable = null` คือไม่มีตาราง Hybrid ซึ่ง public จะซ่อน toggle (map ข้อ 6) **ไม่มี default ตาราง Hybrid ที่ commit ไว้** เพราะ repo เป็น PUBLIC และตาราง Hybrid มีราคา

### 1.2 `CalculatorImport` เปลี่ยนจาก "ไฟล์ที่ upload" เป็น "เวอร์ชันของชุดตาราง"
```prisma
model CalculatorImport {
  id           String    @id @default(cuid())
  source       String    @default("EXCEL") @db.VarChar(10)  // ใหม่: "EXCEL" | "MANUAL"
  fileName     String?   @db.VarChar(120)   // → nullable (MANUAL ไม่มีไฟล์)
  fileKey      String?   @db.VarChar(120)   // → nullable
  sha256       String?   @db.Char(64)       // → nullable
  sizeBytes    Int?                         // → nullable
  rows         Json                         // On-grid SizeRow[] (ชื่อเดิม ไม่ rename)
  hybridRows   Json?                        // ใหม่: HybridRow[] | null (null = ชุดนี้ไม่มี Hybrid)
  warnings     Json
  uploadedById String    @db.VarChar(40)    // ใช้เป็น "ผู้บันทึก" ทั้ง EXCEL และ MANUAL
  uploadedBy   AdminUser @relation(fields: [uploadedById], references: [id])
  createdAt    DateTime  @default(now())
  @@index([createdAt])
  @@index([sha256])
}
```
- **ไม่สร้างตารางใหม่:** ประวัติเดียวกันตามที่ตัดสินใน #161 ข้อ 2, rollback ยังเป็น `applyCalculatorImport` ตัวเดิม และไม่ต้องแตะ backup contract (H5)
- ใช้ `source` เป็น VarChar ไม่ใช้ Prisma enum เพื่อให้ DDL บน prod ง่าย และใช้ pattern เดียวกับคอลัมน์ string อื่นในตารางนี้ การตรวจค่าให้ zod ทำ
- **dedupe sha256** ใช้เฉพาะ `source = "EXCEL"` ส่วน MANUAL ไม่มี hash ทุก save เป็นเวอร์ชันใหม่เสมอ
- **ชื่อในหน้าประวัติ:** `EXCEL` แสดง "Excel: <fileName>" พร้อมลิงก์ดาวน์โหลดต้นฉบับ ส่วน `MANUAL` แสดง "แก้ในหลังบ้าน" ไม่มีลิงก์

### 1.3 `HybridRow` (รูปใน JSON ไม่ merge 1φ/3φ ตาม research-154 E9)
```ts
type HybridRow = {
  kw: number; phase: 1 | 3; batteryKwh: number;           // key = (kw, phase, batteryKwh) ห้ามซ้ำ
  sunHours: number; days: number; pricePerKwh: number;    // ต้องเท่ากันทุกแถวใน kW เดียวกัน (E11)
  panels: number; roofM2: number; billMin: number; billMax: number; // เท่ากันทุกแถวใน kW เดียวกัน
  brandPrices: { brand: string; priceThb: number | null }[]; // ตามลำดับคอลัมน์ในกลุ่ม "ยี่ห้อ"; 0/ว่าง → null (#155 ข้อ 1)
};
```
- **ยี่ห้อเป็น dynamic** อ่านจาก header ของกลุ่ม `ยี่ห้อ` ถ้าเจ้าของเพิ่มหรือลดยี่ห้อ ไม่ต้องแก้โค้ด หลังบ้านแก้ชื่อยี่ห้อไม่ได้ (เปลี่ยนชุดยี่ห้อได้ทาง Excel อย่างเดียว) เพื่อลดขอบเขต UI ส่วนนี้ให้ #162 ยืนยัน
- zod `hybridTableSchema` ตรวจ:
  - key ไม่ซ้ำ
  - ค่าที่ต้องเท่ากันใน kW เดียวกันต้องเท่ากันจริง
  - billMax ต่อ kW เพิ่มขึ้นเคร่งครัด
  - ทุก kW/phase มีแถว `batteryKwh = 0` (E13)
  - ชื่อยี่ห้อตรงกันทุกแถว

## 2. Validator ร่วม (#161 ข้อ 4)

แยกเป็น 2 ชั้น เพื่อให้ทั้ง import และการแก้เองใช้กติกาเดียวกัน

| ชั้น | ทำอะไร | ใช้โดย |
|---|---|---|
| **อ่านชีต** (`readOnGridSheet` / `readHybridSheet`) | หาคอลัมน์จาก label, อ่าน cell เป็น `RawRow[]` พร้อม `excelRow` และ issue ระดับ cell (สูตรไม่มี cached result, หน่วยผิด, ข้อความไม่ใช่ตัวเลข) | import เท่านั้น |
| **ตรวจตาราง** (`validateOnGridTable` / `validateHybridTable`) | merge 1φ/3φ (On-grid), แถวซ้ำ, billMax เพิ่มขึ้น, ค่าในช่วงที่รับได้, ค่าใน kW เดียวกันต้องตรงกัน, warning E3/E5, `theoreticalExceedsBill` → คืน `{rows, issues[], warnings[]}` โดย issue อ้างอิง**ตำแหน่งแบบกลาง** (`{table, rowIndex, field}`) ที่ import แปลงเป็นเลขแถว Excel และหลังบ้านแปลงเป็น cell ในตารางแก้ไข | import + การแก้เอง |

- ปัจจุบัน `parseOnGridSheet` รวมทั้งสองชั้นไว้ด้วยกัน (`parse-on-grid.ts:259-597`) ส่วน merge และ monotone อยู่ในบรรทัด 474-580 ต้อง**ย้ายออกโดยไม่เปลี่ยนพฤติกรรม** โดยมี `scripts/verify-calculator-import.mts` เดิมคุม
- **รวบ warning (Q5 ของ research-154):**
  - ไม่ออก `formulaCachedWarning` สำหรับคอลัมน์ราคายี่ห้อ เพราะเป็นสูตรทั้งคอลัมน์ตามแบบไฟล์ต้นแบบ
  - E3 ออกเป็น **warning เดียว** "ราคาแบต N ช่องไม่มีราคาชุดไม่มีแบตของยี่ห้อเดียวกัน — ไม่นำมาคิด (เช่น …)" แสดงตัวอย่าง 3 ตำแหน่ง
  - E5 ออกเป็น 1 warning ต่อ kW

## 3. Projection ไปหน้า public (#155 ข้อ 5, #156)

ฟังก์ชัน server-only `toPublicHybridTable(rows: HybridRow[]): PublicHybridSize[]` (อยู่ใน `src/lib/calculator-hybrid.ts` ห้าม import ใน client)

```ts
type PublicHybridSize = {
  kw: number; phases: (1|3)[];                  // phase ที่มีใน kW นี้ (แสดง "รองรับ 1/3 เฟส")
  sunHours: number; days: number; pricePerKwh: number; panels: number; roofM2: number;
  billMin: number; billMax: number;
  batteries: { batteryKwh: number; phases: (1|3)[]; minPriceThb: number | null }[]; // เรียงตาม kWh
};
```
- `minPriceThb` = ราคาที่ใช้ได้ต่ำสุดของแบตนั้นในทุก phase ตามกติกา E3 (#155 ข้อ 1-2) **ไม่มีชื่อยี่ห้อ**
- `getCalculatorConfig()` คืน `hybridTable: PublicHybridSize[] | null` แล้ว `page.tsx` ส่งให้ client โดยไม่ส่ง `HybridRow` ดิบ
- logic ฝั่ง client เป็นฟังก์ชัน pure ตัวใหม่ `recommendHybrid(bill, table, batteryKwh, multiplier)` ทำตาม #156:
  - เลือก kW ด้วยกติกาเดียวกับ On-grid
  - ถ้าไม่มีแบตที่เลือกไว้ ให้เลือกแบตที่ใกล้ที่สุด
  - cap ยอดประหยัดที่ค่าไฟ
  - คืน belowFirstRow / tooLarge
  - payback ใช้ `minPriceThb` และคืน null เมื่อไม่มีราคา
- **test ที่ต้องมี:**
  - serialize props ของ `CalculatorClient` แล้วต้องไม่มีชื่อยี่ห้อหรือราคาแยก
  - ค่าจากไฟล์จริง (ถ้ามีในเครื่อง) ต้องตรงกับตาราง §5 ของ research-154

## 4. Server actions และ route

| Action / Route | ขั้นตอน | Audit |
|---|---|---|
| `previewCalculatorImport(formData)` (มีอยู่ ขยาย) | guard ไฟล์ → อ่านชีต On-grid (บังคับ) + Hybrid (ถ้ามี) → validator → dedupe sha256 → `storage.put` → create `CalculatorImport{source:"EXCEL", rows, hybridRows}` → คืน diff ของ**ทั้ง 2 ตาราง** | projection เดิม + `source`, `hybridRowCount` |
| **ใหม่** `saveCalculatorTables({onGrid, hybrid, version})` | `requireRole("ADMIN")` → zod รูปข้อมูล → **validator ตัวเดียวกัน** → ถ้ามี issue คืน `{ok:false, issues}` (ชี้ cell) → เช็ค version → create `CalculatorImport{source:"MANUAL"}` แล้ว apply ทันที | 2 รายการ: create import (projection) + update config (full) |
| `applyCalculatorImport` (มีอยู่) | เพิ่ม `hybridSizeTable: imp.hybridRows` และ zod re-validate ทั้งคู่ | เดิม |
| `resetCalculatorConfigToDefaults` (มีอยู่) | เพิ่ม `hybridSizeTable: null` | เดิม |
| **ใหม่** `GET /api/admin/calculator/export` | `requireRole("ADMIN")` → สร้าง xlsx 2 ชีตตามไฟล์ต้นแบบ (header 2 แถว, ลำดับคอลัมน์, merged block ของ Hybrid) ค่าที่กรอกเป็น value ส่วนช่องคำนวณเป็น**สูตรพร้อม `result`** (H6) ราคายี่ห้อเป็น value → `Content-Disposition: attachment` + `nosniff` + `Cache-Control: no-store` | ไม่ต้อง audit (อ่านอย่างเดียว) |

**การตัดสินที่ research เสนอ (ไม่เคยถาม user):**
- **D3:** ไฟล์ที่**ไม่มีชีต Hybrid** ให้ยอมรับ แล้วชุดนั้นมี `hybridRows = null` เมื่อ apply ตาราง Hybrid จะถูกล้างและ toggle จะถูกซ่อน
  - preview ต้องแสดง warning สีเด่นว่า "ไฟล์นี้ไม่มีชีต Hybrid — ตาราง Hybrid ปัจจุบัน (N แถว) จะถูกลบเมื่อยืนยัน"
  - เหตุผล: สอดคล้องกับ "ไฟล์ทับทั้งตาราง" (#161 ข้อ 3) และไฟล์ On-grid อย่างเดียวที่ใช้ได้ทุกวันนี้ยังใช้ได้ต่อ
- **D4:** ถ้า**ชีต Hybrid ผิด** ให้ reject ทั้งไฟล์ แม้ชีต On-grid จะถูก เพราะชุดเป็น atomic
- **D5:** การกด save ตอนแก้เองคือ **บันทึกและใช้ทันที** (ไม่มี draft) ส่วนการทดลองดูผลก่อน save ให้ทำในหน้าจอ (preview ฝั่ง client ด้วยฟังก์ชันเดียวกับ public)
- **D6:** export จะไม่สร้างบล็อก HUAWEI (ราคาแบต AL59-62) และไม่สร้างสูตรราคาแบบ `ฐาน + ราคาแบต × n` แต่เขียนราคาเป็นค่าที่เก็บไว้ ผลคือไฟล์ที่ export ไม่มีสูตรราคาให้เจ้าของแก้ราคาแบตจุดเดียว ถ้าเจ้าของต้องการให้เขียนสูตรกลับ ต้องเก็บราคาแบตแยก ซึ่งอยู่นอกขอบเขตที่ตัดสินไว้

## 5. Lead fields (map ข้อ 7)

| จุด | การเปลี่ยน |
|---|---|
| `src/lib/booking-links.ts` `bookingLinkParamsSchema` (`.strict()`) | + `system: z.enum(["on-grid","hybrid"]).optional()` + `battery: z.string().regex(/^\d{1,4}$/).optional()` |
| `calculator-client.tsx:187` CTA | โหมด Hybrid ส่ง `bookingHref({tab:"quote", bill, system:"hybrid", battery})` ส่วนโหมด On-grid ส่ง `system:"on-grid"` |
| `booking/page.tsx` | `system` → `initialInterestedSystems` (ใช้ `SERVICE_SLUG_TO_INTERESTED_SYSTEM` เดิม) และ `battery` ส่งต่อเป็นค่าเริ่มต้นเฉพาะเมื่อ `system=hybrid` |
| `booking-forms.tsx` | ช่อง "ขนาดแบตที่สนใจ (kWh)" แบบ hidden หรือแสดงเฉพาะเมื่อติ๊ก HYBRID (UI ให้ #157 ตัดสิน) ใช้ key i18n TH/EN |
| `prisma/schema.prisma` `Lead` | + `interestedBatteryKwh Int?` |
| `src/lib/validations/lead.ts` | + `interestedBatteryKwh` int 0–10000 optional **และ server ล้างเป็น null ถ้า `interestedSystems` ไม่มี HYBRID** |
| `src/actions/submit-quote.ts` | บันทึกฟิลด์ใหม่ (survey ไม่แตะ) |
| `lead-detail-client.tsx` + `leads/[id]/page.tsx` | แสดง "ขนาดแบตที่สนใจ" |
| `src/lib/notifications/format.ts` | + บรรทัด `แบตเตอรี่ที่สนใจ: N kWh` เมื่อมีค่า |
| `src/lib/reports/export-rows.ts` (2 ชีต) | + คอลัมน์ "ขนาดแบตที่สนใจ (kWh)" |
| `src/lib/auth/index.ts` `LEAD_PII_FIELDS` | **ไม่เพิ่ม** เพราะเป็นบริบทของระบบ ไม่ใช่ PII (เหตุผลเดียวกับ `interestedPackageSlug`) |

## 6. ความเสี่ยงและการ deploy (shared hosting, DDL ทำมือผ่าน phpMyAdmin)

**DDL แบบ additive แยกตาม release (#161 ข้อ 6):**

| Release | DDL (InnoDB, utf8mb4) |
|---|---|
| R1 On-grid: แก้เอง + export + ประวัติรวม | `ALTER TABLE CalculatorImport ADD COLUMN source VARCHAR(10) NOT NULL DEFAULT 'EXCEL', MODIFY fileName VARCHAR(120) NULL, MODIFY fileKey VARCHAR(120) NULL, MODIFY sha256 CHAR(64) NULL, MODIFY sizeBytes INT NULL;` |
| R2 Hybrid | `ALTER TABLE CalculatorImport ADD COLUMN hybridRows JSON NULL;` `ALTER TABLE CalculatorConfig ADD COLUMN hybridSizeTable JSON NULL;` `ALTER TABLE Lead ADD COLUMN interestedBatteryKwh INT NULL;` |

| # | ความเสี่ยง | ระดับ | การจัดการ |
|---|---|---|---|
| R1 | ราคาแยกยี่ห้อหลุดไปที่ browser | สูง | projection ใน §3 + test serialize props + review โดย `audit-compliance-reviewer` |
| R2 | rollback code หลังมีแถว MANUAL แล้ว ทำให้ Prisma client เก่า throw ที่ `fileName` null | กลาง | **rollback ของ R1 ต้องทำก่อนมีการ save ด้วยมือครั้งแรก** หรือลบแถว MANUAL ก่อน rollback ให้เขียนไว้ใน runbook ของ sprint |
| R3 | refactor parser เปลี่ยนพฤติกรรม On-grid บน prod | กลาง | ย้ายโค้ดโดยไม่แก้ logic และให้ `verify-calculator-import.mts` เดิมผ่านก่อนเพิ่มอะไร |
| R4 | export แล้ว import กลับไม่เท่าเดิม | กลาง | round-trip test ใน verify script ทั้ง 2 ชีต (H6) |
| R5 | ใช้ไฟล์ Excel จริงเป็น fixture | สูง (repo PUBLIC) | fixture สังเคราะห์ตอนรันเหมือน S2 เดิม ส่วนไฟล์จริงใช้เฉพาะถ้ามีในเครื่อง |
| R6 | ไฟล์ Excel จริงหลุดเข้า repo | — | ตรวจแล้ว: `.gitignore:63` มี `/stuffs/` และ `git check-ignore` ยืนยันว่าไฟล์จริงถูก ignore |

## 7. Impact: ไฟล์ที่กระทบ

| ไฟล์ | R1 | R2 | หมายเหตุ |
|---|---|---|---|
| `prisma/schema.prisma` + migration | ✓ | ✓ | §1, §6 |
| `src/lib/calculator-import/parse-on-grid.ts` → แยก `read-on-grid.ts` + `validate-on-grid.ts` | ✓ | | R3 |
| `src/lib/calculator-import/read-hybrid.ts`, `validate-hybrid.ts` (ใหม่) | | ✓ | research-154 §2 |
| `src/lib/calculator-import/messages.ts` | ✓ | ✓ | issue ตำแหน่งกลาง + ข้อความ Hybrid + รวบ warning |
| `src/lib/calculator-import/diff.ts` | | ✓ | diff ตาราง Hybrid (key = kW/phase/แบต) |
| `src/lib/calculator-import/export.ts` (ใหม่) | ✓ (On-grid) | ✓ (Hybrid) | H6 |
| `src/lib/calculator-size-table.ts` | ✓ | | validator ร่วม |
| `src/lib/calculator-hybrid.ts` (ใหม่: `HybridRow`, schema, `toPublicHybridTable`, `recommendHybrid`) | | ✓ | §1.3, §3 |
| `src/lib/content/index.ts` `getCalculatorConfig` | | ✓ | คืน `hybridTable` (projection) |
| `src/actions/calculator-import.ts` | ✓ | ✓ | §4 |
| `src/app/api/admin/calculator/export/route.ts` (ใหม่) | ✓ | ✓ | §4 |
| `src/app/admin/(dashboard)/pages/calculator/*` (การ์ดตาราง, ตารางแก้ไข, ประวัติ, page query) | ✓ | ✓ | UI ตาม #162 |
| `src/app/[locale]/calculator/page.tsx`, `calculator-client.tsx` | | ✓ | toggle, แบต, CTA ตาม #157 |
| `src/messages/th.json` + `en.json` | | ✓ | toggle / แบต / phase / ช่องแบตในฟอร์ม booking (i18n-parity-checker) |
| `src/lib/booking-links.ts`, `booking/page.tsx`, `booking-forms.tsx`, `validations/lead.ts`, `submit-quote.ts` | | ✓ | §5 |
| `leads/[id]/*`, `notifications/format.ts`, `reports/export-rows.ts` | | ✓ | §5 |
| `scripts/verify-calculator-import.mts` | ✓ | ✓ | refactor ต้องคุมพฤติกรรมเดิม + Hybrid + round-trip |
| `scripts/verify-calculator.mts` | | ✓ | `recommendHybrid` กับ fixture สังเคราะห์ |
| `scripts/e2e-calculator-config.mts` | ✓ | ✓ | แก้เอง → save → public เปลี่ยน; export → import กลับ; rollback; conflict |
| `scripts/e2e-booking.mts` | | ✓ | CTA Hybrid แล้ว lead ต้องมี HYBRID + แบต |
| `CONTEXT.md` | ✓ | ✓ | ศัพท์ "ชุดตาราง (เวอร์ชัน)", "แก้ในหลังบ้าน", "Hybrid row", "ราคาที่ใช้ได้" |
| `scripts/lib/storage-engine-contract.ts`, `backup-db.mts` | — | — | ไม่ต้องแก้ (H5) |
| `src/app/files/[...key]/route.ts` | — | — | ไม่ต้องแก้ เพราะ prefix `private/calculator-imports/` ADMIN-only อยู่แล้ว |

**ไม่กระทบ:** หน้า Packages, การคำนวณของ On-grid ฝั่ง public (R1 เปลี่ยนแค่หลังบ้าน), หน้า audit (`diffFields()` แสดง JSON ก้อนเดียวเหมือนเดิม)
