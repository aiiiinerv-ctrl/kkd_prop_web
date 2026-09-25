# Research — สัญญาการอ่านไฟล์ Excel On-grid + แคตตาล็อก edge case

> Asset ของ ticket #145 (map #143). วันที่ 2026-09-25. ทดสอบด้วย spike parser (throwaway ไม่อยู่ใน repo)
> กับไฟล์จริง 2 เวอร์ชัน: `stuffs/คำนวณติดตั้ง.xlsx` (ใหม่, md5 27532b96…) และ `docs/stuffs/คำนวณติดตั้ง.xlsx` (เดิม)
> **ไม่ใช่ spec implementation** — เป็นข้อเท็จจริง + ข้อเสนอ ให้ ticket ตัดสินใจ/แผน sprint ใช้ต่อ

## 1. ข้อสรุปสั้น

1. **หาคอลัมน์จาก header label ได้จริง** — spike หาเจอครบทั้งไฟล์ใหม่และเดิม แม้คอลัมน์เลื่อน 1 ช่อง (ไฟล์ใหม่เพิ่ม "ประเภท" ที่ A)
2. **import เฉพาะ "ค่าที่คนกรอก"** (ตัวเลขดิบ) — ไม่ต้องใช้ผลสูตรเลยยกเว้นพื้นที่หลังคา; พลังงาน/ประหยัด/คืนทุนคำนวณใหม่ในโค้ดเหมือนตอนนี้ → ความผิดปกติของสูตรใน Excel (เช่น `G6 = F6*C5`, `K11` สูตรต่างแบบ) ไม่ส่งผล
3. **ข้อมูลในไฟล์จริงไม่สะอาด**: ขนาดซ้ำ (1/3-phase), ช่วงค่าไฟ **ซ้อน** และ **ขาดช่วง**, ไฟล์เดิมมีแถวไม่มีช่วงค่าไฟ และ **ค่าไฟ/หน่วยต่างกันรายแถว** (4.5 และ 5.5) → parser ต้อง *รายงาน* ไม่ใช่เดาแก้เอง; นโยบายเลือกแถวเป็นเรื่องของ ticket "ตัดสิน: เครื่องคำนวณแนะนำขนาดระบบจากตาราง Excel อย่างไร"
4. **Security ทำได้ถูก**: magic bytes + ตรวจ zip entries (macro/external link/ขนาดคลาย) ด้วย `jszip` (มีอยู่แล้วเป็น dep ของ exceljs) ก่อนส่งให้ exceljs; ไฟล์จริง load 27 ms / heap ~22 MB
5. **exceljs 4.4.0 ใช้บน production อยู่แล้ว** (`src/app/api/admin/reports/export/route.ts` เขียน xlsx) → pure JS ไม่มี native module, ไม่เพิ่ม dependency ใหม่; `npm audit` ของ exceljs = moderate ผ่าน `uuid` (v3/v5/v6 buffer — ไม่ใช่ path ที่ใช้อ่านไฟล์)

## 2. สัญญาการอ่าน (proposed import contract)

### 2.1 หา sheet
- ชื่อ sheet match `/^on[\s-]?grid$/i` หลัง trim (ไฟล์จริง: `On-grid`) — ไม่พึ่งลำดับ sheet
- ไม่พบ → **reject**: "ไม่พบ sheet On-grid"
- sheet อื่น (Hybrid ฯลฯ) → ignore, แสดงใน preview ว่า "ข้าม sheet: Hybrid"

### 2.2 หา header block
- scan 20 แถวแรก หาแถวที่มี cell = `ผลิตพลังงานต่อวัน` (หลัง normalize whitespace) → แถว group; แถวถัดไป = sub-header
- อ่าน label ผ่าน `cell.master` (merged cells) เป็นคู่ `group|sub`
- **อ่านเฉพาะ block แรก** และหยุดที่แถวแรกที่คอลัมน์ขนาดว่าง — ไฟล์เดิมมี **ตารางที่ 2 ซ้อนอยู่ด้านล่าง** (แถว 32–59) ช่วงค่าไฟไม่ตรงกับตารางแรก (เช่น 10 kW 8,000–10,000 vs 7,000–10,000); ไฟล์ใหม่มีข้อความ "ราคาติดตั้งรวมอุปกรณ์" ที่แถว 37 → ต้องหยุดก่อน

### 2.3 คอลัมน์ที่ import

| Field | หาโดย (group \| sub) | ชนิด | บังคับ | หมายเหตุ |
|---|---|---|---|---|
| category | `ประเภท` | text (merged แนวตั้ง) | ไม่ | มีแค่ไฟล์ใหม่: `บ้าน` / `โรงแรมและโรงงานอุตสาหกรรม` |
| size | `ขนาดกำลังผลิต` | number > 0 | ✓ | |
| unit | `หน่วย` (คอลัมน์ถัดจาก size) | `kW` \| `MW` | ✓ | MW × 1000 → เก็บเป็น kW เสมอ; หน่วยอื่น → reject แถว |
| phase | `Phase` | 1 \| 3 | ✓ | |
| sunHoursPerDay | `ผลิตพลังงานต่อวัน` \| ขึ้นต้น `จำนวนชั่วโมง` | number | ✓ | label ต่างกันระหว่างเวอร์ชัน (มี/ไม่มี "X ประสิทธิภาพ…") → match prefix |
| daysPerMonth | `ผลิตพลังงานต่อเดือน` \| `จำนวนวัน` | int | ✓ | |
| panels | `แผงโซล่าเซลล์` \| `จำนวนติดตั้ง` | int | ✓ | ค่ากรอกมือ (ไม่ใช่สูตร) |
| roofAreaM2 | `แผงโซล่าเซลล์` \| ขึ้นต้น `พื้นที่หลังคา` | number | ไม่ | **เป็นสูตร** `L*2.7` — ใช้ cached result ถ้ามี; ไม่มี → คำนวณ `panels × 2.7` + warning |
| billMin / billMax | `ค่าไฟ` \| `ประมาณ` (merged 2 คอลัมน์: ซ้าย=min ขวา=max) | int | ✓ | |
| pricePerKwhThb | `ค่าไฟ` \| `ค่าไฟ/หน่วย` | number | ✓ | **รายแถว** — ไฟล์เดิมมี 4.5 และ 5.5 |

**ไม่ import:** พลังงาน/วัน, หน่วย/เดือน, จำนวนแผงคำนวณ, จำนวนหน่วยที่ใช้, ลดค่าไฟ/เดือน/ปี, คืนทุน, ราคา/ยี่ห้อ (map ตัดสินแล้ว: คืนทุนใช้ราคา Package)

**ค่าคงที่ที่ฝังในสูตร** (อ่านจากไฟล์ไม่ได้โดยไม่ parse สูตร): ตัวคูณรายปี `×10` (`V4 = SUM(T4*10)`), `0.15`/`0.63` (จำนวนแผงคำนวณ), `2.7 m²/แผง` → **ไม่ parse สูตร**; `×10` ยังเป็น param ใน admin tab เดิม

### 2.4 การอ่านค่าใน cell
- ค่าตัวเลขต้องเป็น `number` ใน cell จริง; string ที่เป็นตัวเลข (`"3,000"`, เลขไทย `๓๐๐๐`) → normalize ได้แต่ต้อง **warning**
- cell เป็นสูตรในคอลัมน์ที่ควรเป็นค่ากรอก (size/phase/sun/days/panels/bill/price) → ใช้ cached result ได้ถ้ามี + warning; cached result ว่าง (ไฟล์ที่ export จากเครื่องมือที่ไม่คำนวณสูตร) → reject แถว
- ห้าม evaluate สูตรเอง (out of scope ตาม map)

## 3. ผลรันกับไฟล์จริง

| | ไฟล์ใหม่ (`stuffs/`) | ไฟล์เดิม (`docs/stuffs/`) |
|---|---|---|
| คอลัมน์ที่เจอ | category A, size C, unit D, phase E, sun F, days I, panels L, roof M, bill N–O, price Q | ไม่มี category; size B, … price P (เลื่อน 1) |
| แถวที่อ่าน | 33 (3 kW → 3 MW), หยุดที่แถว 37 | 27 (3 kW → 3 MW), หยุดที่แถว 31 (ตารางที่ 2 ถูกข้าม) |
| sun / days / price | 5 / 30 / 4.5 ทุกแถว | 5 / 30 / **4.5 และ 5.5** |
| ขนาดซ้ำ | 5 kW (1φ,3φ) ช่วงเท่ากัน 3,000–4,000; 10 kW (1φ,3φ) 7,000–10,000 | 5 kW; 10 kW 8,000–10,000 |
| ช่วงซ้อน | 115 kW (100,000–115,000) vs 120 kW (100,000–120,000) vs 125 kW (100,000–125,000) | — |
| ช่วงขาด | 25,000→26,000 (36→40 kW); 125,000→130,000 (125→150 kW); 2,000,000→2,500,000 (2→3 MW) | 7,000→8,000; 15,000→20,000 |
| ช่วงหาย | — | 125 kW, 1.5 MW, 2 MW, 3 MW |
| ช่วงบิลของตารางเทียบ slider ปัจจุบัน | แถวแรก 2,000–3,000 ฿ (slider เริ่ม 500 ฿) ; แถวสุดท้ายสูงถึง 3,000,000 ฿ (slider สูงสุด 8,000 ฿) | เหมือนกัน |

ขอบช่วงที่ต่อกันพอดี (`max` ของแถวหนึ่ง = `min` ของแถวถัดไป เช่น 3,000) → ต้องมีนิยาม inclusive/exclusive (ข้อเสนอ: `min ≤ bill < max`, แถวสุดท้าย `≤ max`) — ส่งต่อให้ ticket ตัดสินใจ

## 4. แคตตาล็อก edge case → การจัดการ (ข้อเสนอ)

**Reject** = ทั้งไฟล์ไม่ผ่าน, ไม่มี preview ให้ apply · **Warn** = แสดงใน preview, apply ได้ · **Accept** = เงียบ

### 4.1 ระดับไฟล์ (security / format)

| กรณี | ตรวจอย่างไร | ผล | ข้อความ (TH, admin-only) |
|---|---|---|---|
| ไม่ใช่ zip (เช่น `.xls` เก่า, **xlsx ใส่รหัสผ่าน** = OLE/CFB `D0CF11E0`, ไฟล์ปลอมนามสกุล) | 4 byte แรก ≠ `504B0304` | Reject | "รองรับเฉพาะไฟล์ .xlsx ที่ไม่ใส่รหัสผ่าน" |
| นามสกุล ≠ `.xlsx` | ชื่อไฟล์ | Reject | เหมือนข้างบน |
| ใหญ่เกิน | `file.size > 2 MB` (ไฟล์จริง 48 KB; server action limit 10 MB) | Reject | "ไฟล์ใหญ่เกิน 2 MB" |
| zip bomb | รวม `uncompressedSize` ของ entries (jszip) > 20 MB หรือ entries > 200 | Reject | "ไฟล์ผิดรูปแบบ" |
| มี macro (`.xlsm` เปลี่ยนนามสกุล) | entry `vbaProject.bin` หรือ `[Content_Types].xml` มี `macroEnabled` | Reject | "ไฟล์มี macro — กรุณาบันทึกเป็น .xlsx ธรรมดา" |
| external links | entry `xl/externalLinks/*` | Warn | "ไฟล์อ้างอิงไฟล์อื่น — ค่าที่ใช้คือค่าที่บันทึกไว้ในไฟล์นี้" |
| sheet ใหญ่ผิดปกติ | `rowCount > 1000` หรือ `columnCount > 100` ก่อนวน cell | Reject | "ตารางใหญ่ผิดปกติ" |
| parse error จาก exceljs | try/catch | Reject | "อ่านไฟล์ไม่ได้" (ไม่ส่ง stack/ข้อความ library กลับ client) |

หมายเหตุ security อื่น:
- ไม่ trust `file.type` จาก browser (`validateImage()` ตอนนี้ trust — ห้าม copy pattern นั้น)
- parse ใน server action หลัง `requireRole("ADMIN")` เท่านั้น; อ่านจาก `Buffer` ใน memory ไม่เขียน temp file
- เก็บต้นฉบับ (ถ้าเก็บ) ใต้ `private/calculator-imports/<id>.xlsx` ผ่าน `src/lib/storage` — ต้องเพิ่ม `.xlsx` content-type ใน `src/lib/storage/local.ts` และเสิร์ฟแบบ `Content-Disposition: attachment`
- ข้อความจาก cell (category) ที่แสดงใน preview/public → render เป็น text (React escape) + จำกัดความยาว (เช่น 60 ตัวอักษร); ห้าม `dangerouslySetInnerHTML`
- XXE: exceljs ใช้ `saxes` ซึ่งไม่ resolve external entities — ไม่ต้องทำเพิ่ม แต่ควรมี test fixture ที่มี DOCTYPE เพื่อยืนยัน

### 4.2 ระดับโครงสร้าง

| กรณี | ผล |
|---|---|
| ไม่มี sheet On-grid | Reject |
| ไม่เจอ header `ผลิตพลังงานต่อวัน` ใน 20 แถวแรก | Reject — "ไม่พบหัวตาราง On-grid" |
| คอลัมน์บังคับหาย (ตาราง 2.3) | Reject — ระบุชื่อคอลัมน์ที่หาไม่เจอ |
| คอลัมน์ `ประเภท` หาย | Accept (ไฟล์เดิมไม่มี) |
| label เดียว match หลายคอลัมน์ | Reject — กำกวม |
| มีตาราง/ข้อความต่อท้ายหลังแถวว่าง | Accept, ข้าม (แสดงใน preview ว่าอ่านถึงแถวไหน) |
| sheet ถูกซ่อน / แถวถูกซ่อน | Warn (ยัง import ตามข้อมูล) |

### 4.3 ระดับแถว

| กรณี | ผล |
|---|---|
| หน่วยไม่ใช่ kW/MW | Reject |
| ขนาด ≤ 0 / ไม่ใช่ตัวเลข | Reject |
| ขนาดไม่เรียงจากน้อยไปมาก | Warn (เรียงใหม่ตอนเก็บ) |
| ขนาดซ้ำ ต่าง phase | Warn — นโยบายเลือก → ticket "ตัดสิน: เครื่องคำนวณแนะนำขนาดระบบจากตาราง Excel อย่างไร" |
| ขนาดซ้ำ phase เดียวกัน | Reject |
| ช่วงค่าไฟหาย (ไฟล์เดิม 4 แถว) | Warn — แถวนี้ใช้แนะนำไม่ได้ (นโยบาย → ticket ตัดสินใจ) |
| `billMin ≥ billMax` | Reject |
| ช่วงซ้อน / ขาดช่วงระหว่างแถว | Warn พร้อมระบุคู่แถว |
| sun/days/price นอกขอบเขตเดียวกับ zod ปัจจุบัน (`sun 1–12`, `price 0.01–50`) หรือ days ไม่อยู่ 28–31 | Reject |
| price ต่างกันรายแถว | Warn — ต้องตัดสินว่า model เก็บรายแถวหรือบังคับค่าเดียว |
| sun/days/price ต่างจากค่าใน admin tab ปัจจุบัน | Warn (diff) — "ใครชนะ" → ticket ตัดสินใจ |
| สูตรในคอลัมน์กรอก + มี cached result | Warn |
| สูตร + ไม่มี cached result | Reject |
| roof area ไม่มี cached result | Warn, คำนวณ `panels × 2.7` |
| category ยาว/มีอักขระแปลก | ตัด + Warn |
| ผลประหยัดตามทฤษฎี (kW × sun × days × price) > billMax | Warn (ตัวคำนวณ cap ไว้ที่ค่าไฟอยู่แล้ว — ไม่พบในไฟล์จริงทั้ง 2) |

## 5. ส่งต่อให้ ticket อื่น

- **ตัดสิน: เครื่องคำนวณแนะนำขนาดระบบจากตาราง Excel อย่างไร** — ต้องตัดสิน: ขอบช่วง inclusive/exclusive; ช่วงซ้อน (115/120/125 kW) เลือกแถวไหน; ช่วงขาดแสดงอะไร; แถวไม่มีช่วงค่าไฟ; ขนาดซ้ำ 1φ/3φ; price รายแถว vs ค่าเดียว; params ใน Excel vs admin tab ใครชนะ; slider 500–8,000 ฿ vs ตารางที่เริ่ม 2,000 ฿ และไปถึง 3,000,000 ฿
- **Research: data model, audit, rollback และ impact analysis** — model ต้องรองรับ: kW เป็น Float (1.5 MW = 1500), phase, category (optional, TH อย่างเดียวในไฟล์ → ต้องมี EN ถ้าแสดง public — กฎ TH/EN), price รายแถว (ถ้าเลือก), roofArea, panels; เก็บ warnings ของ import ไว้ใน history; content-type `.xlsx` ใน storage; บั๊ก "5kw kW" ใน preview admin
- **Fixtures สำหรับ test** (fog เดิมเรื่อง regression): ใช้ 2 ไฟล์จริงนี้ + fixture สังเคราะห์: ไม่มี sheet, header หาย, OLE/รหัสผ่าน, macro, zip ใหญ่เกิน, สูตรไม่มี cached result
