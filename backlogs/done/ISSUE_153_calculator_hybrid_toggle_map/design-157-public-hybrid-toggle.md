# Design: เครื่องคำนวณ public — toggle On-grid / Hybrid + ตัวเลือกแบต

> Asset ของ ticket #157 (map #153) วันที่ 2026-10-02 · ผู้ออกแบบ `ux-ui-expert`
>
> Mockup (desktop + 375px, 3 variant × 5 สถานะ, TH/EN): https://claude.ai/artifact/4QSMLg9fBStZshBxdC4YuJ (private ต้องแชร์ก่อนส่งต่อ)
>
> อิงการตัดสินจาก #147 (layout On-grid เดิม), #155 (ราคาต่ำสุด), #156 (กติกาแนะนำและแบต), research-158 §3 และ §5 (projection และ lead fields)
>
> **เอกสารนี้ไม่ใช่การอนุมัติ** user จะตัดสินจาก real render บน branch ทดลอง

## 0. หลักที่ทุก variant ต้องทำเหมือนกัน

| เรื่อง | กติกา |
|---|---|
| ไม่มีตาราง Hybrid (`hybridTable == null` หรือว่าง) | ไม่ render toggle, ไม่ render ตัวเลือกแบต → DOM เหมือน production ทุกจุด |
| โหมด On-grid | ฝั่งผลลัพธ์, บรรทัดขนาดระบบ, `phaseBoth`, `popularSuffix`, CTA **ไม่เปลี่ยน** สิ่งเดียวที่เพิ่มคือตัว toggle |
| Slider | ใช้ `config.minBill/maxBill/stepBill` ชุดเดียวกันทั้ง 2 โหมด ห้ามคำนวณ min/max ใหม่จากตาราง Hybrid |
| ช่องพิมพ์ | `max` = `billMax` ของแถวสุดท้ายในตารางของ**โหมดที่ใช้อยู่** (On-grid: `sizeTable`, Hybrid: `hybridTable`) และ `billTypeHint` แสดงค่านี้ |
| สลับโหมด | ห้ามแก้ค่า `bill` ใน store (ไม่ clamp ตอนสลับ ให้ clamp ตอน blur เหมือนเดิม) ถ้าค่าไฟเกินตาราง Hybrid → แสดง tooLarge |
| แบตที่จำไว้ | เก็บ `preferredBatteryKwh` = ค่าที่ลูกค้า**คลิกเอง**ล่าสุด (เริ่ม `null`) ส่วนแบตที่แสดงเป็นค่า derive: `null` → ตัวเลือกเล็กสุดที่ > 0; อยู่ในตัวเลือก → ใช้ค่านั้น; ไม่อยู่ → kWh ที่ใกล้ที่สุด (เสมอกันเลือกตัวเล็กกว่า) **ห้ามเขียนค่าที่ derive กลับลง store** เพื่อให้ 32 kWh กลับมาเมื่อลากกลับไปที่ 10 kW |
| แจ้งเมื่อปรับแบตให้เอง | ถ้าแบตที่แสดง ≠ `preferredBatteryKwh` (และไม่เป็น null) ให้แสดง `batteryAutoAdjusted` ใต้ตัวเลือก `text-xs text-accent-foreground` และ `aria-live="polite"` |
| Phase (Hybrid) | แสดงเสมอเป็น pill ต่อท้ายขนาดระบบ: มีทั้ง 1/3 → `phaseSupportBoth`, มีแค่ 3 → `phaseOnly3`, มีแค่ 1 → `phaseOnly1` (ขนาด 15 kW ขึ้นไปเป็น 3 เฟสอย่างเดียว ลูกค้าบ้าน 1 เฟสต้องเห็น) ลูกค้าเลือก phase ไม่ได้ |
| ผลลัพธ์ Hybrid | ใช้กล่องเดิมทั้งหมด (ก่อน/หลังหรือ `coversFullBill`, 3 tiles, `belowFirstRowNote`, gold badge, `noPaybackCta`, tooLarge card) ไม่เพิ่ม tile ใหม่ tile "ผลิตไฟต่อเดือน" = `kw × sunHours × days` (ไฟจากแผงเท่านั้น ไม่บวกแบต) |
| สมมติฐานแบต | เมื่อแบต > 0 แสดง `batteryAssumption` ใต้ gold badge `text-center text-xs text-muted-foreground` (สูตรคิดแบต 1 รอบ/วัน ควรบอกตรง ๆ เพื่อความน่าเชื่อถือ) |
| tooLarge (Hybrid) | ซ่อนตัวเลือกแบต (ไม่มี kW) แต่ยังจำ `preferredBatteryKwh` ไว้ |
| ห้ามแสดง | ราคา, ยี่ห้อ, จำนวนเงินลงทุน ในทุกสถานะ |
| CTA | ปุ่ม "ขอใบเสนอราคาฟรี": `bookingHref({tab:"quote", bill: quoteBill, system: mode==="hybrid" ? "hybrid" : "on-grid", battery: mode==="hybrid" && kind==="ok" ? String(battery) : undefined})` ปุ่มนัดสำรวจคงเดิม |

> ข้อสังเกตเรื่อง CTA โหมด On-grid: การส่ง `system=on-grid` ทำให้ฟอร์มติ๊ก On-grid ให้เอง ซึ่งเป็นพฤติกรรมใหม่ (หน้าตาเดิม) ตาม research-158 §5 ถ้าต้องการให้ On-grid เหมือน prod 100% รวมพฤติกรรม ให้ส่ง `system` เฉพาะโหมด Hybrid — **ขอ user ตัดสิน**

## 1. Variant A — "Segmented + Chips" (ฝั่ง input) — **แนะนำ**

```
┌ k-left (bg-muted) ──────────────────────┐┌ k-right (bg-accent) ─────────┐
│ ประเมินค่าไฟของคุณ                       ││ ค่าไฟก่อนติดตั้ง      ฿9,500  │
│ ลากตัวเลื่อน…                            ││ ค่าไฟหลังติดตั้ง        ฿590  │
│ ┌──────────────┬──────────────┐          ││ [แผง 19][หลังคา 51][1,500]   │
│ │ ออนกริด      │█ไฮบริด███████│ ← NEW    ││ ┌ gold ──────────────────┐   │
│ └──────────────┴──────────────┘          ││ │ ประหยัด ~฿8,910 · ~4.0 ปี│   │
│ มีแบตเตอรี่เก็บไฟไว้ใช้ตอนเย็น…  ← NEW    ││ └────────────────────────┘   │
│ ค่าไฟต่อเดือน (บาท)  [฿ 9,500 / เดือน]    ││ คิดจากแบตชาร์จเต็ม… ← NEW     │
│ ───────────────●  (slider เดิม)          ││ [นัดสำรวจ] [ขอใบเสนอราคาฟรี] │
│ ระบบไฮบริดที่แนะนำ: 10 kW (รองรับไฟ 1 และ 3 เฟส)│                            │
│ ขนาดแบตเตอรี่                   ← NEW    ││                              │
│ (ไม่มีแบต) (●16 kWh) (32 kWh)            ││                              │
└─────────────────────────────────────────┘└──────────────────────────────┘
```

**Trade-off:** เปลี่ยนน้อยที่สุดและฝั่งผลเหมือน prod แต่ toggle เป็น control ขนาดกลาง คนที่ไม่รู้จักคำว่าไฮบริดพึ่ง hint บรรทัดเดียว

### ตำแหน่งใน `calculator-client.tsx`
- **Toggle:** แทรกหลัง `<p>{resolvedPanelIntro}</p>` (บรรทัด 65) ก่อน `<label htmlFor="monthly-bill">` (67) render เมื่อ `hybridTable?.length` เท่านั้น
- **บรรทัดขนาดระบบ:** บรรทัด 104–110 แยก branch: On-grid ใช้โค้ดเดิมทุกตัวอักษร; Hybrid ใช้ `hybridResultSize` + `<PhasePill>`
- **Battery chips:** ต่อจากบรรทัดขนาดระบบ (หลัง 110) เมื่อ `mode==="hybrid" && result.kind==="ok"`
- **ฝั่งขวา:** ใช้ JSX เดิม (113–191) ป้อนด้วย result ของโหมดที่ใช้อยู่ (ดู §4) + `batteryAssumption` หลัง gold badge (หลัง 177)

### Component ใหม่ (ไฟล์ใหม่ใน `src/app/[locale]/calculator/`)
```ts
// system-mode-toggle.tsx
type SystemMode = "onGrid" | "hybrid";
function SystemModeToggle(props: { value: SystemMode; onChange: (m: SystemMode) => void }): JSX.Element

// battery-picker.tsx  (A = variant="chips")
function BatteryPicker(props: {
  kw: number;
  options: number[];          // kWh เรียงน้อย→มาก, 0 = ไม่มีแบต (จาก PublicHybridSize.batteries)
  value: number;              // แบตที่แสดง (derived)
  preferred: number | null;   // เพื่อแสดง auto-adjust note
  onChange: (kwh: number) => void;
}): JSX.Element

// phase-pill.tsx
function PhasePill(props: { phases: (1 | 3)[] }): JSX.Element
```

### Class (Tailwind ที่มีอยู่แล้ว)
- กล่อง toggle: `mt-5 grid grid-cols-2 gap-1 rounded-xl border border-border bg-white p-1`
- ปุ่มใน toggle (label ครอบ radio): `relative flex min-h-11 cursor-pointer items-center justify-center rounded-lg px-2.5 text-center text-sm font-bold leading-tight transition-colors` + ไม่เลือก `text-primary hover:bg-muted` / เลือก `bg-primary text-primary-foreground` + `has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/50`
- radio: `sr-only` (ใช้ native `<input type="radio">` ห้ามใช้ div)
- hint: `mt-2 text-xs leading-5 text-muted-foreground` (ข้อความตามโหมด)
- หัวข้อแบต: `mt-5 text-sm font-bold text-foreground`
- กลุ่ม chips: `mt-2.5 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap` (มือถือ 3 คอลัมน์ ⇒ 6 ตัวเลือกเป็น 2 แถวพอดี)
- chip: `relative inline-flex min-h-11 min-w-[76px] cursor-pointer items-center justify-center whitespace-nowrap rounded-full border px-4 text-sm font-bold transition-colors` + ไม่เลือก `border-border bg-white text-primary hover:border-primary/50` / เลือก `border-primary bg-primary text-primary-foreground`
- Phase pill: `inline-flex items-center rounded-full border border-primary/25 bg-white px-2.5 py-0.5 text-xs font-semibold text-primary` (ใน `<p>` ที่เปลี่ยนเป็น `flex flex-wrap items-center gap-1.5`)

### Accessibility
- Toggle: `<div role="radiogroup" aria-labelledby="calc-mode-label">` + `<span id="calc-mode-label" className="sr-only">{t("modeLabel")}</span>` + native radio `name="calc-mode"` (ลูกศรซ้าย/ขวาเปลี่ยนค่าได้เองจาก browser)
- Battery: `<div role="radiogroup" aria-labelledby="calc-battery-label">` กับหัวข้อ `<p id="calc-battery-label">` + radio `name="calc-battery"`
- ไม่ใช้ `role="tablist"` เพราะเนื้อหาไม่ได้สลับ panel เป็นการเปลี่ยนค่าที่ป้อน
- Touch target ≥ 44px (`min-h-11`) ทุกปุ่ม
- Contrast: ขาวบน `#003b8e` ≈ 10.4:1; `text-primary` บนขาว ≈ 10.4:1; `text-accent-foreground #7a5200` บน `bg-muted #e5edf6` ≈ 5.8:1 (AA ผ่านทั้งหมด)

## 2. Variant B — "Header tabs + Segmented แบต" (ฝั่งผล)

- **Toggle:** แถบ 2 ช่องเต็มความกว้างเหนือ grid (ก่อนบรรทัด 62) `grid grid-cols-2 border-b border-border` แต่ละช่อง `min-h-14 flex flex-col items-center justify-center px-3 py-2.5` ใช้สีแบบ tab ฟอร์ม booking (`booking-forms.tsx:243-248`): เลือก `bg-primary text-primary-foreground` / ไม่เลือก `bg-muted text-muted-foreground hover:bg-muted/70` มีบรรทัดรอง `text-xs` (`modeOnGridShort` / `modeHybridShort`)
- **แบต:** กล่องใหม่บนสุดของฝั่งขวา (ก่อนบรรทัด 124) `rounded-xl border border-border bg-white px-4 py-3.5 shadow-sm`: หัว `{kw} kW Hybrid` + PhasePill แล้ว caption `batteryFor` แล้ว segmented `flex gap-[3px] overflow-x-auto rounded-[10px] border border-border bg-muted p-[3px]` แต่ละ segment `min-h-11 min-w-16 flex-1 shrink-0 rounded-lg text-[13px] font-bold text-primary` เลือก = `bg-white shadow-sm`
- บรรทัดขนาดระบบฝั่งซ้ายในโหมด Hybrid แสดงโดยไม่มี pill (pill อยู่ในกล่องฝั่งขวา)
- Accessibility: ทั้งสองเป็น radiogroup เหมือน A (หน้าตาเป็น tab แต่ semantics เป็น radio)
- **Trade-off:** โหมดเด่นที่สุด และแบตอยู่ติดกับตัวเลขที่เปลี่ยน แต่หัวการ์ดใหม่ปรากฏในโหมด On-grid ด้วย ทำให้ On-grid ต่างจาก prod ชัดกว่า A และ 50/60 kW (6 ตัวเลือก) บน 375px ต้องเลื่อนแนวนอน ซึ่งซ่อนตัวเลือกท้าย

## 3. Variant C — "Choice cards + Stepper" (ฝั่ง input)

- **Toggle:** การ์ด 2 ใบหลังบรรทัด 65 `mt-5 grid grid-cols-2 gap-2.5` การ์ด `relative flex cursor-pointer gap-2.5 rounded-xl border-2 bg-white p-3` ไม่เลือก `border-border` / เลือก `border-primary ring-[3px] ring-primary/10` มีวงกลม radio จำลอง 18px + ชื่อโหมด `text-sm font-bold text-primary` + คำอธิบาย `text-xs leading-[1.1rem] text-muted-foreground` (`modeOnGridHint` / `modeHybridHint`)
- **แบต:** stepper ใต้บรรทัดขนาดระบบ `mt-2.5 flex items-center gap-2.5 rounded-xl border border-border bg-white p-1.5` ปุ่ม −/+ `size-11 rounded-[10px] border border-border bg-muted text-xl font-extrabold text-primary disabled:opacity-40` ค่าตรงกลาง `text-lg font-bold text-primary` + `batteryStepCount` `text-[11px] text-muted-foreground`
- Accessibility: การ์ด = radiogroup; stepper ปุ่มมี `aria-label` (`batteryDecrease` / `batteryIncrease`), ค่ากลาง `role="status"` (หรือใช้ pattern `role="spinbutton"` + `aria-valuetext`)
- **Trade-off:** อธิบายตัวเองได้ดีที่สุดสำหรับคนที่ไม่รู้จัก Hybrid แต่แผงซ้ายสูงขึ้นราว 90px, ไทยในการ์ดแคบบนมือถือตัดเป็น 2–3 บรรทัด และ stepper ไม่เห็นตัวเลือกทั้งหมด (80 kW+ กระโดด 0→100→200 โดยไม่รู้ล่วงหน้า)

## 4. Data / state (ทุก variant)

- `page.tsx`: ส่ง `hybridTable={calculatorConfigResult.hybridTable}` (`PublicHybridSize[] | null` จาก research-158 §3 ห้ามส่ง `HybridRow` ดิบ)
- `use-calculator-store.ts`: เพิ่ม `systemMode: "onGrid" | "hybrid"` (เริ่ม `"onGrid"`) และ `preferredBatteryKwh: number | null` (เริ่ม `null`) + setter ไม่ persist ข้ามการโหลดหน้า (หน้าเริ่มที่ On-grid ตามที่ล็อกไว้)
- ถ้า `hybridTable` ว่าง แต่ store เป็น `"hybrid"` (เช่น admin ลบตาราง) → บังคับใช้ `"onGrid"` ตอน render
- result: `mode==="hybrid" ? recommendHybrid(bill, hybridTable, preferredBatteryKwh, multiplier) : recommendFromTable(...)` ทั้งสองต้องคืน shape ที่ฝั่งขวาใช้ได้ (`kind`, `belowFirstRow`, `monthlySaving`, `afterBill`, `coversFullBill`, `kwhPerMonth`, `paybackYears`, ข้อมูลแถว `kw/panels/roofM2/phases`) + Hybrid มี `batteryKwh` (ค่าที่ derive) และ `batteryOptions`
- `popularSuffix` ใช้เฉพาะ On-grid (Package ผูกกับ On-grid)

## 5. ข้อความใหม่ (TH / EN)

### `calculator.*`
| key | TH | EN |
|---|---|---|
| `modeLabel` | ประเภทระบบ | System type |
| `modeOnGrid` | ออนกริด (On-grid) | On-grid |
| `modeHybrid` | ไฮบริด (Hybrid) | Hybrid |
| `modeOnGridHint` | ใช้ไฟจากแผงตอนกลางวัน คืนทุนเร็ว | Runs on solar during the day — fastest payback |
| `modeHybridHint` | มีแบตเตอรี่เก็บไฟไว้ใช้ตอนเย็นและตอนไฟดับ | Adds a battery for evenings and power cuts |
| `modeOnGridShort` (B) | ใช้ไฟกลางวัน | Daytime solar |
| `modeHybridShort` (B) | มีแบตเก็บไฟ | With battery storage |
| `hybridResultSize` | ระบบไฮบริดที่แนะนำ: {kw} kW | Recommended hybrid system: {kw} kW |
| `phaseSupportBoth` | รองรับไฟ 1 และ 3 เฟส | Works with 1- or 3-phase |
| `phaseOnly1` | ไฟ 1 เฟส | 1-phase |
| `phaseOnly3` | ไฟ 3 เฟส | 3-phase |
| `batteryLabel` | ขนาดแบตเตอรี่ | Battery size |
| `batteryFor` (B) | แบตเตอรี่สำหรับระบบ {kw} kW | Battery for the {kw} kW system |
| `batteryNone` | ไม่มีแบต | No battery |
| `batteryOption` | {kwh} kWh | {kwh} kWh |
| `batteryAutoAdjusted` | ปรับเป็น {kwh} ให้เข้ากับระบบ {kw} kW | Adjusted to {kwh} to fit the {kw} kW system |
| `batteryAssumption` | คิดจากแบตชาร์จเต็มและใช้หมดวันละ 1 รอบ | Assumes one full battery charge used per day |
| `batteryStepCount` (C) | ตัวเลือก {i} จาก {n} | Option {i} of {n} |
| `batteryDecrease` (C) | ลดขนาดแบต | Smaller battery |
| `batteryIncrease` (C) | เพิ่มขนาดแบต | Larger battery |

ใช้ key เดิมซ้ำ: `saveBadge`, `saveBadgeWithPayback` (ตรงกับ "คืนทุนประมาณ X ปี"), `noPaybackCta`, `coversFullBill(Sub)`, `belowFirstRowNote`, `tooLargeTitle` (size = kW แถวสุดท้ายของ Hybrid), `tooLargeBody`, tiles ทั้งหมด

`{kwh}` ใน `batteryAutoAdjusted` ส่งเป็นข้อความที่จัดรูปแล้ว (`batteryNone` หรือ `batteryOption`)

### `booking.*`
| key | TH | EN |
|---|---|---|
| `fieldBatteryKwh` | ขนาดแบตที่สนใจ (kWh) | Battery size of interest (kWh) |
| `fieldBatteryKwhPlaceholder` | เช่น 16 | e.g. 16 |
| `fieldBatteryKwhHint` | ไม่แน่ใจเว้นว่างได้ ทีมงานจะช่วยแนะนำ · ใส่ 0 ถ้ายังไม่ติดแบต | Not sure? Leave it blank and our team will advise. Enter 0 for no battery yet. |

## 6. ฟอร์ม booking: ช่อง "ขนาดแบตที่สนใจ"

**ข้อเสนอ: แสดงเฉพาะเมื่อติ๊ก HYBRID** (pattern เดียวกับ `buildingType === "OTHER"` ที่ `booking-forms.tsx:374`)

- เหตุผล: ลูกค้าที่มาจากเครื่องคำนวณเห็นค่าที่ตัวเองเลือกและแก้ได้ (โปร่งใส ไม่ใช่ข้อมูลที่ถูกส่งไปเงียบ ๆ) ส่วนลูกค้า On-grid ไม่เห็นช่องที่ไม่เกี่ยว ฟอร์มไม่ยาวขึ้น ส่วนแบบ hidden ทำให้ลูกค้าที่ติ๊ก Hybrid เองจากหน้าอื่นใส่ค่าไม่ได้ และทีมขายไม่รู้ว่าค่ามาจากไหน
- ตำแหน่ง: ใน `BillAndSystemsFields` ต่อจาก checkbox HYBRID (ใน `.map` บรรทัด 492–502 render ใต้ label HYBRID) ห่อด้วย `ml-6 mt-1 border-l-2 border-border pl-3`
- Input: `type="number" inputMode="numeric" min={0} max={10000} step={1}` class `inputCls` + `<label htmlFor="interestedBatteryKwh" className={labelCls}>` + hint `mt-1.5 text-xs text-muted-foreground` เชื่อมด้วย `aria-describedby`
- **render เฉพาะ QuoteForm** (เพิ่ม prop `showBatteryField` ให้ `BillAndSystemsFields`) เพราะ research-158 §5 บันทึกฟิลด์นี้ใน `submit-quote.ts` เท่านั้น ถ้าแสดงใน Survey ค่าจะหายเงียบ ๆ
- ยกเลิกติ๊ก HYBRID → ซ่อนช่อง เก็บค่าไว้ใน form state (ติ๊กกลับแล้วค่าเดิมกลับมา) server ล้างเป็น null เองตาม research-158 §5
- Prefill: `battery` จาก URL เป็นค่าเริ่มต้นเฉพาะเมื่อ `system=hybrid` และชนะ draft เหมือน `interestedSystems`

## 7. สถานะใน mockup (ตัวเลขจริงจาก research-154 §5)

| สถานะ | ค่าไฟ | ระบบ | แบตเริ่มต้น | ผล |
|---|---|---|---|---|
| ปกติ | ฿9,500 | 10 kW, รองรับ 1/3 เฟส | 16 | หลังติดตั้ง ฿590, ประหยัด ฿8,910, คืนทุน ~4.0 ปี (ไม่มีแบต ~3.8, 32 kWh → 100%) |
| ครอบคลุม 100% | ฿5,000 | 5 kW, รองรับ 1/3 เฟส | 16 | "ครอบคลุมค่าไฟเต็ม 100%", ประหยัด ฿5,000 (cap), คืนทุน ~4.6 ปี |
| ไม่มีราคา | ฿120,000 | 125 kW, 3 เฟส | 100 | หลังติดตั้ง ฿22,125, ประหยัด ฿97,875, ไม่มีคืนทุน → `noPaybackCta` |
| tooLarge | ฿150,000 | — | ซ่อน | "ระบบเกิน 125 kW ปรึกษาทีมงาน" |
| ต่ำกว่าช่วง | ฿2,500 | 5 kW + `belowFirstRowNote` | 16 | 100%, คืนทุน ~9.3 ปี |

จำนวนแผงและพื้นที่หลังคาใน mockup เป็นค่าประกอบ (ตารางจริงมีค่าผิด 4 ขนาดตาม research-154 E5) และตัวเลขในโหมด On-grid ของ mockup เป็นตัวอย่างเพื่อแสดง layout เท่านั้น

### คำถามเปิดสำหรับผู้ทำ logic (`recommendHybrid`)
- **คืนทุนใช้ยอดประหยัดหลัง cap หรือก่อน cap:** mockup ใช้หลัง cap (เหมือน On-grid ใน `recommendFromTable`) ทำให้ 5 kW แบต 16 ที่ค่าไฟ ฿5,000 ได้ ~4.6 ปี ขณะที่ตาราง research ให้ 4.18 (ก่อน cap) ผลต่อ UI: ถ้าใช้หลัง cap การเลือกแบตใหญ่เกินค่าไฟจะทำให้ระยะคืนทุนยาวขึ้น ซึ่งตรงความจริงและช่วยไม่ให้ลูกค้าเลือกแบตเกินจำเป็น **แนะนำหลัง cap** แต่ต้องยืนยันใน #156

## 8. คำแนะนำ

**เลือก Variant A** (Segmented + Chips ฝั่ง input)

1. **ความน่าเชื่อถือ / ตรงกับที่อนุมัติแล้ว:** ฝั่งผลลัพธ์ที่ user อนุมัติใน #147 ไม่เปลี่ยนแม้แต่กล่องเดียวในทั้ง 2 โหมด สิ่งที่เพิ่มเป็น control สว่าง เรียบ ใช้สีและมุมโค้งเดิม ไม่มีหัวการ์ดใหม่แบบ B
2. **Conversion:** ลูกค้าเห็นตัวเลือกแบตทั้งหมดในครั้งเดียว (chips) กดครั้งเดียวเห็นยอดประหยัด/คืนทุนเปลี่ยน ซึ่งเป็นช่วงที่ลูกค้าเริ่ม "ลองเล่น" กับตัวเลข แล้ว CTA ส่งระบบและแบตไปที่ฟอร์มให้เลย ลดการกรอกซ้ำ
3. **มือถือ:** ลำดับอ่านตรงไปตรงมา โหมด → ค่าไฟ → ระบบ+เฟส → แบต → ผลลัพธ์ chips 3 คอลัมน์รับได้ถึง 6 ตัวเลือก (50/60 kW) ใน 2 แถวโดยไม่ต้องเลื่อนแนวนอน ทุกปุ่มสูง 44px

ถ้า user เห็น real render แล้วรู้สึกว่า toggle "ไม่เด่นพอ" ให้ยืม**เฉพาะ**คำอธิบายใต้ชื่อโหมดของ C มาใส่ใน A (เพิ่มความสูงราว 20px) ก่อนจะพิจารณา B

### สำหรับ nextjs-dev (prototype บน branch ทดลอง)
- ทำ A ก่อน และ render ด้วยตาราง Hybrid จริง (local) ทั้ง TH/EN ที่ 375px และ 1280px ใน 5 สถานะข้างบน
- ตรวจคำไทยยาวที่สุด: `hybridResultSize` + pill `รองรับไฟ 1 และ 3 เฟส` ต้องตัดบรรทัดได้โดย pill ไม่ล้น (`flex-wrap`)
- ตรวจว่า DOM ของหน้าเมื่อ `hybridTable = null` เหมือน prod (snapshot เดิม)
