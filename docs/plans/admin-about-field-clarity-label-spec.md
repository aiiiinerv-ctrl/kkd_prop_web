# SPEC — Label & helper-text rewrite for `/admin/content/about`

ผลลัพธ์ task #3 ของ `docs/plans/admin-about-field-clarity-tasks.md` — เขียนโดย `ux-ui-expert` 2026-08-23 ส่งให้ `nextjs-dev` implement ต่อ (task #4)

Target file (ไฟล์เดียวที่ต้องแก้): `src/app/admin/(dashboard)/content/about/about-client.tsx`

ข้อจำกัดที่ต้องเคารพ:
- ห้ามแตะ `name=` ของ input ใด ๆ (ผูกกับ `ABOUT_FIELDS` ใน server action), ห้ามแตะ `id=` ใด ๆ บน input (จับคู่กับ `htmlFor`), ห้ามแตะ `id="ab-submit"` / `id="ab-submit-top"`
- ห้ามสร้าง component ใหม่, ห้ามใช้ tooltip, ห้ามเพิ่มค่า padding scale ใหม่ — ทุก class ด้านล่างมีอยู่แล้วในโค้ดเบสนี้
- โครงสร้าง (BilingualTabs, `<h3>` groups, `space-y-5` / `space-y-1.5`) คงเดิม

---

## 1. รูปแบบการตั้งชื่อ label

สำหรับ 6 กล่อง/การ์ดที่ผูกกับไอคอน label มี 3 ส่วนเรียงตามลำดับคงที่:

`<container + เลข> · <ความหมาย> (<ตำแหน่งบนหน้า>, <คำอธิบายไอคอนแบบภาษาไทยธรรมดา>) — <ส่วนไหน>`

- เลขก่อน เพราะเลขคือสิ่งที่ผูกกับลำดับโค้ดและไอคอน
- ความหมายรอง เพราะเป็นข้อมูลที่ขาดหายไปตอนนี้
- ตำแหน่ง + ไอคอนในวงเล็บ เพราะเป็นสิ่งที่ staff ใช้เทียบกับหน้าเว็บจริง
- ส่วน (`หัวข้อ` / `คำอธิบาย`) ท้ายสุด เพื่อให้สองแถวของกล่องเดียวกันอ่านเป็นคู่กัน

กลุ่ม credential ใช้ `กล่อง 1–3`; กลุ่มทีมใช้ `การ์ดทีม 1–3` (ไม่ใช่ `กล่อง`) เพื่อไม่ให้สองกลุ่มพูดคำว่า "กล่อง 2" ซ้ำกัน

---

## 2. ส่วนหัวฟอร์ม (เหนือฟอร์ม)

### 2a. ลิงก์ "เปิดหน้าจริง"

แทรกใต้ `<h1>` ในบล็อกหัว (บรรทัด 59-64 เดิม) ปรับ flex row: ฝั่งซ้ายเป็น block เรียงซ้อน (title + link), Button อยู่ขวาเหมือนเดิม

- คอลัมน์ซ้าย: `<div className="space-y-1">` ครอบ `<h1 className="text-xl font-bold">เนื้อหาหน้าเกี่ยวกับเรา</h1>` เดิม แล้วตามด้วยลิงก์
- คง `flex items-center justify-between` แต่เปลี่ยน `items-center` → `items-start` ให้ปุ่มชิดกับ title ไม่ใช่กึ่งกลาง

สเปกลิงก์:

| Property | Value |
|---|---|
| Element | `<a>` ธรรมดา (ไม่ใช่ `next/link`) — ข้ามจาก admin root layout ไปยัง localized public route |
| Text (TH) | `เปิดหน้าจริง /th/about` |
| Icon | `ExternalLink` จาก `lucide-react`, `className="size-3.5"`, วางหลังข้อความ |
| href | `/th/about` |
| Attributes | `target="_blank"` `rel="noopener"` |
| Classes | `inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline` |

### 2b. หมายเหตุ EN-fallback ขึ้นบน (คงของเดิมด้านล่างไว้ด้วย)

เพิ่มเป็น **child แรก** ของทั้ง node `th` และ `en` ที่ส่งให้ `BilingualTabs` (ก่อน `<h3>` แรกใน `<div className="space-y-5">` แต่ละอัน) ไม่แก้ `BilingualTabs` เอง — `TabsContent` มี `pt-3` อยู่แล้ว หมายเหตุจะอยู่ใต้แถบ tab ทันทีทั้ง 2 tab

- ข้อความ TH: `เว้นภาษาอังกฤษว่างได้ — แท็บ English ที่ยังว่าง หน้า /en จะแสดงข้อความภาษาไทยแทน`
- ข้อความ EN: `Leaving English blank is fine — /en falls back to the Thai text for any empty field.`
- Classes (เหมือนกันทั้ง 2 panel): `rounded-md border border-border/70 bg-muted/50 px-3 py-2 text-xs text-muted-foreground`

หมายเหตุด้านล่างเดิม (บรรทัด 231) คงไว้ **เหมือนเดิมทุกตัวอักษร**: `เว้นภาษาอังกฤษว่างได้ — หน้า /en จะแสดงข้อความภาษาไทยแทน`, classes `text-xs text-muted-foreground`

---

## 3. Token ของ `<h3>` กลุ่ม

เดิม: `text-sm font-semibold text-muted-foreground` — ขนาด/น้ำหนักตระกูลเดียวกับ `<Label>` ต่างแค่สี (live-verify task #1 ยืนยันว่าลำดับชั้นอ่านจาง)

**แนะนำ — "rule + full-strength heading":**

```
text-base font-bold text-foreground border-b border-border/70 pb-1.5
```

ให้สัญญาณ 3 อย่างพร้อมกันเทียบกับ `<Label>` ลูก (`text-sm font-medium text-foreground`): ขนาดใหญ่ขึ้น, น้ำหนักหนักขึ้น, เส้นคั่นแนวนอนปิดกลุ่มก่อนหน้า `border-border/70` คือ border treatment เดียวกับที่ใช้อยู่แล้วในหน้านี้ (empty-state banner, บรรทัด 67) และการ์ด About สาธารณะ `pb-1.5` ใช้ step `1.5` เดิมที่มีอยู่แล้วในทุก field wrapper — ไม่มี padding value ใหม่ `space-y-5` ของ parent ให้ gap ด้านบน heading อยู่แล้ว ไม่ต้องเพิ่ม margin-top

ทางเลือกที่พิจารณาแล้วไม่เลือก: eyebrow style (`text-xs font-semibold uppercase tracking-wide`) — `uppercase` ไม่มีผลกับตัวอักษรไทย ทำให้ tab TH ไม่ได้ลำดับชั้นเพิ่มเลยขณะที่ tab EN เปลี่ยน ไม่สมมาตรและแย่กว่าสำหรับ audience หลัก

ทางเลือกสำรอง ถ้า user รู้สึกว่า rule หนักไปสำหรับฟอร์ม 34 field: ตัด border ออก เหลือแค่ `text-base font-bold text-foreground` ยังอ่านง่ายอยู่ แต่เสีย cue การปิดกลุ่มที่ช่วยตอน scroll ยาว

Group helper paragraph อยู่ **หลัง** `<h3>` และคง `text-xs text-muted-foreground` เดิม — ladder หัวข้อ/helper/label จึงมี 3 ระดับชัดเจน

---

## 4. Group headers + group helper text

| # | `<h3>` TH เดิม | `<h3>` TH ใหม่ | Helper TH ใหม่ (`text-xs text-muted-foreground` ใต้ h3 ทันที) |
|---|---|---|---|
| G1 | `ส่วนหัวของหน้า` | `ส่วนหัวของหน้า` | `แถบบนสุดพื้นสีครีม — 2 บรรทัดแรกที่ลูกค้าเห็นทันทีเมื่อเปิดหน้า` |
| G2 | `จุดที่ทำให้ลูกค้าเชื่อถือ (3 กล่อง)` | `จุดที่ทำให้ลูกค้าเชื่อถือ (3 กล่อง)` | `3 กล่องถัดจากส่วนหัว เรียงซ้าย→ขวาบนจอคอม (บนมือถือเรียงบนลงล่าง) ไอคอนของแต่ละกล่องกำหนดไว้ในโค้ดตามตำแหน่ง แก้จากหน้านี้ไม่ได้ — ถ้าย้ายข้อความข้ามกล่อง ไอคอนจะไม่ตรงความหมาย` |
| G3 | `ทีมงาน` | `ทีมงาน` | `หัวข้อส่วน + การ์ด 3 ใบถัดจากกล่องความน่าเชื่อถือ ไอคอนของการ์ดกำหนดไว้ในโค้ดตามตำแหน่งเช่นเดียวกัน` |

G1 เดิมไม่มี helper — เพิ่มใหม่ G2's helper **แทนที่** ข้อความคำเตือนเดิม (บรรทัด 89-91) ไม่ต้องเก็บทั้งคู่ — ข้อความใหม่พูดเรื่องเดียวกันบวกข้อเท็จจริงที่ขาดไป G3 เดิมไม่มี helper — เพิ่มใหม่

Tab EN:

| # | `<h3>` EN เดิม | `<h3>` EN ใหม่ | Helper EN ใหม่ |
|---|---|---|---|
| G1 | `Page header` | `Page header` | `The cream band at the very top — the first two lines a visitor reads.` |
| G2 | `Trust credentials (3 boxes)` | `Trust credentials (3 boxes)` | `Three boxes below the header, left→right on desktop (stacked on mobile). Each box's icon is fixed in code by position and cannot be changed here — moving text between boxes will mismatch the icons.` |
| G3 | `Team` | `Team` | `Section heading plus three cards below the credential boxes. Card icons are likewise fixed in code by position.` |

Heading คงข้อความเดิม — token ใหม่ + helper line คือสิ่งที่ทำหน้าที่แทน

---

## 5. Field-by-field label spec — TH tab

| Field (`name=`) | Label TH เดิม | Label TH ใหม่ | Helper ต่อ field |
|---|---|---|---|
| `titleTh` | หัวข้อหลัก | `หัวข้อหลัก — บรรทัดใหญ่บนสุดของหน้า` | ไม่มี |
| `introTh` | ย่อหน้าเปิด | `ย่อหน้าเปิด — ข้อความใต้หัวข้อหลัก` | `ยาวได้ 2–3 บรรทัด ถ้ายาวกว่านี้ส่วนหัวจะดูอึดอัด` |
| `credRegisteredTitleTh` | กล่อง 1 — หัวข้อ | `กล่อง 1 · จดทะเบียนบริษัท (ซ้าย, ไอคอนรูปตึก) — หัวข้อ` | ไม่มี |
| `credRegisteredDescTh` | กล่อง 1 — คำอธิบาย | `กล่อง 1 · จดทะเบียนบริษัท (ซ้าย, ไอคอนรูปตึก) — คำอธิบาย` | ไม่มี |
| `credEngineerTitleTh` | กล่อง 2 — หัวข้อ | `กล่อง 2 · วิศวกรมีใบอนุญาต (กลาง, ไอคอนป้ายติ๊กถูก) — หัวข้อ` | ไม่มี |
| `credEngineerDescTh` | กล่อง 2 — คำอธิบาย | `กล่อง 2 · วิศวกรมีใบอนุญาต (กลาง, ไอคอนป้ายติ๊กถูก) — คำอธิบาย` | ไม่มี |
| `credExperienceTitleTh` | กล่อง 3 — หัวข้อ | `กล่อง 3 · ประสบการณ์และผลงาน (ขวา, ไอคอนเหรียญรางวัล) — หัวข้อ` | ไม่มี |
| `credExperienceDescTh` | กล่อง 3 — คำอธิบาย | `กล่อง 3 · ประสบการณ์และผลงาน (ขวา, ไอคอนเหรียญรางวัล) — คำอธิบาย` | `คำอธิบายทั้ง 3 กล่องควรยาวใกล้เคียงกัน 1–2 บรรทัด กล่องจะได้สูงเท่ากัน` (ใส่ใต้ desc field สุดท้ายนี้ตัวเดียว แทนทั้งกลุ่ม) |
| `teamTitleTh` | หัวข้อส่วนทีมงาน | `หัวข้อส่วนทีมงาน — บรรทัดใหญ่เหนือการ์ด 3 ใบ` | ไม่มี |
| `teamDescTh` | คำอธิบายส่วนทีมงาน | `คำอธิบายส่วนทีมงาน — ข้อความใต้หัวข้อส่วน` | `ยาวได้ 2–3 บรรทัด` |
| `teamDesignTitleTh` | ทีมย่อย 1 — หัวข้อ | `การ์ดทีม 1 · ทีมออกแบบและวิศวกรรม (ซ้าย, ไอคอนดินสอกับไม้บรรทัด) — หัวข้อ` | ไม่มี |
| `teamDesignDescTh` | ทีมย่อย 1 — คำอธิบาย | `การ์ดทีม 1 · ทีมออกแบบและวิศวกรรม (ซ้าย, ไอคอนดินสอกับไม้บรรทัด) — คำอธิบาย` | ไม่มี |
| `teamInstallTitleTh` | ทีมย่อย 2 — หัวข้อ | `การ์ดทีม 2 · ทีมติดตั้งหน้างาน (กลาง, ไอคอนประแจ) — หัวข้อ` | ไม่มี |
| `teamInstallDescTh` | ทีมย่อย 2 — คำอธิบาย | `การ์ดทีม 2 · ทีมติดตั้งหน้างาน (กลาง, ไอคอนประแจ) — คำอธิบาย` | ไม่มี |
| `teamSupportTitleTh` | ทีมย่อย 3 — หัวข้อ | `การ์ดทีม 3 · ทีมบริการหลังการขาย (ขวา, ไอคอนหูฟัง) — หัวข้อ` | ไม่มี |
| `teamSupportDescTh` | ทีมย่อย 3 — คำอธิบาย | `การ์ดทีม 3 · ทีมบริการหลังการขาย (ขวา, ไอคอนหูฟัง) — คำอธิบาย` | `คำอธิบายทั้ง 3 การ์ดควรยาวใกล้เคียงกัน 1–2 บรรทัด` (ใส่ใต้ desc field สุดท้ายนี้ตัวเดียว) |

รวม TH tab = 16 field (2 header + 6 credential + 2 team section + 6 team card)

Markup ของ per-field helper (เฉพาะ 4 แถวที่มี): `<p className="text-xs text-muted-foreground">…</p>` วาง **หลัง** `Input`/`Textarea` ภายใน `space-y-1.5` wrapper เดิม — อ่านเป็นคำแนะนำเกี่ยวกับสิ่งที่เพิ่งพิมพ์ ไม่ใช่ label ที่สอง ไม่ต้องเพิ่ม `aria-describedby` — helper เป็น advisory และ label เป็น accessible name อยู่แล้ว

---

## 6. Field-by-field label spec — EN tab (สะท้อน TH)

ข้อเท็จจริงไอคอน/ตำแหน่งเดียวกัน น้ำเสียง English admin-prompt (ตาม task #1 finding, tab EN มี label ภาษาอังกฤษของตัวเองอยู่แล้วโดยตั้งใจ คงไว้เป็นภาษาอังกฤษ)

| Field (`name=`) | Label EN เดิม | Label EN ใหม่ | Helper ต่อ field |
|---|---|---|---|
| `titleEn` | Main heading | `Main heading — the big line at the top of the page` | ไม่มี |
| `introEn` | Opening paragraph | `Opening paragraph — the text under the main heading` | `2–3 lines works best; longer crowds the header band.` |
| `credRegisteredTitleEn` | Box 1 — heading | `Box 1 · Company registration (left, building icon) — heading` | ไม่มี |
| `credRegisteredDescEn` | Box 1 — description | `Box 1 · Company registration (left, building icon) — description` | ไม่มี |
| `credEngineerTitleEn` | Box 2 — heading | `Box 2 · Licensed engineers (middle, check-badge icon) — heading` | ไม่มี |
| `credEngineerDescEn` | Box 2 — description | `Box 2 · Licensed engineers (middle, check-badge icon) — description` | ไม่มี |
| `credExperienceTitleEn` | Box 3 — heading | `Box 3 · Track record (right, award-medal icon) — heading` | ไม่มี |
| `credExperienceDescEn` | Box 3 — description | `Box 3 · Track record (right, award-medal icon) — description` | `Keep all three descriptions a similar 1–2 lines so the boxes stay the same height.` |
| `teamTitleEn` | Team section heading | `Team section heading — the big line above the three cards` | ไม่มี |
| `teamDescEn` | Team section description | `Team section description — the text under that heading` | `2–3 lines.` |
| `teamDesignTitleEn` | Sub-team 1 — heading | `Team card 1 · Design & engineering (left, pencil-and-ruler icon) — heading` | ไม่มี |
| `teamDesignDescEn` | Sub-team 1 — description | `Team card 1 · Design & engineering (left, pencil-and-ruler icon) — description` | ไม่มี |
| `teamInstallTitleEn` | Sub-team 2 — heading | `Team card 2 · On-site installation (middle, wrench icon) — heading` | ไม่มี |
| `teamInstallDescEn` | Sub-team 2 — description | `Team card 2 · On-site installation (middle, wrench icon) — description` | ไม่มี |
| `teamSupportTitleEn` | Sub-team 3 — heading | `Team card 3 · After-sales support (right, headset icon) — heading` | ไม่มี |
| `teamSupportDescEn` | Sub-team 3 — description | `Team card 3 · After-sales support (right, headset icon) — description` | `Keep all three card descriptions a similar 1–2 lines.` |

---

## 7. สรุปการเปลี่ยนแปลงสำหรับ `nextjs-dev`

**เพิ่มใหม่:** ลิงก์ 1 อัน (`เปิดหน้าจริง /th/about`), หมายเหตุ EN-fallback บนสุด 2 จุด (1 ต่อ tab), group helper ใหม่ 4 ย่อหน้า (G1+G3 ทั้ง 2 tab; G2's helper แทนที่ warning เดิม), per-field helper 4 ย่อหน้าต่อ tab (รวม 8) หน้าจะยาวขึ้นราว 8 บรรทัดสั้น ๆ ต่อ tab — ยอมรับได้เทียบกับความยาว ~16-scroll-tick ที่วัดไว้แล้ว และช่วยชดเชยด้วย group rule ที่ทำให้ scan เร็วขึ้น

**เปลี่ยน:** `<Label>` string 32 ตัว, `<h3>` className 6 ตัว, ข้อความ warning paragraph 1 จุด (ถูกแทนที่ด้วย G2 helper), header `div` layout (`items-center` → `items-start`, title ครอบด้วย `space-y-1`)

**ไม่แตะ:** `name=` และ `id=` ทุกตัว, `BilingualTabs` และ `crud-page.tsx`, `src/actions/about-content.ts`, schema, empty-state banner, ปุ่ม submit ทั้งสอง, หมายเหตุ EN-fallback ด้านล่างเดิม, `src/messages/*.json` ทั้งหมด

**Import ใหม่ที่ต้องเพิ่ม:** `ExternalLink` จาก `lucide-react`
