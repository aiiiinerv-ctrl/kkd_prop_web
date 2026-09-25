# Research — data model, audit, rollback และ impact analysis ของ Excel import

> Asset ของ ticket #148 (map #143), 2026-09-25. อิงการตัดสินใจใน #145 (สัญญาการอ่านไฟล์), #146 (กติกาแนะนำ), #147 (UI).
> เป็นข้อเสนอเชิงสถาปัตยกรรม + รายการไฟล์ที่กระทบ ให้แผน sprint (#149) ใช้ตรง ๆ — ยังไม่มีการแก้โค้ด

## 0. ข้อค้นพบที่ต้องทำก่อน/ระวัง (security & ops)

| # | ข้อค้นพบ | หลักฐาน | ผลต่อแผน |
|---|---|---|---|
| F1 | **repo เป็น PUBLIC** และ Excel จริงมี **ราคาแยกยี่ห้อ (ข้อมูลธุรกิจภายใน)** | `gh repo view` → `PUBLIC`; `/docs/stuffs/` gitignored แต่ **`/stuffs/` (root) ไม่ถูก ignore** | S0: เพิ่ม `/stuffs/` ใน `.gitignore`; **ห้าม commit ไฟล์ Excel จริงเป็น fixture** — fixture ต้องสร้างแบบสังเคราะห์ตอนรัน test; ค่า default ที่ commit เป็น TS ต้องมีเฉพาะคอลัมน์ที่ import (ไม่มีราคา) |
| F2 | route `/files` ให้ **FINANCE อ่านไฟล์ `private/` ได้ทุกไฟล์** (ไม่ scope ตาม prefix) | `src/app/files/[...key]/route.ts` `isAuthorizedForPrivate()` | ต้องเพิ่มกติกา: `private/calculator-imports/` → **ADMIN เท่านั้น** (ไฟล์มีราคาต้นทุน) |
| F3 | `/files` เสิร์ฟไฟล์ private แบบ inline ไม่มี `Content-Disposition` / `nosniff`; content-type map ไม่มี xlsx | `src/lib/storage/local.ts` `CONTENT_TYPES` | เพิ่ม `.xlsx` → `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` + `attachment` + `X-Content-Type-Options: nosniff` สำหรับ prefix นี้ (แก้เฉพาะ prefix ใหม่ — slips เดิมไม่แตะ ตามกฎ surgical) |
| F4 | `auditedEntity` = **1 แถว / 1 transaction** | `src/lib/audit.ts` | เก็บตารางเป็น **JSON ก้อนเดียว** ไม่ใช่ 31 แถว (ไม่งั้น apply ไม่ atomic + audit log 31 แถว/ครั้ง) |
| F5 | prod ใช้ DDL ด้วยมือผ่าน phpMyAdmin, ไม่มี `_prisma_migrations`; ต้อง InnoDB (ADR-0006) | runbook §migration, ADR-0006 | migration ต้อง **additive** (ADD COLUMN/CREATE TABLE … ENGINE=InnoDB); **ไม่ drop คอลัมน์ threshold ใน deploy เดียวกัน** (expand/contract) |
| F6 | backup copy `storage/private` ทั้งก้อนอยู่แล้ว แต่ตารางต้องลงทะเบียน | `scripts/lib/create-backup.ts`, `scripts/lib/storage-engine-contract.ts` | เพิ่ม `CalculatorImport` ใน `APPLICATION_TABLE_CONTRACTS` (ลำดับหลัง `AdminUser`) ไม่งั้น `verify-storage-engine` fail "missing tables" |

## 1. Data model (ข้อเสนอ)

### 1.1 `CalculatorConfig` (singleton เดิม) — เพิ่ม 2 คอลัมน์
```prisma
model CalculatorConfig {
  // เดิม: sunHoursPerDay, daysPerMonth, pricePerKwhThb  → เลิกอ่าน (ค่ามาจากตารางรายแถวแล้ว — #146 ข้อ 4)
  // เดิม: billThreshold3To5Kw, billThreshold5To10Kw      → ลบออกจาก Prisma schema (คอลัมน์ใน DB ปล่อยไว้ก่อน — F5)
  annualSavingMonthsMultiplier Int  @default(10)   // ยังใช้
  minBill  Int @default(500)                        // slider เท่านั้น
  maxBill  Int @default(8000)
  stepBill Int @default(100)
  sizeTable         Json?                          // ใหม่: SizeRow[] ที่ใช้งานอยู่ (null = ใช้ค่า default ที่ commit)
  sizeTableImportId String? @db.VarChar(40)       // ใหม่: import ที่มาของตาราง (null = default)
  version Int @default(1)
}
```
- **ทำไม JSON บน config**: apply = `calculatorConfig.update()` ครั้งเดียว → atomic + audit before/after ครบทั้งตารางใน 1 แถว (F4); public อ่าน query เดียวเหมือนเดิม (`getCalculatorConfig`)
- `sunHoursPerDay/daysPerMonth/pricePerKwhThb`: เลิกใช้ใน code + ซ่อนจาก admin UI; ลบจาก schema พร้อม threshold ได้ (Prisma ไม่สนคอลัมน์ส่วนเกิน) — DDL drop เป็นงาน cleanup แยกหลัง deploy นิ่ง
- **อ่านแบบมี guard**: `sizeTable` ผ่าน zod `sizeTableSchema` ทุกครั้งที่อ่าน; parse ไม่ผ่าน → ใช้ default + `console.error` (หน้า public ไม่มีวันพัง)

### 1.2 `SizeRow` (รูปใน JSON — ตรงกับ #145 §2.3 หลังรวม 1φ/3φ)
```ts
type SizeRow = { kw: number; phases: (1|3)[]; sunHours: number; days: number;
  pricePerKwh: number; panels: number; roofM2: number; billMin: number; billMax: number };
```
ไม่เก็บ category (ไม่แสดง — #146 ข้อ 8), ไม่เก็บราคา/ยี่ห้อ

### 1.3 `CalculatorImport` (ตารางใหม่ — ประวัติ + draft)
```prisma
model CalculatorImport {
  id           String   @id @default(cuid())
  fileName     String   @db.VarChar(120)   // sanitize + ตัดยาว
  fileKey      String   @db.VarChar(120)   // private/calculator-imports/<id>.xlsx
  sha256       String   @db.Char(64)
  sizeBytes    Int
  rows         Json                         // SizeRow[] ที่ parse ได้ (immutable)
  warnings     Json                         // string[] (ข้อความ TH สำหรับ admin)
  uploadedById String   @db.VarChar(40)
  uploadedBy   AdminUser @relation(fields: [uploadedById], references: [id])
  createdAt    DateTime @default(now())
  @@index([createdAt])
  @@index([sha256])
}
```
- **ไม่มีคอลัมน์ status**: "ใช้งานอยู่" = `CalculatorConfig.sizeTableImportId`; ที่เหลือ = ประวัติ/draft → ไม่มี dual-write ที่หลุด sync ได้
- ไฟล์ที่ **Reject** (#145 §4) **ไม่ถูกบันทึก** ทั้ง DB และ storage — ตอบ error อย่างเดียว
- อัพไฟล์ `sha256` ซ้ำ → คืน import เดิม (ไม่สร้างใหม่) + บอก "ไฟล์นี้เคย upload แล้ว"
- Retention: เก็บทั้งหมด (ไฟล์ ~48 KB) ไม่มีปุ่มลบใน v1 — ลด surface ของ delete/audit; ทบทวนเมื่อ >100 แถว
- DDL บน prod ต้องเขียน `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4` เอง (F5)

## 2. Flow ของ server actions (`src/actions/calculator-import.ts`)

| Action | ขั้นตอน | Audit |
|---|---|---|
| `previewCalculatorImport(formData)` | `requireRole("ADMIN")` → guard ไฟล์ (#145 §4.1) → parse (#145 §2) + guard ใหม่จาก #146 (billMax เพิ่มเคร่งครัด, 1φ/3φ ขัดกัน, billMax หาย) → dedupe sha256 → `storage.put(private/calculator-imports/<id>.xlsx)` → create `CalculatorImport` → คืน `{importId, rows, warnings, diff}` | `auditedEntity("CalculatorImport").create` — snapshot **projection** `{id,fileName,sha256,sizeBytes,rowCount,warningCount}` (ไม่ใส่ `rows` ทั้งก้อน) |
| `applyCalculatorImport({importId, version})` | `requireRole("ADMIN")` → โหลด import → **zod re-validate `rows`** (defense in depth) → เช็ค `version` (optimistic lock เดิม → `{conflict:true}`) → `calculatorConfig.update({sizeTable: rows, sizeTableImportId, version+1})` | `auditedEntity("CalculatorConfig").update` snapshot full (มี sizeTable ครบ before/after) ; revalidate `/admin/pages/calculator`, `/th/calculator`, `/en/calculator` |
| Rollback | เลือก import เก่าจากประวัติ → เรียก `applyCalculatorImport` ตัวเดิม | เหมือน apply |
| `resetCalculatorConfigToDefaults` (มีอยู่) | เพิ่ม `sizeTable: null, sizeTableImportId: null` | เดิม |
| Upload ค้างไม่ apply | เป็นแค่ประวัติ ไม่มีผลกับหน้าเว็บ | — |

- **ทำไม preview แล้วเก็บ draft ใน DB** (ไม่ re-upload ตอนยืนยัน): สิ่งที่ apply = สิ่งที่ admin เห็นใน preview เป๊ะ (ไม่มี TOCTOU), และได้ประวัติ/rollback ฟรี
- Diff (server คำนวณ, ตาม kW): เพิ่ม / ลบ / เปลี่ยน field (billMax, panels, sun, price …) + คำเตือน "Package X kW ไม่มีในตาราง" + ผลต่อบิลตัวอย่าง (เช่น 3,500 ฿: 5 kW → 5 kW)
- Concurrency: preview อิง `version` ขณะ preview; apply เช็คอีกครั้ง → ชน = toast เดิม "มีคนแก้ก่อนคุณ" แล้ว preview ใหม่
- Upload body: server action limit 10 MB อยู่แล้ว; guard เอง ≤ 2 MB
- AuditEntityType ใหม่ `"CalculatorImport"` + label ใน `src/lib/enum-labels.ts`
- Audit UI: `diffFields()` เทียบ top-level → `sizeTable` แสดงเป็น JSON ก้อนเดียว — ยอมรับได้ (diff ที่อ่านง่ายอยู่ใน preview); ไม่ต้องแก้ audit page

## 3. Domain / logic (`src/lib/calculator.ts`)

- ใหม่: `recommendFromTable(bill, table, packages, multiplier)` → union
  `{kind:"empty"} | {kind:"tooLarge", lastRow} | {kind:"ok", row, belowFirstRow, monthlySaving, afterBill, coversFullBill, kwhPerMonth, paybackYears|null}`
  ตามกติกา #146 (smallest `billMax > bill`) และ #147 (`coversFullBill` เมื่อ saving ≥ bill → UI แสดง "ครอบคลุมค่าไฟเต็ม 100%")
- ลบ: `recommendSystemSizeKw`, `systemKey` union `system3kw|5kw|10kw`, `SYSTEM_KEY_BY_SIZE_KW`, export `BILL_THRESHOLD_*`; คง `calculateTheoretical*` ถ้ายังใช้ใน verify
- ใหม่: `src/lib/calculator-size-table.ts` — `SizeRow`, `sizeTableSchema` (zod), `DEFAULT_SIZE_TABLE` (31 แถวจาก Excel อ้างอิง, **ไม่มีราคา**), `resolveSizeTable(json)`
- ใหม่: `src/lib/calculator-import/` — `validateXlsxFile()` (guards), `parseOnGridSheet()` (header-based), `diffSizeTables()`; pure functions ทดสอบได้ไม่ต้องมี DB

## 4. Impact — ไฟล์ที่กระทบ

| ไฟล์ | การเปลี่ยน | ความเสี่ยง |
|---|---|---|
| `prisma/schema.prisma` + migration ใหม่ | +2 คอลัมน์ config, −2 threshold (schema only), +`CalculatorImport`, relation บน `AdminUser` | กลาง — DDL มือบน prod |
| `prisma/seed.ts` | seed ไม่ต้องใส่ sizeTable (null = default); ลบ threshold | ต่ำ |
| `src/lib/calculator.ts`, `calculator-config.ts`, `validations/calculator-config.ts` | ตาม §3; zod ของ config เหลือ ×10 + slider bounds (ลบ superRefine threshold) | กลาง |
| `src/lib/calculator-size-table.ts`, `src/lib/calculator-import/*` | ใหม่ | — |
| `src/lib/content/index.ts` `getCalculatorConfig` | คืน `{params, sizeTable}` | ต่ำ |
| `src/actions/calculator-config.ts` | ลบ threshold fields, reset ล้าง sizeTable | ต่ำ |
| `src/actions/calculator-import.ts` | ใหม่ (preview/apply) | สูง — จุด mutation + upload |
| `src/lib/audit.ts`, `src/lib/enum-labels.ts` | + `CalculatorImport` | ต่ำ |
| `src/lib/storage/local.ts` | + xlsx content-type | ต่ำ |
| `src/app/files/[...key]/route.ts` | prefix `private/calculator-imports/` ADMIN-only + attachment + nosniff (F2/F3) | กลาง — security path |
| `src/app/[locale]/calculator/calculator-client.tsx`, `page.tsx` | ตาม #147: ลบ tier markers/ticks, ไม่ clamp ช่องพิมพ์, tiles, สถานะพิเศษ, 100% | กลาง — หน้า public ที่มีประวัติ design ถูก reject |
| `src/store/use-calculator-store.ts` | ไม่เปลี่ยน (clamp อยู่ใน client) | — |
| `src/app/admin/(dashboard)/pages/calculator/calculator-config-client.tsx`, `page.tsx`, `calculator-admin-shell.tsx` | ลบ threshold fields + ticks; preview ใช้ตาราง; **แก้ "5kw kW"**; การ์ดใหม่ "ตารางขนาดระบบ (Excel)": สรุปชุดที่ใช้, upload, preview+diff+warnings, ยืนยัน, ประวัติ + ใช้ชุดนี้ + ดาวน์โหลดต้นฉบับ | กลาง |
| `src/messages/th.json` + `en.json` | ลบ `system3kw/5kw/10kw`, `tierZone*`; เพิ่ม: ป้ายเฟส, tiles 3 ช่อง, belowFirstRow note, tooLarge, coversFullBill, noPayback CTA, hint พิมพ์เกิน slider (key ที่ตายอยู่แล้ว เช่น `billRange*`, `methodology*`, `colBillRange`, `disclaimer` **ไม่แตะ** — ไม่ใช่ผลของงานนี้) | ต่ำ — i18n-parity-checker |
| `scripts/verify-calculator.mts` | เปลี่ยน assertion เป็นแบบตาราง (2,500→3 kW; 3,000→5 kW; 25,500→40 kW + coversFullBill; 110,000→115 kW; <2,000 belowFirstRow; ≥3,000,000 tooLarge; Package match → payback) | ต่ำ |
| `scripts/verify-calculator-import.mts` (ใหม่) | test parser/guards ด้วย **fixture สังเคราะห์สร้างตอนรัน** (exceljs/jszip): ไฟล์ดี, คอลัมน์เลื่อน, ไม่มี sheet, header หาย, OLE magic, macro, zip ใหญ่, สูตรไม่มี cached result, billMax ไม่เพิ่ม, 1φ/3φ ขัดกัน; + ถ้ามี `stuffs/…xlsx` ในเครื่อง รันกับไฟล์จริงเพิ่ม (skip ถ้าไม่มี) | — |
| `scripts/e2e-calculator-config.mts` | ใช้ threshold/`calculateSavings` อยู่ → เขียนใหม่: upload ไฟล์สังเคราะห์ → preview → apply → `/th/calculator` แสดงขนาดใหม่ → rollback → conflict | กลาง |
| `scripts/lib/storage-engine-contract.ts` | + `CalculatorImport` (F6) | ต่ำ |
| `.gitignore` | + `/stuffs/` (F1) | — |
| `CONTEXT.md` | เพิ่มศัพท์ "ตารางขนาดระบบ (Size table)", "Import" | — |

**ไม่กระทบ:** หน้า Packages (อ่าน `Package.sizeKw/priceThb` เอง), booking prefill (`bookingHref({bill})` เดิม), audit page, backup format (copy private ทั้งก้อน)

**นอกเครื่องคำนวณที่ยังพูดถึง 3/5/10 kW:** FAQ `a1` ใน `th/en.json` ("บ้าน 1,500–3,000 บาท … 5KW …") เป็น copy การตลาด — ไม่ผูกกับตาราง → นอก scope (แจ้ง owner แยก)

## 5. Deploy / release (ข้อเสนอสำหรับแผน)

1. snapshot prod ก่อน (runbook)
2. DDL: `ALTER TABLE CalculatorConfig ADD COLUMN sizeTable JSON NULL, ADD COLUMN sizeTableImportId VARCHAR(40) NULL;` + `CREATE TABLE CalculatorImport (…) ENGINE=InnoDB` + FK → `SHOW COLUMNS`/`SHOW CREATE TABLE` verify
3. deploy code (อ่าน `sizeTable` null → `DEFAULT_SIZE_TABLE`)
4. ⚠️ **หน้า public เปลี่ยนพฤติกรรมทันทีหลัง deploy** แม้ยังไม่มีใครอัพไฟล์ (เพราะ default = ตารางจาก Excel ใหม่ ไม่ใช่ 3/5/10 threshold เดิม) — ต้องให้ owner รับทราบ / หรือจะให้ default = ตาราง 3 แถวที่เทียบเท่าของเดิม → **ต้องถาม owner** (graduates เป็น ticket ใหม่ ถ้ายังไม่ตัดสิน)
5. smoke: `/th|en/calculator` 200 + ค่าตัวอย่าง; admin upload ไฟล์จริงบน prod → apply → ตรวจหน้า public
6. cleanup (deploy ถัดไป): DROP คอลัมน์ threshold + sun/days/price

## 6. ส่งต่อ

- ทุกข้อใน §4 → แผน sprint (#149)
- คำถามใหม่ที่ต้องให้ owner ตัดสิน: **ค่า default หลัง deploy** (§5.4) — ตาราง Excel ใหม่ทันที vs คงพฤติกรรม 3/5/10 จนกว่าจะ upload ครั้งแรก
