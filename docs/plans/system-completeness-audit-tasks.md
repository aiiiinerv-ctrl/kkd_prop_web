# System Completeness Audit (หน้าบ้าน / หลังบ้าน) — Task Breakdown

อ้างอิง:
- `docs/stuffs/KKD_เอกสารความต้องการเว็บไซต์_V1.2.pdf` — เอกสารความต้องการจากลูกค้า (baseline ของคำว่า "สมบูรณ์")
- `docs/plans/kkd-spec-remediation.md` — gap analysis ต่อ spec V1.2 + สถานะ Sprint 0-7 (ตารางสถานะสปรินต์)
- `docs/plans/sa-channel-taxonomy-utm-tasks.md` — งานล่าสุด (taxonomy ช่องทาง + UTM) deploy แล้ว
- `scripts/uat-full-system.mts` — UAT 27 เช็คบน production ผ่านครบเมื่อ 2026-08-15
- `AGENTS.md` (Working rules, Agent model tiers), `docs/adr/0001-0006`

ข้อเท็จจริงที่ห้ามแก้ระหว่าง audit:
- งานทั้งหมดเป็น **read-only** — ห้าม agent ตัวใดแก้โค้ด/deploy ระหว่างงานนี้ ผลลัพธ์คือ finding list เท่านั้น
- Baseline ของ "ความสมบูรณ์" คือ spec V1.2 ไม่ใช่ความเห็นส่วนตัวของ agent
- ของที่จงใจไม่ทำ ห้ามรายงานเป็นบั๊ก (ดู "Known intentional gaps" ท้ายไฟล์)

## Mapping ที่ตรวจจากโค้ดจริงแล้ว

**หน้าบ้าน (public)** — `src/app/[locale]/` = 13 `page.tsx`
`/` `about` `services` `packages` `packages/[slug]` `portfolio` `calculator` `booking` `contact`
`testimonials` `cookie-policy` `themes` `[...rest]`
รองรับด้วย `src/components/site/`, `src/messages/{th,en}.json` (409 บรรทัดเท่ากันทั้งคู่),
`src/app/api/ref`, `src/app/api/bookings/availability`,
mutations สาธารณะ: `src/actions/submit-quote.ts`, `src/actions/submit-survey-booking.ts`

**หลังบ้าน (admin)** — `src/app/admin/` = 15 `page.tsx` (14 ใน `(dashboard)/` + `login/`)
`dashboard` `leads` `leads/[id]` `bookings` `bookings/[id]` `channels` `reports` `audit`
`packages` `services` `portfolio` `testimonials` `users` `settings`
รองรับด้วย `src/components/admin/`, `src/hooks/admin/`,
`src/app/api/admin/{leads,bookings,reports/summary,reports/export}`,
mutations: `src/actions/{auth,bookings,channels,leads,packages,payment-settings,portfolio,promptpay-preview,services,testimonials,users}.ts`
choke point: `src/lib/audit.ts` (`withAudit()`), `requireAdmin()`/`requireRole()`

> หมายเหตุ: `/themes` เป็นหน้า internal preview ที่อยู่ใต้ `[locale]` — จัดเป็นหน้าบ้านทาง route แต่ไม่ใช่หน้าที่ลูกค้าปลายทางต้องเห็น ให้ตรวจเฉพาะว่ามัน noindex/ไม่รั่วเข้า sitemap

## Default ที่ตัดสินใจแล้ว (ไม่ block ถามผู้ใช้)

1. **เกณฑ์ "ความสมบูรณ์" = 6 มิติ** — feature coverage vs spec V1.2 / TH-EN parity / UX-conversion บน render จริง /
   security + audit invariants / error-empty-edge-state handling / operational readiness (backup, notification, monitoring)
   เลือกแบบนี้เพราะ 6 มิตินี้ map ตรงกับจุดที่โปรเจกต์นี้เคยพลาดจริงและมี agent รองรับอยู่แล้ว
   ทางที่ไม่เลือก: Lighthouse/perf score ล้วน — วัดง่ายแต่ไม่ตอบคำถาม "ระบบครบไหม"
2. **ไม่สร้าง agent ใหม่ในรอบนี้** — ใช้ `Explore` ทำส่วน feature-coverage แทน โดยล็อก scope ด้วย `kkd-spec-remediation.md`
   เหตุผล: งานนี้เป็น one-off audit ไม่ใช่ recurring gate การสร้าง `system-completeness-auditor` ต้องขอ confirm ผู้ใช้ก่อน
   (agent-scaling-protocol) และยังพิสูจน์ไม่ได้ว่าคุ้ม ถ้าผลรอบนี้ออกมาว่า Explore เอาไม่อยู่ ค่อยเสนอสร้าง
3. **design-business-reviewer ตรวจบน production จริง** (`https://kkdproperty.co.th/th/…` และ `/en/…`) ไม่ใช่ localhost
   เหตุผล: production คือสิ่งที่ลูกค้าเห็นจริง และ UAT 27/27 เพิ่งยืนยันว่า production ใช้งานได้ปกติ
   ทางที่ไม่เลือก: dev server — เคยทำให้ประเมินพลาดเพราะ asset/redirect ต่างกัน
4. **หลังบ้านไม่ตรวจ TH/EN** — admin UI เป็นภาษาไทยอย่างเดียวโดยตั้งใจ (decision #10 ใน `kkd-spec-remediation.md`)
   `i18n-parity-checker` จึงจำกัด scope ที่หน้าบ้าน + DB paired columns เท่านั้น
5. **รวม issue ที่ค้างอยู่เข้าเป็น input ไม่ใช่ finding ใหม่** — #32 #30 #27 #25 #24 #22 #21 ต้องถูกอ้างเป็นสถานะที่รู้อยู่แล้ว
   agent ห้ามรายงานซ้ำเป็นของใหม่ แต่ให้ประเมิน **ผลกระทบต่อความสมบูรณ์** ของแต่ละอัน
6. **`deploy-verify` เข้าร่วมแบบมีเงื่อนไข** — charter ของมันเขียนไว้ที่ Fly.io/Firebase แต่ production จริงคือ
   DirectAdmin shared hosting ให้มันรายงาน "scope mismatch" นี้เป็น finding ด้วย แทนที่จะตรวจไฟล์ที่ไม่ได้ใช้แล้ว
7. **รูปแบบผลลัพธ์ต่อ agent** — ตาราง finding: `ID | ฝั่ง(หน้าบ้าน/หลังบ้าน) | มิติ | path ไฟล์จริง | สิ่งที่พบ | ความรุนแรง(P0-P3) | อ้างอิง spec/issue`
   ห้ามส่งกลับเป็นความเรียงลอย ๆ

## คำถามที่ต้องตอบก่อนเริ่ม

1. **ต้องการ audit เพื่ออะไร** — (ก) ส่งมอบ/ปิดโปรเจกต์กับลูกค้า (ข) วางแผน sprint ถัดไป (ค) ประเมินความเสี่ยง production
   คำตอบเปลี่ยนน้ำหนัก: (ก) เน้น spec coverage + เอกสารส่งมอบ, (ข) เน้น P1-P2 ที่ทำต่อได้, (ค) เน้น security/ops
   **ถ้าไม่ตอบ จะเดินตาม (ข)**
2. **ให้ตรวจลึกแค่ไหน** — audit เต็ม 6 มิติใช้ agent 5-6 ตัว (มี opus 1 ตัว) หรือจะตัดเหลือเฉพาะ P0-P1 sweep
   นี่เป็นเรื่องงบ/เวลา จึงไม่ตัดสินใจแทน

## Task List

### เฟส A — สำรวจขนาน (ทั้งหมด read-only, ไม่มี dependency ต่อกัน)

1. `src/app/[locale]/**` + `docs/stuffs/KKD_เอกสารความต้องการเว็บไซต์_V1.2.pdf` — **หน้าบ้าน: feature coverage vs spec**
   ไล่ทีละหน้าใน 13 route ว่ามีครบตาม spec 8 หน้าหลัก, เนื้อหา/ตัวเลข (ระยะคืนทุน, ผลิตไฟตามฤดูกาล, แบรนด์อุปกรณ์,
   เลข DBD) ตรง spec ไหม, ฟอร์ม booking ครบ field ตาม `docs/lead-capture-field-inventory.md` ไหม,
   empty/error state ของ packages/portfolio/testimonials เมื่อ DB ว่าง | ผู้รับผิดชอบ: `Explore` | ✅ ขนานได้
2. `src/messages/th.json` + `en.json` + `src/lib/i18n-content.ts` — **หน้าบ้าน: TH/EN parity**
   key parity (ตอนนี้ 409 บรรทัดเท่ากัน — ยืนยันระดับ key path ไม่ใช่จำนวนบรรทัด), หา hardcoded Thai string
   ใน `src/components/site/`, ตรวจ DB content ทุก entity มี `xxxTh`/`xxxEn` ครบและอ่านผ่าน `pickLocale()`
   | ผู้รับผิดชอบ: `i18n-parity-checker` | ✅ ขนานได้
3. production `https://kkdproperty.co.th/th/*` + `/en/*` — **หน้าบ้าน: design + conversion บน render จริง**
   ตรวจทุกหน้าสาธารณะบน desktop + mobile: brand credibility สำหรับ SME ไทย, CTA path ไปหน้า booking,
   ความสม่ำเสมอของ section padding (`py-16` / `py-14` ตาม ADR 0005), cookie consent banner ไม่บัง CTA,
   หน้า `/en` ไม่มี Thai string ตกค้างที่มองเห็น | ผู้รับผิดชอบ: `design-business-reviewer` (opus) | ✅ ขนานได้
4. `src/actions/*.ts` + `src/lib/audit.ts` — **หลังบ้าน: security + audit invariants**
   ทุก mutation เริ่มด้วย `requireAdmin()`/`requireRole()` และห่อ `withAudit()`, ไม่มี secret เข้า snapshot
   (เทียบ pattern `auditView()` ใน `users.ts`), ครอบคลุม action ใหม่ `channels.ts` `payment-settings.ts`
   `promptpay-preview.ts` ด้วย, และประเมินผลกระทบของ issue #22 (MyISAM → `$transaction` ไม่ atomic จริง)
   | ผู้รับผิดชอบ: `audit-compliance-reviewer` | ✅ ขนานได้
5. `src/app/admin/(dashboard)/**` + `src/app/api/admin/**` + `src/hooks/admin/` — **หลังบ้าน: feature coverage vs spec**
   เทียบกับตารางสถานะ Sprint 0-7 ใน `kkd-spec-remediation.md`: 4 roles + RBAC scope, Lead 8 สถานะ,
   Booking 8 สถานะ + เลขที่นัดอัตโนมัติ + ช่อง "ส่งของขวัญแล้ว", export Excel, dashboard/reports,
   PromptPay QR, `BookingCapacitySetting`; และเช็คว่า GET `/api/admin/*` (ที่ไม่ใช่ server action)
   มี authorization guard ครบ — จุดนี้อยู่นอก scope ของ task #4 | ผู้รับผิดชอบ: `Explore` | ✅ ขนานได้
6. `Dockerfile`, `fly.toml`, `firebase.json`, `scripts/build-shared-hosting-deploy.mts`,
   `docs/plans/kkd-shared-hosting-redeploy-runbook.md` — **ops readiness + scope mismatch**
   ตรวจว่า deploy surface ที่ใช้จริง (shared hosting) กับไฟล์ config ที่ยังค้างอยู่ (Fly/Firebase) ขัดกันตรงไหน,
   backup/restore script พร้อมใช้จริงไหม, ประเมินผลกระทบ #32 (ไม่มี notification) และ #25 (ไม่มี GA)
   ต่อความพร้อม operation | ผู้รับผิดชอบ: `deploy-verify` | ✅ ขนานได้

### เฟส B — รวมผล

7. `docs/plans/system-completeness-audit-tasks.md` — **PM รวม finding ทั้ง 6 ตัวเป็นรายงานเดียว**
   แยกเป็น 2 หัวข้อใหญ่ หน้าบ้าน / หลังบ้าน, ให้ RAG (🟢🟡🔴) ต่อมิติ, จัดลำดับ P0-P3,
   ตัดของที่อยู่ใน "Known intentional gaps" ออก, เสนอ issue ใหม่ที่ควรเปิด (ยังไม่เปิดจนกว่าผู้ใช้อนุมัติ)
   | ผู้รับผิดชอบ: `pm-expert` | ⏳ รอ #1-#6

8. **Verify:** audit นี้ไม่แก้โค้ด จึงไม่ต้อง `npm run build` แต่ต้องยืนยัน baseline ว่ายังจริงอยู่ด้วย
   `npx tsx scripts/uat-full-system.mts` (คาด 27/27) และ `npx tsx scripts/smoke-test-production.mts`
   ก่อนสรุป — ถ้าสองอันนี้ไม่ผ่าน finding ทั้งหมดต้องประเมินใหม่ | ผู้รับผิดชอบ: `nextjs-dev` | ⏳ รอ #1-#6

## Known intentional gaps — ห้ามรายงานเป็นบั๊ก

- "Google ค้นหา" และ "อื่น ๆ / Walk-in" ไม่มี subType — ชีต SA มี 10 ค่าไม่ครอบคลุมสองอันนี้ จงใจปล่อยว่าง
- refCode เดิม CH015-CH019 ยังไม่ย้ายเป็นสกีมใหม่ (TE/FB/LN/…) — จงใจไม่ auto-migrate เพื่อไม่ให้ลิงก์เก่าตาย
- Admin UI เป็นภาษาไทยอย่างเดียว — decision #10 ใน `kkd-spec-remediation.md`
- `/testimonials` ไม่มีใน spec — เก็บไว้เป็น bonus โดยตั้งใจ (decision #13)
- ข้อมูลบัญชี/PromptPay เป็น placeholder — รอข้อมูลจริงจากลูกค้า ออกแบบให้ config ผ่าน admin แล้ว (decision #4)
- #32 notification ยังไม่เปิด — รอ API key จากลูกค้า ไม่ใช่ข้อบกพร่องของโค้ด

## Out of scope

- **ไม่แก้อะไรทั้งสิ้นในรอบนี้** — audit อย่างเดียว การแก้เป็นแผนถัดไปหลังผู้ใช้จัดลำดับ
- **ไม่ทำ performance/Lighthouse audit เชิงลึก** — คนละมิติกับความสมบูรณ์เชิงฟีเจอร์ ถ้าต้องการให้แยกงาน
- **ไม่ทำ accessibility audit เต็มมาตรฐาน WCAG** — เกินขอบเขต spec V1.2 ให้ `design-business-reviewer`
  รายงานเฉพาะที่กระทบการใช้งานจริง (contrast, tap target) เท่านั้น
- **ไม่ refactor ของข้างเคียง** — `AGENTS.md` สั่ง surgical changes
- **ไม่ปิด/merge issue ใด ๆ** — เสนอได้ ตัดสินใจเป็นของผู้ใช้
