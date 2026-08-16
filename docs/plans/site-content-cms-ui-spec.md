# Site Content CMS — Admin UI Spec (`/admin/settings` + `/admin/content/about`)

ผู้เขียน: `ux-ui-expert` (read-only — spec เท่านั้น ไม่แตะ `src/`)
ผู้ implement: `nextjs-dev` — task #14, #15, #16 ใน `docs/plans/site-content-cms-tasks.md`
วันที่: 2026-08-16

อ้างอิงที่อ่านแล้วก่อนเขียน spec นี้:
- `src/app/admin/(dashboard)/settings/settings-client.tsx` (ของเดิม 2 การ์ด)
- `src/components/admin/crud-page.tsx` (`CrudPage`, `BilingualTabs`)
- `src/components/ui/tabs.tsx` (`TabsContent` มี `keepMounted` **ฝังไว้แล้ว**)
- `src/app/admin/(dashboard)/services/services-client.tsx` (native `<select>` + `inputCls`)
- `src/app/admin/(dashboard)/admin-sidebar.tsx`, `layout.tsx`, `admin-topbar.tsx`
- `src/app/globals.css` (token), `src/lib/seo.ts` (`MetaKey` 10 ค่า), `src/messages/th.json`
- `scripts/e2e-admin-crud.mts:629-677`, `scripts/e2e-rbac-sprint2.mts`

---

## 0. ข้อสรุปสั้น (ถ้าอ่านแค่ส่วนเดียว ให้อ่านส่วนนี้)

1. `/admin/settings` = `<Tabs>` แนวนอน 4 tab; tab แรกคือของเดิมยกมาทั้งก้อน **ไม่แก้ markup ข้างใน**
2. **`TabsContent` มี `keepMounted` อยู่แล้วในตัว component** — ห้ามคิดว่าต้องเติมเอง และ**ห้ามลบ**; ผลข้างเคียงที่ต้องรู้: panel ทุกอันอยู่ใน DOM พร้อมกัน (มี attribute `hidden`)
3. tab SEO ใช้ **rail แนวตั้ง 10 หน้า** (`<Tabs orientation="vertical">`) ไม่ใช้ accordion (repo ไม่มี component accordion) และไม่ใช้ `<select>` (ดูเหตุผลข้อ 3.2)
4. `SiteSettings` เป็น **1 แถวเดียวแต่ถูกแบ่งเป็น 2 tab** → action ต้องอัปเดตแบบ **partial ตาม `section`** ไม่งั้น tab หนึ่งจะล้างค่าอีก tab ทิ้ง (ข้อ 6 — **สำคัญที่สุดในเอกสารนี้**)
5. `/admin/content/about` = ฟอร์ม singleton หน้าเดียว + `BilingualTabs` ตัวเดียวคุมทั้งหน้า + ปุ่มบันทึก 2 จุด (บน/ล่าง)
6. ความกว้างหน้า `/admin/settings` เปลี่ยนจาก `max-w-xl` → `max-w-3xl` (เหตุผลข้อ 1.2) — เป็นการเปลี่ยนภาพเดียวที่ spec นี้ทำกับของเดิม

---

## 1. `/admin/settings` — โครงหน้า

### 1.1 โครงสร้าง JSX (ระดับบนสุด)

```
<div className="max-w-3xl space-y-5">
  <h1 className="text-xl font-bold">ตั้งค่าระบบ</h1>          ← ห้ามเปลี่ยนข้อความ (e2e รอ selector นี้)
  <Tabs defaultValue={defaultTab}>
    <TabsList className="w-full max-w-full overflow-x-auto">
      … 4 TabsTrigger (tab แรกซ่อนเมื่อ MARKETING) …
    </TabsList>
    <TabsContent value="capacity"  className="space-y-5 pt-3"> … </TabsContent>
    <TabsContent value="seo"       className="space-y-5 pt-3"> … </TabsContent>
    <TabsContent value="contact"   className="space-y-5 pt-3"> … </TabsContent>
    <TabsContent value="headfoot"  className="space-y-5 pt-3"> … </TabsContent>
  </Tabs>
</div>
```

- `h1` ข้อความ `ตั้งค่าระบบ` **ห้ามเปลี่ยน** — `e2e-admin-crud.mts:631` และ `screenshot-pages.mts` ใช้
- `TabsList` ต้องมี `w-full max-w-full overflow-x-auto` เพราะ label ไทย 4 อันยาวเกิน `w-fit` เดิมของ `TabsList` แน่นอนที่ ~768px (label รวมกัน ~ 46 ตัวอักษร) — ถ้าไม่ใส่ tab จะล้นออกนอกการ์ด
- `TabsTrigger` ของ tab นอก **ห้ามใส่ `flex-1`** (ต่างจาก `BilingualTabs` ที่ใส่) — ให้ใส่ `shrink-0 px-3` แทน; `flex-1` จะบีบ trigger ให้แคบลงจนตัวอักษรทับกันแทนที่จะปล่อยให้ list เลื่อนแนวนอน ทำให้ `overflow-x-auto` ไม่มีผล
- ห้ามใส่ `variant="line"` — ใช้ default (พื้น `bg-muted`) แบบเดียวกับ `BilingualTabs` เพื่อให้ tab นอกกับ tab TH/EN ดูเป็นระบบเดียวกัน แต่แยกชั้นได้ด้วยขนาด/ตำแหน่ง

### 1.2 ความกว้าง: `max-w-xl` → `max-w-3xl`

ของเดิมคือ `max-w-xl` (576px). เปลี่ยนเป็น `max-w-3xl` (768px) ทั้งหน้า **รวม tab แรกด้วย**

เหตุผล: tab SEO มี rail แนวตั้งกว้าง 176px + ฟอร์ม → ที่ 576px เหลือฟอร์ม ~380px ซึ่งแคบเกินจะพิมพ์ meta description (150+ ตัวอักษร) ได้อย่างมีศักดิ์ศรี. ถ้าให้ tab SEO กว้างกว่า tab อื่น หน้าจะ "เต้น" ทุกครั้งที่สลับ tab ซึ่งเป็นอาการที่ผู้ใช้อ่านว่า "เว็บพัง" มากกว่า "ดีไซน์ตั้งใจ"

ต้นทุน: การ์ด 2 ใบเดิมกว้างขึ้น 192px. รับได้ — ไม่มี field ไหนเสียสัดส่วน (ทั้งหมดเป็น `Input` เต็มความกว้างอยู่แล้ว)

ทางเลือกถ้าไม่ยอมแตะของเดิมเลย: คง `max-w-xl` ทุก tab แล้วให้ rail SEO กว้าง 140px — ยอมรับได้แต่แย่กว่า ไม่แนะนำ

### 1.3 Tab label + value + id

| # | `value` | label ไทย (ตรงตัว) | id ของ trigger | เห็นโดย |
|---|---|---|---|---|
| 1 | `capacity` | `นัดสำรวจ & ชำระเงิน` | `st-tab-capacity` | ADMIN เท่านั้น |
| 2 | `seo` | `SEO / Meta` | `st-tab-seo` | ADMIN, MARKETING |
| 3 | `contact` | `ติดต่อ & Social` | `st-tab-contact` | ADMIN, MARKETING |
| 4 | `headfoot` | `Header / Footer` | `st-tab-headfoot` | ADMIN, MARKETING |

- id บน `TabsTrigger` มีไว้ให้ `e2e-rbac-sprint2.mts` เช็คการซ่อน tab ได้แบบไม่เปราะ (`#st-tab-capacity` count === 0 สำหรับ MARKETING) — อย่าใช้การ match ข้อความไทยแทน
- label ไม่แปลเป็นไทยล้วนสำหรับ `SEO / Meta` และ `Header / Footer` โดยตั้งใจ: คำเหล่านี้เป็นศัพท์ที่คนดูแลเว็บใช้จริงและแปลไทยแล้วจะกำกวม ("อภิข้อมูล" ไม่มีใครอ่านออก). Admin เป็นไทยล้วนตาม ADR ในความหมายว่า **ไม่มี message key / ไม่มีสวิตช์ภาษา** — ไม่ได้แปลว่าต้องบังคับแปลศัพท์เทคนิค

### 1.4 การซ่อน tab แรกสำหรับ MARKETING

```
const showCapacity = role === "ADMIN";
const defaultTab = showCapacity ? "capacity" : "seo";
```

- ซ่อนทั้ง `TabsTrigger` และ `TabsContent` ของ `capacity` (conditional render — **ไม่ใช่ `className="hidden"`**) เพื่อไม่ให้ค่า PromptPay/บัญชีธนาคารหลุดไปอยู่ใน DOM ของ MARKETING
- ผลตามมาที่ต้องทำจริง: `page.tsx` ต้อง **ไม่ query** `bookingCapacitySetting` / `paymentSettings` เมื่อ role ไม่ใช่ ADMIN และส่ง prop เป็น `null` — ซ่อนแค่ที่ JSX แต่ยังส่งข้อมูลลง client = ข้อมูลรั่วผ่าน RSC payload
- ปุ่ม `#s-capacity-submit` / `#p-payment-submit` จึงหายไปจาก DOM ของ MARKETING ตามไปด้วย (server action ยังคง 403 ตาม default #11 ของแผน — UI แค่ไม่ล่อให้กด)
- `defaultTab` ต้องคำนวณตาม role ไม่ใช่ hardcode `"capacity"` ไม่งั้น MARKETING เปิดมาเจอ panel ว่าง

### 1.5 e2e ที่ต้องไม่พัง (ตรวจก่อน commit)

`e2e-admin-crud.mts:634-677` ทำงานกับ ADMIN และ locate `input[name="maxPerDay"]` / `input[name="promptpayId"]` **โดยไม่คลิก tab ก่อน** → ใช้ได้ต่อไปเพราะ `defaultTab === "capacity"` สำหรับ ADMIN

แต่ถ้าอนาคตมีใครสลับลำดับ tab ให้ SEO มาก่อน สคริปต์จะพังทันทีแบบเงียบ ๆ (`fill()` บน element ที่ `hidden`) → แนะนำให้ #28 เติมบรรทัด `await page.click("#st-tab-capacity")` ก่อน block เดิม เพื่อกันไว้ล่วงหน้า (idempotent, ไม่กระทบผลปัจจุบัน)

---

## 2. Tab 1 — `นัดสำรวจ & ชำระเงิน`

**ยกของเดิมมาทั้งก้อน ไม่แก้อะไรข้างใน** — `settings-client.tsx:72-163` ทั้งสองการ์ด ย้ายเข้า `<TabsContent value="capacity">` เท่านั้น

ห้ามแตะ: `s-max-per-day`, `s-max-per-slot`, `s-capacity-submit`, `p-promptpay-id`, `p-bank-name`, `p-bank-account-number`, `p-bank-account-name`, `p-payment-submit`, ข้อความ toast ทั้ง 2 อัน, ปุ่ม `พรีวิว QR PromptPay`, `noValidate` บนทั้ง 2 form

สิ่งเดียวที่หายไปคือ `<h1>` ที่เดิมอยู่ในไฟล์นี้ — ย้ายขึ้นไปอยู่เหนือ `<Tabs>` (ข้อ 1.1)

---

## 3. Tab 2 — `SEO / Meta`

### 3.1 หน้าตา

```
┌─ TabsContent value="seo" ─────────────────────────────────────┐
│ ┌ rail (w-44) ─────┐ ┌ ฟอร์มของหน้าที่เลือก ─────────────────┐ │
│ │ ● หน้าแรก        │ │ SEO ของ: หน้าแรก                      │ │
│ │   เกี่ยวกับเรา    │ │ /th · /en                              │ │
│ │   บริการ         │ │                                        │ │
│ │   แพ็กเกจ        │ │ [ ภาษาไทย | English ]  ← BilingualTabs │ │
│ │   ผลงาน          │ │                                        │ │
│ │   นัดสำรวจ       │ │ ชื่อหน้า (Title) TH                    │ │
│ │   ติดต่อเรา      │ │ [_______________________]   38/60      │ │
│ │   เครื่องคำนวณ    │ │ คำอธิบาย (Description) TH              │ │
│ │   รีวิวลูกค้า  ⚠ │ │ [                       ]  142/155     │ │
│ │   นโยบายคุกกี้    │ │ [                       ]              │ │
│ └──────────────────┘ │                                        │ │
│                      │ [ บันทึก SEO ของหน้านี้ ]               │ │
│                      └────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

### 3.2 ทำไม rail แนวตั้ง ไม่ใช่ accordion และไม่ใช่ `<select>`

ผมเลือก **rail แนวตั้งด้วย `<Tabs orientation="vertical">` ที่มีอยู่แล้ว** ด้วย 4 เหตุผลเรียงตามน้ำหนัก:

1. **`<select>` ทำข้อมูลหาย** — ถ้า picker เป็น `<select>` ที่ขับ React state แล้ว remount ฟอร์ม (หรือใช้ `key={selectedKey}`) ค่าที่พิมพ์ค้างไว้ของหน้าก่อนจะหายทันทีที่เปลี่ยนหน้า โดยไม่มีคำเตือน. rail + `keepMounted` เก็บ DOM ไว้ทั้ง 10 ฟอร์ม → สลับไปดูหน้าอื่นแล้วกลับมา ค่ายังอยู่
2. **Repo ไม่มี component accordion** — `src/components/ui/` ไม่มี `accordion.tsx` (ตรวจแล้ว). การเพิ่ม primitive ใหม่เพื่อ tab เดียวคือ scope creep แบบเดียวกับที่ทำให้ Tabs รอบก่อนโดน revert
3. **ซ้อน tab แนวนอน 3 ชั้นจะอ่านไม่ออก** — outer tabs แนวนอนอยู่แล้ว + TH/EN แนวนอนอยู่แล้ว; ถ้าเอา 10 หน้ามาเป็นแนวนอนอีกชั้น ผู้ใช้จะแยกไม่ออกว่าแถวไหนคุมอะไร. **แนวตั้ง = สลับแกน = สลับชั้น** เป็นสัญญาณสายตาที่ฟรี
4. **เห็นสถานะครบทั้ง 10 หน้าพร้อมกัน** — คนดูแล SEO ต้องการรู้ว่า "หน้าไหนยังไม่ได้ตั้ง" ก่อนจะรู้ว่าจะแก้หน้าไหน. `<select>` ปิดข้อมูลนี้ไว้หลังการคลิก; accordion เห็นแต่ต้องเลื่อนยาว; rail เห็นครบใน viewport เดียว

**ต้นทุนที่ยอมรับ:** DOM มี 10 ฟอร์ม × 4 field = 40 input พร้อมกัน (เพราะ `keepMounted`). ไม่ใช่ปัญหา performance ที่ scale นี้ แต่สร้างกับดักหนึ่งข้อ ดูข้อ 3.6

### 3.3 rail — รายการ 10 หน้า

ลำดับต้องตรงกับ `META_KEYS` ใน `src/lib/seo.ts` (task #1) เป๊ะ ๆ อย่าจัดเรียงใหม่ในฝั่ง UI

| `key` | label ไทยใน rail | path ที่แสดงใต้หัวฟอร์ม |
|---|---|---|
| `home` | หน้าแรก | `/` |
| `about` | เกี่ยวกับเรา | `/about` |
| `services` | บริการ | `/services` |
| `packages` | แพ็กเกจ | `/packages` |
| `portfolio` | ผลงาน | `/portfolio` |
| `booking` | สอบถาม/นัดสำรวจ | `/booking` |
| `contact` | ติดต่อเรา | `/contact` |
| `calculator` | เครื่องคำนวณ | `/calculator` |
| `testimonials` | รีวิวลูกค้า | `/testimonials` |
| `cookiePolicy` | นโยบายคุกกี้ | `/cookie-policy` |

label ไทยดึงมาจาก `messages.nav.*` ที่ผู้ใช้เห็นบนเว็บจริงอยู่แล้ว (ยกเว้น `calculator`/`cookiePolicy` ที่ไม่ได้อยู่ใน nav) — **แต่ให้ hardcode เป็น const ในไฟล์ client ไม่ต้อง import messages** เพราะ admin เป็นไทยล้วนไม่มี `NextIntlClientProvider` (ADR 0001)

โครง rail:

```
<Tabs orientation="vertical" defaultValue="home" className="flex-col md:flex-row">
  <TabsList className="w-full max-h-56 overflow-y-auto md:max-h-none md:w-44 md:shrink-0">
    {SEO_PAGES.map(p => <TabsTrigger id={`seo-tab-${p.key}`} value={p.key} …>)}
  </TabsList>
  {SEO_PAGES.map(p => <TabsContent value={p.key} className="min-w-0 space-y-4">…</TabsContent>)}
</Tabs>
```

- `TabsList` แนวตั้งได้ `group-data-vertical/tabs:flex-col` มาจาก `tabsListVariants` อยู่แล้ว ไม่ต้องเขียน flex เอง
- `TabsTrigger` แนวตั้งได้ `justify-start` มาแล้วเช่นกัน
- `min-w-0` บน `TabsContent` จำเป็น — ไม่ใส่แล้ว `Textarea` จะดัน rail จนเบี้ยว

### 3.4 Badge สถานะใน rail

ต่อท้าย label ในแต่ละ trigger:

| เงื่อนไขของแถว | สิ่งที่แสดง | สี |
|---|---|---|
| มีแถว + `titleTh` และ `descriptionTh` ไม่ว่าง | ไม่แสดงอะไร | — |
| มีแถว แต่ TH ว่างอย่างน้อย 1 ช่อง **หรือ** ไม่มีแถวใน DB | `<span className="text-[10px] text-accent-foreground">ค่าสำรอง</span>` | `--accent-foreground` = `#7a5200` (contrast ~8:1 บนพื้นขาว ผ่าน AA) |

ข้อความ `ค่าสำรอง` สื่อความจริงตาม default #5 ของแผน: หน้าเว็บไม่พัง แต่กำลังใช้ค่าจาก `messages` ไม่ใช่ค่าที่แก้ได้จากหน้านี้

**ห้ามใช้ `text-destructive`** — การยังไม่ตั้ง SEO ไม่ใช่ error และสีแดงในหน้า setting ทำให้ผู้ใช้ SME คิดว่าระบบเสีย

### 3.5 ฟอร์มของแต่ละหน้า (ซ้ำ 10 ครั้ง)

หัวฟอร์ม:
```
<h2 className="font-semibold">SEO ของ: {label}</h2>
<p className="text-sm text-muted-foreground">/th{path} · /en{path}</p>
```

`<form action={…} className="space-y-4" noValidate>` ประกอบด้วย:

| ลำดับ | ที่อยู่ | `name` | label ไทย | control | หมายเหตุ |
|---|---|---|---|---|---|
| 1 | นอก BilingualTabs | `key` | — | `<input type="hidden" value={p.key}>` | ต้องมี ไม่งั้น action ไม่รู้ว่าหน้าไหน |
| 2 | tab ภาษาไทย | `titleTh` | `ชื่อหน้า (Title) — ภาษาไทย` | `Input` id=`seo-{key}-title-th` | counter 60 |
| 3 | tab ภาษาไทย | `descriptionTh` | `คำอธิบาย (Description) — ภาษาไทย` | `Textarea rows={3}` id=`seo-{key}-desc-th` | counter 155 |
| 4 | tab English | `titleEn` | `Title (EN)` | `Input` id=`seo-{key}-title-en` | counter 60 |
| 5 | tab English | `descriptionEn` | `Description (EN)` | `Textarea rows={3}` id=`seo-{key}-desc-en` | counter 155 |

- ใช้ `BilingualTabs` จาก `@/components/admin/crud-page` ตรง ๆ — **ห้ามประกอบ Tabs เอง** (JSDoc ที่ `crud-page.tsx:230` เตือนไว้แล้วว่าทำเองแล้วจะลืม `keepMounted`)
- **ไม่ต้องทำ `ogImageKey`** — out of scope ตาม default #16; อย่าใส่ field disabled ไว้หลอกตา ผู้ใช้จะพยายามกด
- ปุ่ม: `<Button type="submit" id={`seo-${key}-submit`} disabled={isPending}>` ข้อความ `บันทึก SEO ของหน้านี้` / ระหว่างบันทึก `กำลังบันทึก...`
- toast สำเร็จ: `บันทึก SEO ของหน้า "{label}" เรียบร้อย` — ระบุชื่อหน้าเพราะมี 10 ฟอร์มบนจอเดียว ถ้าขึ้นแค่ "บันทึกเรียบร้อย" ผู้ใช้จะไม่แน่ใจว่าบันทึกอันไหน

### 3.6 กับดักของ `keepMounted` ที่ต้องจัดการ

ผู้ใช้แก้หน้า A → สลับไปหน้า B (ค่า A ยังค้างใน DOM แต่ **ยังไม่ถูกบันทึก**) → refresh → งานหาย

วิธีแก้ที่สั่ง (ทำแค่ระดับนี้พอ ไม่ต้องทำ `beforeunload`):

- เก็บ `dirtyKeys: Set<string>` ระดับ component ของ tab SEO — `onInput` ของ `<form>` ของหน้า `k` ทำ `add(k)`, บันทึกสำเร็จทำ `delete(k)`
- trigger ใน rail ที่ `dirtyKeys.has(key)` แสดงจุด `<span className="ml-auto size-1.5 rounded-full bg-brand-orange" aria-label="ยังไม่ได้บันทึก" />`
- ถ้ามี dirty อย่างน้อย 1 อัน แสดงบรรทัดใต้ rail: `<p className="text-xs text-accent-foreground">มีหน้าที่แก้ไขแล้วยังไม่ได้บันทึก</p>`

จุดสีส้ม + ประโยคเดียว แก้ปัญหาได้ ~90% ด้วยโค้ด ~10 บรรทัด; dialog ยืนยันตอนออกจากหน้าไม่คุ้มในสปรินต์นี้

---

## 4. Tab 3 — `ติดต่อ & Social`

`<form action={…} className="space-y-4" noValidate>` เดียว ครอบทั้ง tab

### 4.1 การ์ดที่ 1 — `ข้อมูลติดต่อ`

คำอธิบายใต้หัวข้อ: `ข้อมูลชุดนี้ใช้ร่วมกันทั้ง footer, หน้าติดต่อเรา, ฟอร์มนัดสำรวจ และข้อมูลธุรกิจสำหรับ Google — แก้ที่นี่ที่เดียวเปลี่ยนทั้งเว็บ`

(ประโยคนี้สำคัญเชิงธุรกิจ: ป้องกันคำถาม "ทำไมแก้ที่นี่แล้วหน้าอื่นเปลี่ยนด้วย" และสื่อว่าไม่ต้องไปตามแก้ที่อื่น)

ส่วนที่ **ไม่มี** TH/EN (ค่าเดียวใช้ทั้งสองภาษา) — วางไว้ **นอก** `BilingualTabs`:

| `name` | id | label ไทย | control | placeholder / hint |
|---|---|---|---|---|
| `phone` | `c-phone` | `เบอร์โทรศัพท์` | `Input type="tel"` | `082-473-1567` — hint: `ใช้เป็นทั้งข้อความที่แสดงและลิงก์โทรออก` |
| `email` | `c-email` | `อีเมล` | `Input type="email"` | `contact@kkdproperty.com` |
| `mapQuery` | `c-map-query` | `คำค้นสำหรับแผนที่ Google` | `Input` | hint: `ข้อความที่ใช้ค้นใน Google Maps ของหน้าติดต่อเรา — ใส่ชื่อบริษัทหรือที่อยู่เต็ม` |

ส่วนที่ **มี** TH/EN — วางไว้ใน `BilingualTabs`:

| panel | `name` | id | label |
|---|---|---|---|
| ภาษาไทย | `addressTh` | `c-address-th` | `ที่อยู่ (ไทย)` — `Textarea rows={2}` |
| ภาษาไทย | `hoursTh` | `c-hours-th` | `เวลาทำการ (ไทย)` — `Input` |
| ภาษาไทย | `contactTitleTh` | `c-title-th` | `หัวข้อหน้าติดต่อเรา (ไทย)` — `Input` |
| ภาษาไทย | `contactSubtitleTh` | `c-subtitle-th` | `ข้อความรองหน้าติดต่อเรา (ไทย)` — `Input` |
| English | `addressEn` | `c-address-en` | `Address (EN)` — `Textarea rows={2}` |
| English | `hoursEn` | `c-hours-en` | `Business hours (EN)` |
| English | `contactTitleEn` | `c-title-en` | `Contact page title (EN)` |
| English | `contactSubtitleEn` | `c-subtitle-en` | `Contact page subtitle (EN)` |

ใต้ `BilingualTabs` ทุกจุดในเอกสารนี้ ให้มีบรรทัดเดียวกันเสมอ:
`<p className="text-xs text-muted-foreground">เว้นภาษาอังกฤษว่างได้ — หน้า /en จะแสดงข้อความภาษาไทยแทน</p>`

(ตรงกับพฤติกรรมจริงของ `pickLocale()` ที่ fallback เป็น TH — เขียนไว้จะได้ไม่มีใครคิดว่าเว็บ EN พัง)

### 4.2 การ์ดที่ 2 — `Social Media`

คำอธิบาย: `เว้นว่างช่องไหน ไอคอนของช่องทางนั้นจะไม่แสดงบนหน้าเว็บ`
(นี่คือ default #8 ของแผน — ต้องบอกผู้ใช้ตรง ๆ ไม่งั้นการเว้นว่างจะดูเหมือนความผิดพลาด)

5 field เรียงตามความสำคัญสำหรับลูกค้าไทย (LINE มาก่อน Facebook เสมอ):

| `name` | id | label | placeholder |
|---|---|---|---|
| `lineUrl` | `c-line-url` | `LINE (URL)` | `https://line.me/R/ti/p/@kkdsolar` |
| `facebookUrl` | `c-facebook-url` | `Facebook (URL)` | `https://facebook.com/kkdsolar` |
| `instagramUrl` | `c-instagram-url` | `Instagram (URL)` | `https://instagram.com/kkdproperty` |
| `tiktokUrl` | `c-tiktok-url` | `TikTok (URL)` | `https://tiktok.com/@kkdproperty` |
| `youtubeUrl` | `c-youtube-url` | `YouTube (URL)` | `https://youtube.com/@kkdproperty` |

- ใช้ `type="url"` ได้ แต่ **ต้องคง `noValidate` บน form** — zod ฝั่ง server เป็น source of truth ตาม Version constraints
- แต่ละช่องมีไอคอนนำหน้าจาก `lucide-react`? **ไม่ต้อง** — lucide ไม่มีไอคอน LINE/TikTok และการมีไอคอน 3 จาก 5 จะดูเหมือนของหาย
- placeholder ตรงกับ mock seed ในแผน (task #5) โดยตั้งใจ: ผู้ใช้ที่เห็นช่องว่างจะรู้ทันทีว่าต้องใส่รูปแบบไหน

### 4.3 ปุ่มบันทึก

ท้ายฟอร์ม (นอกการ์ด หรือท้ายการ์ดที่ 2 ก็ได้ — ขอให้เป็นปุ่มเดียวคุมทั้ง tab):
`<Button type="submit" id="c-contact-submit">บันทึกข้อมูลติดต่อ</Button>`
toast: `บันทึกข้อมูลติดต่อเรียบร้อย`

**ปุ่มเดียวคุม 2 การ์ด** ต่างจาก tab 1 ที่การ์ดละปุ่ม — เพราะทั้ง 8+5+3 field คือ `SiteSettings` แถวเดียวกัน การมี 2 ปุ่มจะสร้างคำถามว่ากดปุ่มบนแล้วค่าล่างบันทึกไหม (คำตอบคือบันทึก ซึ่งยิ่งสับสน)

---

## 5. Tab 4 — `Header / Footer`

`<form>` เดียว, การ์ดเดียว, หัวข้อ `ข้อความบน Header และ Footer`

คำอธิบาย: `แก้ได้เฉพาะข้อความ — เมนูและลิงก์ในเมนูผูกกับหน้าจริงของเว็บ จึงจัดเรียงจากที่นี่ไม่ได้`
(ตรงกับคำตอบข้อ 5 ของผู้ใช้ + Out of scope ของแผน — เขียนไว้กัน expectation ผิด)

ทั้งหมดอยู่ใน `BilingualTabs` ตัวเดียว:

| panel | `name` | id | label | control |
|---|---|---|---|---|
| ภาษาไทย | `headerCtaLabelTh` | `hf-cta-th` | `ข้อความปุ่ม CTA บน Header (ไทย)` | `Input` |
| ภาษาไทย | `footerDescriptionTh` | `hf-desc-th` | `ข้อความแนะนำบริษัทใน Footer (ไทย)` | `Textarea rows={4}` |
| English | `headerCtaLabelEn` | `hf-cta-en` | `Header CTA button label (EN)` | `Input` |
| English | `footerDescriptionEn` | `hf-desc-en` | `Footer company description (EN)` | `Textarea rows={4}` |

- hint ใต้ CTA: `ปุ่มสีส้มมุมขวาบนของทุกหน้า — เว้นว่างเพื่อใช้ข้อความเริ่มต้น` (`common.bookSurvey` = `นัดสำรวจหน้างาน 199.-`)
- CTA ยาวเกิน ~28 ตัวอักษรไทยจะทำให้ header พังบน tablet → แสดง counter แบบเดียวกับ SEO: `{n}/28` เป็น `text-muted-foreground` และเป็น `text-accent-foreground` เมื่อเกิน (เตือน ไม่บล็อก)
- ปุ่ม: `<Button type="submit" id="hf-submit">บันทึก Header / Footer</Button>` — toast `บันทึกข้อความ Header / Footer เรียบร้อย`
- บรรทัด fallback EN เหมือนข้อ 4.1

---

## 6. ⚠ ข้อจำกัดที่ spec นี้บังคับกับ `src/actions/site-settings.ts` (task #11)

**Tab 3 และ Tab 4 แก้ `SiteSettings` แถวเดียวกัน แต่ส่ง FormData คนละชุด**

ถ้า `updateSiteSettings()` เขียนทับทุกคอลัมน์จาก FormData ที่ได้รับ → กดบันทึกที่ tab `Header / Footer` จะล้าง `phone`, `email`, social ทั้ง 5 เป็น `null` ทันที (เพราะไม่ได้ถูกส่งมา) และ `auditedEntity` จะบันทึกความเสียหายนั้นเป็นประวัติที่ดูเหมือนตั้งใจ

**สิ่งที่ต้องทำ:**

1. ทั้ง 2 ฟอร์มใส่ `<input type="hidden" name="section" value="contact">` / `value="headerFooter">`
2. zod แยกเป็น 2 schema แล้ว discriminate ด้วย `section`
3. action ประกอบ `data` ที่จะส่งเข้า Prisma **จากเฉพาะ field ของ section นั้น** — ไม่ใช้ spread ของทั้ง FormData

ทางเลือกที่รับได้เท่ากัน: แยกเป็น 2 exported action (`updateContactSettings`, `updateHeaderFooterSettings`) — เลือกได้ตามใจ ขอแค่ **อย่าให้ฟอร์มหนึ่งมีอำนาจล้างคอลัมน์ที่มันไม่ได้แสดง**

ให้ `audit-compliance-reviewer` (task #27) ตรวจข้อนี้ด้วย: บันทึกจาก tab หนึ่งต้องไม่ทำให้ `after` snapshot ของอีก tab กลายเป็น null

---

## 7. `/admin/content/about`

### 7.1 โครง

```
<div className="max-w-3xl space-y-5">
  <div className="flex items-center justify-between">
    <h1 className="text-xl font-bold">เนื้อหาหน้าเกี่ยวกับเรา</h1>
    <Button type="submit" form="about-form" id="ab-submit-top" disabled={isPending}>
      {isPending ? "กำลังบันทึก..." : "บันทึก"}
    </Button>
  </div>

  <form id="about-form" action={onSubmit} className="space-y-5" noValidate>
    <BilingualTabs th={…} en={…} />
    <Button type="submit" id="ab-submit" className="w-full" disabled={isPending}>…</Button>
  </form>
</div>
```

- แถวหัวเรื่อง + ปุ่มขวา ใช้ layout เดียวกับ `CrudPage:113-123` เป๊ะ — ไม่ใช่ pattern ใหม่ แค่เปลี่ยนปุ่ม "เพิ่ม" เป็น "บันทึก"
- ปุ่มบน ผูกกับฟอร์มด้วย attribute `form="about-form"` (HTML มาตรฐาน ทำงานได้แม้อยู่นอก `<form>`)
- **มีปุ่ม 2 จุดโดยตั้งใจ**: ฟอร์มนี้ยาวเกิน 1 viewport แน่นอน (16 field ต่อภาษา) ผู้ใช้ที่แก้ฟิลด์บนสุดไม่ควรต้องเลื่อนลงสุดเพื่อกดบันทึก และผู้ใช้ที่แก้ฟิลด์ล่างสุดไม่ควรต้องเลื่อนขึ้น
- **ไม่มีปุ่มลบ** ทุกกรณี (default #15)
- ใช้ `BilingualTabs` **ตัวเดียวคุมทั้งหน้า** ไม่ใช่ตัวละ section — โหมดภาษาคือสถานะระดับหน้า ("ตอนนี้ฉันกำลังแก้ภาษาไทย") ถ้าแยกเป็น 3-4 ชุด ผู้ใช้ต้องสลับซ้ำ ๆ และจะลืมบาง section ไว้ที่ภาษาเดิม
- toast: `บันทึกเนื้อหาหน้าเกี่ยวกับเราเรียบร้อย`

### 7.2 field ในแต่ละ panel (16 คู่ ตาม task #4)

แบ่ง 3 กลุ่ม คั่นด้วย `<h3 className="text-sm font-semibold text-muted-foreground">` ไม่ต้องเป็นการ์ดซ้อนการ์ด

**กลุ่ม 1 — `ส่วนหัวของหน้า`**

| `name` (TH / EN) | label ไทย | control |
|---|---|---|
| `titleTh` / `titleEn` | `หัวข้อหลัก` | `Input` |
| `introTh` / `introEn` | `ย่อหน้าเปิด` | `Textarea rows={3}` |

**กลุ่ม 2 — `จุดที่ทำให้ลูกค้าเชื่อถือ (3 กล่อง)`**

หมายเหตุใต้หัวกลุ่ม: `ไอคอนของทั้ง 3 กล่องกำหนดไว้ในโค้ดตามลำดับ — สลับลำดับข้อความจะทำให้ไอคอนไม่ตรงความหมาย`
(ตรงกับ task #23 ที่ห้ามแตะ icon mapping — ต้องเตือนผู้ใช้ ไม่งั้นเขาสลับข้อความแล้วงงว่าทำไมไอคอนไม่ตาม)

| `name` | label |
|---|---|
| `credRegisteredTitleTh/En` | `กล่อง 1 — หัวข้อ` |
| `credRegisteredDescTh/En` | `กล่อง 1 — คำอธิบาย` (`Textarea rows={2}`) |
| `credEngineerTitleTh/En` | `กล่อง 2 — หัวข้อ` |
| `credEngineerDescTh/En` | `กล่อง 2 — คำอธิบาย` (`Textarea rows={2}`) |
| `credExperienceTitleTh/En` | `กล่อง 3 — หัวข้อ` |
| `credExperienceDescTh/En` | `กล่อง 3 — คำอธิบาย` (`Textarea rows={2}`) |

**กลุ่ม 3 — `ทีมงาน`**

| `name` | label |
|---|---|
| `teamTitleTh/En` | `หัวข้อส่วนทีมงาน` |
| `teamDescTh/En` | `คำอธิบายส่วนทีมงาน` (`Textarea rows={3}`) |
| `teamDesignTitleTh/En` | `ทีมย่อย 1 — หัวข้อ` |
| `teamDesignDescTh/En` | `ทีมย่อย 1 — คำอธิบาย` (`Textarea rows={2}`) |
| `teamInstallTitleTh/En` | `ทีมย่อย 2 — หัวข้อ` |
| `teamInstallDescTh/En` | `ทีมย่อย 2 — คำอธิบาย` (`Textarea rows={2}`) |
| `teamSupportTitleTh/En` | `ทีมย่อย 3 — หัวข้อ` |
| `teamSupportDescTh/En` | `ทีมย่อย 3 — คำอธิบาย` (`Textarea rows={2}`) |

- id ของ input: `ab-{camelCaseName}` เช่น `ab-titleTh`, `ab-credRegisteredDescEn`
- panel EN ใช้ label อังกฤษคู่ขนาน (`Main heading`, `Opening paragraph`, `Box 1 — heading`, …) ตามแบบ `services-client.tsx`
- **ห้ามใส่ `numbersTitle`** — ยังอยู่ใน messages ตาม task #4

### 7.3 Empty state

`AboutContent` เป็น singleton ที่ seed ไว้แล้ว จึงไม่มี empty state แบบ "ไม่มีข้อมูล"

กรณีที่เกิดจริงได้คือ **production ที่ seed ไม่เข้า** (default #5 ของแผน) → `page.tsx` ได้ `null`:

- ยัง render ฟอร์มตามปกติ ทุก `defaultValue` เป็น `""`
- เพิ่ม banner บนสุดของฟอร์ม:
  `<p className="rounded-lg border border-border/70 bg-accent px-4 py-3 text-sm text-accent-foreground">ยังไม่มีข้อมูลในฐานข้อมูล — ตอนนี้หน้าเว็บกำลังใช้ข้อความเริ่มต้นที่ฝังมากับระบบ กรอกและกดบันทึกเพื่อเริ่มจัดการเอง</p>`
- ใช้ token `bg-accent` (`#fff1cf`) + `text-accent-foreground` (`#7a5200`) ที่มีอยู่แล้ว — contrast ~7:1 ผ่าน AA
- action ต้องรองรับกรณีไม่มีแถว (create แทน update) แบบเดียวกับ `payment-settings.ts`

ใช้ banner แบบเดียวกันที่ tab `ติดต่อ & Social` ถ้า `siteSettings === null`

### 7.4 Sidebar (task #17)

- label: `เนื้อหาหน้าเว็บ` (ไม่ใช่ `เกี่ยวกับเรา` — เผื่อ `/admin/content/home` ในสปรินต์หน้า ตาม default #12)
- icon: `FileText` จาก `lucide-react` (ยังไม่ถูกใช้ใน `ITEMS`; `ScrollText` ถูก audit ใช้ไปแล้ว)
- ตำแหน่ง: ต่อจาก `รีวิวลูกค้า` ก่อน `ช่องทางโปรโมท`
- `roles: ["ADMIN","SALES","MARKETING","EDITOR"]`
- ระวัง: `admin-sidebar.tsx:124` ใช้ `pathname.startsWith(item.href)` — `/admin/content` ไม่ชนกับ item อื่น ปลอดภัย

---

## 8. หน้าจอแคบ / มือถือ

Admin เป็น **desktop-first โดยตั้งใจ** — `admin-sidebar.tsx:117` คือ `hidden … md:flex` แปลว่าต่ำกว่า 768px ไม่มีเมนูเลย spec นี้**ไม่แก้เรื่องนั้น** (นอก scope)

สิ่งที่ต้องทำเพื่อไม่ให้ของใหม่พังเพิ่มที่จอแคบ:

| จุด | ที่ต้องใส่ | เหตุผล |
|---|---|---|
| `TabsList` ของ tab นอก | `w-full max-w-full overflow-x-auto` | label ไทย 4 อันรวมกันยาวเกินจอ ~600px |
| `Tabs` ของ rail SEO | `flex-col md:flex-row` | ต่ำกว่า md ให้ rail อยู่บน ฟอร์มอยู่ล่าง |
| `TabsList` ของ rail SEO | `w-full max-h-56 overflow-y-auto md:max-h-none md:w-44 md:shrink-0` | 10 รายการเรียงตั้งจะดันฟอร์มตกจอ ถ้าไม่จำกัดความสูง |
| `TabsContent` ของ rail | `min-w-0` | กัน `Textarea` ดัน layout |
| `Textarea` / `Input` ทุกตัว | ไม่ต้องทำอะไร | เต็มความกว้าง container อยู่แล้ว |

**touch target:** `TabsTrigger` สูง `h-8` (32px) ต่ำกว่ามาตรฐาน 44px — **ยอมรับตามของเดิม ไม่แก้ในสปรินต์นี้** เพราะเป็นค่าของ design system (`tabs.tsx:27`) การแก้เฉพาะหน้านี้จะทำให้ tab หน้านี้ไม่เหมือน tab ที่อื่นทั้งระบบ ถ้าจะแก้ควรเปิด issue แยกให้แก้ที่ `tabsListVariants` ทีเดียว

---

## 9. เช็กลิสต์ให้ `design-business-reviewer` (task #31)

ตรวจกับ render จริง ไม่ใช่ mockup:

1. ADMIN เปิด `/admin/settings` → tab แรกคือ `นัดสำรวจ & ชำระเงิน` และฟอร์มเดิมทำงานครบ (รวมปุ่มพรีวิว QR)
2. MARKETING เปิด `/admin/settings` → เห็น 3 tab, tab แรกคือ `SEO / Meta` ที่ active, **view-source ไม่มีคำว่า promptpay ที่ไหนเลย**
3. rail SEO: คลิกสลับ 10 หน้าแล้วฟอร์มไม่กระพริบ/ไม่รีเซ็ต, badge `ค่าสำรอง` ขึ้นตรงกับแถวที่ TH ว่างจริง
4. พิมพ์ที่หน้า `home` แล้วสลับไป `about` แล้วกลับมา → ข้อความยังอยู่ + จุดส้มขึ้นที่ `home`
5. บันทึก tab `Header / Footer` แล้วเปิด `/admin/settings` ใหม่ → เบอร์โทร/social **ยังอยู่ครบ** (ข้อ 6 — ถ้าข้อนี้พัง ห้ามผ่าน)
6. ล้าง social ครบทั้ง 5 → `/th` ไม่มีแถวไอคอนโล่ง ๆ ใน footer
7. `/en/about` เมื่อ EN ว่าง → เห็นภาษาไทย และในหน้า admin เห็นบรรทัด `เว้นภาษาอังกฤษว่างได้…` อธิบายไว้แล้ว
8. `/admin/content/about` ที่ 1280px: ปุ่มบันทึกบนมองเห็นตลอดโดยไม่ต้องเลื่อน, ฟอร์มไม่กว้างเกิน `max-w-3xl`
9. บีบ browser เหลือ 700px: tab นอกเลื่อนแนวนอนได้ ไม่ล้นออกนอกจอ, rail SEO ตกลงมาอยู่บนฟอร์ม

---

## 10. สิ่งที่ spec นี้จงใจ **ไม่** ทำ

- ไม่ทำ preview หน้าเว็บข้าง ๆ ฟอร์ม (SEO snippet preview แบบ Google) — น่าใช้ แต่เป็นงานคนละก้อนและต้องเดา rendering ของ Google
- ไม่ทำ UI อัปโหลด OG image (default #16)
- ไม่ทำ dialog เตือนตอนออกจากหน้าทั้งที่มีงานค้าง — ใช้จุดส้ม + บรรทัดเตือนแทน (ข้อ 3.6)
- ไม่แตะ `admin-topbar.tsx` / `admin-sidebar.tsx` นอกจากเพิ่ม 1 รายการ + แก้ `roles` ของ settings
- ไม่เปลี่ยน `h-8` ของ `TabsTrigger` ทั้งระบบ (ข้อ 8)
- ไม่แปลง `/admin/settings` เป็นหลาย route (`/admin/settings/seo` ฯลฯ) — ผู้ใช้ขอ "tab" ตรง ๆ และ tab เดียวหน้าเดียวทำให้ e2e/permission gate อยู่ที่เดียว
