# Admin UI spec — การ์ด "ตารางขนาดระบบ (Excel)" (S6a)

Date: 2026-09-26 · Author: `ux-ui-expert` (read-only) · ใช้โดย: `nextjs-dev` ใน S6
Plan: [`calculator-excel-import-sprints.md`](calculator-excel-import-sprints.md) §S6a / §S6 · Decisions: #145, #146, #148, #150

> Spec นี้ **ไม่เพิ่มภาษาภาพใหม่** — ทุก surface ใช้ pattern ที่มีอยู่แล้วใน admin (อ้างอิง file:line ในแต่ละหัวข้อ).
> Admin เป็นภาษาไทยอย่างเดียว (Default #6) → ข้อความทั้งหมดในเอกสารนี้เป็น TH hard-coded ในโค้ด, ไม่เข้า `messages/*.json`.
> ข้อความ reject/warning ของ parser อยู่ใน `src/lib/calculator-import/messages.ts` (S2) — **ให้ใช้ copy จาก §7 ของ spec นี้เป็นตัวจริง**.

---

## 0. ทิศทางที่พิจารณา + ที่เลือก

| ทิศทาง | แนวคิด | ต้นทุน / ความเสี่ยง |
|---|---|---|
| **A. Inline stacked card** (เลือก) | การ์ดเดียวใต้ฟอร์มตัวเลข; preview/diff กางต่อในการ์ดเดิม; ประวัติเป็น list ท้ายการ์ด | ยาวเมื่อ preview เปิด (scroll) — แต่เหมือนการ์ด FAQ background / page banner ที่ admin คุ้นแล้ว, mobile ไม่ต้องทำอะไรพิเศษ |
| B. Preview ใน `Dialog` | อัปโหลดในการ์ด แล้ว preview/diff เปิดใน dialog ใหญ่ | ตาราง 8 คอลัมน์ + diff ใน dialog บนมือถือแคบมาก; `Dialog` ใช้กับฟอร์ม CRUD ไม่ใช่ review ยาว ๆ; ต้องจัด focus trap + scroll ซ้อน |
| C. Tab ย่อยในแท็บ "ตัวเลขการคำนวณ" | แยก "ตัวเลข" / "ตาราง Excel" / "ประวัติ" เป็น Tabs ซ้อน | Tabs ซ้อน Tabs ไม่มีที่ไหนใน admin (pattern ใหม่); ซ่อนความสัมพันธ์ว่าตัวอย่างผลคำนวณขึ้นกับตาราง |

**เลือก A** — ตรงกับ taste (คุ้นเคย/น่าเชื่อถือ ไม่ใช่ของใหม่), เป็น flow เชิงเส้นอ่านบนลงล่าง (อัปโหลด → ตรวจ → ยืนยัน) และ reuse โครงของ `FaqBackgroundSection` (`src/app/admin/(dashboard)/pages/home/home-client.tsx:289-466`) ได้ตรงที่สุด.

---

## 1. Layout ของแท็บ "ตัวเลขการคำนวณ" หลัง S6

Container เดิม: `mx-auto max-w-3xl space-y-8` (`calculator-config-client.tsx:143`) — คงไว้.

```
┌──────────────────────────────────────────────────────────────┐
│ ตัวเลขการคำนวณ                                  เปิดหน้าจริง ↗ │  (1) header เดิม, แก้ subtitle
│ ตั้งค่าตัวคูณรายปี ช่วงสไลด์บิล และตารางขนาดระบบจาก Excel      │
├──────────────────────────────────────────────────────────────┤
│ (2) <form> ตัวคูณและช่วงสไลด์                                 │
│   [ตัวคูณรายปี (เดือน)] [บิลขั้นต่ำ ฿] [บิลสูงสุด ฿] [ขั้นสไลด์ ฿] │  grid sm:grid-cols-2
│   ┌ ตัวอย่างผลคำนวณ (ตามตารางที่ใช้อยู่) ─────────────────────┐ │
│   │ ═══════════●══════════════  (slider ไม่มี tick)         │ │
│   │ ระบบที่แนะนำ  │ ประหยัด/เดือน │ บิลหลังติดตั้ง             │ │
│   │ 5 kW · 1 หรือ 3 เฟส │ ฿3,375 │ ฿125                     │ │
│   └──────────────────────────────────────────────────────────┘ │
│                                           [บันทึกตัวเลข]       │
├──────────────────────────────────────────────────────────────┤
│ (3) การ์ด "ตารางขนาดระบบ (Excel)"  ← §2–§6                    │
├──────────────────────────────────────────────────────────────┤
│ (4) คืนค่าเริ่มต้น  ← §8                                        │
└──────────────────────────────────────────────────────────────┘
```

### 1.1 Header (แก้ข้อความเดียว)
- `h2` คงเดิม: **ตัวเลขการคำนวณ**
- subtitle ใหม่ (แทน "ปรับสมมติฐานธุรกิจและช่วงสไลด์บิล — หน้าจริงอัปเดตหลังบันทึก"):
  **"ตั้งค่าตัวคูณรายปี ช่วงสไลด์บิล และตารางขนาดระบบจาก Excel — หน้าจริงอัปเดตทันทีหลังบันทึกหรือยืนยัน"**

### 1.2 ฟอร์มตัวคูณและช่วงสไลด์ (ลดจากเดิม)
- ลบ section "สมมติฐานธุรกิจ (Phase A)" ทั้งก้อน และช่องเกณฑ์ 3→5 / 5→10 kW + tick marks (บรรทัด 312–323) — ตาม S6
- `h3` เดียว: **"ตัวคูณและช่วงสไลด์บิล"**; grid `gap-4 sm:grid-cols-2`, 4 ช่อง ตามลำดับ:

| id | Label | helper (`text-xs text-muted-foreground`) |
|---|---|---|
| `calc-annual-mult` | ตัวคูณรายปี (เดือน) | "ใช้คูณเงินประหยัดต่อเดือนเป็นต่อปี · ค่าเริ่มต้น 10" |
| `calc-min-bill` | บิลขั้นต่ำ (฿) | "ค่าเริ่มต้น 500" |
| `calc-max-bill` | บิลสูงสุด (฿) | "ค่าเริ่มต้น 8,000 · ลูกค้ายังพิมพ์บิลเกินนี้ได้" |
| `calc-step-bill` | ขั้นสไลด์ (฿) | "ค่าเริ่มต้น 100" |

- Validation inline (แทนข้อความลำดับ threshold เดิม บรรทัด 292–296): `min >= max` → `text-sm text-destructive` **"บิลขั้นต่ำต้องน้อยกว่าบิลสูงสุด"**; `step <= 0` → **"ขั้นสไลด์ต้องมากกว่า 0"**
- **ตัวอย่างผลคำนวณ** รวมเป็นกล่องเดียว (รวม "ตัวอย่างสไลด์" + fieldset เดิม เพื่อลดกล่องซ้อน): `rounded-lg border border-border bg-muted/20 p-4 space-y-3`
  - legend/label: **"ตัวอย่างผลคำนวณ (ตามตารางที่ใช้อยู่)"**
  - slider `accent-brand-orange` เดิม, **ไม่มี tick**; บรรทัดใต้ slider: "บิล ฿{bill}"
  - `dl` 3 ช่อง `grid gap-2 text-sm sm:grid-cols-3` (เดิม) คำนวณด้วย `recommendFromTable(activeTable, …)`:

| ผล `recommendFromTable` | ระบบที่แนะนำ | ประหยัด/เดือน | บิลหลังติดตั้ง |
|---|---|---|---|
| `ok` | **"{kw} kW · {phaseText}"** — แก้บั๊ก "5kw kW" (บรรทัด 341) | ฿{monthlySaving} | ฿{afterBill}; ถ้า `coversFullBill` → **"ครอบคลุมเต็ม 100%"** แทน ฿0 |
| `ok` + `belowFirstRow` | เหมือน `ok` + บรรทัดใต้ dl `text-xs text-muted-foreground`: **"บิลต่ำกว่าช่วงของขนาดเล็กสุดในตาราง — หน้าเว็บจะแสดงหมายเหตุ"** | | |
| `tooLarge` | **"เกินตาราง (ใหญ่สุด {lastKw} kW)"** | — | — |
| `empty` | **"ยังไม่มีตาราง"** (ไม่ควรเกิด — default มีเสมอ) | — | — |

  - `phaseText`: `[1,3]` → "1 หรือ 3 เฟส", `[1]` → "1 เฟส", `[3]` → "3 เฟส"
  - `kw` format: `kw.toLocaleString("th-TH")` (เช่น "1,500 kW") — **ห้าม** string replace จาก key
- ปุ่ม **บันทึกตัวเลข** / **กำลังบันทึก…** เดิม (ย้าย "คืนค่าเริ่มต้น" ออกไป §8)

---

## 2. การ์ด "ตารางขนาดระบบ (Excel)" — โครง

- แสดงเฉพาะ ADMIN (`canManageConfig`) — แท็บนี้ ADMIN-only อยู่แล้ว
- Shell: `<section aria-labelledby="calc-size-table-heading" className="rounded-xl border border-border/70 bg-card p-6">` — **เหมือน FAQ card เป๊ะ** (`home-client.tsx:336`)
- **ไม่อยู่ใน `<form>` ของ §1.2** (ห้าม form ซ้อน) — เป็น component แยก `calculator-size-table-card.tsx` ตาม plan
- ลำดับภายในการ์ด (`space-y-5`):

```
┌ ตารางขนาดระบบ (Excel) ───────────────────────────────────────┐
│ ใช้แนะนำขนาดระบบในหน้าเครื่องคำนวณ อัปโหลดไฟล์ Excel ของฝ่ายขาย  │ (a) h2 + คำอธิบายสั้น
│ แล้วตรวจก่อนยืนยัน                                               │
│ ┌ ที่ใช้อยู่ ─────────────────────────────────────────────────┐ │ (b) Summary
│ │ [ใช้อยู่] คำนวณติดตั้ง.xlsx · 31 ขนาด (3 – 3,000 kW)        │ │
│ │ ยืนยันเมื่อ 26 ก.ย. 2569 14:05 โดย สมชาย                  │ │
│ │ ⤓ ดาวน์โหลดต้นฉบับ                                         │ │
│ └────────────────────────────────────────────────────────────┘ │
│ ┌ ระบบอ่านอะไรจากไฟล์ ─────────────────────────────────────┐   │ (c) Explanation box
│ │ ...                                         [ดูคอลัมน์ ▾]  │   │
│ └──────────────────────────────────────────────────────────┘   │
│ ไฟล์ Excel (.xlsx)                                              │ (d) Upload
│ [ Choose file  คำนวณติดตั้ง.xlsx        ] [อัปโหลดและตรวจไฟล์] │
│ .xlsx ไม่เกิน 2 MB · ยังไม่มีผลกับหน้าเว็บจนกว่าจะกดยืนยัน       │
│                                                                │
│ (e) ผลตรวจไฟล์: reject │ preview (§4) — แสดงเมื่อมีผล          │
│                                                                │
│ ── ประวัติไฟล์ (20 รายการล่าสุด) ──                            │ (f) History §6
│ ...                                                            │
└────────────────────────────────────────────────────────────────┘
```

### 2.1 (a) Heading
- `h2 className="mb-1 font-semibold"` id `calc-size-table-heading`: **"ตารางขนาดระบบ (Excel)"**
- `p text-sm text-muted-foreground`: **"ใช้แนะนำขนาดระบบในหน้าเครื่องคำนวณ — อัปโหลดไฟล์ Excel ของฝ่ายขาย ตรวจผลก่อน แล้วกดยืนยันเพื่อใช้บนหน้าเว็บ"**

### 2.2 (b) Summary "ที่ใช้อยู่"
กล่อง `rounded-lg border border-border/70 bg-muted/30 p-4 text-sm` (โทนเดียวกับ fieldset ตัวอย่างผลเดิม `bg-muted/30`).

| สถานะ | บรรทัด 1 | บรรทัด 2 (`text-xs text-muted-foreground`) | บรรทัด 3 |
|---|---|---|---|
| **default** (`sizeTableSource === "default"`) | `Badge variant="secondary"` **"ค่าเริ่มต้น"** + **"ตารางเริ่มต้น 3 ขนาด (3, 5, 10 kW)"** | **"ยังไม่มีไฟล์ในระบบ — ใช้ไฟล์ Excel ของฝ่ายขาย"** | — |
| **import** | `Badge` (default/primary) **"ใช้อยู่"** + **"{fileName} · {n} ขนาด ({minKw} – {maxKw} kW)"** | **"ยืนยันใช้เมื่อ {วันที่ เวลา} · อัปโหลดโดย {name}"** | ลิงก์ **"ดาวน์โหลดต้นฉบับ"** (icon `Download` size-3.5) |

- วันที่: `toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })` (ตาม precedent `channels-client.tsx:68`)
- **หมายเหตุข้อมูล**: "ยืนยันใช้เมื่อ" = `CalculatorConfig.updatedAt` ไม่ใช่ `CalculatorImport.createdAt` — ถ้า S5 ไม่ส่งค่านี้ ใช้ "อัปโหลดเมื่อ {createdAt}" แทน (อย่าเขียนว่า "ยืนยันใช้" ถ้าข้อมูลคือเวลาอัปโหลด)
- fileName: `truncate` + `title={fileName}`; render เป็น text เท่านั้น
- ลิงก์ดาวน์โหลด: `<a href="/files/private/calculator-imports/{id}.xlsx" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">` — style เดียวกับ "เปิดหน้าจริง" (`calculator-config-client.tsx:151-159`). server ส่ง attachment อยู่แล้ว (S4) — ไม่ต้องมี `download` attr

### 2.3 (c) กล่องคำอธิบาย (#150 §2)
กล่อง info `rounded-md border border-border/70 bg-muted/50 px-4 py-3 text-sm` (precedent FAQ info `home-client.tsx:344`, ขยาย padding เพราะเนื้อหายาวกว่า).

**ข้อความ (แสดงเสมอ):**
> **ระบบอ่านอะไรจากไฟล์**
> - อ่านเฉพาะ sheet **On-grid** — sheet อื่น (เช่น Hybrid) ระบบข้าม
> - อ่านตารางแรกใต้หัวตาราง "ผลิตพลังงานต่อวัน" ลงไปจนถึงแถวแรกที่ช่องขนาดว่าง
> - **ไม่อ่าน** ราคา ยี่ห้อ เงินประหยัด และระยะคืนทุนในไฟล์ — ระยะคืนทุนบนหน้าเว็บคำนวณจากราคา Package
> - ไม่ต้องใช้แบบฟอร์มพิเศษ แก้ไฟล์ Excel ของฝ่ายขายแล้วอัปโหลดได้เลย — **ห้ามแก้หัวตาราง 2 แถวบน** (ระบบหาคอลัมน์จากชื่อหัวตาราง)
> - บันทึกไฟล์จาก Microsoft Excel เป็น .xlsx (ไม่ใส่รหัสผ่าน ไม่มี macro) — ไฟล์จาก Google Sheets อาจไม่มีค่าที่คำนวณจากสูตร

**ปุ่ม toggle** (Button `variant="ghost"` `size="sm"`, `aria-expanded`, `aria-controls="calc-import-columns"`): **"ดูคอลัมน์ที่ระบบอ่าน (9)"** / **"ซ่อนคอลัมน์"** — ค่าเริ่มต้น **ปิด**. เมื่อเปิด แสดง `ul` `text-xs`:

| คอลัมน์ในไฟล์ (หัวตาราง) | ใช้ทำอะไร |
|---|---|
| ขนาดกำลังผลิต + หน่วย (kW / MW) | ขนาดระบบ (MW แปลงเป็น kW) |
| Phase | 1 เฟส / 3 เฟส — ขนาดเดียวกันที่ค่าตรงกันรวมเป็นแถวเดียว |
| ผลิตพลังงานต่อวัน › จำนวนชั่วโมง… | ชั่วโมงแดดต่อวัน |
| ผลิตพลังงานต่อเดือน › จำนวนวัน | จำนวนวันต่อเดือน |
| แผงโซล่าเซลล์ › จำนวนติดตั้ง | จำนวนแผง |
| แผงโซล่าเซลล์ › พื้นที่หลังคา… | พื้นที่หลังคา (ถ้าว่าง ใช้ จำนวนแผง × 2.7 ตร.ม.) |
| ค่าไฟ › ประมาณ (ต่ำสุด–สูงสุด) | ช่วงค่าไฟที่เหมาะกับขนาดนี้ — **ค่าไฟสูงสุดต้องเพิ่มขึ้นตามขนาด** |
| ค่าไฟ › ค่าไฟ/หน่วย | ราคาค่าไฟต่อหน่วย (รายแถว) |
| ประเภท | ไม่บังคับ — ไม่นำไปแสดง |

บรรทัดท้าย `ul`: **"กติกาแนะนำ: เลือกขนาดเล็กที่สุดที่ค่าไฟสูงสุดมากกว่าบิลของลูกค้า"**

> ✅ ตรวจเทียบ comment สุดท้ายของ #150 §2 แล้ว (2026-09-26, main session) — ครบทุกข้อ; เพิ่มบรรทัด "ห้ามแก้หัวตาราง 2 แถวบน" ตาม #150

### 2.4 (d) Upload
โครงเดียวกับ FAQ (`home-client.tsx:395-407`) + ปุ่มส่งแยก (FAQ ส่งพร้อมฟอร์ม Save — ที่นี่ไม่มีฟอร์มรวม):

```
<form onSubmit=… noValidate className="space-y-1.5">
  <Label htmlFor="calc-import-file">ไฟล์ Excel (.xlsx)</Label>
  <div className="flex flex-col gap-2 sm:flex-row">
    <Input id="calc-import-file" name="file" type="file"
           accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
           aria-describedby="calc-import-file-hint calc-import-file-error" className="sm:flex-1" />
    <Button id="calc-import-upload" type="submit" disabled={!file || uploading}>
      <Upload className="size-4" /> อัปโหลดและตรวจไฟล์
    </Button>
  </div>
  <p id="calc-import-file-hint" className="text-xs text-muted-foreground">
    .xlsx ไม่เกิน 2 MB · อัปโหลดแล้วยังไม่มีผลกับหน้าเว็บจนกว่าจะกดยืนยัน
  </p>
  {fileError && <p id="calc-import-file-error" className="text-xs text-destructive">{fileError}</p>}
</form>
```

- Client pre-check (server ยังเป็นตัวจริง): นามสกุลไม่ใช่ `.xlsx` → **"รองรับเฉพาะไฟล์ .xlsx"**; `> 2 MB` → **"ไฟล์ใหญ่เกิน 2 MB"** — เคลียร์ input เหมือน FAQ (`home-client.tsx:315-326`)
- เลือกไฟล์ใหม่ขณะมี preview/reject ค้าง → **ล้างผลเดิมทันที** (ไม่ให้ preview ไฟล์เก่าค้างคู่ชื่อไฟล์ใหม่)
- ปุ่มกว้างเต็มบน mobile (`flex-col`), ติดขวา input บน `sm:`

---

## 3. States

| # | State | อะไรแสดงในโซน (e) | ปุ่ม | Announce / focus |
|---|---|---|---|---|
| S-1 | **Idle, default table, ไม่มีประวัติ** | ไม่มี (e); (b) = default; (f) = empty state | upload disabled จนเลือกไฟล์ | — |
| S-2 | **Idle, มี import ใช้อยู่** | ไม่มี (e); (b) = import | — | — |
| S-3 | **Uploading** | บรรทัด `role="status"` `text-sm text-muted-foreground` + `Loader2 animate-spin size-4`: **"กำลังอ่านและตรวจไฟล์…"** | upload → label **"กำลังตรวจไฟล์…"** disabled; file input disabled; ปุ่มในประวัติ disabled | status อ่านออกเสียง (polite); การ์ด `aria-busy="true"` |
| S-4 | **Reject** | กล่อง error §4.1 | upload กลับ enabled (เลือกไฟล์ใหม่) | focus → heading ของกล่อง error |
| S-5 | **Preview (ไม่มี warning)** | Preview panel §4.2 | **ใช้ตารางนี้บนหน้าเว็บ** / **ยกเลิก** | focus → heading preview |
| S-6 | **Preview + warnings** | เหมือน S-5 + กล่อง warning อยู่ **บนสุด** ของ panel | เหมือน S-5 (warning ไม่ block) | focus → heading preview (warning count อยู่ใน heading) |
| S-7 | **Duplicate sha256** | Preview ของ import เดิม + banner info §4.2.1 | ถ้า import นั้น **ใช้อยู่แล้ว** → ปุ่มยืนยันถูกแทนด้วยข้อความ "ชุดนี้ใช้อยู่แล้ว" | focus → heading preview |
| S-8 | **Apply confirm** | แถบยืนยัน inline ใต้ preview §4.3 | **ยืนยัน ใช้ตารางนี้** / **ยกเลิก** | focus → ปุ่มยืนยัน |
| S-9 | **Applying** | แถบยืนยันคงอยู่ | ยืนยัน → **"กำลังใช้ตาราง…"** disabled, ยกเลิก disabled | — |
| S-10 | **Conflict** | Preview คงอยู่ + กล่อง error §4.4 แทนแถบยืนยัน | **โหลดข้อมูลล่าสุด** | toast + focus → กล่อง conflict |
| S-11 | **Applied** | (e) หาย; (b) อัปเดตเป็นชุดใหม่; ประวัติ badge "ใช้อยู่" ย้าย | — | toast success; focus → heading การ์ด |
| S-12 | **History empty** | (f) empty state §6 | — | — |
| S-13 | **Action error อื่น** (network/500) | (e) คงผลเดิม | ปุ่มกลับ enabled | `toast.error` §7.4 |

**กติกา pending**: ระหว่าง S-3 และ S-9 ปุ่มทุกปุ่มในการ์ด + ปุ่ม "คืนค่าเริ่มต้น" (§8) disabled — กันยิง action ซ้อน.

---

## 4. โซนผลตรวจไฟล์ (e)

### 4.1 Reject (S-4)
กล่อง `role="group" aria-labelledby="calc-import-reject-heading"` class `rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3` (precedent `home-client.tsx:352`) — **แต่** รายการข้อผิดพลาดเป็น `text-sm text-foreground` (ไม่ใช่ `text-destructive` ทั้งก้อน: แดงบนชมพูที่ `text-xs` คอนทราสต์ ~4.3:1 ต่ำกว่า AA และอ่านยากเมื่อหลายบรรทัด). เฉพาะ heading + icon เป็น `text-destructive`.

```
┌ ⚠ ใช้ไฟล์นี้ไม่ได้ — พบปัญหา 3 ข้อ ────────────────────────────┐   h3 tabIndex=-1, text-destructive font-semibold
│ คำนวณติดตั้ง.xlsx · ไม่มีอะไรถูกบันทึก                         │   text-xs text-muted-foreground
│ • แถว 14, คอลัมน์ O (ค่าไฟ ประมาณ – สูงสุด): ว่าง              │
│   → ใส่ค่าไฟสูงสุดของขนาด 40 kW                                │
│ • แถว 21: ค่าไฟสูงสุดของ 115 kW (115,000 ฿) ต้องมากกว่าของ     │
│   ขนาดก่อนหน้า 120 kW …                                        │
│ • …                                                            │
│ และอีก 7 ข้อ  [แสดงทั้งหมด]                                    │   เกิน 10 ข้อ → ตัด + toggle
│ แก้ไฟล์ใน Excel แล้วอัปโหลดใหม่                                  │   text-xs text-muted-foreground
└────────────────────────────────────────────────────────────────┘
```

- Heading: **"ใช้ไฟล์นี้ไม่ได้ — พบปัญหา {n} ข้อ"** (n=1 → "ใช้ไฟล์นี้ไม่ได้")
- Sub: **"{fileName} · ไม่มีอะไรถูกบันทึก"**
- รายการ: `ol list-disc pl-5 space-y-1`; แต่ละข้อรูปแบบ **"{ตำแหน่ง}: {ปัญหา}"** + บรรทัดใหม่ `text-muted-foreground` **"→ {สิ่งที่ต้องทำ}"** (copy §7.1–7.3)
- เกิน 10 ข้อ: แสดง 10 แรก + **"และอีก {n} ข้อ"** + ghost button **"แสดงทั้งหมด"** (`aria-expanded`)
- ท้าย: **"แก้ไฟล์ใน Excel แล้วอัปโหลดใหม่"**
- **ไม่มี toast** สำหรับ reject (ผลอยู่ inline และ focus ย้ายไปแล้ว — toast ซ้ำเป็น noise)

### 4.2 Preview (S-5 / S-6 / S-7)
`<section id="calc-import-preview" aria-labelledby="calc-import-preview-heading" className="space-y-4 rounded-lg border border-border p-4">`

```
┌ ตรวจก่อนใช้: คำนวณติดตั้ง.xlsx ───────────────────────────────┐  h3 tabIndex=-1
│ 31 ขนาด (3 – 3,000 kW) · คำเตือน 2 ข้อ · อ่านถึงแถว 36 · ข้าม sheet: Hybrid │ text-xs muted
│                                                                │
│ ┌ ⚠ คำเตือน 2 ข้อ — ยืนยันได้ แต่โปรดตรวจ ────────────────────┐ │  amber box
│ │ • Package 7 kW ไม่มีในตาราง — เครื่องคำนวณจะไม่แนะนำขนาดนี้ │ │
│ │ • สไลด์บิลสูงสุด 8,000 ฿ …                                   │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                │
│ ผลต่อบิลตัวอย่าง                                                 │  h4
│ ┌─────────┬──────────────┬──────────────┬───────────────────┐ │
│ │ บิล/เดือน │ ตอนนี้          │ หลังยืนยัน      │ คืนทุนบนหน้าเว็บ     │ │
│ │ 1,500 ฿ │ 3 kW          │ 3 kW          │ แสดง              │ │
│ │ 3,500 ฿ │ 5 kW          │ 5 kW          │ แสดง              │ │
│ │ 6,000 ฿ │ 10 kW         │ ▸ 8 kW        │ ไม่แสดง (ไม่มี Package) │ │  แถวเปลี่ยน: bg-amber-50
│ │ 8,000 ฿ │ 10 kW         │ ▸ 10 kW       │ แสดง              │ │
│ └─────────┴──────────────┴──────────────┴───────────────────┘ │
│ ขนาดที่ไม่มี Package (ไม่แสดงระยะคืนทุน): 6, 8, 12, 15 … kW     │  text-xs muted
│                                                                │
│ เทียบกับตารางที่ใช้อยู่   เพิ่ม 28 · ลบ 0 · เปลี่ยน 2 · เหมือนเดิม 1 │  h4 + summary
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ [เปลี่ยน] 5 kW                                            │   │
│ │   ช่วงค่าไฟ  3,000–6,000 → 3,000–4,000                    │   │
│ │ [เปลี่ยน] 10 kW                                           │   │
│ │   ช่วงค่าไฟ  6,000–10,000 → 7,000–10,000                  │   │
│ │ [เพิ่ม] 28 ขนาด: 6, 8, 12, 15, 20 … 3,000 kW               │   │
│ └──────────────────────────────────────────────────────────┘   │
│                                                                │
│ [ดูตารางทั้งหมด (31 ขนาด) ▾]                                   │  ghost toggle
│                                                                │
│                 [ยกเลิก]  [ใช้ตารางนี้บนหน้าเว็บ]               │
└────────────────────────────────────────────────────────────────┘
```

**Heading**: **"ตรวจก่อนใช้: {fileName}"**. Meta line (`text-xs text-muted-foreground`, คั่นด้วย " · "): **"{n} ขนาด ({minKw} – {maxKw} kW)"**, **"คำเตือน {w} ข้อ"** (เฉพาะ w>0), **"อ่านถึงแถว {r}"** และ **"ข้าม sheet: {names}"** (เฉพาะเมื่อ parser ส่งมา).

ลำดับภายใน preview คงที่: **warning → ผลต่อบิลตัวอย่าง → diff → ตารางทั้งหมด (พับ) → ปุ่ม** — เรียงจาก "สิ่งที่ลูกค้าจะเห็น" ไป "รายละเอียดข้อมูล".

#### 4.2.1 Duplicate banner (S-7)
กล่อง info (`border-border/70 bg-muted/50`, `text-sm`) บนสุดของ preview:
- ไม่ใช่ชุดที่ใช้อยู่: **"ไฟล์นี้เคย upload แล้ว เมื่อ {วันที่ เวลา} โดย {name} — แสดงผลจากชุดเดิม ไม่ได้บันทึกซ้ำ"**
- เป็นชุดที่ใช้อยู่: **"ไฟล์นี้เคย upload แล้ว และเป็นชุดที่ใช้อยู่ตอนนี้ — ไม่ต้องยืนยันซ้ำ"**; footer แทนปุ่มยืนยันด้วย `text-sm text-muted-foreground` **"ชุดนี้ใช้อยู่แล้ว"** + ปุ่ม **"ปิด"**

#### 4.2.2 Warnings box (S-6)
`role="group" aria-labelledby` · class **`rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800`** (precedent เดียวใน admin: `settings-client.tsx:78`; amber-800 บน amber-50 ≈ 7:1 ผ่าน AA). Icon `AlertTriangle size-4`.
- Heading: **"คำเตือน {w} ข้อ — ยืนยันได้ แต่โปรดตรวจ"**
- `ul list-disc pl-5 space-y-1` — copy §7.5. เกิน 10 ข้อ → ตัดแบบเดียวกับ §4.1
- **Package-size warnings จัดไว้บนสุดของรายการ** (มีผลกับลูกค้า) ตามด้วย slider warning แล้วค่อยเป็น warning ระดับ cell

#### 4.2.3 ผลต่อบิลตัวอย่าง
- `h4 text-sm font-semibold`: **"ผลต่อบิลตัวอย่าง"**
- shadcn `Table` ใน `div.overflow-x-auto rounded-md border` (precedent: audit/leads) — คอลัมน์: **บิล/เดือน · ตอนนี้ · หลังยืนยัน · คืนทุนบนหน้าเว็บ**
- ค่าในช่องขนาด: `"{kw} kW"`, `belowFirstRow` → `"{kw} kW (ต่ำกว่าช่วง)"`, `tooLarge` → **"เกินตาราง"**
- แถวที่ขนาดเปลี่ยน: `<TableRow className="bg-amber-50">` + ช่อง "หลังยืนยัน" `font-semibold` + prefix ข้อความซ่อน `<span className="sr-only">เปลี่ยน: </span>` (ไม่พึ่งสีอย่างเดียว; ใน mockup "▸")
- คอลัมน์ "คืนทุนบนหน้าเว็บ": **"แสดง"** / **"ไม่แสดง (ไม่มี Package)"** — **ต้องการ `hasPackage` ต่อบิลตัวอย่างจาก `diffSizeTables` (S2)** หรือส่ง `packageSizesKw: number[]` (published) จาก `page.tsx` ให้ client คำนวณ → ดู §10 Q3
- บรรทัดใต้ตาราง (`text-xs text-muted-foreground`, แสดงเมื่อมี): **"ขนาดที่ไม่มี Package (ไม่แสดงระยะคืนทุน): {list} kW"** — list ยาว > 12 ตัว ตัดเป็น "… และอีก {n} ขนาด"
- ชุดบิลตัวอย่าง: ตามที่ `diffSizeTables` คืน (plan: 1,500 / 3,000 / 3,500 / 6,000 / 8,000) — แนะนำเพิ่ม **4,500** (S10 ระบุว่า 4,000–6,999 คือช่วงที่คืนทุนหาย) → §10 Q4

#### 4.2.4 Diff กับตารางที่ใช้อยู่
- `h4`: **"เทียบกับตารางที่ใช้อยู่"** + summary inline `text-xs text-muted-foreground`: **"เพิ่ม {a} · ลบ {r} · เปลี่ยน {c} · เหมือนเดิม {s}"**
- ไม่มีความต่าง → `text-sm text-muted-foreground` **"ตารางนี้เหมือนกับที่ใช้อยู่ทุกแถว"**
- เป็น **list** (`ul divide-y rounded-md border`), ไม่ใช่ตาราง — แต่ละ item `px-3 py-2 text-sm`:
  - **เปลี่ยน** (แสดงก่อน, เรียง kW): `Badge variant="outline"` **"เปลี่ยน"** + **"{kw} kW"**, แล้วบรรทัดละ field ที่เปลี่ยน:
    `{fieldLabel}  <s className="text-muted-foreground">{old}</s> → <mark className="rounded bg-amber-50 px-1 font-semibold text-foreground">{new}</mark>`
    + sr-only "เดิม" / "ใหม่" ก่อนค่า (strike/สีไม่ถูกอ่านออกเสียง). **แสดงเฉพาะ field ที่เปลี่ยน**
  - **ลบ**: `Badge variant="destructive"` **"ลบ"** + **"{kw} kW — ขนาดนี้จะไม่ถูกแนะนำอีก"**
  - **เพิ่ม**: รวมเป็น **item เดียว** `Badge variant="secondary"` **"เพิ่ม"** + **"{a} ขนาด: {kw list} kW"** (ตัดเหมือน §4.2.3) — ค่าละเอียดดูในตารางทั้งหมด (ไม่แตก 28 item)
- Field labels (ใช้ทั้ง diff และตารางทั้งหมด):

| field | label | format |
|---|---|---|
| `phases` | เฟส | "1 หรือ 3" / "1" / "3" |
| `billMin`–`billMax` | ช่วงค่าไฟ (฿) | "3,000–4,000" (รวมเป็น field เดียวเมื่อ min หรือ max เปลี่ยน) |
| `panels` | แผง | "10" |
| `roofM2` | หลังคา (ตร.ม.) | 1 ตำแหน่ง "27.0" |
| `sunHours` | ชม.แดด/วัน | "5" |
| `days` | วัน/เดือน | "30" |
| `pricePerKwh` | ค่าไฟ/หน่วย (฿) | 2 ตำแหน่ง "4.50" |

#### 4.2.5 ตารางทั้งหมด (พับ)
- Ghost toggle **"ดูตารางทั้งหมด ({n} ขนาด)"** / **"ซ่อนตาราง"** (`aria-expanded`, `aria-controls`), ค่าเริ่มต้นปิด
- shadcn `Table` ใน `overflow-x-auto rounded-md border`, `text-xs`, หัว `whitespace-nowrap`, ตัวเลข `text-right tabular-nums`; คอลัมน์ตามลำดับตาราง field ข้างบน โดย **ขนาด (kW)** เป็นคอลัมน์แรก `sticky left-0 bg-card` (ให้เลื่อนแนวนอนบนมือถือแล้วยังรู้ว่าแถวไหน)
- แถวที่ "เพิ่ม"/"เปลี่ยน" ไม่ต้องไฮไลต์ซ้ำ (diff ทำหน้าที่แล้ว — กันตารางลายตา)

### 4.3 Apply confirm (S-8 / S-9)
Footer ของ preview `flex flex-wrap justify-end gap-2`:
- **"ยกเลิก"** (outline) → ปิด preview, ล้าง file input, focus → file input. **ไม่ลบ draft** (อยู่ในประวัติแล้ว — ไม่มีปุ่มลบใน v1)
- **"ใช้ตารางนี้บนหน้าเว็บ"** (`Button` default/primary, id `calc-import-apply`) → เปลี่ยน footer เป็นแถบยืนยัน inline (pattern FAQ `home-client.tsx:423-452`, แต่โทน **ไม่แดง** เพราะไม่ใช่การลบ):

```
┌ rounded-md border border-border bg-muted/40 px-3 py-2 text-sm ─────────┐
│ ยืนยันใช้ตารางนี้บนหน้าเว็บจริง? ขนาดที่แนะนำจะเปลี่ยนใน 2 จาก 5          │
│ บิลตัวอย่าง — ลูกค้าเห็นทันที                                            │
│                         [ยกเลิก] [ยืนยัน ใช้ตารางนี้]                    │
└──────────────────────────────────────────────────────────────────────────┘
```
- ข้อความ: **"ยืนยันใช้ตารางนี้บนหน้าเว็บจริง? ขนาดที่แนะนำจะเปลี่ยนใน {k} จาก {m} บิลตัวอย่าง — ลูกค้าเห็นทันที"**; ถ้า k=0 → **"ยืนยันใช้ตารางนี้บนหน้าเว็บจริง? บิลตัวอย่างได้ขนาดเดิมทั้งหมด — ลูกค้าเห็นทันที"**
- ปุ่ม: **"ยกเลิก"** (outline, `h-8`) · **"ยืนยัน ใช้ตารางนี้"** (default, id `calc-import-apply-confirm`) → pending **"กำลังใช้ตาราง…"**
- ใช้ `version` จาก preview result (`configVersion`) เป็นตัว lock — **ไม่ใช่** `data.version` ของฟอร์ม
- ทำไม inline ไม่ใช่ `AlertDialog`: ข้อมูลที่ต้องใช้ตัดสินใจ (diff) อยู่บนจอเดียวกัน — dialog จะบังมัน. `AlertDialog` ใน admin ใช้กับ "ลบ" (`crud-page.tsx:217`) ซึ่งไม่ใช่กรณีนี้

### 4.4 Conflict (S-10)
- `toast.error("มีคนแก้ก่อนคุณ — รีเฟรชแล้วลองใหม่")` — **ข้อความเดิมตรงตัว** (`calculator-config-client.tsx:115`)
- แทนแถบยืนยันด้วยกล่อง error (class §4.1) `role="alert"`:
  **"มีคนแก้ตัวเลขการคำนวณก่อนคุณ — ผลเทียบด้านบนอาจไม่ตรงกับตารางล่าสุดแล้ว กด "โหลดข้อมูลล่าสุด" แล้วอัปโหลดไฟล์เดิมอีกครั้งเพื่อดูผลเทียบใหม่ (ไฟล์นี้เก็บในประวัติแล้ว ไม่ต้องกังวลว่าจะหาย)"**
  + ปุ่ม outline **"โหลดข้อมูลล่าสุด"** → `router.refresh()`
- **ห้าม** `router.refresh()` อัตโนมัติทันทีที่ชน (ต่างจากฟอร์มตัวเลขเดิม): `page.tsx:33` ใส่ `key` ที่รวม `configRow.version` บน shell → refresh = remount ทั้งแท็บ → preview + ข้อความ conflict หายก่อนผู้ใช้อ่าน และ Tabs กลับไป `defaultValue="content"` (ดู §9.3)
- อัปโหลดไฟล์เดิมซ้ำหลัง refresh → server คืน import เดิม (dedupe) + diff เทียบตารางล่าสุด → ได้ S-7 → ยืนยันได้ตามปกติ

### 4.5 Applied (S-11)
- `toast.success("ใช้ตารางใหม่แล้ว — หน้าเครื่องคำนวณอัปเดตแล้ว")`
- `router.refresh()` → summary (b) แสดงชุดใหม่, badge "ใช้อยู่" ย้ายในประวัติ, preview ปิด, file input ว่าง
- focus → `h2#calc-size-table-heading` (`tabIndex={-1}`) — ดู §9.3 เรื่องรักษาแท็บ/focus หลัง remount

---

## 5. การเลือก "ใช้ชุดนี้" (rollback) — ใน §6

(กติกาเดียวกับ apply — `applyCalculatorImport({ importId, version: data.version })`)

---

## 6. ประวัติไฟล์ (f)

- `Separator` แล้ว `h3 text-sm font-semibold`: **"ประวัติไฟล์ (20 รายการล่าสุด)"**
- **List เดียวทุกความกว้าง** (ไม่ทำ table desktop + card mobile สองชุด): `ul id="calc-import-history" className="divide-y rounded-md border border-border/70"`; item `li className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"`

```
┌──────────────────────────────────────────────────────────────┐
│ คำนวณติดตั้ง.xlsx  [ใช้อยู่]                  ⤓ ดาวน์โหลดต้นฉบับ │
│ 26 ก.ย. 2569 14:02 · สมชาย · 31 ขนาด · คำเตือน 2 ▾            │
├──────────────────────────────────────────────────────────────┤
│ คำนวณติดตั้ง (เก่า).xlsx                                       │
│ 20 ก.ย. 2569 09:15 · สมหญิง · 27 ขนาด · ไม่มีคำเตือน           │
│                        [ใช้ชุดนี้]   ⤓ ดาวน์โหลดต้นฉบับ         │
└──────────────────────────────────────────────────────────────┘
```

- บรรทัด 1: fileName `font-medium truncate` (`title`), + `Badge` **"ใช้อยู่"** เมื่อ `id === sizeTableImportId`
- บรรทัด 2 `text-xs text-muted-foreground`: **"{วันที่ เวลาอัปโหลด} · {ชื่อผู้อัป} · {n} ขนาด · {คำเตือน}"**
  - คำเตือน: 0 → **"ไม่มีคำเตือน"**; >0 → ghost button เล็ก **"คำเตือน {w}"** (`aria-expanded`) กางรายการ `ul text-xs text-amber-800` ใต้ item
- Actions (ขวาบน desktop / แถวล่างบน mobile, `flex flex-wrap gap-2`):
  - **"ใช้ชุดนี้"** — `Button variant="outline" size="sm"` id `calc-import-use-{id}`; **ซ่อน** เมื่อเป็นชุดที่ใช้อยู่ (badge แทน)
  - **"ดาวน์โหลดต้นฉบับ"** — ลิงก์ style §2.2, `aria-label="ดาวน์โหลดต้นฉบับ {fileName}"`
- **Confirm "ใช้ชุดนี้"** — inline ใต้ item นั้น (pattern §4.3, โทน muted):
  **"ใช้ชุด "{fileName}" ({n} ขนาด, อัปโหลด {วันที่}) บนหน้าเว็บจริงแทนชุดปัจจุบัน? ลูกค้าเห็นทันที"** · **"ยกเลิก"** / **"ยืนยัน ใช้ชุดนี้"** → pending **"กำลังใช้ตาราง…"**
  - เปิดได้ทีละ item (เปิดอันใหม่ปิดอันเก่า); focus → ปุ่มยืนยัน; Esc หรือ "ยกเลิก" → focus กลับปุ่ม "ใช้ชุดนี้"
  - สำเร็จ: `toast.success("กลับไปใช้ชุด {fileName} แล้ว")`; conflict: §4.4 (toast เดิม + กล่อง conflict ใน item นั้น)
  - **ไม่มี diff ใน rollback v1** — ข้อจำกัดโดยรู้ตัว; ถ้าต้องการ diff ต้องเพิ่ม action preview-by-id (§10 Q2)
- **Empty state (S-12)**: `p text-sm text-muted-foreground` ในกรอบ `rounded-md border border-dashed px-3 py-6 text-center`: **"ยังไม่มีไฟล์ในระบบ — ใช้ไฟล์ Excel ของฝ่ายขาย"** (copy จาก plan S6a)
- Draft ที่ไม่เคยใช้ ไม่มี label พิเศษ (model ไม่มี status — #148 §1.3)

---

## 7. Copy catalog (exact Thai)

ตำแหน่ง: `{r}` = เลขแถว Excel (1-based ตามที่เห็นใน Excel), `{c}` = ตัวอักษรคอลัมน์ (A, B, …), `{label}` = ชื่อหัวคอลัมน์ที่คนอ่านรู้เรื่อง. รูปแบบ: **"{ตำแหน่ง}: {ปัญหา}"** + **"→ {สิ่งที่ต้องทำ}"**.

### 7.1 Reject — ระดับไฟล์
| กรณี | ปัญหา | → ทำอะไร |
|---|---|---|
| นามสกุล/magic ผิด, มีรหัสผ่าน, .xls | รองรับเฉพาะไฟล์ .xlsx ที่ไม่ใส่รหัสผ่าน | เปิดใน Excel แล้วเลือก "บันทึกเป็น" › สมุดงาน Excel (.xlsx) และไม่ตั้งรหัสผ่าน |
| > 2 MB | ไฟล์ใหญ่เกิน 2 MB (ไฟล์นี้ {x} MB) | ลบ sheet หรือรูปภาพที่ไม่ใช้ แล้วบันทึกใหม่ |
| zip bomb / entries เกิน | ไฟล์ผิดรูปแบบ | เปิดใน Excel แล้วบันทึกใหม่เป็น .xlsx |
| มี macro | ไฟล์มี macro | บันทึกเป็น .xlsx ธรรมดา (ไม่ใช่ .xlsm) |
| sheet ใหญ่ผิดปกติ | ตาราง On-grid ใหญ่ผิดปกติ (เกิน 1,000 แถว หรือ 100 คอลัมน์) | ลบแถว/คอลัมน์ว่างที่ถูกจัดรูปแบบไว้ แล้วบันทึกใหม่ |
| exceljs error | อ่านไฟล์ไม่ได้ | เปิดใน Excel แล้วบันทึกใหม่เป็น .xlsx แล้วลองอีกครั้ง |

### 7.2 Reject — ระดับโครงสร้าง
| กรณี | ข้อความ |
|---|---|
| ไม่มี sheet | ไม่พบ sheet ชื่อ On-grid → ตรวจชื่อ sheet ให้เป็น "On-grid" |
| ไม่เจอ header | ไม่พบหัวตาราง "ผลิตพลังงานต่อวัน" ใน 20 แถวแรกของ sheet On-grid → ตรวจว่าหัวตารางยังอยู่ด้านบนของ sheet |
| คอลัมน์บังคับหาย | ไม่พบคอลัมน์ "{label}" → ตรวจว่าหัวคอลัมน์ยังสะกดเหมือนไฟล์เดิม |
| label ซ้ำหลายคอลัมน์ | พบคอลัมน์ "{label}" มากกว่า 1 คอลัมน์ ({c1}, {c2}) → เหลือไว้คอลัมน์เดียว |

### 7.3 Reject — ระดับแถว
| กรณี | ข้อความ |
|---|---|
| หน่วยผิด | แถว {r}, คอลัมน์ {c} (หน่วย): "{v}" → ใช้ได้เฉพาะ kW หรือ MW |
| ขนาด ≤0/ไม่ใช่เลข | แถว {r}, คอลัมน์ {c} (ขนาดกำลังผลิต): ต้องเป็นตัวเลขมากกว่า 0 |
| ขนาดซ้ำ phase เดียวกัน | แถว {r1} และ {r2}: ขนาด {kw} kW {p} เฟส ซ้ำกัน → ลบแถวที่ซ้ำ |
| 1φ/3φ ค่าไม่ตรง (#146) | แถว {r1} และ {r2}: ขนาด {kw} kW แบบ 1 เฟสและ 3 เฟส มี{label}ไม่ตรงกัน ({a} กับ {b}) → แก้ให้ตรงกัน |
| billMax หาย (#146) | แถว {r}, คอลัมน์ {c} (ค่าไฟ ประมาณ – สูงสุด): ว่าง → ใส่ค่าไฟสูงสุดของขนาด {kw} kW |
| billMin ≥ billMax | แถว {r}: ค่าไฟต่ำสุด ({min} ฿) ต้องน้อยกว่าค่าไฟสูงสุด ({max} ฿) |
| billMax ไม่เพิ่ม (#146) | แถว {r}: ค่าไฟสูงสุดของ {kw} kW ({max} ฿) ต้องมากกว่าของขนาดก่อนหน้า {prevKw} kW ({prevMax} ฿) → แก้ช่วงค่าไฟให้เพิ่มขึ้นตามขนาด |
| นอกช่วง | แถว {r}, คอลัมน์ {c} ({label}): {v} อยู่นอกช่วงที่รับได้ ({range}) — ranges: ชั่วโมงแดด "1–12", วันต่อเดือน "28–31", ค่าไฟ/หน่วย "0.01–50 ฿", จำนวนแผง "จำนวนเต็มตั้งแต่ 1" |
| สูตรไม่มี cached | แถว {r}, คอลัมน์ {c} ({label}): เป็นสูตรที่ไม่มีค่าที่คำนวณไว้ → เปิดไฟล์ใน Microsoft Excel แล้วกดบันทึกอีกครั้ง |

### 7.4 Toasts
| เหตุการณ์ | Toast |
|---|---|
| apply สำเร็จ | success "ใช้ตารางใหม่แล้ว — หน้าเครื่องคำนวณอัปเดตแล้ว" |
| rollback สำเร็จ | success "กลับไปใช้ชุด {fileName} แล้ว" |
| conflict (apply/rollback) | error "มีคนแก้ก่อนคุณ — รีเฟรชแล้วลองใหม่" (เดิม) |
| apply/rollback error อื่น | error `result.error` หรือ "ใช้ตารางไม่สำเร็จ" |
| upload ล้มเหลว (network/500/throw) | error "อัปโหลดไม่สำเร็จ — ลองใหม่อีกครั้ง" |
| preview สำเร็จ / reject | **ไม่มี toast** (inline + focus) |
| reset สำเร็จ / ล้มเหลว | "คืนค่าเริ่มต้นแล้ว" / "คืนค่าไม่สำเร็จ" (เดิม) |

### 7.5 Warnings (ไม่ block)
| กรณี | ข้อความ |
|---|---|
| Package ไม่อยู่ในตาราง (#146) | Package {kw} kW ไม่มีในตาราง — เครื่องคำนวณจะไม่แนะนำขนาดนี้ (หน้า Packages ยังแสดงตามปกติ) |
| slider max ≥ billMax สุดท้าย (Default #13) | สไลด์บิลสูงสุด {max} ฿ ไม่น้อยกว่าค่าไฟสูงสุดของขนาดใหญ่สุด ({lastMax} ฿) — ช่วงปลายสไลด์จะแสดง "ระบบเกิน {lastKw} kW ปรึกษาทีมงาน" |
| external links | ไฟล์อ้างอิงไฟล์อื่น — ระบบใช้ค่าที่บันทึกไว้ในไฟล์นี้เท่านั้น |
| sheet/แถวซ่อน | sheet On-grid มีแถวที่ซ่อนอยู่ ({rows}) — ระบบยังอ่านค่าในแถวเหล่านี้ |
| ตัวเลขเป็นข้อความ | แถว {r}, คอลัมน์ {c}: ตัวเลขถูกพิมพ์เป็นข้อความ ("{v}") — ระบบแปลงให้แล้ว |
| สูตร + cached | แถว {r}, คอลัมน์ {c} ({label}): เป็นสูตร — ใช้ค่าที่คำนวณไว้ ({v}) |
| roof ว่าง | แถว {r}: ไม่มีพื้นที่หลังคา — คำนวณจากจำนวนแผง × 2.7 ตร.ม. |
| ขนาดไม่เรียง | ขนาดในไฟล์ไม่เรียงจากน้อยไปมาก — ระบบเรียงให้แล้ว |
| ประหยัดตามทฤษฎี > billMax | ขนาด {kw} kW ผลิตไฟได้มากกว่าค่าไฟสูงสุดของช่วง — หน้าเว็บจำกัดเงินประหยัดไม่เกินบิลอยู่แล้ว |

Info (ไม่นับเป็น warning, อยู่ใน meta line ของ preview): **"อ่านถึงแถว {r}"**, **"ข้าม sheet: {names}"**.

---

## 8. คืนค่าเริ่มต้น (reset)

- ย้ายออกจาก footer ฟอร์ม → **section ท้ายแท็บ** แยกด้วย `Separator`:
  - `h3 text-sm font-semibold`: **"คืนค่าเริ่มต้น"**
  - `p text-sm text-muted-foreground`: **"คืนตัวคูณรายปีเป็น 10, สไลด์บิล 500–8,000 ฿ ทีละ 100 และกลับไปใช้ตารางเริ่มต้น 3 ขนาด (3, 5, 10 kW) — ไฟล์ในประวัติยังอยู่ เลือก "ใช้ชุดนี้" ได้ภายหลัง"**
  - Button outline + `RotateCcw` **"คืนค่าเริ่มต้น"** (id เดิม ถ้ามีใน e2e)
- **แทน `window.confirm`** (บรรทัด 124–130 — ที่เดียวใน admin ที่ใช้ native confirm, และ copy "ค่าเริ่มต้นจาก Excel" ผิดความหมายแล้ว) ด้วย inline confirm pattern FAQ **โทน destructive** (เพราะย้อนสิ่งที่ลูกค้าเห็น):
  **"ยืนยันคืนค่าเริ่มต้นทั้งหมด? หน้าเครื่องคำนวณจะกลับไปใช้ตารางเริ่มต้น 3 ขนาดทันที"** · **"ยกเลิก"** / **"ยืนยันคืนค่า"** (`variant="destructive"`) → pending **"กำลังคืนค่า…"**
- เมื่อสถานะเป็น default อยู่แล้ว และตัวคูณ/สไลด์ = ค่าเริ่มต้น → ปุ่ม disabled + `title="ใช้ค่าเริ่มต้นอยู่แล้ว"` (optional — ถ้า data ที่มีพอจะรู้)
- ในการ์ด (b) เมื่อ source = import: บรรทัด `text-xs text-muted-foreground` **"ต้องการกลับไปตารางเริ่มต้น? ใช้ "คืนค่าเริ่มต้น" ท้ายหน้านี้"**

---

## 9. Accessibility · Responsive · Implementation notes

### 9.1 Keyboard & focus
- ทุก control เป็น `<button>`/`<a>`/`<input>` จริง — ไม่มี div clickable
- Focus หลังเหตุการณ์: upload สำเร็จ → `#calc-import-preview-heading`; reject → `#calc-import-reject-heading`; กด "ใช้ตารางนี้…" → ปุ่มยืนยัน; ยกเลิก confirm → ปุ่มที่เปิด confirm; ยกเลิก preview → file input; applied → `#calc-size-table-heading`. Heading ที่รับ focus ใส่ `tabIndex={-1}` + `outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-sm`
- Inline confirm ทุกตัว: Esc = ยกเลิก
- Toggle ทุกตัว: `aria-expanded` + `aria-controls`

### 9.2 Live regions
- **หนึ่ง** `<p role="status" aria-live="polite" className="sr-only">` ต่อการ์ด สำหรับข้อความสถานะ: "กำลังอ่านและตรวจไฟล์…" → "ตรวจไฟล์เสร็จ: {n} ขนาด คำเตือน {w} ข้อ" / "ใช้ไฟล์นี้ไม่ได้ พบปัญหา {n} ข้อ"
- ไม่ใส่ `role="alert"` บนกล่อง reject/warning (focus ย้ายไปแล้ว — alert ซ้ำ = อ่านสองรอบ). ยกเว้นกล่อง conflict (§4.4) ซึ่งเกิดโดยไม่ได้ย้าย focus จาก action ของผู้ใช้โดยตรง
- Toast (sonner) มี live region ของตัวเองอยู่แล้ว

### 9.3 Tab/focus หลัง `router.refresh()` — ต้องแก้ใน S6
`page.tsx:33` key = `${pageRow.version}-${pageSeo.version}-${configRow.version}` บน `CalculatorAdminShell` → apply/rollback/reset/บันทึกตัวเลข เพิ่ม version → **shell remount → `Tabs defaultValue="content"` เด้งกลับแท็บ "เนื้อหา"** (อนุมานจากโค้ด — ตรวจใน real render). กับการ์ดใหม่ที่ผู้ใช้ทำงานหลายขั้นในแท็บนี้ ถือว่าเป็น regression ของ flow. แนวแก้ที่แนะนำ (ให้ `nextjs-dev` เลือก, surgical):
1. ย้าย `key` ที่ผูก `configRow.version` ลงไปที่ `<CalculatorConfigClient key=…>` เท่านั้น (ฟอร์ม re-init state จาก data ใหม่) และให้การ์ดอ่าน props สด (ไม่ copy ลง state) — Tabs ไม่ remount; หรือ
2. ทำ Tabs เป็น controlled + จำค่าไว้นอก key (เช่น `?tab=config` ผ่าน `useSearchParams`)
- ต้องยืนยันใน e2e: หลัง apply ยังอยู่แท็บ "ตัวเลขการคำนวณ"

### 9.4 Responsive (admin content แคบสุด ~320–360px)
- Upload: input + ปุ่ม stack (`flex-col sm:flex-row`), ปุ่มเต็มกว้าง
- ตาราง (บิลตัวอย่าง, ตารางทั้งหมด): `overflow-x-auto` เฉพาะกล่องตาราง, body ห้าม scroll แนวนอน; คอลัมน์ kW sticky
- Diff + ประวัติ: list ที่ `flex-wrap` — ไม่มีตารางกว้าง
- footer ปุ่ม `flex-wrap justify-end`; touch target ปุ่มหลัก ≥ 36px (Button default `h-9`) — ปุ่มใน inline confirm ใช้ `h-8` (FAQ ใช้ `h-7` ซึ่งเล็กไปบนมือถือ — อย่าลอก `h-7`)
- ชื่อไฟล์ไทยยาว: `truncate min-w-0` บน container flex (ไม่งั้น overflow)

### 9.5 Stable ids (สำหรับ e2e S6)
`calc-import-file`, `calc-import-upload`, `calc-import-reject`, `calc-import-preview`, `calc-import-apply`, `calc-import-apply-confirm`, `calc-import-conflict`, `calc-import-history`, `calc-import-use-{id}`, `calc-import-use-confirm-{id}`, `calc-size-table-summary`, `calc-reset`, `calc-reset-confirm`

### 9.6 Data ที่การ์ดต้องได้ (props จาก `page.tsx`)
- `activeTable: SizeRow[]`, `source: "default" | "import"`, `activeImportId: string | null`, `configVersion`, (`configUpdatedAt` ถ้าจะใช้ "ยืนยันใช้เมื่อ")
- `history: { id, fileName, createdAt, uploadedByName, rowCount, warnings: string[] }[]` (20)
- `packageSizesKw: number[]` (published) — ถ้าเลือกคำนวณ "ขนาดที่ไม่มี Package" ฝั่ง client (§10 Q3)
- preview result ต้องมี: `rows`, `warnings`, `diff` (added/removed/changed + fields, samples), `configVersion`, และ **`duplicate?: { createdAt, uploadedByName }`** (S5 ตอนนี้ระบุแค่ "คืน import เดิม") + ข้อมูล info `readToRow`, `skippedSheets` ถ้า parser มี
- reject result: `messages: string[]` เรียงตามแถว (ไม่ใช่ตามชนิด error) เพื่อให้แก้ไฟล์ไล่บนลงล่างได้

### 9.7 สิ่งที่ห้าม
- ไม่ใช้สีใหม่/token ใหม่: ใช้แค่ `destructive`, `amber-300/50/800` (precedent), `muted`, `border`, `primary`, `Badge` variants ที่มี
- ไม่มี success box สีเขียว (ไม่มี precedent — ใช้ toast + summary อัปเดตเป็นหลักฐาน)
- ไม่มี drag-and-drop zone / progress bar / animation — ใช้ file `Input` เดิม

---

## 10. คำถามที่ต้องให้ owner ตัดสิน (ไม่ block S6 — มี default)

| # | คำถาม | Default ใน spec |
|---|---|---|
| Q1 | "คืนค่าเริ่มต้น" รีเซ็ตทั้งตัวคูณ/สไลด์ **และ** ตาราง ในปุ่มเดียว (ตาม #150 + S5) — ต้องการปุ่ม "กลับไปตารางเริ่มต้น" แยกเฉพาะตารางไหม? | ปุ่มเดียว + copy บอกชัดว่ารีเซ็ตอะไรบ้าง |
| Q2 | Rollback ("ใช้ชุดนี้") ไม่มี diff เทียบชุดปัจจุบัน — ยอมรับไหม? ถ้าไม่ ต้องเพิ่ม action `previewCalculatorImportById` ใน S5 | ยอมรับใน v1; confirm แสดงชื่อไฟล์/จำนวนขนาด/วันที่ |
| Q3 | คอลัมน์ "คืนทุนบนหน้าเว็บ" + "ขนาดที่ไม่มี Package" ต้องมีข้อมูล Package — เพิ่ม `hasPackage` ใน `diffSizeTables` (S2) หรือส่ง `packageSizesKw` ให้ client? | แนะนำเพิ่มใน `diffSizeTables` (มี packages อยู่แล้วใน signature) |
| Q4 | บิลตัวอย่างเพิ่ม **4,500 ฿** (ช่วงที่คืนทุนหายหลัง S10) และบิล = slider max? | เพิ่ม 4,500 |
| Q5 | "ดาวน์โหลดต้นฉบับ" ใน summary = ไฟล์ของชุดที่ **ใช้อยู่** (ไม่ใช่ไฟล์ที่อัปโหลดล่าสุดซึ่งอาจเป็น draft) — ตรงกับเจตนา #150 "download latest original" ไหม? | ชุดที่ใช้อยู่; ไฟล์ล่าสุดทุกไฟล์โหลดได้จากประวัติ |
| Q6 | Copy กล่องคำอธิบาย §2.3 ต้องเทียบกับ #150 §2 (agent เปิด issue ไม่ได้รอบนี้) | #150 ชนะถ้าขัด |
