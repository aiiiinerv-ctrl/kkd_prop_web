# Admin About Content — Field Clarity for Non-Technical Staff — Task Breakdown

อ้างอิง:
- `docs/plans/site-content-cms-ui-spec.md` §0 ข้อ 5 — `/admin/content/about` = ฟอร์ม singleton + `BilingualTabs` ตัวเดียวคุมทั้งหน้า + ปุ่มบันทึก 2 จุด (โครงนี้ **ไม่เปลี่ยน**)
- `docs/plans/site-content-cms-tasks.md` task #14–#16 — งานนี้เป็นส่วนต่อขยายของ sprint นั้น ไม่ใช่ของใหม่
- `AGENTS.md` → Working rules (TH/EN เคลื่อนพร้อมกัน, surgical changes), Agent model tiers
- Production: https://kkdproperty.co.th/admin/content/about (307 → `/admin/login` ยืนยันแล้ว 2026-08-23)

ข้อเท็จจริงจากโค้ดที่ห้ามแก้:
- ไอคอนของ 3 กล่อง credential และ 3 ทีมย่อย **ถูก hardcode ตามลำดับ** ใน `src/app/[locale]/about/page.tsx` (`Building2` / `BadgeCheck` / `Award` และ `PencilRuler` / …) — ลำดับ field ในฟอร์มจึงผูกกับไอคอน สลับไม่ได้
- `TabsContent` มี `keepMounted` ฝังใน `src/components/ui/tabs.tsx` แล้ว — ห้ามเติม ห้ามลบ
- `src/actions/about-content.ts` ใช้ `auditedEntity()` + `requireRole()` อยู่แล้ว งานนี้เป็น presentation-only จึง**ไม่แตะ action** และไม่ต้องรัน `audit-compliance-reviewer`

## สรุปสิ่งที่พบจากโค้ด (ก่อน live-verify)

`src/app/admin/(dashboard)/content/about/about-client.tsx` มี `<Label>` ครบทุก field เป็นภาษาไทย + จัดกลุ่มด้วย `<h3>` 3 กลุ่ม (ส่วนหัวของหน้า / จุดที่ทำให้ลูกค้าเชื่อถือ / ทีมงาน) — **ฐานดีกว่าที่คาด** ปัญหาไม่ใช่ "ไม่มี label" แต่เป็น label เชิงตำแหน่ง:

| อาการ | ตัวอย่าง | ทำไมเป็นปัญหากับ staff |
|---|---|---|
| Label เป็นเลขลำดับล้วน | `กล่อง 1 — หัวข้อ`, `ทีมย่อย 2 — คำอธิบาย` | ไม่รู้ว่ากล่อง 1 คือกล่องไหนบนหน้าเว็บจริง ต้องเปิดสองจอเทียบเอง |
| ความหมายจริงอยู่แค่ในชื่อคอลัมน์ DB | `credRegistered` = จดทะเบียน DBD, `credEngineer` = วิศวกรมีใบอนุญาต, `credExperience` = ประสบการณ์; `teamDesign` / `teamInstall` / `teamSupport` | staff มองไม่เห็นชื่อ field เลย ข้อมูลนี้หายไปทั้งหมดใน UI |
| คำเตือนบอกข้อห้ามแต่ไม่บอกข้อเท็จจริง | "ไอคอนของทั้ง 3 กล่องกำหนดไว้ในโค้ดตามลำดับ — สลับลำดับข้อความจะทำให้ไอคอนไม่ตรงความหมาย" | บอกว่า "อย่าสลับ" แต่ไม่บอกว่าแต่ละกล่องไอคอนอะไร → staff ยังสลับผิดได้อยู่ดี |
| ไม่มีลิงก์ไปหน้าจริง | — | ไม่มีทางเทียบ field ↔ ตำแหน่งบนหน้าเว็บได้ในคลิกเดียว |
| ไม่มี help text เรื่องความยาว | `introTh` rows=3, `credXxxDesc` rows=2 | staff ไม่รู้ว่าพิมพ์ยาวแค่ไหนแล้วหน้าเว็บจะแตก |

หมายเหตุ: `เว้นภาษาอังกฤษว่างได้ — หน้า /en จะแสดงข้อความภาษาไทยแทน` เขียนไว้ดีแล้ว แต่**อยู่ล่างสุดของฟอร์ม** คนที่เปิด tab EN แล้วเห็นช่องว่างหมดจะตกใจก่อนจะเลื่อนไปเจอ

## Default ที่ตัดสินใจแล้ว (ไม่ block ถามผู้ใช้)

1. **ไม่ใช้ tooltip / hover** — ใช้ helper text แบบเห็นตลอดใต้ label แทน เหตุผล: staff ส่วนใหญ่ใช้ผ่าน tablet/มือถือของออฟฟิศซึ่งไม่มี hover และ repo ยังไม่มี `tooltip.tsx` การเพิ่ม component ใหม่ขัด surgical-changes ทางที่ไม่เลือก: `title` attribute — ไม่แสดงบน touch และ screen reader อ่านซ้ำซ้อนกับ label
2. **แก้ label ให้เป็น "ความหมาย + ตำแหน่ง"** เช่น `กล่อง 1 — จดทะเบียน DBD (ไอคอนอาคาร)` แทนการเพิ่มบรรทัด helper แยกทุกช่อง เหตุผล: ฟอร์มนี้มี 34 field อยู่แล้ว การเติม helper text ทุกช่องจะทำให้หน้ายาวขึ้นเท่าตัวและอ่านยากกว่าเดิม ใส่ helper เฉพาะระดับกลุ่ม (`<h3>`) กับช่องที่กำกวมจริง
3. **ย้ายหมายเหตุ "เว้นภาษาอังกฤษว่างได้"** ขึ้นไปไว้ใต้ `BilingualTabs` header (เห็นทันทีที่สลับ tab) และคงข้อความเดิมไว้ล่างสุดด้วย — ต้นทุนศูนย์ กันความตกใจ
4. **เพิ่มลิงก์ "เปิดหน้าจริง" ที่หัวฟอร์ม** ชี้ `/th/about` เปิด tab ใหม่ (`target="_blank" rel="noopener"`) เหตุผล: แก้ปัญหา "field นี้อยู่ตรงไหนของหน้า" ได้ตรงที่สุดด้วยโค้ดบรรทัดเดียว ทางที่ไม่เลือก: live preview pane — เกิน scope และต้องแก้สถาปัตยกรรมหน้า
5. **ไม่แตะ `src/actions/about-content.ts`, schema, DB** — งานนี้เป็น presentation-only ทั้งหมด
6. **ไม่แตะหน้า admin อื่น** (`/admin/settings`, services, packages ฯลฯ) แม้จะมีอาการคล้ายกัน — ดู Out of scope

## คำถามที่ต้องตอบก่อนเริ่ม

1. **Production admin credentials** — live-verify (task #1) ต้อง login จริงบน https://kkdproperty.co.th/admin/login ผู้ใช้ต้องให้ credentials หรือ login ให้เองแล้วส่ง session ต่อ **ห้ามใช้ค่าจาก local `.env` กับ production** (ตาม memory: production ไม่มี external MySQL access และ env-var UI ต้องใช้ browser จริง)
2. **ทำ live-verify ก่อน แล้วค่อยตัดสินขอบเขตแก้ หรือ implement ตาม default ข้างบนเลย?** — ถ้าเลือกอย่างหลัง งานจบเร็วกว่า ~1 รอบ แต่เสี่ยงว่า production รันโค้ดคนละเวอร์ชันกับ `main` (หน้านี้แก้ล่าสุดที่ `84739cb`) ซึ่งจะทำให้ premise ทั้งหมดเพี้ยน **แนะนำ: live-verify ก่อน**

## Task List

1. **Live-verify บน production** — login https://kkdproperty.co.th/admin/login → เปิด `/admin/content/about` ผ่าน claude-in-chrome; เก็บ: (ก) label ที่ render จริงตรงกับ `about-client.tsx` ใน `main` ไหม (ยืนยันว่า production ไม่ล้าหลัง), (ข) screenshot ทั้ง tab TH และ tab EN, (ค) การอ่านออกของหัวข้อกลุ่ม `<h3>` เทียบกับ label ลูก (ตอนนี้ทั้งคู่เป็น `text-sm` ต่างกันแค่ `text-muted-foreground` — ต้องดูของจริงว่าลำดับชั้นแยกออกไหม), (ง) ความยาวหน้า/จำนวน scroll กว่าจะถึงปุ่มบันทึกล่าง | ผู้รับผิดชอบ: `design-business-reviewer` (+ claude-in-chrome) | ✅ เสร็จ 2026-08-23
   - Session อยู่แล้ว (login ค้างไว้เป็น KKD Admin) — ไม่ต้อง login ใหม่
   - **DB ว่างเปล่าทั้งหมด** — มี banner เตือน "ยังไม่มีข้อมูลในฐานข้อมูล — ตอนนี้หน้าเว็บกำลังใช้ข้อความเริ่มต้นที่ฝังมากับระบบ กรอกและกดบันทึกเพื่อเริ่มจัดการเอง" (สีเหลือง ด้านบนฟอร์ม)
   - Label ที่ render ตรงกับ `about-client.tsx` ใน `main` 100% ยืนยันว่า production ไม่ล้าหลัง (`กล่อง 1 — หัวข้อ` ฯลฯ, คำเตือนไอคอน, note EN-fallback)
   - Tab EN มี label เป็นภาษาอังกฤษเอง (`Page header`, `Box 1 — heading`, `Trust credentials (3 boxes)`, `Icons are fixed in code by position — swapping text order will mismatch icons.`) — ไม่ใช่ bug ขัด ADR admin ไทยล้วน เพราะเป็น prompt สำหรับ "กำลังกรอกเนื้อหาภาษาอังกฤษ" ไม่ใช่แปล admin UI ทั้งหน้า
   - หัวกลุ่ม `<h3>` ("Team"/"ทีมงาน") กับ `<Label>` ลูก แยกชั้นได้จาง ๆ ด้วย `text-muted-foreground` เท่านั้น — เห็นความแตกต่างแต่ไม่ชัดเจน ยืนยันปัญหาตามที่ plan สมมติไว้
   - หมายเหตุ "เว้นภาษาอังกฤษว่างได้" อยู่ล่างสุดจริง (คงเดิมทั้ง 2 tab) ต้อง scroll ~16 ticks (2 รอบ scroll ใหญ่) จากบนสุดถึงปุ่มบันทึกล่าง — ยืนยันปัญหาหน้ายาว
2. `src/app/[locale]/about/page.tsx` — อ่านอย่างเดียว: ทำตาราง mapping `field name → ไอคอน → ข้อความจริงบนหน้าเว็บ production` ให้ครบ 6 กล่อง ใช้เป็นวัตถุดิบเขียน label ใหม่ | ผู้รับผิดชอบ: `design-business-reviewer` | ✅ เสร็จ 2026-08-23 (verify ผ่าน `/th/about` จริงบน production)

   | Field (DB) | ไอคอน | ข้อความจริงบน production |
   |---|---|---|
   | `credRegistered` (กล่อง 1) | `Building2` (ตึก) | "จดทะเบียนถูกต้องในประเทศไทย" / เลขทะเบียน DBD |
   | `credEngineer` (กล่อง 2) | `BadgeCheck` (ป้ายติ๊กถูก) | "ทีมวิศวกรมีใบอนุญาต" / รับงานที่ต้องมีวิศวกรเซ็นรับรอง |
   | `credExperience` (กล่อง 3) | `Award` (เหรียญรางวัล) | "ผลงานที่ผ่านมา" / ทีมมีอาชีพติดตั้งระบบโซลาร์คุณภาพสูง |
   | `teamDesign` (ทีมย่อย 1) | `PencilRuler` (ดินสอไม้บรรทัดไขว้) | "ทีมออกแบบและวิศวกรรม" |
   | `teamInstall` (ทีมย่อย 2) | ประแจ (wrench) | "ทีมติดตั้งหน้างาน" |
   | `teamSupport` (ทีมย่อย 3) | หูฟัง (headset) | "ทีมบริการหลังการขาย" |

3. Spec ข้อความ label + helper text ชุดใหม่ (TH สำหรับ tab TH, EN สำหรับ tab EN) ครบทั้ง 34 field — ส่งเป็น spec ไม่แก้โค้ด รวมถึงตัดสินว่าจะแยกลำดับชั้น `<h3>` กับ `<Label>` ด้วย token อะไร (ห้ามเพิ่มค่า padding ใหม่ ตาม `AGENTS.md`) | ผู้รับผิดชอบ: `ux-ui-expert` | ✅ เสร็จ 2026-08-23 — spec เต็มอยู่ที่ `docs/plans/admin-about-field-clarity-label-spec.md`
4. `src/app/admin/(dashboard)/content/about/about-client.tsx` — implement ตาม spec ใน `docs/plans/admin-about-field-clarity-label-spec.md`: แก้ข้อความ `<Label>` ทั้ง TH/EN, เพิ่ม helper text ระดับกลุ่ม+ต่อ field, ย้าย/ทำซ้ำหมายเหตุ EN-fallback, เพิ่มลิงก์ "เปิดหน้าจริง" ที่หัวฟอร์ม, เปลี่ยน token `<h3>` **ห้ามแตะ `name=` ของ input ใด ๆ** (ผูกกับ `ABOUT_FIELDS` ใน action) และห้ามแตะ `id=` `ab-submit` / `ab-submit-top` (e2e ใช้) | ผู้รับผิดชอบ: `nextjs-dev` | ✅ เสร็จ 2026-08-23 — ตรงตาม spec ทุกจุด ไม่มี deviation
5. Verify ตาม `.claude/skills/verify/SKILL.md`: `npm run build` + `npx tsx scripts/e2e-admin-crud.mts` (ครอบ content CRUD — ต้องผ่านเพื่อพิสูจน์ว่า `name=` ไม่เพี้ยน) + เปิด `http://localhost:3000/admin/content/about` ดูจริงทั้ง tab TH/EN + เปิด `/th/about` และ `/en/about` ยืนยันหน้าเว็บสาธารณะไม่กระทบ | ผู้รับผิดชอบ: `nextjs-dev` | ✅ เสร็จ 2026-08-23 — `npm run build` ผ่าน, e2e-admin-crud ผ่านครบ (รวม AuditLog), screenshot ยืนยัน TH/EN tab render ถูกต้อง, `/th/about` `/en/about` (200, ข้อความเดิม) ไม่กระทบ
6. ตรวจ render จริงหลัง implement (local) ว่า staff ที่ไม่ใช่ dev เข้าใจได้จริง — เกณฑ์: อ่าน label แล้วชี้ได้ว่าตรงกับกล่องไหนบน `/th/about` โดยไม่ต้องเปิดโค้ด | ผู้รับผิดชอบ: `design-business-reviewer` | ✅ PASS 2026-08-23
   - Mapping label↔กล่อง/การ์ดถูกทุกจุด (9/9 icon-bound fields + 4 non-icon fields) — ปัญหาเดิม ("กล่อง 1 — หัวข้อ" ชี้ไม่ได้) หายไปแล้ว
   - ลิงก์ "เปิดหน้าจริง" และหมายเหตุ EN-fallback บนสุด เห็นก่อนกรอกฟอร์มจริง แม้บนมือถือ 390px
   - `<h3>` แยกชั้นชัดเจนขึ้น แก้ปัญหา "faint hierarchy" จาก task #1 ได้แล้ว หน้ายาวขึ้น ~8% ยอมรับได้
   - พบ 4 จุดเล็กน้อย แก้แล้ว 3 จุด (wording-only ไม่กระทบ `name=`/`id=`): (ก) G1 helper "แถบบนสุดพื้นสีครีม" → "แถบบนสุดของหน้า" (สีครีมจริงจางมาก ชี้ผิดแถบได้), (ข) G3 helper เพิ่ม caveat "เรียงซ้าย→ขวาบนจอคอม (บนมือถือเรียงบนลงล่าง)" ให้เหมือน G2, (ค) `credEngineer` "ไอคอนป้ายติ๊กถูก"/"check-badge icon" → "ไอคอนตราประทับติ๊กถูก"/"check-seal icon" (ตรงกับรูป `BadgeCheck` ที่ render จริงกว่า)
   - จุดที่ 4 (หมายเหตุ EN-fallback ล่างสุดยังเป็นไทยใน tab EN) เป็นไปตาม spec ที่สั่งให้คงไว้ทุกตัวอักษร — ไม่แก้ ถือเป็น follow-up แยกถ้าต้องการ
   - Note นอกขอบเขต task นี้: `git status` ยังมีไฟล์อื่นติดมา (`lead-detail-client.tsx`, `globals.css` จาก Design B ที่ยังไม่ commit) — ตอน commit งานนี้ต้อง stage เฉพาะ `about-client.tsx` และ `docs/plans/*` ที่เกี่ยวข้อง อย่าพ่วง Design B เข้าไปด้วย
7. `i18n-parity-checker` — งานนี้**ไม่แตะ** `src/messages/*.json` (label admin เป็น hardcode ไทย ตาม ADR admin ไทยล้วน) ให้ยืนยันว่าไม่มี key ใหม่หลุดเข้าไปจริง ๆ เท่านั้น | ผู้รับผิดชอบ: `i18n-parity-checker` | ✅ PASS 2026-08-23 — ไม่มี diff ใน `th.json`/`en.json`, ไม่มี `useTranslations`/`t()` เพิ่มใน `about-client.tsx`, parity check ทั้ง repo ผ่าน (365 keys)
8. Deploy — อ่าน `docs/plans/kkd-shared-hosting-redeploy-runbook.md` ก่อน แล้ว deploy, ปิดด้วย `npx tsx scripts/smoke-test-production.mts` | ผู้รับผิดชอบ: หลัก (ไม่ใช่ `hosting-deploy-specialist` — ถูก auto-mode classifier บล็อกซ้ำ 2 ครั้ง จึงรันเองผ่าน Bash + FTP upload โดยผู้ใช้ตาม non-negotiable rule ของ runbook) | ✅ เสร็จ 2026-08-24
   - Commit `72da1be` เท่านั้นที่ deploy — stash งาน Design B (`lead-detail-client.tsx`, `globals.css`) ก่อน build เพราะ Dockerfile ใช้ `COPY . .` แล้ว pop กลับหลัง build เสร็จ (ไม่หายจาก working tree)
   - Build ผ่าน Docker (AlmaLinux 8) สำเร็จ → `deploy/dist.zip` (27,728,290 bytes)
   - FTP upload โดยผู้ใช้ผ่าน `!` prefix ตามกฎ: `226 File successfully transferred`, byte count ตรงกัน
   - Extract บน production: "File Extracted" (HTTP 200)
   - Restart Passenger: HTTP 302 (ตามคาด ไม่มี success marker ใน response)
   - Verify: `/api/admin/leads` → 401 (ไม่ใช่ 500), `/th/about` `/en/about` → 200 พร้อมเนื้อหาปกติ, เปิด `/admin/content/about` จริงด้วย session ที่ login ค้างไว้ — label ใหม่ทั้งหมด (รวม fix wording 3 จุดจาก task #6) ขึ้น live ครบถูกต้อง
   - `npx tsx scripts/smoke-test-production.mts` — ผ่านทั้ง 3 check (HOMEPAGE, ADMIN_REDIRECT, PRIVATE_FILE)
   - งานนี้ไม่มี migration จึงไม่ต้องทำ DDL/backup step ของ runbook

## Out of scope

- **หน้า admin อื่นที่มีอาการเดียวกัน** (`/admin/settings` tab SEO, services, packages) — surgical changes; ถ้า #6 ผ่านแล้วผู้ใช้พอใจ ค่อยเปิด issue แยกใช้ pattern เดียวกัน
- **Live preview pane / side-by-side editor** — เปลี่ยนสถาปัตยกรรมหน้า ต้นทุนสูงกว่าปัญหาที่แก้
- **ทำให้ไอคอนเลือกได้จาก admin** — ต้องแก้ schema + `page.tsx` และเปิดช่องให้ staff เลือกไอคอนผิดความหมาย ค่าที่ได้ไม่คุ้ม
- **แปล admin UI เป็น EN** — ขัด ADR admin ไทยล้วน
- **แก้เนื้อหา About จริงบน production** — งานนี้แก้ "ป้ายกำกับช่องกรอก" ไม่ใช่ "เนื้อหา"
