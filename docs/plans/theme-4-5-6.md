# แผนพัฒนา Theme 4 / 5 / 6 — ตัวเลือกดีไซน์เพิ่มสำหรับลูกค้า

## Context

ไซต์มี theme preview 1–3 อยู่แล้ว (`/th/theme-N`, selector ที่ `/themes`) สำหรับให้ลูกค้าเลือกทิศทางดีไซน์ ลูกค้าต้องการตัวเลือกเพิ่มอีก 3 แบบ โดยทุกตัวตั้งต้นจาก theme-3 (blue-orange):

- **theme-4** = theme-3 + footer ดำ/ทองของ theme-2
- **theme-5** = theme-3 แต่สลับ accent ส้ม → เหลือง mustard
- **theme-6** = theme-3 ปรับตาม visual ref ของลูกค้า (`stuffs/messageImage_1783996661078.jpg`) — โทน **navy เข้ม + ทอง** ครอบคลุม **hero + decision strip** (ตัดสินใจแล้ว: ไม่ทำทั้งหน้า) ส่วนที่เหลือเป็นพื้นสว่างแบบ theme-3 แต่สลับ accent เป็นทอง

**Key takeaways จาก ref (theme-6):** พื้น navy เข้ม `#0a1e3c` ซ้อนแผงเฉียง/chevron, ทอง `#f0b429`–`#ffc233` เป็น accent, headline สองโทน (ขาว + ทอง, uppercase), เส้น hairline ทองบาง, แถว 4 ไอคอน outline ทองคั่นด้วยเส้นตั้ง, ภาพถ่ายโทน golden hour

**สถาปัตยกรรมที่มีอยู่ (reuse ทั้งหมด):** theme route เป็น thin wrapper — `theme-N/page.tsx` เรนเดอร์ `HomeContent` พร้อม `themeVariant`, sub-page 8 หน้าเป็น re-export 3 บรรทัด; สไตล์ทั้งหมดอยู่ใน `src/app/globals.css` ผ่าน selector `:is(html[data-theme-variant=…], html:has(.theme-N-page))`; `ThemeRouteMarker` เซ็ต attribute จาก pathname

## หลักการ implement (ใช้ร่วมทั้ง 3 theme)

**ห้ามแตะ CSS block ของ theme-3 (globals.css ~260–837)** — ให้ theme ใหม่ "เข้าร่วม" selector เดิมแทน:

1. `HomeContent` เรนเดอร์ `<main className="theme-3-page theme-N-page">` (สองคลาส) → สืบทอด theme-3 ฟรีทั้ง block
2. `ThemeRouteMarker` เซ็ต 2 attribute: `data-theme-variant="blue-orange"` (สืบทอด base, ครอบ sub-page) + `data-theme-skin="theme-N"` (สำหรับ delta)
3. Delta block ของแต่ละ theme ต่อท้าย globals.css **หลังบรรทัด ~837** (หลัง media query ของ theme-3 — specificity เท่ากัน source order ชนะ) ด้วย selector `:is(html[data-theme-skin="theme-N"], html:has(.theme-N-page))`

## Sprint 1 — theme-4 (รวม plumbing ที่ใช้ร่วมทุก theme)

1. `src/app/[locale]/home-content.tsx` — ขยาย union `HomeThemeVariant` เป็น theme-4/5/6; เปลี่ยน `isTheme3` → `isTheme3Family` (Set `{theme-3,4,5,6}`); `main` className ประกอบ `theme-3-page` + `theme-N-page`
2. `src/components/site/theme-route-marker.tsx` — คืน `{variant, skin}`, เซ็ต/ลบ `dataset.themeSkin` (รวม popstate + cleanup — **ต้องลบ themeSkin พร้อม themeVariant** ไม่งั้น skin ค้างเมื่อออกจาก theme)
3. `src/components/site/site-header.tsx` — เพิ่ม prefix theme-4/5/6 ใน `themePrefixForPath` + ใช้ `theme-3-site-header` กับทั้งสาม
4. `src/components/site/site-footer.tsx` — เพิ่ม prefix ทั้งสาม; `/theme-4` → ใส่คลาส **`theme-2-site-footer`** (CSS เดิมมี `!important` ชนะ footer amber ของ theme-3 → theme-4 **ไม่ต้องมี CSS ใหม่เลย**; ใส่ comment กันคนลบ `!important` ในอนาคต)
5. โฟลเดอร์ `src/app/[locale]/theme-4/` — `page.tsx` (`themeVariant="theme-4"`) + sub-page re-export 8 หน้า (ก็อปแพตเทิร์น theme-3)
6. `src/app/[locale]/themes/page.tsx` — เพิ่มการ์ด theme4 ใน `THEME_ROUTES` (swatches `#0d47a1 / #ff9f00 / #050505`)
7. `src/messages/th.json` + `en.json` — `themeSelector.theme4.*` (5 คีย์ ทั้งสองภาษาพร้อมกัน)
8. `scripts/screenshot-pages.mts` — เพิ่มลูป theme routes (th+en) — sprint ถัดไปแค่ขยาย array

## Sprint 2 — theme-5 (mustard)

1. โฟลเดอร์ `src/app/[locale]/theme-5/` (9 ไฟล์ แพตเทิร์นเดิม)
2. Delta block ท้าย globals.css — เปลี่ยนตัวแปร: `--brand-orange #c99700`, `--brand-orange-dark #a67c00`, `--brand-gold #f2c744`, `--accent #faf3d9`, `--accent-foreground #7a5c00`, `--ring`, `--shadow-gold rgb(201 151 0/.28)` + กวาด hex ที่ hardcode ใน block theme-3 (~30 จุด: nav hover `#ffb54d`, hero stripe/radial, kicker, proof panel, decision strip, portfolio bar, action row, footer `#ffbc63` → `#e0b64b` ตัวอักษร `#3d3200`) — override ใน delta เท่านั้น
3. การ์ด theme5 ใน `themes/page.tsx` (swatches `#0d47a1 / #c99700 / #faf3d9`) + `themeSelector.theme5.*` TH+EN
4. ขยาย screenshot array

## Sprint 3 — theme-6 (navy/gold ตาม ref)

1. โฟลเดอร์ `src/app/[locale]/theme-6/` (9 ไฟล์)
2. `home-content.tsx` — flag `isTheme6` + markup ใหม่ 2 จุด: (a) headline สองโทน `theme6HeroTitleWhite`/`theme6HeroTitleGold` (b) แถว 4 ไอคอน `theme6-feature-row` (lucide: Sun, ShieldCheck, Wrench, LineChart) — ที่เหลือ reuse hook เดิม (`theme3-hero-kicker`, `theme3-proof-panel`, `theme3-decision-strip`) แล้ว restyle ด้วย CSS
3. Messages TH+EN: `home.theme6HeroTitleWhite/Gold`, `home.theme6Feature1–4`, `themeSelector.theme6.*`
4. Delta block: hero navy `#0a1e3c` + แผงเฉียงด้วย layered `linear-gradient(115deg, …)` (ไม่เพิ่ม DOM), `.home-hero::before` เป็นเส้น hairline ทอง, `.home-hero-media::before` เส้นทองไล่ตาม clip-path เดิม, `img` filter โทน golden hour, decision strip เป็นแถบ navy `#061223` ตัวหนังสือทอง/ขาว, ส่วนสว่างที่เหลือกวาด accent ส้ม → ทอง `#f0b429`/`#d99a1b`, footer navy/gold + mobile media query ปิด `::before` ของ media
5. การ์ด theme6 (swatches `#0a1e3c / #f0b429 / #ffffff`) + screenshot array

## Handoff & การตรวจ

- **บันทึกแผนนี้ลง repo เป็น `docs/plans/theme-4-5-6.md`** (ขั้นแรกก่อนเริ่ม Sprint 1) — และตั้งเป็น convention: แผนพัฒนาทุกฉบับเก็บที่ `docs/plans/*.md` (บันทึกลง memory + AGENTS.md)
- ผู้ทำ: **nextjs-dev** ทีละ sprint (แต่ละ sprint shippable อิสระ → commit แยกเป็น `feat(themes): add theme-N …` ตาม Conventional Commits)
- ตรวจต่อ sprint: `npm run build` → TH/EN key parity (ใช้ **i18n-parity-checker**) → รัน `scripts/screenshot-pages.mts` ดู theme ใหม่ + **re-shoot theme-2/3 ยืนยันไม่ regress** → verify skill → จากนั้น **design-business-reviewer** ตรวจ render จริงเทียบ ref (โดยเฉพาะ theme-6)
- ความเสี่ยงหลัก: delta ต้องอยู่หลัง media query เดิม (source order), themeSkin ต้อง cleanup, theme-4 พึ่ง `!important` ของ theme-2 footer
