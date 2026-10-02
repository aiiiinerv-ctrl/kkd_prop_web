# Design spec: ตัวแก้ตาราง On-grid / Hybrid + นำเข้า 2 ชีต (หลังบ้าน)

> **Asset ของ ticket #162 (map #153)** · วันที่ 2026-10-02 · ผู้เขียน `ux-ui-expert` (read-only) · ผู้ใช้ `nextjs-dev`
> Mockup: https://claude.ai/artifact/WLiD3MBW5Pszv22Lu2ZJpY (private)
>
> **ต่อยอดจาก** `docs/plans/calculator-excel-import-admin-ui-spec.md` (ต่อไปเรียก "spec S6") ทุกอย่างที่ไม่ได้เขียนไว้ในเอกสารนี้ ให้ใช้ตาม spec S6
> **ข้อตัดสินที่ใช้:** #161, #163 (D3–D6), research-158 §1–§4, research-154 §2–§4 และข้อตัดสินที่ caller สรุปให้ในบรีฟ #162
> หมายเหตุ: agent ไม่ได้อ่าน comment ของ issue บน GitHub ตรง ๆ (ไม่มีสิทธิ์รัน `gh`) ถ้าข้อใดขัดกับ comment ใน #161/#163/#162 ให้ comment ชนะ
>
> หลังบ้านเป็นภาษาไทยอย่างเดียว ข้อความทั้งหมดเขียนตรงในโค้ด (ไม่เข้า `messages/*.json`) และไม่เพิ่มสีหรือ token ใหม่ (spec S6 §9.7) **ยกเว้น 1 จุด** คือกล่องเตือน "ตาราง Hybrid จะถูกลบ" ที่ใช้ `border-2 border-destructive` (§8.3)

---

## 0. ข้อสรุปสั้น

| เรื่อง | ที่เลือก |
|---|---|
| ตัวแก้ตาราง | **แบบ B**: รายการขนาด (อ่านอย่างเดียว) + Dialog แก้ทีละขนาด ใช้ทั้ง On-grid และ Hybrid |
| ตำแหน่งในหน้า | **แท็บบนสุดใหม่ "ตารางขนาดระบบ"** (กว้าง `max-w-5xl`) แยกจาก "ตัวเลขการคำนวณ" ภายในมีแท็บย่อย On-grid / Hybrid (`variant="line"`) |
| นำเข้า | แผงกาง/พับได้ใต้กล่อง "ที่ใช้อยู่" ใช้ preview เดิม แบ่งผลเป็น 2 ส่วน (ชีต On-grid / ชีต Hybrid) |
| บันทึก | แถบบันทึก sticky → Dialog ยืนยัน diff → ใช้ทันที |
| ประวัติ | รายการเดียว ป้าย "Excel: <ไฟล์>" หรือ "แก้ในหลังบ้าน" |

---

## 1. ทิศทางที่พิจารณา

### 1.1 ตัวแก้ตาราง

| แบบ | แนวคิด | ได้ | เสีย |
|---|---|---|---|
| **A. ตารางแก้ในช่อง จัดกลุ่มตาม kW (พับได้)** | ทุกช่องเป็น input เหมือน Excel; หัวกลุ่มของ Hybrid มีช่องค่าร่วมของ kW | เห็นทุกค่าพร้อมกัน แก้หลายแถวติดกันได้เร็ว | Hybrid มีตาราง 2 รูปแบบซ้อนกัน (ค่าร่วม + แถวแบต × ยี่ห้อ); มีช่องกรอกราว 300 ช่อง บน tablet ต้องเลื่อนแนวนอนขณะพิมพ์; error ในกลุ่มที่พับมองไม่เห็น; ไม่มีโหมดแก้ชัดเจน จึงเสี่ยงแก้โดยไม่ตั้งใจ; ทำ a11y ของ grid ยาก |
| **B. รายการขนาด + Dialog แก้ทีละขนาด** (เลือก) | ตารางสรุป 1 แถวต่อขนาด (อ่านอย่างเดียว) กด "แก้ไข" เพื่อเปิด Dialog ของขนาดนั้น | ตรงกับงานจริงของการแก้ในหลังบ้าน (แก้จุดเล็ก ส่วนงานแก้ทั้งคอลัมน์ใช้ Excel ได้แล้ว); โครง Dialog ตรงกับข้อมูล (ค่าร่วมอยู่บน ตารางแบต × ยี่ห้ออยู่ล่าง); ใช้ Dialog แบบฟอร์ม CRUD ที่เจ้าของคุ้นแล้ว (`crud-page.tsx:171`); dialog กว้างราว 720px บน tablet พอดี 9 คอลัมน์ | ถ้าจะแก้ค่าเดียวกันหลายขนาดต้องเปิดหลายครั้ง; ต้องมี working copy ข้ามหลาย Dialog + แถบบันทึก |

**เหตุผลที่เลือก B สำหรับเจ้าของ SME ที่ไม่ใช่สาย tech**
1. มี "จุดเริ่มแก้" ชัด (ปุ่มแก้ไข) และ "จุดจบ" ชัด (ตกลง → บันทึก) จึงไม่เกิดการพิมพ์ทับโดยไม่ตั้งใจ
2. หน้าจอที่เห็นแต่ละครั้งเป็นข้อมูลของ 1 ขนาด (ไม่เกิน 9 ช่องค่าร่วม + 6 แถว × 5 ยี่ห้อ) error ทุกจุดอยู่ในจอเดียวกับช่องที่ต้องแก้
3. งานแก้จำนวนมากมีทางที่ดีกว่าอยู่แล้ว คือดาวน์โหลด Excel → แก้ → นำเข้า (#161) ตัวแก้ในหลังบ้านจึงไม่ต้องเลียน Excel
4. ใช้ภาษาภาพเดิมทั้งหมด: Table, Dialog, Badge, Input, กล่อง amber/destructive

### 1.2 ตำแหน่งในหน้า

| แบบ | ได้ | เสีย |
|---|---|---|
| **L1. แท็บใหม่ "ตารางขนาดระบบ"** (เลือก) | เจ้าของกดตรงไปที่ตารางได้ทันที; ความกว้างของแต่ละแท็บเหมาะกับเนื้อหา (ฟอร์ม 3xl / ตาราง 5xl); แยก state "ยังไม่บันทึก" ออกจากฟอร์มตัวคูณ | ต้องย้ายการ์ดออกจาก `calculator-config-tab.tsx`; การประสาน busy ข้ามแท็บหายไป (optimistic lock ยังคุมอยู่ ดู §2.3) |
| L2. รวมไว้ในแท็บ "ตัวเลขการคำนวณ" | แก้โค้ดน้อยกว่า; ตัวอย่างผลคำนวณอยู่ใกล้ตาราง | หน้ายาวมาก (ฟอร์ม + ตาราง 2 ชุด + นำเข้า + ประวัติ + reset); ความกว้างในแท็บเดียวไม่เท่ากัน; เจ้าของต้องเลื่อนผ่านตัวคูณทุกครั้งที่จะแก้ราคา |

---

## 2. โครงหน้า

### 2.1 แท็บของ `CalculatorAdminShell`
ลำดับ: **เนื้อหา · แบนเนอร์ · ตัวเลขการคำนวณ · ตารางขนาดระบบ · Properties** (ถ้าไม่มีสิทธิ์ Properties ก็ไม่มีแท็บสุดท้ายเหมือนเดิม)

- แท็บใหม่ `value="size-table"` `id="calculator-tab-size-table"` แสดงเฉพาะ `canManageConfig` (ADMIN) เหมือนแท็บตัวเลข
- `<TabsContent value="size-table" keepMounted className="pt-4">` **ต้องมี `keepMounted`** เพื่อให้ working copy ไม่หายเมื่อสลับไปแท็บอื่น
- `description` ของ PageShell: **"เนื้อหาหน้า · แบนเนอร์ · ตัวเลขการคำนวณ · ตารางขนาดระบบ · Properties (SEO)"**

### 2.2 แท็บ "ตัวเลขการคำนวณ" หลังแยก
- เอา `<CalculatorSizeTableCard>` ออกจาก `calculator-config-tab.tsx`
- ใต้ฟอร์ม ใส่บรรทัด `text-sm text-muted-foreground`: **"ตารางขนาดระบบ (On-grid / Hybrid) ย้ายไปอยู่แท็บ "ตารางขนาดระบบ""**
- กล่อง "ตัวอย่างผลคำนวณ (ตามตารางที่ใช้อยู่)" ยังเป็น On-grid อย่างเดียว (Hybrid preview ในแท็บนี้อยู่นอกขอบเขต ดู §13 Q4)
- Reset อยู่ที่เดิม เปลี่ยนแค่ข้อความ (§11)

### 2.3 แท็บ "ตารางขนาดระบบ"
Container: `mx-auto max-w-5xl min-w-0 space-y-6`

```
┌ ตารางขนาดระบบ ─────────────────────────────────────────────────────┐ h2 #calc-tables-heading
│ ใช้แนะนำขนาดระบบในหน้าเครื่องคำนวณ — แก้ในหน้านี้ หรือดาวน์โหลด…    │
│ ┌ ที่ใช้อยู่ (§10) ─────────────────── [⤓ ดาวน์โหลดเป็น Excel] [⤒ นำเข้าไฟล์ Excel] │
│ └──────────────────────────────────────────────────────────────┘   │
│ (แผงนำเข้า §8 กางตรงนี้เมื่อเปิด)                                    │
│ ─ On-grid (32) ─ Hybrid (13 ขนาด) [ผิด 2] ─                        │ Tabs variant="line"
│ ตารางรายการ (§4)                                    [+ เพิ่มขนาด]   │
│ ┌ แถบบันทึก sticky (§6) ─────────────────────────────────────┐     │
│ ─────────────────────────────────────────────────────────────      │
│ ประวัติตาราง (20 เวอร์ชันล่าสุด) (§9)                                 │
└────────────────────────────────────────────────────────────────────┘
```

- ทั้งแท็บอยู่ใน `<section className="rounded-xl border border-border/70 bg-card p-6 space-y-5">` (shell เดียวกับการ์ดเดิม) ส่วนบนมือถือใช้ `p-4 sm:p-6`
- **แท็บย่อย On-grid / Hybrid:** `<Tabs defaultValue="on-grid">` + `<TabsList variant="line">` (มีอยู่ใน `tabs.tsx`) หน้าตาเป็นเส้นใต้ ต่างจากแท็บเม็ดยาด้านบนชัดเจน และใส่ `keepMounted` เหมือนกัน
  - label ของ trigger: **"On-grid"** + `<span className="text-muted-foreground">({n})</span>`; **"Hybrid"** + `({k} ขนาด)` และถ้าไม่มีตาราง Hybrid ใช้ **"Hybrid (ไม่มี)"**
  - ถ้า working copy ของตารางนั้นมี error ให้ต่อ `<Badge variant="destructive">ผิด {e}</Badge>` ท้าย trigger เพื่อไม่ให้ error ซ่อนอยู่ในแท็บที่ไม่ได้เปิด
- **ระหว่างมีการแก้ที่ยังไม่บันทึก (dirty):**
  - ปุ่ม "นำเข้าไฟล์ Excel" disabled พร้อม hint ใต้กล่อง `text-xs`: **"บันทึกหรือยกเลิกการแก้ก่อนนำเข้าไฟล์"**
  - ปุ่ม "ใช้ชุดนี้" ในประวัติ disabled แบบเดียวกัน
  - ปุ่ม "ดาวน์โหลดเป็น Excel" ยังใช้ได้ และแสดง hint: **"ไฟล์ที่ดาวน์โหลดเป็นตารางที่ใช้อยู่ ไม่รวมการแก้ที่ยังไม่บันทึก"**
  - `beforeunload` เตือนเมื่อจะออกจากหน้า
- **การประสานข้ามแท็บ:** ไม่ต้องยก busy state ข้ามแท็บ ถ้าใครกด reset หรือบันทึกตัวเลขระหว่างที่ตารางยังไม่บันทึก `version` จะเปลี่ยน และการบันทึกตารางจะชน optimistic lock → เข้าสู่ §7.4 ซึ่งเป็นพฤติกรรมที่ต้องการ

---

## 3. ไฟล์และ component

| ไฟล์ | สถานะ | หน้าที่ |
|---|---|---|
| `calculator-admin-shell.tsx` | แก้ | เพิ่มแท็บ `size-table` (§2.1) |
| `calculator-config-tab.tsx` | แก้ | เอาการ์ดตารางออก, เพิ่มบรรทัดชี้แท็บ, แก้ copy ของ reset (§11) |
| `calculator-size-table-card.tsx` | แก้ → **เปลี่ยนบทบาท** | เหลือเฉพาะ **แผงนำเข้า** (upload + reject + preview + apply) แนะนำให้เปลี่ยนชื่อเป็น `calculator-import-panel.tsx` (ถ้าเปลี่ยน ให้แก้ comment อ้างอิงใน spec S6 ด้วย) |
| `calculator-tables-tab.tsx` | **ใหม่** | root ของแท็บ: summary (§10), ปุ่ม export/นำเข้า, แท็บย่อย, ถือ working copy + แถบบันทึก + Dialog ยืนยัน |
| `calculator-table-list.tsx` | **ใหม่** | ตารางรายการ On-grid และ Hybrid (§4) แยกเป็น 2 export: `OnGridList`, `HybridList` |
| `on-grid-size-dialog.tsx` | **ใหม่** | Dialog แก้/เพิ่มขนาด On-grid (§5.2) |
| `hybrid-size-dialog.tsx` | **ใหม่** | Dialog แก้/เพิ่มขนาด Hybrid (§5.3) |
| `save-tables-dialog.tsx` | **ใหม่** | Dialog ยืนยัน diff (§7) |
| `calculator-version-history.tsx` | **ใหม่** (ย้ายจาก size-table-card) | ประวัติ (§9) |
| `src/hooks/admin/use-table-draft.ts` | **ใหม่** | reducer ของ working copy (§6.1) ไม่ใช้ Zustand เพราะ state อยู่ในแท็บเดียว |
| `page.tsx` | แก้ | ส่ง `hybridRows`, `brands`, `source` ของแต่ละเวอร์ชัน และ `activeSource` (§12) |

ทุกไฟล์อยู่ใน `src/app/admin/(dashboard)/pages/calculator/` ยกเว้น hook

---

## 4. ตารางรายการ (อ่านอย่างเดียว)

ใช้ร่วม: shadcn `Table` ใน `div.overflow-x-auto rounded-md border`, `text-xs sm:text-sm`, หัวตาราง `whitespace-nowrap`, ตัวเลขใช้ `text-right tabular-nums`, คอลัมน์ "ขนาด" เป็น `sticky left-0 bg-card font-medium` ส่วนคอลัมน์ที่ระบบคำนวณใช้ `bg-muted/40 text-muted-foreground`

### 4.1 สถานะของแถว (ไม่พึ่งสีอย่างเดียว ต้องมีป้ายข้อความทุกสถานะ)

| สถานะ | ลักษณะ | คอลัมน์ "สถานะ" | ปุ่มท้ายแถว |
|---|---|---|---|
| เหมือนที่ใช้อยู่ | ปกติ | ว่าง | `ghost sm` **"แก้ไข"** |
| แก้แล้ว | `shadow-[inset_3px_0_0_var(--primary)]` ที่ cell แรก, ค่าที่เปลี่ยนใช้ `<mark className="rounded bg-amber-50 px-1">` | `Badge outline` **"แก้แล้ว"** | "แก้ไข" |
| ใหม่ | เส้นซ้ายสี primary | `Badge secondary` **"ใหม่"** | "แก้ไข" |
| จะลบ | ทั้งแถว `text-muted-foreground line-through` (ยกเว้นคอลัมน์สถานะและปุ่ม) | `Badge secondary` **"จะลบ"** | `ghost sm` **"คืนขนาดนี้"** |
| มี error | เส้นซ้าย `var(--destructive)` | + `Badge destructive` **"ผิด {n}"** | "แก้ไข" |
| มี warning | — | + `Badge` class `border-amber-300 bg-amber-50 text-amber-800` **"เตือน {n}"** | "แก้ไข" |

- ปุ่ม "แก้ไข" มี `aria-label="แก้ไขขนาด {kw} kW"` และ id `calc-edit-{table}-{kw}` ทั้งแถวไม่ต้องคลิกได้ (ไม่มี div คลิก)
- **ไม่มีปุ่มลบในรายการ** ให้ลบได้จากใน Dialog เท่านั้น เพื่อกันแตะพลาดบน tablet

### 4.2 คอลัมน์ On-grid
**ขนาด · เฟส · ช่วงค่าไฟ (฿) · ชม.แดด · วัน · ค่าไฟ/หน่วย · แผง · หลังคา (ตร.ม.) · ผลิต kWh/ด.\* · ประหยัด/ด.\* · สถานะ · (ปุ่ม)**
- \* ระบบคำนวณ: ผลิต = `kw × sunHours × days`; ประหยัด = ผลิต × `pricePerKwh` (ไม่ cap บิล เพราะเป็นตัวเลขช่วยตรวจ ต้องใช้ฟังก์ชันเดียวกับที่ public ใช้)
- format ใช้ `formatFieldValue` เดิม (เฟส "1, 3" / "1" / "3")

### 4.3 คอลัมน์ Hybrid (1 แถวต่อ kW)
**ขนาด · เฟส · แบต (kWh) · ช่วงค่าไฟ (฿) · แผง · ยี่ห้อที่มีราคา\* · คืนทุน (ปี)\* · สถานะ · (ปุ่ม)**
- เฟส: phase ทั้งหมดที่มีใน kW นี้ ("1, 3")
- แบต: รายการ kWh ที่ไม่ซ้ำ เรียงจากน้อยไปมาก คั่นด้วย " · " (ถ้าแต่ละ phase มีชุดแบตไม่เท่ากัน ให้แสดงแบบรวม แล้วรายละเอียดอยู่ใน Dialog)
- \* ยี่ห้อที่มีราคา: "{ยี่ห้อที่มีราคาใช้ได้อย่างน้อย 1 แถว}/{จำนวนยี่ห้อ}"
- \* คืนทุน: ช่วง min–max ของคืนทุนทุกแถวที่มีราคา (ทศนิยม 1 ตำแหน่ง); ถ้าบางแถวไม่มีราคาให้ต่อ **" · แบต: ไม่มีราคา"**; ถ้าไม่มีราคาเลย **"ไม่แสดง (ไม่มีราคา)"**
- ใต้ตาราง `text-xs text-muted-foreground`: **"ราคาเป็นราคาต่อยี่ห้อจาก Excel ชื่อยี่ห้อแก้ได้ทาง Excel เท่านั้น คืนทุนคิดจากราคาต่ำสุดที่ใช้ได้"**

### 4.4 แถวหัวรายการ
`flex flex-wrap items-center justify-between gap-2`: ข้อความอธิบาย (ซ้าย) + ปุ่ม `outline sm` **"+ เพิ่มขนาด"** (`Plus` icon) id `calc-add-{table}`

### 4.5 Empty state ของ Hybrid (ไม่มีตาราง Hybrid)
กรอบ `rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground`:
**"ยังไม่มีตาราง Hybrid — หน้าเครื่องคำนวณจึงไม่แสดงตัวเลือก Hybrid นำเข้าไฟล์ Excel ที่มีชีต Hybrid เพื่อเริ่มใช้"**
- **ไม่มีปุ่ม "เพิ่มขนาด"** ในสถานะนี้ เพราะชื่อยี่ห้อมาจาก Excel เท่านั้น ถ้าไม่มีตารางก็ไม่มีชุดยี่ห้อ (ดู §13 Q1)

---

## 5. Dialog แก้ขนาด

### 5.1 ร่วมกันทั้งสองตาราง
- `Dialog` + `DialogContent className="max-h-[90vh] w-full max-w-3xl overflow-y-auto"` บนจอ `< sm` ให้เต็มจอ (`max-sm:h-dvh max-sm:max-h-dvh max-sm:max-w-none max-sm:rounded-none`)
- หัว (`DialogTitle`): **"แก้ขนาด {kw} kW · {On-grid|Hybrid}"** / เพิ่มใหม่: **"เพิ่มขนาดใหม่ · {On-grid|Hybrid}"**
- `DialogDescription`: **"ค่าจะยังไม่ขึ้นหน้าเว็บจนกว่าจะกด "ตรวจและบันทึก" ที่แถบด้านล่างหน้า"**
- footer (`flex flex-wrap gap-2`): ปุ่ม **"ลบขนาดนี้"** (`ghost` + `text-destructive`, ชิดซ้าย `mr-auto`, ซ่อนตอนเพิ่มใหม่) · **"ยกเลิก"** (outline) · **"ตกลง"** (default)
  - **"ตกลง"** นำค่าเข้า working copy แล้วปิด **ปิดได้แม้มี error** (กติกาข้ามแถว เช่น billMax ต้องเพิ่มขึ้น อาจต้องไปแก้อีกขนาด) แถวจะติดป้าย "ผิด n"
  - **"ยกเลิก"** / Esc / คลิกนอก Dialog: ทิ้งค่าที่แก้ใน Dialog รอบนี้ ถ้ามีการแก้ใน Dialog แล้ว ให้แสดง inline confirm แทน footer: **"ทิ้งค่าที่แก้ในหน้าต่างนี้?"** · **"แก้ต่อ"** / **"ทิ้ง"**
  - **"ลบขนาดนี้"**: ทำเครื่องหมาย "จะลบ" ใน working copy แล้วปิด (ไม่ต้อง confirm เพราะคืนได้จากรายการ และยังต้องผ่านการยืนยัน diff อีกครั้ง) toast: **"ทำเครื่องหมายลบ {kw} kW แล้ว — กด "คืนขนาดนี้" ได้ถ้าเปลี่ยนใจ"**
- **กล่องสรุป error** อยู่บนสุดของ body เมื่อมี error: `rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3` (class จาก spec S6 §4.1) หัว `text-destructive font-semibold`: **"ต้องแก้ {n} จุดก่อนบันทึก"** แล้วตามด้วยรายการที่แต่ละข้อเป็นปุ่มลิงก์ (`<button className="text-primary underline-offset-2 hover:underline">`) กดแล้ว focus ไปที่ช่องนั้น
- **กล่องสรุป warning** อยู่ท้าย body: class amber จาก spec S6 §4.2.2 หัว **"คำเตือน {n} ข้อ — บันทึกได้ แต่โปรดตรวจ"**
- validation ทำงาน **ทุกครั้งที่ blur และตอนกดตกลง** (ไม่ต้องตรวจทุก keystroke) โดยรัน `validateOnGridTable` / `validateHybridTable` กับทั้งตารางใน working copy (เพื่อให้กติกาข้ามแถวทำงาน) แล้วกรองเฉพาะ issue ของขนาดนี้มาแสดงใน Dialog

### 5.2 ช่องกรอก (ตัวเลข)
- ใช้ `<Input type="text" inputMode="decimal">` (**ห้าม `type="number"`** เพราะ scroll wheel เปลี่ยนค่าได้และใส่ comma ไม่ได้) ใส่ `className="text-right tabular-nums"` และ `h-9` (สูง ≥36px สำหรับนิ้ว)
- ตอน focus แสดงค่าดิบ (ไม่มี comma) ตอน blur จัดรูปแบบ `toLocaleString("th-TH")` ตอน parse ให้ตัด `,` และช่องว่าง
- error: `aria-invalid="true"` (Input ของ base-nova มี style แดงอยู่แล้ว) + `<p id="{fieldId}-error" className="mt-1 text-xs text-destructive">` + `aria-describedby`
- warning: `className="border-amber-400 bg-amber-50"` + `<p className="mt-1 text-xs text-amber-800">` + `aria-describedby`
- คำอธิบายใต้ช่อง (helper): `text-xs text-muted-foreground`

### 5.3 On-grid: ช่องใน Dialog
grid `gap-4 sm:grid-cols-2 lg:grid-cols-3`

| id | Label | ชนิด | helper / หมายเหตุ |
|---|---|---|---|
| `og-kw` | ขนาด (kW) | ตัวเลข > 0 | เพิ่มใหม่: แก้ได้ · ขนาดเดิม: `readOnly` + พื้น `bg-muted` + helper **"เปลี่ยนขนาดไม่ได้ ต้องลบแล้วเพิ่มขนาดใหม่"** |
| `og-phase-1`, `og-phase-3` | เฟส | checkbox 2 ตัว "1 เฟส" "3 เฟส" ใน `fieldset` + `legend` | ต้องเลือกอย่างน้อย 1 |
| `og-sun` | ชม.แดด/วัน | 1–12 | |
| `og-days` | วัน/เดือน | 28–31 | |
| `og-price` | ค่าไฟ/หน่วย (฿) | 0.01–50 | |
| `og-panels` | จำนวนแผง | จำนวนเต็ม ≥ 1 | |
| `og-roof` | หลังคา (ตร.ม.) | ว่างได้ | **"ว่างได้ ระบบจะใช้ แผง × 2.7"** |
| `og-bill-min` | ค่าไฟต่ำสุด (฿) | int | |
| `og-bill-max` | ค่าไฟสูงสุด (฿) | int | **"ต้องมากกว่าค่าไฟสูงสุดของขนาดที่เล็กกว่า ({prevKw} kW: {prevMax} ฿)"** (แสดงค่าจริงเพื่อช่วยกรอก) |

กล่องคำนวณ (read-only) ใต้ grid `rounded-lg border border-border bg-muted/20 p-4` ใช้ `dl grid gap-2 text-sm sm:grid-cols-3`:
**ผลิตต่อเดือน** "{n} kWh" · **ประหยัดต่อเดือน** "฿{n}" · **แผงตามสูตร** "≈{n}" (ใช้ช่วยตรวจ ดู Q2) ค่าจะอัปเดตทันทีที่พิมพ์ และ `aria-live="off"`

### 5.4 Hybrid: ช่องใน Dialog

**(ก) ค่าที่ใช้ทั้งขนาด** — `<fieldset>` + `<legend className="text-sm font-semibold">` **"ค่าที่ใช้ทั้งขนาด {kw} kW (ทุกเฟส ทุกแบต)"** grid `gap-4 sm:grid-cols-3`
ช่องเดียวกับ On-grid §5.3 (ขนาด, ชม.แดด, วัน, ค่าไฟ/หน่วย, แผง, หลังคา, ค่าไฟต่ำสุด, ค่าไฟสูงสุด) โดยเปลี่ยน prefix id เป็น `hy-`
- **"เฟสที่มี"** checkbox "1 เฟส" / "3 เฟส":
  - ติ๊กเพิ่ม phase: สร้างแถวของ phase นั้น โดยคัดลอกชุดแบตจาก phase ที่มีอยู่และปล่อยราคาว่าง
  - เอาติ๊กออก: ทำเครื่องหมายลบแถวทั้งหมดของ phase นั้น โดยแสดง inline confirm ใต้ checkbox **"ลบแถว {p} เฟส ทั้ง {n} แถว?"** · "ยกเลิก" / "ลบแถว"
  - ต้องเหลืออย่างน้อย 1 phase
- ช่อง "จำนวนแผง": helper แสดง **"สูตร ≈{n}"** เสมอ และถ้าต่างเกิน 20% ให้เป็น warning (§5.2) ข้อความ **"ต่างจากสูตร (≈{n}) เกิน 20%"**

**(ข) ราคาต่อยี่ห้อ** — หัว `text-sm font-semibold` **"ราคาต่อยี่ห้อ (฿) แยกตามเฟสและแบต"** และด้านขวา `text-xs text-muted-foreground` พร้อม icon `Lock size-3.5`: **"ชื่อยี่ห้อมาจากไฟล์ Excel เปลี่ยนชื่อได้ทาง Excel เท่านั้น"**

Table ใน `overflow-x-auto rounded-md border` คอลัมน์:
**เฟส · แบต (kWh)** (sticky left) · **{ยี่ห้อ 1..N}** (หัวเป็นข้อความธรรมดา ไม่ใช่ input) · **ประหยัด/ด.\*** · **คืนทุน (ปี)\*** · (ปุ่มลบแถว)

- เรียงแถวตาม phase แล้วตาม kWh
- cell แรก: `"{p}φ · {kWh}"` และแถว kWh = 0 ต่อ `<span className="text-xs text-muted-foreground">(ไม่มีแบต)</span>`
  - แถวที่เพิ่มใหม่: kWh เป็น `Input` กว้าง `w-16` (แก้ได้) ส่วนแถวเดิม kWh เป็นข้อความ (เปลี่ยน key ไม่ได้ ใช้วิธีลบแล้วเพิ่ม)
- ช่องราคา: `Input` `min-w-[6.5rem]`, `placeholder="ไม่มีราคา"`, `aria-label="ราคา {ยี่ห้อ} {p} เฟส แบต {kWh} kWh"`
  - ถ้ากรอก 0 → ตอน blur ให้ล้างเป็นว่าง (ตาม #155: 0 = ไม่มีราคา) โดยไม่ต้องแจ้ง error
  - **ราคาแบตที่ไม่นำมาคิด** (E3: แถวแบต > 0 ที่ยี่ห้อเดียวกันในแถวแบต 0 ไม่มีราคา): ช่องเป็น warning style + ข้อความใต้ช่อง **"ไม่นำมาคิด"** และ `title`/`aria-describedby` **"ยี่ห้อนี้ไม่มีราคาชุดไม่มีแบต ราคานี้จึงไม่นำมาคิดคืนทุน"**
- \* ประหยัด/ด. = `(kw × sunHours + batteryKwh) × pricePerKwh × days` (ฟังก์ชันเดียวกับ public)
- \* คืนทุน = ราคาต่ำสุดที่ใช้ได้ ÷ (ประหยัด/ด. × ตัวคูณรายปี) ทศนิยม 2 ตำแหน่ง ต่อด้วยชื่อยี่ห้อที่ใช้คิด `text-xs` (admin เห็นยี่ห้อได้ เพราะไม่ใช่ payload ของ public) ถ้าไม่มีราคาแสดง **"—"**
- ปุ่มลบแถว: `ghost size="icon-sm"` icon `Trash2`, `aria-label="ลบแถว {p} เฟส แบต {kWh} kWh"`
  - แถวแบต 0: disabled + `title="แถวไม่มีแบตต้องมีเสมอ ถ้าไม่ใช้ขนาดนี้ ให้ลบทั้งขนาด"` (E13)
  - กดลบแล้วแถวจะขีดฆ่า และปุ่มเปลี่ยนเป็น `ghost sm` **"คืน"**
- ใต้ตาราง: ปุ่ม `outline sm` **"+ เพิ่มแถวแบต"** ซึ่งเพิ่มแถวใหม่ท้าย phase แรกที่ติ๊กไว้ (ถ้ามี 2 phase ให้เลือก phase ใน cell แรกของแถวใหม่ด้วย `Select` 1/3) แล้ว focus ช่อง kWh
  - ข้อความข้างปุ่ม `text-xs text-muted-foreground`: **"ช่องว่างหรือ 0 หมายถึงยี่ห้อนี้ไม่มีราคา · คืนทุน = ราคาต่ำสุดที่ใช้ได้ ÷ (ประหยัด/เดือน × {ตัวคูณ})"**

**เพิ่มขนาดใหม่ (Hybrid):** เปิด Dialog เปล่า โดยค่าเริ่มต้นของ ชม.แดด/วัน/ค่าไฟต่อหน่วย คัดลอกจากขนาดที่ใหญ่สุดในตาราง ติ๊ก "3 เฟส" และสร้างแถวแบต 0 ให้ 1 แถว คอลัมน์ยี่ห้อใช้ชุดยี่ห้อของตารางปัจจุบัน

---

## 6. Working copy และแถบบันทึก

### 6.1 State (`use-table-draft.ts`)
```ts
type Draft = {
  baseVersion: number;                 // configVersion ตอนเริ่มแก้ — ใช้เป็น optimistic lock
  onGrid: DraftRow<SizeRow>[];         // { key, original: SizeRow|null, current: SizeRow|null(=จะลบ) }
  hybrid: DraftHybridSize[] | null;    // จัดกลุ่มตาม kW: shared fields + rows[]
};
```
- dirty = มีแถวที่ `current` ต่างจาก `original` (deep-equal) **ถ้าแก้แล้วแก้กลับเป็นค่าเดิม ให้ถือว่าไม่ dirty**
- issues/warnings มาจาก validator ตัวเดียวกับ import (research-158 §2) ซึ่งคืนตำแหน่งแบบกลาง `{table, rowIndex, field}` แล้ว UI แปลงเป็น `(kw, phase?, batteryKwh?, field)`
- **validator และ diff ต้อง import ได้ฝั่ง client** (ห้ามมี `exceljs`/`server-only`) ส่วน server จะ validate ซ้ำตอนบันทึกเสมอ

### 6.2 แถบบันทึก (`#calc-tables-savebar`)
แสดงเมื่อ dirty เท่านั้น: `sticky bottom-0 z-10 mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary bg-card px-3 py-2 shadow-sm` และ `role="region" aria-label="การแก้ที่ยังไม่บันทึก"`
- ซ้าย: **"แก้ไว้ {n} ขนาด"** (ตัวหนา) + **"(On-grid {a} · Hybrid {b})"** + **" — ยังไม่บันทึก"**
  - เมื่อมี error ให้เพิ่มบรรทัด `text-xs text-destructive` **"มีข้อผิดพลาด {e} จุด ต้องแก้ก่อนบันทึก · "** + ปุ่มลิงก์ **"ไปที่จุดแรก ({ตาราง} {kw} kW)"** ซึ่งจะสลับแท็บย่อย เปิด Dialog และ focus ช่องนั้น
- ขวา:
  - `ghost sm` **"ยกเลิกการแก้ทั้งหมด"** → inline confirm แทนที่ปุ่ม **"ทิ้งการแก้ทั้งหมด {n} ขนาด?"** · "ไม่ทิ้ง" / "ทิ้งการแก้" (`destructive`, `h-8`)
  - `default sm` **"ตรวจและบันทึก…"** id `calc-tables-save` เมื่อมี error ให้ `disabled` + `aria-describedby` ชี้บรรทัด error

### 6.3 States ของแท็บ

| # | State | สิ่งที่เห็น |
|---|---|---|
| T-1 | Idle (ไม่ dirty) | รายการ + ปุ่ม export/นำเข้าใช้ได้ ไม่มีแถบบันทึก |
| T-2 | Dirty ไม่มี error | แถบบันทึก ปุ่มบันทึกใช้ได้; นำเข้า/ใช้ชุดนี้ disabled + hint |
| T-3 | Dirty มี error | เหมือน T-2 แต่ปุ่มบันทึก disabled, มีป้าย "ผิด n" ที่แถวและแท็บย่อย |
| T-4 | Confirm | Dialog ยืนยัน (§7) |
| T-5 | Saving | ปุ่มยืนยันเป็น **"กำลังบันทึก…"**, ทุกปุ่มใน Dialog disabled, Dialog ปิดด้วย Esc ไม่ได้ |
| T-6 | Saved | ปิด Dialog, ล้าง draft, `router.refresh()`, toast success, focus → `#calc-tables-heading` |
| T-7 | Server reject (validator ฝั่ง server เจอ issue ที่ client ไม่เจอ) | Dialog ยืนยันแสดงกล่อง error พร้อมรายการ issue (ลิงก์ไปที่ช่อง), ปุ่มยืนยัน disabled, ปุ่ม **"กลับไปแก้"** |
| T-8 | Conflict | §7.4 |
| T-9 | Import panel เปิด | ปุ่ม "นำเข้าไฟล์ Excel" `aria-expanded="true"` เปลี่ยน label เป็น **"ปิดการนำเข้า"** แผงกางใต้กล่องที่ใช้อยู่; ระหว่าง upload/apply ทั้งแท็บ `aria-busy` และตัวแก้ disabled (`fieldset disabled`) |

---

## 7. Dialog ยืนยันก่อนบันทึก (`save-tables-dialog.tsx`)

`Dialog` (ไม่ใช่ `AlertDialog` เพราะไม่ใช่การลบ) `DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto"` id `calc-tables-confirm`

### 7.1 โครง (ลำดับคงที่ เหมือน preview ของ spec S6 §4.2)
1. **Title:** **"ตรวจก่อนบันทึกและใช้บนหน้าเว็บ"**
   **Description** `text-xs`: **"On-grid: เปลี่ยน {c} · เพิ่ม {a} · ลบ {r} · Hybrid: เปลี่ยน {c} · เพิ่ม {a} · ลบ {r} · คำเตือน {w} ข้อ"** (ตัดส่วนที่เป็น 0 ทิ้ง และถ้าตารางไหนไม่เปลี่ยนเลยไม่ต้องแสดงชื่อตารางนั้น)
2. **ผลต่อบิลตัวอย่าง** (`h4`) ตารางคอลัมน์ **บิล/เดือน · On-grid ตอนนี้ · หลังบันทึก · Hybrid ตอนนี้ · หลังบันทึก**
   - ค่า Hybrid: **"{kw} kW · แบต {kWh}"** ใช้แบตเริ่มต้นตามกติกา #156 (แบตเล็กสุดที่ > 0)
   - ถ้าไม่มี Hybrid ทั้งก่อนและหลัง ให้ตัดคอลัมน์ Hybrid ออก
   - แถวที่เปลี่ยนใช้ `bg-amber-50` + `font-semibold` + `sr-only "เปลี่ยน: "` (pattern เดิม)
   - ชุดบิลตัวอย่างใช้ชุดเดียวกับ `diffSizeTables`
3. **สิ่งที่เปลี่ยน** (`h4`) ใช้ list แบบ diff ของ spec S6 §4.2.4 โดยใส่ prefix ชื่อตารางที่หน้าขนาด ("On-grid 8 kW", "Hybrid 30 kW")
   - Hybrid เปลี่ยน: บรรทัดของค่าร่วม (`FIELD_LABELS` เดิม) แล้วตามด้วยบรรทัดราคา **"ราคา {ยี่ห้อ} · {p} เฟส · แบต {kWh} {old} → {new}"** (ราคาว่างแสดง "ไม่มีราคา")
   - Hybrid แถวแบตเพิ่ม/ลบ: **"เพิ่มแถว {p} เฟส แบต {kWh}"** / **"ลบแถว {p} เฟส แบต {kWh}"**
   - ลบทั้งขนาด: `Badge destructive` **"ลบ"** + **"{ตาราง} {kw} kW ({n} แถว) — ขนาดนี้จะไม่ถูกแนะนำอีก"**
   - เพิ่มขนาด: `Badge secondary` **"เพิ่ม"** + สรุปบรรทัดเดียว **"On-grid 12 kW · 3 เฟส · 7,500–9,000 ฿ · 22 แผง"** / **"Hybrid {kw} kW · {p} เฟส · แบต {list}"**
   - ถ้ารายการเกิน 10 ข้อ ให้ตัดและใช้ปุ่ม **"แสดงทั้งหมด"** (pattern เดิม)
4. **คำเตือน** (กล่อง amber) รวม warning ของทั้งตารางหลังแก้ ไม่ใช่เฉพาะแถวที่แก้ (เจ้าของต้องเห็นสภาพที่ลูกค้าจะเห็นจริง) จัดเรียง: Package → ไม่มีราคา → แผง → E3 (รวมเป็นข้อเดียว)
5. **Footer:** ซ้าย `text-xs text-muted-foreground mr-auto` **"ลูกค้าเห็นทันทีหลังบันทึก ย้อนกลับได้จากประวัติ"** · ขวา **"กลับไปแก้"** (outline) · **"ยืนยัน บันทึกและใช้ทันที"** (default, id `calc-tables-confirm-save`, ได้ focus ตอนเปิด)

### 7.2 Action
`saveCalculatorTables({ onGrid, hybrid, version: draft.baseVersion })` (research-158 §4)
- diff ใน Dialog คำนวณฝั่ง client จาก lib ตัวเดียวกัน (ไม่ต้องยิง server 2 รอบ)
- ถ้า server คืน `{ok:false, issues}` → T-7

### 7.3 Toasts
| เหตุการณ์ | Toast |
|---|---|
| บันทึกสำเร็จ | success **"บันทึกแล้ว — หน้าเครื่องคำนวณอัปเดตแล้ว"** |
| conflict | error **"มีคนแก้ก่อนคุณ — รีเฟรชแล้วลองใหม่"** (ข้อความเดิม) |
| error อื่น | error `result.error` หรือ **"บันทึกไม่สำเร็จ"** |
| ทำเครื่องหมายลบขนาด | default **"ทำเครื่องหมายลบ {kw} kW แล้ว — กด "คืนขนาดนี้" ได้ถ้าเปลี่ยนใจ"** |

### 7.4 Conflict
- ในตัว Dialog แทนกล่องคำเตือน ให้แสดงกล่อง error `role="alert"` id `calc-tables-conflict`:
  **"มีคนแก้ตารางก่อนคุณ"** (หัว) + **"ยังไม่มีอะไรถูกบันทึก กด "โหลดข้อมูลล่าสุด" แล้วแก้ใหม่ สิ่งที่คุณแก้ไว้: {On-grid 8, 12 kW · Hybrid 30, 99.9 kW}"** + ปุ่ม outline **"โหลดข้อมูลล่าสุด"**
- ปุ่มยืนยัน disabled
- "โหลดข้อมูลล่าสุด" จะทิ้ง draft, `router.refresh()` แล้วปิด Dialog
- **ห้าม refresh อัตโนมัติ** (เหตุผลเดียวกับ spec S6 §4.4) รายชื่อขนาดที่แก้ไว้ช่วยให้เจ้าของแก้ซ้ำได้ ซึ่งรับได้เพราะการแก้ในหลังบ้านเป็นจุดเล็ก

---

## 8. แผงนำเข้า (เปลี่ยนจาก spec S6)

### 8.1 การเปิด
ปุ่ม `outline` **"นำเข้าไฟล์ Excel"** (icon `Upload`) `aria-expanded` `aria-controls="calc-import-panel"` เมื่อเปิด แผงจะกางใต้กล่อง "ที่ใช้อยู่" (`rounded-lg border border-border p-4 space-y-4`) โดยมีกล่องคำอธิบาย + ฟอร์มเลือกไฟล์ + โซนผลตรวจตาม spec S6 §2.3–§4 ปิดแผงได้เมื่อไม่ busy (การปิดจะล้างผล preview เหมือนกด "ยกเลิก")

### 8.2 กล่องคำอธิบาย: แก้ข้อความ
แทน 2 ข้อแรกของ spec S6 §2.3 ด้วย:
- **"อ่าน sheet On-grid (ต้องมี) และ Hybrid (ถ้ามี) — sheet อื่นข้าม"**
- **"นำเข้าแล้วจะแทนที่ตารางทั้ง 2 ชุด รวมถึงค่าที่แก้ในหลังบ้าน"**
- **"ถ้าไม่มี sheet Hybrid ตาราง Hybrid จะถูกลบ และตัวเลือก Hybrid บนหน้าเว็บจะถูกซ่อน"**
- **"ชีต Hybrid: อ่านตารางแรกถึงแถวว่างแรก (บล็อกราคาแบตด้านล่างไม่ได้อ่าน) ราคาแต่ละยี่ห้ออ่านจากกลุ่มคอลัมน์ "ยี่ห้อ""**
- ข้ออื่นคงเดิม ส่วนปุ่ม "ดูคอลัมน์ที่ระบบอ่าน" ให้เพิ่มหัวย่อย **"ชีต On-grid (9)"** / **"ชีต Hybrid (11)"** โดยรายการของ Hybrid มาจาก research-154 §2.3 (ขนาด, หน่วย, Phase, ขนาดแบตเตอรี่, จำนวนชั่วโมง…, จำนวนวัน, จำนวนติดตั้ง, พื้นที่หลังคา…, ค่าไฟ ประมาณ ต่ำสุด–สูงสุด, ค่าไฟ/หน่วย, ยี่ห้อ › ชื่อยี่ห้อ)

### 8.3 Preview (ไฟล์ผ่าน)
ลำดับภายใน `#calc-import-preview` (ต่อจากของเดิม):

1. Heading + meta: **"On-grid {n} ขนาด · Hybrid {k} ขนาด ({r} แถว) · คำเตือน {w} ข้อ"** และถ้าไม่มีชีต Hybrid ใช้ **"On-grid {n} ขนาด · ไม่มีชีต Hybrid · คำเตือน {w} ข้อ"**
2. Duplicate banner (เดิม)
3. **กล่อง "แทนที่ทั้งชุด"** (ใหม่) class amber ของ spec S6 §4.2.2 id `calc-import-overwrite`:
   - ถ้าชุดที่ใช้อยู่เป็น **MANUAL**: หัว **"ไฟล์นี้จะแทนที่ตารางทั้ง 2 ชุด"** + **"ชุดที่ใช้อยู่แก้ในหลังบ้านเมื่อ {วันที่ เวลา} โดย {name} ค่าที่แก้ไว้จะถูกแทนด้วยค่าในไฟล์ ถ้าต้องการเก็บไว้ ให้กด "ดาวน์โหลดเป็น Excel" ก่อน (เวอร์ชันเดิมยังอยู่ในประวัติ กด "ใช้ชุดนี้" เพื่อย้อนกลับได้)"**
   - ถ้าชุดที่ใช้อยู่เป็น EXCEL หรือ default: ไม่ต้องแสดงกล่องนี้ เพราะข้อความในกล่องคำอธิบายพอแล้ว และกล่องเตือนที่ขึ้นทุกครั้งจะถูกมองข้าม
4. **กล่อง "ตาราง Hybrid จะถูกลบ"** (ใหม่ เฉพาะเมื่อไม่มีชีต Hybrid **และ** ตารางที่ใช้อยู่มี Hybrid) id `calc-import-hybrid-removed`, `role="group"`:
   class **`rounded-md border-2 border-destructive bg-destructive/10 px-4 py-3`** หัว `font-bold text-destructive` + icon `AlertTriangle`:
   **"ไฟล์นี้ไม่มีชีต Hybrid — ตาราง Hybrid จะถูกลบ"**
   body `text-sm text-foreground`: **"ตาราง Hybrid ที่ใช้อยู่ ({k} ขนาด · {r} แถว) จะถูกลบเมื่อยืนยัน และหน้าเครื่องคำนวณจะซ่อนตัวเลือก Hybrid ถ้าไม่ได้ตั้งใจ ให้ใช้ไฟล์ที่มีชีต Hybrid หรือกด "ดาวน์โหลดเป็น Excel" เพื่อให้ได้ไฟล์ที่มีครบ 2 ชีต"**
   - ถ้าทั้งไฟล์และตารางปัจจุบันไม่มี Hybrid: ไม่ต้องมีกล่องนี้ meta line บอก "ไม่มีชีต Hybrid" อยู่แล้ว
5. กล่องคำเตือน (เดิม) รวม warning ของทั้ง 2 ชีต ข้อของ Hybrid ใส่ prefix **"ชีต Hybrid: "**
6. **ส่วนชีต On-grid** (`h4` **"ชีต On-grid"** + สรุป `text-xs` "เพิ่ม · ลบ · เปลี่ยน · เหมือนเดิม") → ตารางผลต่อบิลตัวอย่าง → diff list → ปุ่ม "ดูตารางทั้งหมด" (ทั้งหมดเป็นของเดิม ย้ายมาอยู่ใต้หัวนี้)
7. **ส่วนชีต Hybrid** (`h4` **"ชีต Hybrid"**) โครงเดียวกัน:
   - ผลต่อบิลตัวอย่าง: คอลัมน์ **บิล/เดือน · ตอนนี้ · หลังยืนยัน · คืนทุนบนหน้าเว็บ** ค่าเป็น "{kw} kW · แบต {kWh}" และคืนทุนเป็น **"แสดง ({x} ปี)"** / **"ไม่แสดง (ไม่มีราคา)"** ถ้าเปลี่ยนเป็น **"แสดง ({old} → {new} ปี)"**
   - diff key = (kW, phase, แบต) แสดงเป็นกลุ่มตาม kW เหมือน §7.1 ข้อ 3
   - ปุ่ม **"ดูตารางทั้งหมด ({r} แถว)"** → ตาราง read-only แบบเดียวกับตารางราคาใน §5.4 (ไม่มี input)
   - ถ้าตารางปัจจุบันไม่มี Hybrid: สรุปเป็น **"เพิ่มใหม่ทั้งตาราง {k} ขนาด — หน้าเครื่องคำนวณจะเริ่มแสดงตัวเลือก Hybrid"** และไม่ต้องมีตารางผลต่อบิล
8. Footer และ confirm (เดิม) แต่เปลี่ยนข้อความ confirm:
   - ปกติ: **"ยืนยันใช้ไฟล์นี้บนหน้าเว็บจริง? On-grid: ขนาดที่แนะนำจะเปลี่ยนใน {k} จาก {m} บิลตัวอย่าง · Hybrid: {k2} จาก {m2} — ลูกค้าเห็นทันที"**
   - กรณีลบ Hybrid: กล่อง confirm ใช้ `border-destructive` ข้อความ **"ยืนยันใช้ไฟล์นี้? ตาราง Hybrid จะถูกลบ และตัวเลือก Hybrid จะหายจากหน้าเว็บ · On-grid: …"** และปุ่ม **"ยืนยัน ใช้ไฟล์นี้และลบ Hybrid"** (`variant="destructive"`)

> **ไม่ใช้ Tabs แยกชีตใน preview** เพราะการตัดสินบังคับให้ "แสดงทั้ง 2 ตาราง" ถ้าใช้แท็บ ชีตที่ไม่ได้เปิดจะถูกมองข้าม ให้เรียงต่อกันแทน

### 8.4 Reject
- ถ้าผิดทั้ง 2 ชีต ให้แบ่งรายการเป็นกลุ่มย่อย `p.text-sm.font-semibold` **"ชีต On-grid ({n} ข้อ)"** / **"ชีต Hybrid ({n} ข้อ)"** ถ้าผิดชีตเดียวให้มีหัวกลุ่มเดียว
- ทุกข้อของ Hybrid ขึ้นต้นด้วย **"ชีต Hybrid แถว {r}"** (+ ", คอลัมน์ {c} ({label})" ถ้ามี) ตามรูปแบบ "{ตำแหน่ง}: {ปัญหา}" / "→ {ทำอะไร}"
- sub line: **"{fileName} · ไม่มีอะไรถูกบันทึก"** และเมื่อผิดเฉพาะ Hybrid ให้ต่อ **" · ทั้งไฟล์ไม่ผ่าน แม้ชีต On-grid จะถูกต้อง"**
- Copy ใหม่ของ Hybrid (เพิ่มใน `messages.ts`):

| กรณี | ข้อความ |
|---|---|
| แถวซ้ำ (E12) | ชีต Hybrid แถว {r1} และ {r2}: ขนาด {kw} kW {p} เฟส แบต {b} kWh ซ้ำกัน → ลบแถวที่ซ้ำ |
| ค่าร่วมไม่ตรง (E11) | ชีต Hybrid แถว {r}, คอลัมน์ {c} ({label}): {kw} kW มีค่าไม่ตรงกับแถวอื่นในขนาดเดียวกัน ({a} กับ {b}) → แก้ให้ทุกแถวของ {kw} kW ตรงกัน |
| ไม่มีแถวแบต 0 (E13) | ชีต Hybrid แถว {r}: ไม่มีแถวไม่มีแบต (แบต 0) ของ {kw} kW {p} เฟส → เพิ่มแถวแบต 0 ของ {kw} kW |
| แบตไม่ใช่เลข/ติดลบ | ชีต Hybrid แถว {r}, คอลัมน์ {c} (ขนาดแบตเตอรี่): ต้องเป็นตัวเลขตั้งแต่ 0 |
| ราคาไม่ใช่เลข | ชีต Hybrid แถว {r}, คอลัมน์ {c} ({ยี่ห้อ}): "{v}" ไม่ใช่ตัวเลข → ใส่ราคาเป็นตัวเลข หรือเว้นว่างถ้าไม่มีราคา |
| ไม่มีกลุ่ม "ยี่ห้อ" | ไม่พบกลุ่มคอลัมน์ "ยี่ห้อ" ในชีต Hybrid → ตรวจว่าหัวตารางยังสะกดเหมือนไฟล์เดิม |
| ข้ออื่นที่ใช้ร่วมกับ On-grid | ใช้ข้อความของ spec S6 §7.2–7.3 โดยเติม prefix "ชีต Hybrid " |

### 8.5 Warning copy ใหม่ (ใช้ทั้งนำเข้าและแก้เอง)

| กรณี | นำเข้า | แก้ในหลังบ้าน |
|---|---|---|
| แผงต่างจากสูตร > 20% (E5) | ชีต Hybrid: จำนวนแผงของ {kw list} kW ต่างจากสูตรเกิน 20% (เช่น {kw} kW กรอก {n} แต่สูตรได้ ≈{m}) | Hybrid {kw} kW: จำนวนแผง {n} ต่างจากที่สูตรคำนวณได้ (≈{m}) เกิน 20% |
| ราคาแบตไม่นำมาคิด (E3) **รวมเป็นข้อเดียว** | ชีต Hybrid: ราคาแบต {n} ช่องไม่มีราคาชุดไม่มีแบตของยี่ห้อเดียวกัน จึงไม่นำมาคิด (เช่น แถว {r} {ยี่ห้อ}, … สูงสุด 3 ตัวอย่าง) | ราคาแบต {n} ช่องไม่มีราคาชุดไม่มีแบตของยี่ห้อเดียวกัน จึงไม่นำมาคิด (เช่น Hybrid {kw} kW {ยี่ห้อ} แบต {b}, …) |
| แถวไม่มีราคาเลย (E4) | ชีต Hybrid: {kw} kW แบต {list} kWh ไม่มีราคา — หน้าเว็บจะไม่แสดงระยะคืนทุน | (ข้อความเดียวกัน ตัด "ชีต Hybrid: " แล้วใส่ "Hybrid ") |

> แหล่งของ E5 ตอนนำเข้า = คอลัมน์ `จำนวนคำนวณ` (cached) ส่วนตอนแก้ในหลังบ้าน = สูตร `(kW × 1.2) / 0.63` (research-154 §2.3) **ทั้งสองต้องให้ผลเดียวกันกับไฟล์จริง** ถ้าไม่ตรง ให้ใช้สูตรทั้งสองทาง (Q2)

---

## 9. ประวัติ (`calculator-version-history.tsx`)

- หัว `h3 text-sm font-semibold`: **"ประวัติตาราง (20 เวอร์ชันล่าสุด)"**
- โครง list ตาม spec S6 §6 โดยเปลี่ยนบรรทัดที่ 1 ของแต่ละ item:
  - **EXCEL**: ป้าย `span.rounded-md.border.px-2.text-xs.font-semibold` (icon `FileSpreadsheet size-3.5`) **"Excel:"** + ชื่อไฟล์ `font-medium truncate` (`title`)
  - **MANUAL**: ป้าย `rounded-md bg-accent text-accent-foreground px-2 text-xs font-semibold` (icon `PencilLine size-3.5`) **"แก้ในหลังบ้าน"** ไม่มีชื่อไฟล์ (token `--accent` #fff1cf / #7a5200 มีอยู่แล้ว คอนทราสต์ราว 6.6:1)
  - + `Badge` **"ใช้อยู่"** เหมือนเดิม
- บรรทัดที่ 2 (`text-xs text-muted-foreground`): **"{วันที่ เวลา} · {ชื่อผู้บันทึก} · On-grid {n} ขนาด · Hybrid {k} ขนาด"** ถ้าไม่มี Hybrid ใช้ **"ไม่มี Hybrid"** แล้วตามด้วย **"· ไม่มีคำเตือน"** / ปุ่ม **"คำเตือน {w}"** (เดิม)
- Actions: **"ใช้ชุดนี้"** (เดิม) · **"ดาวน์โหลดต้นฉบับ"** เฉพาะ EXCEL (MANUAL ไม่มีลิงก์ และไม่ต้องมี placeholder)
- **Confirm "ใช้ชุดนี้"** (inline เดิม) เปลี่ยนข้อความ:
  - EXCEL: **"ใช้ชุด "{fileName}" (อัปโหลด {วันที่}) บนหน้าเว็บจริงแทนชุดปัจจุบัน? ทั้ง On-grid และ Hybrid จะเปลี่ยนเป็นของเวอร์ชันนี้ — ลูกค้าเห็นทันที"**
  - MANUAL: **"ใช้เวอร์ชัน "แก้ในหลังบ้าน" ({วันที่ เวลา}) บนหน้าเว็บจริงแทนชุดปัจจุบัน? ทั้ง On-grid และ Hybrid จะเปลี่ยนเป็นของเวอร์ชันนี้ — ลูกค้าเห็นทันที"**
  - ถ้าเวอร์ชันนั้น **ไม่มี Hybrid** แต่ชุดปัจจุบันมี: ให้ต่อด้วย **"เวอร์ชันนี้ไม่มีตาราง Hybrid ตัวเลือก Hybrid จะหายจากหน้าเว็บ"** (ตัวหนา) และกล่อง confirm เปลี่ยนเป็น `border-destructive`
- toast rollback: EXCEL **"กลับไปใช้ชุด {fileName} แล้ว"** (เดิม) · MANUAL **"กลับไปใช้เวอร์ชันแก้ในหลังบ้าน ({วันที่}) แล้ว"**
- Empty state: **"ยังไม่มีเวอร์ชันในระบบ — แก้ตารางในหน้านี้ หรือนำเข้าไฟล์ Excel ของฝ่ายขาย"**

---

## 10. กล่อง "ที่ใช้อยู่" + ปุ่มดาวน์โหลด

`#calc-size-table-summary` (class เดิม) ภายใน `flex flex-wrap items-start justify-between gap-3`:
- ซ้าย (`min-w-0 flex-1 basis-80`):
  - บรรทัด 1: `Badge` **"ใช้อยู่"** + ป้ายแหล่งที่มา (§9) + **"On-grid {n} ขนาด · Hybrid {k} ขนาด ({r} แถว)"** / **"· ไม่มี Hybrid"**
  - บรรทัด 2: EXCEL **"ยืนยันใช้เมื่อ {configUpdatedAt} · อัปโหลดโดย {name}"** (เดิม) + ลิงก์ "ดาวน์โหลดต้นฉบับ"; MANUAL **"บันทึกเมื่อ {configUpdatedAt} · โดย {name}"**
  - default (ยังไม่มีเวอร์ชัน): ใช้ของเดิม (Badge "ค่าเริ่มต้น") + **"· ไม่มี Hybrid"**
- ขวา (`flex flex-wrap gap-2`):
  - `<a href="/api/admin/calculator/export" className={buttonVariants({variant:"outline"})}>` icon `Download` **"ดาวน์โหลดเป็น Excel"** id `calc-export` (ใช้ `<a>` จริงเพราะเป็น GET ที่ server ส่ง attachment ไม่ต้องใช้ JS)
  - `Button outline` icon `Upload` **"นำเข้าไฟล์ Excel"** id `calc-import-toggle` (§8.1)
- บรรทัดใต้ทั้งกล่อง `text-xs text-muted-foreground`: **"ไฟล์ที่ดาวน์โหลดมี 2 ชีต (On-grid, Hybrid) ตามแบบไฟล์เดิม แก้แล้วนำเข้ากลับได้"** และเมื่อ dirty ให้ต่อ **" · ไม่รวมการแก้ที่ยังไม่บันทึก"**

---

## 11. คืนค่าเริ่มต้น (แท็บตัวเลขการคำนวณ)

แก้ข้อความใน `calculator-config-tab.tsx`:
- คำอธิบาย: **"คืนตัวคูณรายปีเป็น 10, สไลด์บิล 500–8,000 ฿ ทีละ 100, กลับไปใช้ตาราง On-grid เริ่มต้น 3 ขนาด (3, 5, 10 kW) และลบตาราง Hybrid (หน้าเว็บจะซ่อนตัวเลือก Hybrid) — เวอร์ชันในประวัติยังอยู่ เลือก "ใช้ชุดนี้" ได้ภายหลัง"**
- confirm: **"ยืนยันคืนค่าเริ่มต้นทั้งหมด? หน้าเครื่องคำนวณจะกลับไปใช้ตารางเริ่มต้น 3 ขนาด และตัวเลือก Hybrid จะหายทันที"**

---

## 12. ข้อมูลที่ UI ต้องได้ (props จาก `page.tsx`)

```ts
type CalculatorTablesTabData = {
  configVersion: number;
  configUpdatedAt: string;
  multiplier: number;                        // ใช้คิดคืนทุนใน Dialog
  active: {
    source: "default" | "EXCEL" | "MANUAL";
    versionId: string | null;
    fileName: string | null;                 // EXCEL เท่านั้น
    savedByName: string | null;
  };
  onGrid: SizeRow[];
  hybrid: HybridRow[] | null;                // ราคาแยกยี่ห้อ — admin เท่านั้น (ADMIN-only tab)
  brands: string[];                          // ลำดับคอลัมน์ยี่ห้อ จาก hybrid[0].brandPrices
  packageSizesKw: number[];                  // สำหรับ warning Package (เหมือน S6)
  history: {
    id: string; source: "EXCEL" | "MANUAL"; fileName: string | null;
    createdAt: string; savedByName: string;
    onGridCount: number; hybridSizeCount: number | null; hybridRowCount: number | null;
    warnings: string[];
  }[];
};
```
- history ยังนับจำนวนฝั่ง server ห้ามส่ง JSON ของ rows ทั้งก้อน (เหมือนเดิม)
- preview result ต้องเพิ่ม: `hybrid: { rows, diff, sampleBills } | null`, `hasHybridSheet: boolean`, `activeHybridCounts` (สำหรับข้อความ "จะถูกลบ"), `activeSource` + `activeSavedAt/By` (สำหรับกล่อง "แทนที่ทั้งชุด")

---

## 13. Accessibility · Responsive · ids

### 13.1 Keyboard / focus
- Dialog (base-ui) จัด focus trap ให้อยู่แล้ว ตอนเปิด Dialog แก้ขนาด ให้ focus ช่องแรกที่แก้ได้ (หรือช่องที่มี error ถ้ามาจากลิงก์ "ไปที่จุดแรก") ตอนปิด focus กลับปุ่ม "แก้ไข" ของแถวนั้น
- ลิงก์ในกล่องสรุป error เป็น `<button>` ที่ใช้ `document.getElementById(fieldId)?.focus()` + `scrollIntoView({block:"center"})`
- Esc: ใน Dialog แก้ขนาด = ยกเลิก (ผ่าน confirm ถ้ามีการแก้), ใน inline confirm = ยกเลิก, ระหว่าง saving = ไม่ทำอะไร
- หลังบันทึกสำเร็จ: focus → `h2#calc-tables-heading` (`tabIndex={-1}`)

### 13.2 Screen reader
- แต่ละช่องในตารางราคามี `aria-label` ครบ (ยี่ห้อ + เฟส + แบต) เพราะ `<th>` ไม่ผูกกับ input ให้อัตโนมัติ
- ป้ายสถานะแถวเป็นข้อความ (ไม่ใช่สีอย่างเดียว) ส่วนเส้นซ้ายเป็นแค่สิ่งช่วยทางสายตา
- `<p role="status" aria-live="polite" className="sr-only">` หนึ่งตัวต่อแท็บ ใช้ประกาศ: **"แก้ไว้ {n} ขนาด ยังไม่บันทึก"** (หลังกดตกลงใน Dialog) / **"มีข้อผิดพลาด {e} จุด"** / ข้อความของการนำเข้าเดิม
- ค่า diff: `sr-only` "เดิม" / "ใหม่" (pattern เดิม)

### 13.3 Responsive
- ≥1024px: รายการเต็ม ไม่ต้องเลื่อน; Dialog `max-w-3xl` ตารางราคา 9 คอลัมน์พอดี
- 768–1023px (tablet): รายการ Hybrid 9 คอลัมน์พอดี ส่วน On-grid 12 คอลัมน์ให้เลื่อนในกล่อง `overflow-x-auto` โดยคอลัมน์ขนาด sticky; Dialog ราว 720px ตารางราคาพอดีถ้า input `min-w-[6.5rem]`
- <640px: Dialog เต็มจอ ตารางราคาเลื่อนแนวนอนโดยมีคอลัมน์ "เฟส · แบต" sticky; แถบบันทึกขึ้นบรรทัดใหม่ (`flex-wrap`) และปุ่มเต็มกว้าง
- touch target: ปุ่มแก้ไข/คืน `size="sm"` (h-8 = 32px) ซึ่งต่ำกว่า 44px แต่ห่างกันพอ (แถวสูง ≥40px) ส่วนปุ่มหลัก h-9 และช่องกรอก h-9
- ภาษาไทยยาว: ทุก flex ที่มีข้อความใส่ `min-w-0`; หัวตาราง `whitespace-nowrap`; ข้อความ error ใต้ช่อง `whitespace-normal`

### 13.4 Stable ids (e2e)
`calculator-tab-size-table`, `calc-tables-heading`, `calc-export`, `calc-import-toggle`, `calc-import-panel`, `calc-tables-tab-on-grid`, `calc-tables-tab-hybrid`, `calc-add-on-grid`, `calc-add-hybrid`, `calc-edit-on-grid-{kw}`, `calc-edit-hybrid-{kw}`, `calc-size-dialog`, `calc-size-dialog-ok`, `calc-size-dialog-delete`, `og-*` / `hy-*` (ช่อง §5), `hy-price-{brandIndex}-{phase}-{kwh}`, `calc-tables-savebar`, `calc-tables-save`, `calc-tables-discard`, `calc-tables-confirm`, `calc-tables-confirm-save`, `calc-tables-conflict`, `calc-import-overwrite`, `calc-import-hybrid-removed` + ids เดิมทั้งหมดของ spec S6 §9.5
- `{kw}` ใน id ให้แทน `.` ด้วย `_` (เช่น `99_9`)

---

## 14. คำถามที่ owner ต้องตัดสิน (ไม่ block prototype เพราะมี default)

| # | คำถาม | Default ใน spec |
|---|---|---|
| Q1 | ถ้ายังไม่มีตาราง Hybrid จะให้สร้างตารางใหม่ในหลังบ้านได้ไหม (ต้องมีชุดยี่ห้อ ซึ่งตัดสินแล้วว่ามาจาก Excel เท่านั้น) | ไม่ได้ ต้องนำเข้า Excel ก่อน (§4.5) |
| Q2 | warning แผงต่างจากสูตร > 20% ใช้กับ On-grid ด้วยไหม (ตอนนี้ import On-grid ไม่มีกติกานี้ ส่วนสูตรแผงของ On-grid คือ ×1.15) | ใช้เฉพาะ Hybrid ตาม E5; On-grid แสดง "แผงตามสูตร ≈n" เป็นข้อมูลช่วยตรวจเท่านั้น ไม่เตือน |
| Q3 | แก้ kW ของขนาดเดิมได้ไหม | ไม่ได้ ต้องลบแล้วเพิ่ม (กัน diff สับสน) |
| Q4 | แท็บตัวเลขการคำนวณควรมีตัวอย่างผลคำนวณของ Hybrid ด้วยไหม | ไม่มีในรอบนี้ ใช้คอลัมน์คืนทุนในรายการ/Dialog และผลต่อบิลตัวอย่างใน Dialog ยืนยันแทน |
| Q5 | กล่อง "แทนที่ทั้งชุด" ควรแสดงทุกครั้ง หรือเฉพาะเมื่อชุดที่ใช้อยู่เป็น MANUAL | เฉพาะ MANUAL (กันเตือนจนชิน) |
| Q6 | release R1 (On-grid ก่อน) ควรมีแท็บย่อย Hybrid ไหม | R1 ไม่ต้องมีแท็บย่อย ให้แสดงรายการ On-grid ตรง ๆ แล้วค่อยเพิ่มแท็บย่อยใน R2 (โครงหน้าอื่นเหมือนเดิม) |
