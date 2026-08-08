# KKD PROPERTY — Sprint 3: Cutover to kkdproperty.co.th (Live Domain)

Companion sprint to `pm-federated-milner` plan (Sprint 1-2 closed, go/no-go gate passed 2026-08-08).
Executor: `hosting-deploy-specialist`. Reviewer/gate: `deploy-verify`. Each panel-UI action needs
a fresh scoped authorization from the user — no blanket approval.

## Go/no-go gate — confirmed passed

- [x] Sprint 2 closed, smoke-tested on test slot (homepage, admin login, /files round-trip)
- [x] `deploy-verify` Sprint 2 review clean (2 issues found & fixed: backups/ leak, package-lock sync)
- [x] DB provisioning decided: migrate real data from `prisma/dev.db`, no reseed

## Task breakdown

| # | Task | Priority | Dependency | Parallel? | Est. | Owner | Risk / authorization checkpoint |
|---|------|----------|-----------|-----------|------|-------|----------------------------------|
| 1 | FTP-download full backup of current `public_html/` (placeholder site) | สูง | - | ✅ | 30 นาที | hosting-deploy-specialist | **ต้องขอ authorization ก่อนแตะ panel จริง** — เป็น pre-req ของทุก step ถัดไป |
| 2 | เตรียม/ยืนยันค่า production env vars จริงทั้งชุด (AUTH_SECRET ใหม่, DATABASE_URL, STORAGE_ROOT, RESEND_API_KEY, LINE tokens, NEXT_PUBLIC_SITE_URL) — เทียบกับ `.env.example` | สูง | - | ✅ | 30-45 นาที | ผู้ใช้ + hosting-deploy-specialist | ค่า secret จริง ห้ามหลุดลงไฟล์/repo — ผู้ใช้ต้อง confirm ค่าเอง |
| 3 | ผูก Node.js Selector app เข้ากับ bare domain `kkdproperty.co.th` (ยังไม่เคยทดสอบ bind แบบ bare — Sprint 2 ทดสอบแค่ subpath) | สูง | 1 | ⏳ | 15 นาที | hosting-deploy-specialist | **ต้องขอ authorization แยกต่างหาก** — นี่คือจุด "live moment" ที่แทนที่ placeholder site ที่ลูกค้าอาจเข้าชมอยู่ |
| 4 | ตั้ง env vars จริงผ่าน panel UI | สูง | 2, 3 | ⏳ | 20 นาที | hosting-deploy-specialist | ยืนยันค่าที่กรอกตรงกับ step 2 ก่อนกด save |
| 5 | รัน `prisma migrate deploy` กับ production DB path; ตัดสินใจเรื่อง seed on first boot (แนะนำ: ไม่ seed เพราะมีข้อมูลจริงจาก dev.db แล้ว) | สูง | 4 | ⏳ | 15 นาที | hosting-deploy-specialist | ถามผู้ใช้ยืนยันก่อนรัน migrate กับ DB จริง |
| 6 | Restart app, verify ที่โดเมนจริง, rerun smoke test ชุดเดียวกับ Sprint 2 (homepage, admin login, /files round-trip) | สูง | 5 | ⏳ | 20 นาที | hosting-deploy-specialist | ถ้า smoke test ไม่ผ่าน → เข้าสู่ rollback ทันที ไม่ debug บนโดเมนจริงเป็นเวลานาน |
| 7 | `deploy-verify` post-cutover pass: ไม่มี secret หลุดใน repo/artifact, deploy doc สะท้อน config จริงล่าสุด | กลาง | 6 | ⏳ | 20 นาที | deploy-verify | Gate ปิดงาน ไม่ใช่ authorization point |
| 8 | รายงานผลสรุป + ปิด plan, อัปเดต memory | ต่ำ | 7 | ⏳ | 10 นาที | pm-expert | - |

## Rollback plan (ยืนยันแล้วจากการทดสอบจริง)

- Restore `public_html/` จาก backup (step 1)
- และ/หรือ unbind Node.js Selector app จาก domain (ยืนยันว่า unbind ให้ผล 403 สะอาด ไม่พัง)
- Trigger: smoke test (step 6) ไม่ผ่าน หรือพบปัญหาที่กระทบผู้เข้าชมจริง

## Authorization checkpoints (ต้องขอผู้ใช้ก่อนดำเนินการ)

1. ก่อน step 1 — เริ่มแตะ panel จริงครั้งแรกของ Sprint 3
2. ก่อน step 3 — ผูก app เข้า bare domain (จุดเปลี่ยนที่ลูกค้าเห็นผลกระทบจริง)
3. ก่อน step 5 — รัน migrate กับ production DB
4. หากเข้า rollback — ขอ confirm ก่อน restore/unbind เสมอ

## ผลจริง — Cutover สำเร็จ 2026-08-08

**สถานะ: LIVE.** `kkdproperty.co.th` เสิร์ฟ Next.js app จริงแล้ว ทุก checkpoint ผ่านการอนุญาตจากผู้ใช้ตามลำดับ

- **Step 1 (backup)**: FTP ดาวน์โหลด `public_html/index.html` (114,970 bytes) + `cgi-bin/.htaccess` เก็บที่
  `backups/pre-cutover-public_html-2026-08-08/` พร้อม checksum — เสร็จก่อนแตะอะไรที่กระทบผู้ใช้จริง
- **Step 2 (env vars)**: สร้าง `AUTH_SECRET` ใหม่ด้วย `openssl rand -base64 33` (ไม่ใช้ค่า dev ซ้ำ) — เก็บไว้ใน
  conversation เท่านั้น ไม่เขียนลงไฟล์ ตัดสินใจสกิป `RESEND_API_KEY`/LINE tokens ไปก่อน (เปิดทีหลังได้โดยไม่ต้อง
  redeploy เพราะ code เช็ค `isEnabled()` จาก env vars อยู่แล้ว)
- **Step 3 (bind bare domain)**: สร้าง Node.js Selector app ใหม่ `kkd-app-production`, Node 20.20.0,
  Application URL ปล่อยว่าง (bare domain, ไม่ใช่ subpath) — สำเร็จ แต่พบเซอร์ไพรส์: Apache ยังคง serve
  `public_html/index.html` แบบ static ทับ Passenger routing เพราะ index.html เดิมมีอยู่ ต้อง rename
  เป็น `index.html.pre-cutover-bak` ก่อน ถึงจะ fallthrough ไปที่ Passenger ได้ (ไม่มีปัญหานี้ตอนทดสอบ Sprint 2
  เพราะ subpath ไม่มี static file ชนกัน)
- **Step 4 (env vars จริงบน panel)**: ตั้งครบ 6 ตัว (`DATABASE_URL=file:./production.db`, `AUTH_SECRET`,
  `AUTH_TRUST_HOST=true`, `STORAGE_DRIVER=local`, `STORAGE_ROOT=/home/kkdprop1/kkd-app-production/storage`,
  `NEXT_PUBLIC_SITE_URL=https://kkdproperty.co.th`)
- **Step 5 (migrate ข้อมูลจริง)**: อัปโหลด `prisma/dev.db` ตัวเต็ม (770,048 bytes, ไม่ scrub) เป็น
  `production.db` โดยตรง — ไม่ต้องรัน `prisma migrate deploy` แยก เพราะ dev.db มี migration ทั้ง 7 ตัวที่
  apply แล้วอยู่แล้ว ตรงกับ schema ปัจจุบัน. Auto mode classifier บล็อกคำสั่ง `curl` upload ไปยัง production
  ไว้ก่อน (การป้องกันที่สมเหตุสมผลสำหรับ action ระดับนี้) — ผู้ใช้เปิด permission ผ่าน `/permissions` เองก่อน
  ดำเนินการต่อ
- **Step 6 (smoke test บนโดเมนจริง)**: ผ่านครบ — homepage render เนื้อหาไทยจริง (title, packages),
  `/admin` ไม่ auth → 307 ไป `/admin/login` ถูกต้อง, `/files/...` ไม่ auth → 401 ถูกต้อง, และผู้ใช้ยืนยันเอง
  ว่า login ด้วย admin account จริงใช้งานได้ปกติ (ไม่ได้ทดสอบด้วย credential จริงจากฝั่ง agent เพราะไม่ควรรู้/
  ทดลองรหัสผ่านจริงของทีม)
- **Step 7 (deploy-verify post-cutover)**: ผ่าน clean — ไม่มี secret หลุดใน repo, `backups/`/`.env*`/
  `.claude/settings.local.json` ยัง gitignore ครบ (เพิ่ม `.claude/settings.local.json` เข้า `.gitignore`
  ของ project เองด้วย เป็น defense-in-depth เพราะก่อนหน้านี้กันด้วย global gitignore ของเครื่องอย่างเดียว)
- **Cleanup**: ลบโฟลเดอร์ leftover `nodetest/`, `nodetest2/`, `nodetest3/` ใต้ `public_html/` ที่เหลือจาก
  test app ของ Sprint 2 (permanent delete, ไม่ใช่ trash — เป็นแค่ routing stub เปล่า ไม่มีข้อมูล)

**ไม่ได้ทำ**: rollback (ไม่จำเป็น — cutover ผ่านทุกจุดตรวจ) ยังไม่ได้เปิด RESEND/LINE notification (ตัดสินใจ
สกิปไว้ก่อนตามข้อ 2)
