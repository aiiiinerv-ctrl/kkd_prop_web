# Backlog Dispatch 2026-08-16 (Claude subagents + external AI CLI) — Task Breakdown

อ้างอิง:
- `docs/plans/system-completeness-audit-tasks.md` — รายงาน audit 2026-08-16 (P1 5 ข้อ / P2 8 ข้อ / P3 7 ข้อ) = แหล่งที่มาหลักของ backlog นี้
- `docs/agents/external-cli-guardrails.md` — **ยังไม่ commit (untracked)** กติกาบังคับสำหรับ handoff ไป codex / cursor-agent / antigravity
- `docs/agents/issue-tracker.md`, `docs/agents/triage-labels.md` — repo `aiiiinerv-ctrl/kkd_prop_web`
- `AGENTS.md` — Working rules (surgical changes, TH/EN move together, audit invariants), Agent model tiers
- `.claude/skills/verify/SKILL.md`, `docs/plans/kkd-shared-hosting-redeploy-runbook.md`

ข้อเท็จจริงที่ห้ามแก้:
- ใบเสนอราคา 21/06/2026 **รายการที่ 6 "บริการตั้งค่า Google Analytic — 1 บัญชี"** ยังไม่ได้ส่งมอบ (กราด repo แล้วไม่มี `gtag`/`googletagmanager`/`G-` แม้แต่บรรทัดเดียว — ยืนยันซ้ำ 2026-08-16) และหมายเหตุข้อ 4 ระบุ **"ไม่รวมการทำ SEO และการติดตั้ง Event tag"** → scope = GA4 pageview พื้นฐาน + ตั้งบัญชี เท่านั้น
- Admin UI เป็นภาษาไทยอย่างเดียวโดยตั้งใจ (decision #10) — ห้ามเสนอ i18n ฝั่งแอดมิน
- Known intentional gaps ท้าย `system-completeness-audit-tasks.md` ห้ามหยิบมาเป็นงาน

## สถานะที่ยืนยันจากโค้ดจริงแล้ว (อย่าสั่งทำซ้ำ)

| ของ | สถานะจริง |
|---|---|
| P1-2 ปุ่ม booking ค้างจอบนมือถือ | ✅ ทำแล้ว — `bb456a7 feat(site): add a persistent mobile booking CTA bar` |
| P1-4 JSON-LD ไทยบนหน้า EN | ✅ ทำแล้ว — `d274459 fix(site): localize LocalBusiness JSON-LD` |
| P2 `Dockerfile` / `fly.toml` ค้าง | ✅ ลบแล้ว — `b5ac4f1` (issue #40 ปิดแล้ว) แต่ **`firebase.json` ยังอยู่ที่ root** |
| P2 `docs/lead-capture-field-inventory.md` ล้าสมัย | ✅ อัปเดตแล้ว — `4e418b1` (issue #39 ปิดแล้ว) |
| #24 UTM capture | ✅ โค้ดครบแล้ว (`53b4d79`, `ce93bd3`, `c541214`) — issue ยังเปิดค้าง ควรเสนอปิด |
| แบนเนอร์คุกกี้หายตอน rebuild | ✅ แก้แล้ว — `fee97d2` (issue #41 ปิดแล้ว) |
| `/testimonials` คืน 404 เมื่อไม่มีรีวิว published | ยังเป็นแบบนั้นจริง — `src/app/[locale]/testimonials/page.tsx:29-32` `notFound()` |
| `province` ไม่มีคอลัมน์คู่ EN | ยังจริง — `prisma/schema.prisma:153,302,321` เป็น `String` เดี่ยว |
| หน้า packages ไม่มี empty state | ยังจริง — `src/app/[locale]/packages/page.tsx` ไม่มี branch เมื่อลิสต์ว่าง |
| padding นอก ADR 0005 | `src/app/[locale]/not-found.tsx:8` ใช้ `py-24` |

## Default ที่ตัดสินใจแล้ว (ไม่ block ถามผู้ใช้)

1. **External CLI ทำงาน "รอบนอก core invariants" เป็นหลัก** — งานที่แตะ `src/actions/` (audit/auth) และ `prisma/schema.prisma` ให้ `nextjs-dev` ทำเอง เหตุผล: จุดที่พลาดแล้วเสียหายเงียบ ๆ ควรอยู่กับ agent ที่มี AGENTS.md อยู่ใน context ตลอด ทางที่ไม่เลือก: ปล่อยทุกงานให้ CLI ภายนอกเพื่อวัด throughput — ได้ความเร็วแต่เสี่ยงกับของที่ review ยาก
2. **Write-mode handoff ทุกครั้งต้องแนบ `docs/agents/external-cli-guardrails.md`** และ Claude ต้องอ่านทุกไฟล์ที่ CLI อ้างว่าแก้ + `npx tsc --noEmit` ก่อนนับว่าเสร็จ (ตามที่ไฟล์นั้นเขียนไว้เอง)
3. **แบ่งบทบาท CLI ตามความถนัด ไม่ใช่สุ่มกระจาย** — `antigravity` = ask-only → คำถามวิจัย/second opinion; `codex` = วิเคราะห์ลึกแยก context → งานสืบสวน/ทวนสูตร; `cursor-agent` = แก้หลายไฟล์แบบ mechanical ที่ diff review ง่าย
4. **#34 (About stats ขัดแย้ง) ทำครึ่งที่ไม่ต้องรอลูกค้าไปก่อน** — ซ่อน stat ที่ไม่มีข้อมูลจริง (`—` / `0`) แทนการโชว์ แล้วค่อยเติมตัวเลขจริงเมื่อลูกค้าส่งมา เหตุผล: P1 นี้เสียความน่าเชื่อถือทุกวันที่ปล่อยไว้ และการซ่อนไม่ผูกกับคำตอบลูกค้า ทางที่ไม่เลือก: รอตัวเลขครบแล้วค่อยแก้ทีเดียว — บล็อกไม่มีกำหนด
5. **#37 (portfolio) ทำ interim copy fix ก่อน** — ปรับ hero/filter chip ให้ตรงผลงานที่มีจริง 2 ชิ้น ไม่รอรูปงานเชิงพาณิชย์จากลูกค้า
6. **#32/#36 (ไม่มีแจ้งเตือน lead) แตกเป็น 2 ส่วน** — ส่วนที่ต้องใช้ API key ของลูกค้า = ยังบล็อก; ส่วน in-app (badge/นับ lead ใหม่ในหน้า admin) ทำได้เลยโดยไม่ต้องรอใคร เหตุผล: ลด blast radius ของ "lead มองไม่เห็น" ทันที
7. **ไม่เปิด issue ใหม่ในรอบนี้โดยไม่ขออนุมัติ** — เสนอรายการไว้ท้ายไฟล์ ผู้ใช้สั่งค่อยเปิด (ตาม policy เดิม)
8. **commit `docs/agents/external-cli-guardrails.md` ก่อนเริ่ม dispatch** — ไฟล์นี้เป็น input ของทุกงานสาย external CLI แต่ยัง untracked; ถ้าไม่ commit จะไม่มีอะไรให้อ้างเป็นแหล่งความจริง

## คำถามที่ต้องตอบก่อนเริ่ม

1. **#25 Google Analytics — บัญชี GA4 เปิดในชื่อใคร และใครเป็นคนกดสร้าง** เป็นงานส่งมอบตามใบเสนอราคาที่ยังค้าง ต้องมี Measurement ID จริงถึงจะจบได้ (โค้ดทำล่วงหน้าได้ แต่ปิดงานไม่ได้) — เป็นเรื่องความสัมพันธ์กับลูกค้า ไม่ตัดสินใจแทน
2. **จะปล่อยงานรอบนี้ขึ้น production กี่รอบ** — รวบเป็น deploy เดียวหลังจบ batch (ถูกกว่า/เสี่ยงน้อยกว่า) หรือทยอยขึ้นทีละ P1 เป็นเรื่องเวลา/ความเสี่ยงที่ผู้ใช้ควรเลือก **ถ้าไม่ตอบ จะรวบเป็น deploy เดียว**
3. **#22 MyISAM → InnoDB** งานนี้แตะ DB production จริงและเป็น destructive-ish (`ALTER TABLE`) ต้องมี go/no-go จากผู้ใช้ก่อน execute — รอบนี้จะทำแค่ **research + แผน** ไม่ execute เว้นแต่ผู้ใช้สั่ง

## Task List

### Batch 0 — เปิดทาง (ทำก่อนทุกอย่าง)

1. `docs/agents/external-cli-guardrails.md` — commit ไฟล์ guardrails (`docs(agents): ...`) เพื่อให้ทุก handoff อ้างอิงได้ | ผู้รับผิดชอบ: `nextjs-dev` (commit อย่างเดียว ไม่แก้เนื้อหา) | ✅ ขนานได้

### Batch A — P1 หน้าบ้าน (แก้โค้ด, ขนานกันได้ทั้งหมด)

2. `src/app/[locale]/about/page.tsx:96-101` + `src/messages/th.json` + `src/messages/en.json:80-86` — **#34**: ซ่อน stat ที่ค่าเป็น placeholder `—` หรือ `0` แทนการ render (ตาม default #4) ทั้ง `statsProjectsValue`/`statsCustomersValue` ที่มาจาก `getSiteStats()` และ key ที่เป็น placeholder ใน messages; ห้ามลบ key ทิ้งข้างเดียว TH/EN ต้องเคลื่อนพร้อมกัน | ผู้รับผิดชอบ: `nextjs-dev` | ✅ ขนานได้
3. `src/app/admin/(dashboard)/dashboard/` + `src/app/api/admin/leads/` — **#32/#36 ส่วน in-app**: badge/ตัวนับ "lead ใหม่ที่ยังไม่ถูกเปิด" ในแอดมิน (อ่านอย่างเดียว ไม่ใช่ mutation จึงไม่ต้อง `withAudit()` แต่ต้องมี authorization guard บน GET endpoint ตามที่ audit เคยชี้) | ผู้รับผิดชอบ: `nextjs-dev` | ✅ ขนานได้
4. CookieYes dashboard config (นอกโค้ด) + ยืนยันผลบน `/en` — **#38**: ผูกภาษาแบนเนอร์กับ locale ของหน้า (issue ระบุว่ามี MCP `mcp__cookieyes__*` ใช้ตรวจ/แก้ config ได้) ถ้า Free plan ไม่รองรับ multi-language ให้รายงานกลับเป็นข้อจำกัดพร้อมทางเลือก อย่าฝืนเขียนโค้ด workaround เอง | ผู้รับผิดชอบ: `nextjs-dev` (ถือ MCP) | ✅ ขนานได้

### Batch B — P2 ที่แก้ได้เลย (ขนานได้ทั้งหมด, เหมาะกับ external CLI)

5. `src/app/[locale]/portfolio/` + hero copy ใน `src/messages/{th,en}.json` — **#37 interim**: ปรับคำโฆษณาให้ตรงผลงานจริง 2 ชิ้น และซ่อน filter chip ("เชิงพาณิชย์"/"อุตสาหกรรม") ที่กดแล้วว่างเปล่า | ผู้รับผิดชอบ: `ux-ui-expert` (ตัดสิน copy/behavior, read-only) → `nextjs-dev` (implement) | ⏳ #5a→#5b ภายในตัวเอง, ขนานกับงานอื่นได้
6. `src/app/[locale]/packages/page.tsx` — เพิ่ม empty state เมื่อไม่มีแพ็กเกจ published (ให้สอดคล้องกับ portfolio/testimonials) พร้อม key TH/EN คู่กัน | ผู้รับผิดชอบ: **`cursor-agent`** (แก้เล็ก หลายไฟล์ แต่ diff review ง่าย — เหมาะเป็นงานพิสูจน์ pipeline external CLI) → `nextjs-dev` ตรวจรับ | ✅ ขนานได้
7. `src/app/[locale]/not-found.tsx:8` — เปลี่ยน `py-24` ให้เข้าคู่ `py-16`/`py-14` ตาม ADR 0005 (P3 แต่ถูกมาก รวมมาใน batch นี้) | ผู้รับผิดชอบ: **`cursor-agent`** (mechanical ล้วน) → `nextjs-dev` ตรวจรับ | ✅ ขนานได้
8. `src/app/[locale]/testimonials/page.tsx:29-32` — **ตัดสินก่อนแก้**: หน้านี้ 404 เมื่อไม่มีรีวิว published ทำให้เว็บไม่มี social proof เลย ให้ประเมินว่าควรเปลี่ยนเป็น empty state, ซ่อนลิงก์ในเมนู, หรือคงพฤติกรรมเดิม (มันเป็น bonus นอก spec) | ผู้รับผิดชอบ: `ux-ui-expert` (ตัดสิน) → `nextjs-dev` (ถ้าเปลี่ยน) | ✅ ขนานได้

### Batch C — Research / second opinion (read-only, ขนานได้ทั้งหมด, ส่งออก external CLI)

9. **#22 MyISAM vs InnoDB** — วิเคราะห์ผลกระทบต่อ `withAudit()` (`src/lib/audit.ts` ใช้ `$transaction`), หาสาเหตุว่าทำไม 12 ตารางเป็น MyISAM (host default หรือ `migrate-sqlite-to-mysql.mts`), ประเมินความเสี่ยง `ALTER TABLE ... ENGINE=InnoDB` เทียบ error 1071 key-length ที่เคยเจอ, เสนอจุดยืนย้าย/ไม่ย้ายพร้อมเหตุผล **ห้าม execute อะไรกับ DB** | ผู้รับผิดชอบ: **`codex`** (งานสืบสวนเชิงลึกที่ได้ประโยชน์จาก context อิสระ ไม่แตะโค้ด) → `pm-expert` สรุปเป็นข้อเสนอให้ผู้ใช้ go/no-go | ✅ ขนานได้
10. **#25 GA4 บน Next 16** — ตอบว่า `@next/third-parties/google` กับการวาง script เอง อันไหนเหมาะกับ App Router + two-root-layout ของ repo นี้, วิธี gate ด้วย CookieYes ให้ไม่ยิงก่อน consent, และวิธี exclude `/admin` ออกจาก tracking ต้องอ้าง `node_modules/next/dist/docs/` ไม่ใช่ความจำ | ผู้รับผิดชอบ: **`antigravity`** (ask-only เหมาะกับคำถามออกแบบที่ยังไม่ต้องแก้โค้ด) → `nextjs-dev` implement ในรอบถัดไปเมื่อได้ Measurement ID | ✅ ขนานได้
11. **#27 Google Maps iframe ตั้งคุกกี้ก่อน consent** — ยืนยันว่า CookieYes Free plan auto-block iframe ได้จริงไหม, หน้าตาตอนถูกบล็อกเป็นอย่างไร, ถ้าไม่ได้ให้เสนอ click-to-load placeholder ที่ `src/app/[locale]/contact/page.tsx:93` พร้อม copy TH/EN | ผู้รับผิดชอบ: **`antigravity`** (research) → `ux-ui-expert` ตัดสินหน้าตา placeholder | ✅ ขนานได้
12. **P2 ตัวเลขเริ่มต้นเครื่องคำนวณดูเกินจริง** (ลด ~96%, 3,500→125 บาท) — ทวนสูตร/ค่า default เทียบ reference Excel และ `scripts/verify-calculator.mts` ว่าเป็นบั๊กหรือเป็นผลของ default input ที่ไม่สมจริง | ผู้รับผิดชอบ: **`codex`** (งานทวนตัวเลขล้วน ๆ วัดผลถูก/ผิดได้ชัด เหมาะกับ second opinion อิสระ) → `nextjs-dev` ถ้าต้องแก้ | ✅ ขนานได้
13. **#21 sourceChannelId หายเงียบ** — ยืนยันว่า `8ff2797 feat(booking): fall back to ref code in referrer field when no executive matches` ปิดเคสนี้แล้วหรือยัง ถ้าปิดแล้วให้เสนอปิด issue พร้อมหลักฐาน commit/ไฟล์ | ผู้รับผิดชอบ: `Explore` | ✅ ขนานได้

### Batch D — Ops / เอกสาร (ขนานได้)

14. `firebase.json` (root) — ยังค้างอยู่ทั้งที่ deploy target จริงคือ DirectAdmin shared hosting (issue #40 ปิดไปโดยลบแค่ `Dockerfile`+`fly.toml`) ให้ตรวจว่ายังมีอะไรอ้างถึงไหม แล้วเสนอ ลบ/archive/ติดป้ายเตือน | ผู้รับผิดชอบ: `deploy-verify` (read-only) → `nextjs-dev` ถ้าลบ | ✅ ขนานได้
15. DirectAdmin panel — ยืนยันว่ามี cron job รัน `scripts/backup-db.mts` จริงไหม (script พร้อมแล้ว แต่ไม่เคยยืนยันว่าติดตั้ง) ใช้ credential จาก `.env.hosting-panel` | ผู้รับผิดชอบ: `hosting-deploy-specialist` | ✅ ขนานได้
16. `prisma/schema.prisma` (`province`) — **สืบก่อน ไม่แก้**: ประเมินว่าควรเพิ่มคอลัมน์คู่ `provinceTh`/`provinceEn` ตามกติกา TH/EN หรือใช้ mapping table ของจังหวัดแทน migration (กระทบ 3 จุดใน schema + ฟอร์ม + export) | ผู้รับผิดชอบ: `Explore` → `pm-expert` วางแผน migration แยกเป็นงานของตัวเอง | ✅ ขนานได้

### Batch E — ตรวจรับ (⏳ รอ Batch A+B เสร็จทั้งหมด)

17. `src/messages/th.json` + `en.json` — key parity หลังการแก้ทั้งหมดใน Batch A+B | ผู้รับผิดชอบ: `i18n-parity-checker` | ⏳ รอ #2,#5,#6,#8
18. `src/actions/` + GET `/api/admin/*` ที่ถูกแตะใน #3 — ยืนยัน authorization guard ครบ, ไม่มี secret รั่วเข้า snapshot | ผู้รับผิดชอบ: `audit-compliance-reviewer` (ต้องไม่ใช่ตัวที่เขียนโค้ด) | ⏳ รอ #3
19. **Verify** ตาม `.claude/skills/verify/SKILL.md`: `npm run build` → `npm run start` → `npx tsx scripts/e2e-booking.mts` + `npx tsx scripts/e2e-admin-crud.mts` + `npx tsx scripts/verify-calculator.mts` (ถ้า #12 แตะสูตร) และเปิดดูจริง `/th/about` `/en/about` `/th/portfolio` `/en/portfolio` `/th/packages` `/en/packages` | ผู้รับผิดชอบ: `nextjs-dev` | ⏳ รอ #17,#18
20. **Design + business review บน render จริง** — ทุกหน้าที่ถูกแตะ ทั้ง desktop + mobile ทั้ง `/th` และ `/en` โดยเฉพาะ About หลังซ่อน stats (ยังดูน่าเชื่อถือไหม) และ portfolio หลังแก้ copy | ผู้รับผิดชอบ: `design-business-reviewer` (opus) | ⏳ รอ #19 — **ปิดท้ายเสมอ ไม่ optional**
21. **Deploy**: อ่าน `docs/plans/kkd-shared-hosting-redeploy-runbook.md` ให้จบก่อน แล้ว deploy ปิดด้วย `npx tsx scripts/smoke-test-production.mts` | ผู้รับผิดชอบ: `hosting-deploy-specialist` | ⏳ รอ #20 + ผู้ใช้อนุมัติ (คำถามข้อ 2)

## กติกาบังคับสำหรับงานที่ส่งออก external CLI (#6, #7, #9, #10, #11, #12)

- แนบเนื้อหา `docs/agents/external-cli-guardrails.md` เข้าไปใน brief ทุกครั้งที่เป็น write-mode (#6, #7)
- ย้ำในทุก brief: repo นี้เป็น **Next.js 16** — `src/proxy.ts` ไม่ใช่ `middleware.ts` ที่พิมพ์ผิด, Prisma 7 config อยู่ที่ `prisma.config.ts`, `TabsContent keepMounted` และ `noValidate` เป็นของตั้งใจ
- งาน read-only (#9-#12) ต้องสั่งชัดว่า **ห้ามแก้ไฟล์ ห้ามแตะ DB** ส่งกลับเป็น finding/ข้อเสนอเท่านั้น
- ก่อนนับว่าเสร็จ: Claude อ่านทุกไฟล์ที่ CLI อ้างว่าแก้ + `npx tsc --noEmit` + verify skill
- ถ้า output ของ CLI ขัดกับ AGENTS.md ให้ทิ้งแล้วให้ `nextjs-dev` ทำใหม่ อย่าพยายามซ่อมของที่ผิด convention

## เสนอต่อผู้ใช้ (ยังไม่ทำ)

- **เสนอปิด #24** — UTM capture ทำครบและ deploy แล้ว (`c541214`, `53b4d79`, `ce93bd3`)
- **เสนอ label**: #34 → `ready-for-agent` (ทำครึ่งที่ไม่รอลูกค้าได้แล้ว), #37 → `ready-for-agent` (interim copy fix), #36 → `ready-for-agent` เฉพาะส่วน in-app badge, #22 → `ready-for-human` (ต้อง go/no-go ก่อน ALTER), #27 → `needs-info` จนกว่าจะรู้ว่า CookieYes Free บล็อก iframe ได้ไหม
- **issue ใหม่ที่ควรเปิด**: (1) `/testimonials` 404 = ไม่มี social proof, (2) `province` ไม่มีคู่ EN, (3) `firebase.json` ค้างจาก deploy target เก่า, (4) ยืนยัน cron backup บน DirectAdmin

## Out of scope

- **ไม่ execute `ALTER TABLE` บน production** ในรอบนี้ — #22 ทำแค่ research (ดูคำถามข้อ 3)
- **ไม่ implement GA4 จนกว่าจะมี Measurement ID จริง** — #25 รอบนี้ได้แค่ผลวิจัยการออกแบบ
- **ไม่ทำ i18n ฝั่ง admin** — ตั้งใจให้เป็นภาษาไทยอย่างเดียว (decision #10)
- **ไม่ migrate refCode เก่า CH015-CH019** — known intentional gap
- **ไม่ refactor ข้างเคียงระหว่างแก้ P2/P3** — `AGENTS.md` สั่ง surgical changes; padding cleanup จำกัดที่ `not-found.tsx` จุดเดียวเท่านั้น
- **ไม่ทำ performance/Lighthouse และ WCAG audit** — แยกงานตามที่ audit เดิมระบุ
