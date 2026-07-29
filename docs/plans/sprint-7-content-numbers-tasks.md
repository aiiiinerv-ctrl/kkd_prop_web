# Sprint 7 — แก้เนื้อหา/ตัวเลขให้ตรง Spec — Task Breakdown

อ้างอิง `docs/plans/kkd-spec-remediation.md` (Sprint 7) และ `docs/stuffs/KKD_เอกสารความต้องการเว็บไซต์_V1.2.pdf` §3.3 หน้า 3-4 (ยืนยันตัวเลขตรงจาก PDF ผ่าน `pdftotext -layout` รอบนี้):

- ผลิตไฟเฉลี่ย/วัน ระบบ 5KW: ฤดูร้อน (มี.ค.-พ.ค.) ~20 หน่วย, ต้นฤดูฝน (มิ.ย.-ก.ค.) 16-17 หน่วย, กลางฤดูฝน (ส.ค.-ต.ค.) 12-14 หน่วย, ฤดูหนาว (พ.ย.-ก.พ.) 15-17 หน่วย — **"ต้องใช้ตัวเลขนี้เท่านั้น ห้ามแก้ไข"** ตาม PDF
- ระยะคืนทุน (conservative estimate): ออนกริด 6-7 ปี, ไฮบริด (มีแบต) 6-8 ปี, ออฟกริด 8-12 ปี
- แบรนด์แผง: LONGi / Trina / Jinko / JA Solar (ต้องแสดงครบ 4 ยี่ห้อทุกแพ็กเกจ)

## Default ที่ตัดสินใจแล้ว (ตาม decisive-execution — ไม่ block ถามผู้ใช้)

1. **`seasonalProduction` shape**: เปลี่ยนจาก `unitsPerDay: number` เดี่ยว → `unitsPerDayMin`/`unitsPerDayMax` เสมอ (ฤดูร้อนใช้ min=max=20 เพื่อแสดง "~20" เดี่ยวตาม PDF, อีก 3 ฤดูใช้ช่วงจริงตาม PDF). Field เป็น `Json` อยู่แล้วไม่ต้อง migrate schema. UI: ถ้า min===max แสดง `~{min}`, ไม่งั้นแสดง `{min}-{max}`.
2. **Payback range**: ทั้ง 3 แพ็กเกจปัจจุบัน (3/5/10KW) ไม่มี field แยกประเภทระบบ (ไม่มี on-grid/hybrid/off-grid classification ใน schema) — เพิ่ม field ใหม่ไม่อยู่ใน scope sprint นี้ (เสี่ยง scope creep). แสดงเป็นกล่องข้อมูลแยกต่างหาก (มิเรอร์ pattern กล่อง "ข้อมูลปริมาณไฟฟ้า" ที่มีอยู่แล้ว) ลิสต์ทั้ง 3 ประเภทพร้อมช่วงปี ไม่ผูกกับแพ็กเกจใดแพ็กเกจหนึ่ง
3. **แบรนด์แผง**: แก้ `featuresTh`/`featuresEn` ทั้ง 3 แพ็กเกจใน seed ให้ขึ้นต้นด้วย "แผงโซลาร์ LONGi / Trina / Jinko / JA Solar" เหมือนกันทุกแพ็กเกจ (ปัจจุบันไม่ตรงกัน — 5KW มีแค่ 2 ยี่ห้อ, 3KW/10KW ไม่ระบุยี่ห้อเลย)
4. **หน้ารายละเอียดแพ็กเกจ** (`packages/[slug]/page.tsx`): ใหม่ทั้งหมด — แสดง name/price/suitable/features เต็ม/seasonal table เฉพาะแพ็กเกจนั้น/ปุ่มขอใบเสนอราคา ไม่มี field ใหม่ใน schema (ใช้ข้อมูลที่มีอยู่แล้วทั้งหมด)
5. **StatsRow**: component มีอยู่แล้ว (`src/components/site/stats-row.tsx`) แต่ไม่ได้ import ใช้ที่ไหนเลย และค่าทั้งหมดเป็น placeholder `"—"` ใน messages. Wire เข้า about page พร้อมตัวเลขจริงจาก DB **เฉพาะ 2 ตัวที่ derive ได้** ตาม PDF ("จำนวนโครงการที่เสร็จสิ้น จำนวนลูกค้า"):
   - `statsProjects` → นับ `PortfolioProject` ที่ `isPublished: true`
   - เปลี่ยน `statsSatisfaction` (วัดไม่ได้จริง ไม่มีข้อมูล survey) → `statsCustomers` ("ลูกค้าที่ไว้วางใจ") นับ `Lead` ที่ status ∈ `CLOSED_LEAD_STATUSES` (มิเรอร์นิยามเดิมจาก `src/lib/reports/aggregate.ts` Sprint 5b — `SIGNED`/`INSTALLING`/`COMPLETED`)
   - `statsYears`/`statsEngineers` คงเป็น static placeholder ต่อไป (ไม่มี field ใน DB ให้ derive, นอก scope sprint นี้)
6. **Contact page**: Google Maps embed + ลิงก์ Facebook เป็น **placeholder แบบ hardcode** (ไม่ทำ admin-configurable เหมือน PromptPay เพราะ remediation-plan ระบุไว้ชัดว่าเป็นของที่ "รอข้อมูลจากลูกค้า...ไม่ block sprint" ไม่ใช่ decision ที่ต้อง admin แก้ได้ทันทีแบบ payment info) — ใช้ `addressValue` เดิม (`"สมุทรปราการ, ประเทศไทย"`) เป็น query ของ Google Maps embed iframe (generic, ไม่ผูกพิกัดจริง), Facebook link ใช้ placeholder URL `https://facebook.com/kkdsolar` (รูปแบบเดียวกับ LINE OA `@kkdsolar` ที่มีอยู่แล้ว)
7. **Home quick-contact row**: เพิ่มแถวไอคอนโทร/LINE/Facebook ในหน้าแรกเอง (ไม่ใช่แค่ footer) — ใช้ href เดียวกับที่ contact page ใช้ (`tel:`, LINE OA link, Facebook placeholder) เพื่อไม่ให้ข้อมูลไม่ตรงกันสองที่

## Task List

1. `prisma/seed.ts` — แก้ `seasonal()`: เปลี่ยน shape เป็น `{monthsTh, monthsEn, unitsPerDayMin, unitsPerDayMax}`, ใช้ตัวเลขตรง PDF (summer 20/20, earlyRainy 16/17, rainy 12/14, winter 15/17) คูณ scale ตามขนาดระบบเหมือนเดิม (`Math.round(value * scale)` ทั้ง min/max); แก้ `featuresTh`/`featuresEn` ทั้ง 3 แพ็กเกจให้ระบุ 4 แบรนด์เหมือนกัน
2. `src/app/[locale]/packages/page.tsx` — อัปเดต `SeasonRow` type รับ min/max, render `~{min}` หรือ `{min}-{max}`; เพิ่มกล่องระยะคืนทุน (3 ประเภท on-grid/hybrid/off-grid) ใต้กล่อง seasonal; เพิ่มปุ่ม "ดูรายละเอียด" (`tCommon("learnMore")` มีอยู่แล้ว) ลิงก์ไป `/packages/[slug]`
3. `src/app/[locale]/packages/[slug]/page.tsx` (ใหม่) — RSC ดึง `Package` ตาม slug (`notFound()` ถ้าไม่พบ/`isPublished:false`), แสดงรายละเอียดเต็ม + seasonal table เฉพาะแพ็กเกจนั้น (ใช้ helper render เดียวกับหน้า list ถ้าทำได้ — พิจารณา extract shared component เล็กๆ)
4. `src/messages/th.json`/`en.json` — namespace `packages`: เพิ่ม key สำหรับกล่องคืนทุน (`paybackTitle`, `paybackOnGrid`, `paybackHybrid`, `paybackOffGrid` หรือเทียบเท่า) และหน้ารายละเอียด; namespace `home`: เปลี่ยน `statsSatisfaction`/`statsSatisfactionValue` → `statsCustomers`/`statsCustomersValue` (ไม่ hardcode ค่า — คงเป็น placeholder key แต่ page จะ override ด้วยค่าจริงจาก DB ตอน render ไม่ใช่จาก message file); เพิ่ม key สำหรับ quick-contact row ใน home ถ้ายังไม่มี (เช่น `quickContactTitle`) — คู่ TH/EN เสมอ
5. `src/components/site/stats-row.tsx` — รับ prop `overrides?: Partial<Record<"statsProjectsValue" | "statsCustomersValue", string>>` (หรือรูปแบบเทียบเท่า) แทนที่ค่าจาก `t()` เมื่อมี override; เปลี่ยน `statsSatisfaction` เป็น `statsCustomers` ใน `STATS` array
6. `src/app/[locale]/about/page.tsx` — import + render `<StatsRow />` (ปัจจุบันไม่ได้ใช้เลย), query `prisma.portfolioProject.count({where: {isPublished: true}})` และ `prisma.lead.count({where: {status: {in: CLOSED_LEAD_STATUSES}}})` ส่งเป็น override props (import `CLOSED_LEAD_STATUSES` จาก `src/lib/reports/aggregate.ts` แทนการ define ซ้ำ)
7. `src/app/[locale]/contact/page.tsx` — เพิ่มไอเทม Facebook เข้า `ITEMS` array (มิเรอร์ pattern LINE เดิม), เพิ่ม Google Maps `<iframe>` embed (query จาก `addressValue`, `loading="lazy"`, ไม่มี API key required ด้วย embed แบบ `maps.google.com/maps?q=...&output=embed`)
8. `src/app/[locale]/home-content.tsx` — เพิ่มแถวไอคอนติดต่อด่วน (โทร/LINE/Facebook) ในส่วน hero หรือใต้ hero (ใช้ href เดียวกับ contact page)
9. Verify: `npx tsc --noEmit`, `npm run build && npm run start`, i18n key-parity script (TH/EN key ต้องเท่ากันหลังแก้), manual check `/th/packages`, `/en/packages`, `/th/packages/5kw`, `/th/about`, `/th/contact`, `/th` (home) ว่า render ถูกต้อง, ตัวเลข seasonal ตรง PDF เป๊ะ

## Out of scope (ยืนยันจาก remediation plan เดิม)

- ที่อยู่บริษัทแบบละเอียด + พิกัดจริงสำหรับ Maps, ลิงก์ Facebook จริง — รอข้อมูลจากลูกค้า, ใช้ placeholder ไปก่อนตามที่ระบุใน remediation plan บรรทัด "สิ่งที่ต้องขอจากลูกค้าเพิ่ม"
- `statsYears`/`statsEngineers` — ไม่มี DB field รองรับ, คงเป็น static placeholder
- ไม่แก้ payback calculation ใน calculator (`src/store/use-calculator-store.ts`) — เป็นการคำนวณจริงจากราคา/ค่าไฟที่ประหยัดได้ ไม่ใช่ค่า static ที่ spec ระบุ ไม่ใช่ gap
