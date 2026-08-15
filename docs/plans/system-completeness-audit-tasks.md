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
   | ผู้รับผิดชอบ: `pm-expert` | ✅ เสร็จแล้ว — ดู "รายงานสรุป" ท้ายไฟล์

8. **Verify:** audit นี้ไม่แก้โค้ด จึงไม่ต้อง `npm run build` แต่ต้องยืนยัน baseline ว่ายังจริงอยู่ด้วย
   `npx tsx scripts/smoke-test-production.mts` ก่อนสรุป | ✅ ทำแล้ว — `smoke-test-production: all checks passed ✓`
   (3/3, รันวันที่ทำรายงานสรุปนี้) ยืนยันแล้วว่าทุก finding ยืนอยู่บนระบบที่ทำงานปกติจริง ไม่ใช่ผลจากระบบล่ม

---

# รายงานสรุป — System Completeness Audit

**สรุปภาพรวม: ไม่มี P0 เลยทั้งระบบ** — ไม่มีจุดไหนที่ระบบพังหรือใช้งานไม่ได้ ปัญหาที่หนักที่สุดที่เจอคือ
**mobile conversion บนหน้าบ้านถูกบล็อกจริงตอน first-visit** (แบนเนอร์คุกกี้บังปุ่ม CTA ทั้งหมด) และ
**#32 ไม่มีแจ้งเตือน lead** ซึ่งทั้งสองเรื่องนี้กระทบธุรกิจโดยตรงมากกว่าความรุนแรงเชิงโค้ด

## RAG ต่อมิติ (6 มิติตามแผน)

| มิติ | ฝั่ง | สถานะ | สรุป |
|---|---|:---:|---|
| Feature coverage vs spec V1.2 | หน้าบ้าน | 🟢 | 8 หน้าหลักครบ เนื้อหา/ตัวเลขตรง PDF ทุกจุด |
| TH/EN parity | หน้าบ้าน | 🟡 | key parity ผ่าน (363/363) แต่มี Thai string หลุดที่มองเห็นได้จริงหลายจุด |
| Design + conversion (production จริง) | หน้าบ้าน | 🔴 | mobile CTA ถูกบังจริง, ข้อมูล trust ขัดแย้งกันเองในหน้าเดียว |
| Security + audit invariants | หลังบ้าน | 🟢 | ไม่พบการละเมิดเลยจาก 13 action file |
| Feature coverage vs Sprint 0-7 | หลังบ้าน | 🟢 | ตรงสเปกเกือบทั้งหมด รวม GET endpoint ที่ไม่มีใครเคยตรวจมาก่อน |
| Ops readiness | ระบบ | 🟡 | config เก่าที่ boot-loop ได้ถ้า deploy ผิด, #32 กระทบธุรกิจจริง |

## P1 — ควรทำก่อนสุด (5 รายการ, ไม่มี P0)

| # | ฝั่ง | เรื่อง | รายละเอียด | ไฟล์ |
|---|---|---|---|---|
| P1-1 | หน้าบ้าน | แบนเนอร์คุกกี้บัง CTA บนมือถือ | สูง **46% ของจอ** ทับปุ่ม "นัดสำรวจ 199.-" และ "ขอใบเสนอราคา" ทั้งคู่ — ผู้เข้าเว็บครั้งแรกบนมือถือมองไม่เห็นทางไป booking เลยจนกว่าจะกด | CookieYes config (ภายนอกโค้ด) + `src/components/site/site-header.tsx` |
| P1-2 | หน้าบ้าน | ไม่มีปุ่ม booking ค้างจอบนมือถือ | ปุ่มอยู่ใน `hidden lg:flex` เท่านั้น รวมกับ P1-1 = mobile first-visit ไม่เหลือทาง conversion เลย | `src/components/site/site-header.tsx:65-76` |
| P1-3 | หน้าบ้าน | หน้า About ขัดแย้งกันเอง | การ์ดเขียน "200+ โครงการ" แต่ stats row ข้างล่างโชว์ "0 ลูกค้าที่ไว้วางใจ" ในหน้าเดียวกัน — ลูกค้าที่กำลังตัดสินใจซื้อของราคาสูงอ่านแล้วสรุปผิด | `src/app/[locale]/about/page.tsx:96-101`, `src/messages/{th,en}.json:80-86` |
| P1-4 | หน้าบ้าน | ข้อความไทย hardcode ใน JSON-LD บนหน้า EN | schema.org markup มีภาษาไทยล้วน ขึ้นทั้งหน้า `/th` และ `/en` | `src/components/site/local-business-jsonld.tsx:10` |
| P1-5 | ธุรกิจ/Ops | #32 ไม่มีแจ้งเตือน lead ใหม่ | ไม่ใช่บั๊กโค้ด (รอ API key ลูกค้า) แต่ปรับน้ำหนักเป็น P1 เพราะตอนนี้ lead ทุกตัว "มองไม่เห็น" จนกว่าจะมีคนเปิดแอดมินเอง ไม่มี badge แจ้งเตือนใด ๆ | `src/lib/notifications/` |

## P2 (8 รายการ)

| ฝั่ง | เรื่อง | ไฟล์ |
|---|---|---|
| หน้าบ้าน | Portfolio มีแค่ 2 ผลงาน (บ้านพักอาศัยทั้งคู่) แต่ hero โฆษณา "ผลงานเชิงพาณิชย์จริง" | `src/app/[locale]/portfolio/`, hero copy |
| หน้าบ้าน | `/testimonials` คืน 404 ทั้ง TH/EN เพราะไม่มีรีวิว published เลย → ทั้งเว็บไม่มี social proof | `src/app/[locale]/testimonials/page.tsx:29-32` |
| หน้าบ้าน | แบนเนอร์คุกกี้เป็นไทยล้วนบนหน้า `/en` | CookieYes config — ไม่ผูก locale |
| หน้าบ้าน | การ์ดผลงานบนหน้า EN โชว์ชื่อจังหวัดภาษาไทย ("Province: อยุธยา") | DB `province` ไม่มีคู่ EN |
| หน้าบ้าน | ตัวเลขเริ่มต้นเครื่องคำนวณดูเกินจริง (ลด ~96%, บิล 3,500→125 บาท) | สูตรคำนวณ (`verify-calculator.mts` scope) |
| เอกสาร | `docs/lead-capture-field-inventory.md` ล้าสมัยมาก — gap ที่บันทึกไว้ (G1,G2,G3,G4,G6,G7) แก้จริงหมดแล้ว เสี่ยงมีคนไปแก้ซ้ำของที่แก้แล้ว | `docs/lead-capture-field-inventory.md` |
| Ops | `Dockerfile`/`fly.toml` ค้างจากแผนเก่า ยังตั้ง SQLite ทั้งที่ระบบย้าย MySQL แล้ว — ถ้ามีใคร deploy ผิดจะ boot-loop เงียบ ๆ | `Dockerfile`, `fly.toml` |
| Ops | ยังไม่ยืนยันว่ามี cron job สำรองข้อมูลอัตโนมัติบนแพเนลจริงหรือยัง (script พร้อมใช้ แต่ต้องเช็คว่าติดตั้งแล้ว) | `scripts/backup-db.mts` + DirectAdmin cron |

## P3 (7 รายการ — polish, ไม่กระทบ core flow)

- ปุ่มลอย cookie settings ทับ field "LINE ID" บนฟอร์ม survey มือถือ
- padding นอกคู่ `py-16`/`py-14` ตาม ADR 0005 อยู่ 3 จุด (`not-found.tsx`, `home-content.tsx` 2 จุด)
- สีปุ่ม CookieYes ตัดกับ brand palette + badge "Powered by CookieYes" (free plan)
- copy ภาษาอังกฤษยาวกว่าไทยทำการ์ดไม่ align กันในหน้า EN
- dropdown ค่าไฟช่วง 5 ระดับต่างจาก PDF (4 ระดับ) — เคย sign-off แล้วแต่ไม่เคยกระทบยอดกับ PDF ตอนตัดสินใจ
- หน้า packages ไม่มีข้อความ empty state (ต่างจาก portfolio/testimonials ที่มี)
- booking capacity check เป็น check-then-create ไม่มี DB lock (ยอมรับความเสี่ยงไว้แล้วในโค้ด)

## ตัดออกแล้ว — Known intentional gaps (ตามที่แผนกำหนด ไม่ใช่บั๊ก)

Google ค้นหา/Walk-in ไม่มี subType, refCode เก่าไม่ migrate, admin UI ไทยอย่างเดียว, `/testimonials` ไม่มีใน
spec (แต่ยังนับ P2 เรื่อง "ไม่มีเนื้อหา" ซึ่งเป็นคนละประเด็นกับ "ไม่มีใน spec"), ข้อมูลบัญชี/PromptPay placeholder,
#32 ไม่ใช่บั๊กโค้ด (แต่ยกเป็น P1 เชิงธุรกิจแยกต่างหาก)

## เสนอ issue ใหม่ที่ควรเปิด (ยังไม่เปิด — รอผู้ใช้อนุมัติ)

1. **[P1] แบนเนอร์คุกกี้บัง CTA บนมือถือ** — รวม P1-1 + P1-2 เป็น issue เดียว เพราะแก้พร้อมกันจะสมเหตุสมผลกว่า
2. **[P1] หน้า About stats ขัดแย้งกันเอง** — ต้องได้ตัวเลขจริง (ปีประสบการณ์, จำนวนวิศวกร) จากลูกค้า หรือซ่อน stat ที่ไม่มีข้อมูลแทนโชว์ "0"/"—"
3. **[P1] JSON-LD ภาษาไทยบนหน้า EN**
4. **[P2] Portfolio ผลงานเดียวกันไม่พอสำหรับคำโฆษณา** — ต้องคุยกับลูกค้าเรื่องเนื้อหา ไม่ใช่แค่โค้ด
5. **[P2] แบนเนอร์คุกกี้ไม่ผูก locale**
6. **[P2] `docs/lead-capture-field-inventory.md` ต้องรีรัน audit ใหม่หรือลบทิ้ง** — ป้องกันคนรุ่นหลังหลงทาง
7. **[P2] ลบ/archive `Dockerfile`+`fly.toml`+`firebase.json`** หรือติดป้ายเตือนชัดเจนว่าไม่ใช่ deploy target จริง
8. **[P2] ยืนยัน DirectAdmin cron job สำรองข้อมูล** — เป็นคำถามให้ผู้ใช้เช็คในแพเนล ไม่ใช่งานโค้ด

## Next actions

1. **ผู้ใช้** — ตัดสินใจว่าจะเปิด issue ไหนบ้างจาก 8 ข้อข้างบน (หรือให้เปิดทั้งหมด)
2. **ผู้ใช้** — ยืนยัน DirectAdmin cron job backup มีอยู่จริงไหม (เช็คในแพเนลได้เลย ไม่ต้องรอ agent)
3. เมื่อ issue เปิดแล้ว วางแผน sprint ถัดไปจาก P1 ก่อน (5 ข้อ) แล้วค่อย P2 (8 ข้อ)

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
