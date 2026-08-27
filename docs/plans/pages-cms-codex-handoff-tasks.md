# Pages CMS — Codex hand-off continuation tasks

Date: 2026-08-25 (hand-off เกิดขึ้นเพราะ Codex ชน usage limit ระหว่างเตรียม Sprint 2)

อ้างอิง:

- [`pages-cms-implementation-sprints.md`](pages-cms-implementation-sprints.md) — แผนแม่ 12 sprint (Sprint 1 = เสร็จ, Sprint 2 = ถัดไป)
- [`pages-cms-innodb-conversion-runbook.md`](pages-cms-innodb-conversion-runbook.md) — Gate A–E, ยัง **ไม่ authorized** ให้รันบน production
- [`myisam-innodb-atomicity-investigation.md`](myisam-innodb-atomicity-investigation.md) — SQL ของ Gate A (บรรทัด 254–284)
- [`pages-cms-live-verification-matrix.md`](pages-cms-live-verification-matrix.md) — เกณฑ์หลักฐาน
- [`kkd-shared-hosting-redeploy-runbook.md`](kkd-shared-hosting-redeploy-runbook.md) — บังคับอ่านก่อน deploy ทุกครั้ง
- หลักฐาน Sprint 1: `docs/plans/assets/pages-cms-result/s01-engine-readiness/manifest.md`

ข้อเท็จจริงที่ห้ามแก้ (quote จาก Sprint 1 manifest / runbook):

> "No Pages CMS write is enabled until production InnoDB, Foreign Keys, backup, restore, and forced-rollback evidence are green."

> "Next checkpoint is approval for Sprint 2 **read-only production inventory only**. It does not authorize maintenance activation, DDL, restore, deploy, FTP, or production content mutation."

> Deterministic rehearsal signature: `9ebedff82dd842c42e88d3217f394a1e1c8e1d25829d1001112d981cf8f3b7bc`
> (`TABLE_COUNT=16`, `FOREIGN_KEY_COUNT=11`, `MYISAM_GATE=RED`, `INNODB_GATE=GREEN`, `RESTORE_ROLLBACK=PASS`)

---

## สถานะปัจจุบัน (ยืนยันจาก git + ไฟล์จริง ไม่ใช่จากความจำ)

| รายการ | สถานะ | หลักฐาน |
|---|---|---|
| Sprint 1 — engine safety tooling + rehearsal | 🟢 เสร็จ + review ปิดครบ | 8 commits `c262dfa`…`d333128` (25 ส.ค. 21:16–21:34), manifest + 4 screenshots |
| Sprint 2 — production InnoDB gate | 🔴 ยังไม่เริ่ม — **บล็อกที่ owner approval** | runbook Gate A ระบุ "ต้องมี approval แยก" |
| Sprint 3–12 | ⬜ ยังไม่เริ่ม ตามลำดับ dependency | แผนแม่ |
| Gate C (production backup path) | 🟡 **ยังเป็นช่องโหว่ที่รู้อยู่** — host รัน `tsx` ไม่ได้ | runbook Gate C: "Do not claim this gate is executable on production until that path is proved" |
| งานที่ Codex ทำค้างกลางคัน | 🟡 `.tmp-inspect-pma-sso.mts` (untracked) — กำลังหยั่ง DirectAdmin → phpMyAdmin SSO เพื่อหาเส้นทางรัน Gate A/C | ไฟล์อยู่ที่ repo root ไม่ได้ commit |
| `scripts/verify-all.mts` | 🔴 แดงอยู่ก่อนถึง build | `verify-enums.mts` ฟ้อง `READ_ONLY_LEAD_ROLES` ที่ `src/app/admin/(dashboard)/admin-sidebar.tsx:120` — pre-existing ไม่ใช่ของ Sprint 1 |
| Git | 🟡 ahead `origin/main` **19 commits** ยังไม่ push | `git rev-list --count origin/main..HEAD` |
| Repo hygiene | 🟡 untracked: `.agents/`, `.claude/skills/*` 13 โฟลเดอร์, `skills-lock.json`, `.tmp-inspect-pma-sso.mts` | `git status` |

**สรุปหนึ่งประโยค:** Codex ส่งมอบ Sprint 1 ครบถ้วนพร้อม before/after summary แล้ว งานที่ถูกตัดกลางคือ *การหาเส้นทางรัน Gate A/Gate C บน shared hosting ที่ไม่มี SSH* ซึ่งไม่ใช่ code แต่เป็น host investigation

---

## Default ที่ตัดสินใจแล้ว (ไม่ block ถามผู้ใช้)

1. **ไม่แตะ Sprint 3+ ก่อน Sprint 2 เขียว** — แผนแม่ระบุชัดว่า engine conversion กับ Pages DDL ห้ามอยู่ใน rollback boundary เดียวกัน การเริ่ม schema ล่วงหน้าเพื่อ "ประหยัดเวลา" จะทำลาย boundary นั้น
2. **แก้ `verify-enums` finding เป็น commit แยก `fix(admin)`** ไม่ผูกกับ pages-cms — เป็นหนี้เก่าที่บังเอิญโผล่ตอน Sprint 1 และ Sprint 11 บังคับให้ `verify-all.mts` เขียวทั้งท่อ ปล่อยไว้จะเป็นตัวบล็อกตอนท้ายที่แพงกว่า
3. **`.tmp-inspect-pma-sso.mts` ไม่ commit ในรูปแบบปัจจุบัน** — มันอ่าน `HOSTING_PANEL_PASSWORD` จาก env และ log path ของ panel ถ้าเส้นทาง SSO ใช้ได้จริง ให้ `hosting-deploy-specialist` แปลงเป็น script ถาวรใต้ `scripts/` ที่ output เฉพาะค่า aggregate (ตามมาตรฐาน sanitization ของ Sprint 1) ถ้าใช้ไม่ได้ให้ลบทิ้ง
4. **`.agents/`, `.claude/skills/*`, `skills-lock.json` → เสนอใส่ `.gitignore`** เพราะเป็น artifact ที่ tool จัดการเอง ไม่ใช่ source ของโปรเจกต์ (ค้านได้ถ้าอยากให้ skills เป็นของ versioned)
5. **Gate B (`.htaccess` + maintenance page) ต้องผ่าน `deploy-verify` ก่อนแตะ host จริง** — แผนแม่ยอมรับเองว่า LiteSpeed semantics ยัง "unproved" การรีวิว block ที่จะ append ล่วงหน้าถูกกว่าการ debug ตอนเว็บ 503 อยู่
6. **Push 19 commits ขึ้น `origin/main` ก่อนเริ่ม Sprint 2** — หลักฐาน Sprint 1 ต้องอยู่บน remote ก่อนมีการแตะ production ไม่งั้น rollback point อยู่แค่เครื่องเดียว

---

## คำถามที่ต้องผู้ใช้ตอบก่อนเริ่ม Sprint 2

1. **อนุมัติ Gate A (read-only production inventory) หรือยัง?** — อ่านอย่างเดียว ไม่มี `ALTER` ไม่มี backup ไม่มี restart ถ้าไม่อนุมัติ ทั้งสาย Sprint 2–12 หยุดที่นี่
2. **หน้าต่าง maintenance เอาวันไหน เวลาไหน?** — Gate B–E ต้องปิดเว็บ 503 ทั้งไซต์ (public form POST + admin write) runbook ยังใส่ค่า placeholder `Wed, 26 Aug 2026 03:00:00 GMT` อยู่ ต้องได้เวลาจริงก่อน แนะนำเลือกช่วงที่ lead เข้าน้อยที่สุด
3. **Gate C จะใช้เส้นทางไหน?** — host รัน `tsx` ตรงไม่ได้ มีสองทาง เลือกได้ทางเดียว:
   - (ก) **temporary secret-gated backup route** — ได้ `schema-metadata.json` + dump hash ครบตามที่ `restore-db.mts` ต้องการ แต่ต้อง deploy เพิ่ม 2 รอบ (ใส่ + ถอด) และเปิด endpoint ชั่วคราวบน production
   - (ข) **panel-native export (phpMyAdmin/DirectAdmin)** — ไม่ต้อง deploy แต่ต้องพิสูจน์ว่า output เทียบเท่า metadata ที่ restore verifier ยอมรับ ไม่งั้น restore จะปฏิเสธ snapshot ตอนฉุกเฉิน
   
   ผมไม่ตัดสินใจข้อนี้แทน เพราะ (ก) เพิ่ม attack surface บน production ส่วน (ข) เสี่ยงได้ backup ที่กู้ไม่ได้จริง — เป็นการแลกความเสี่ยงที่เจ้าของต้องเลือกเอง

---

## Task List

### A. งานที่ทำได้ทันที ไม่ต้องรอ approval (ขนานกันได้ทั้งหมด)

1. `src/app/admin/(dashboard)/admin-sidebar.tsx:120` — ย้าย `READ_ONLY_LEAD_ROLES` ออกจากการประกาศ inline ให้ผ่าน `scripts/verify-enums.mts` (ดู pattern ที่ verifier ยอมรับก่อนแก้ อย่าเดา) แล้วรัน `npx tsx scripts/verify-all.mts` ให้เขียวทั้งท่อ | ผู้รับผิดชอบ: `nextjs-dev` | ✅ ขนานได้
2. `.gitignore` — เพิ่ม `.agents/`, `.claude/skills/`, `skills-lock.json`, `.tmp-inspect-*.mts` (ถ้าผู้ใช้เห็นด้วยกับ default ข้อ 4) | ผู้รับผิดชอบ: `nextjs-dev` | ✅ ขนานได้
3. `deploy/maintenance/pages-cms-maintenance.html` + บล็อก `.htaccess` ใน `pages-cms-innodb-conversion-runbook.md` (บรรทัด 77–88) — รีวิวว่า `ErrorDocument 503` + `RewriteRule ^ - [R=503,L]` จะ intercept **ทุก method ก่อนถึง Passenger** จริงบน LiteSpeed และไม่ทับ CloudLinux-managed block / canonical-host block ที่มีอยู่ | ผู้รับผิดชอบ: `deploy-verify` | ✅ ขนานได้
4. `git push origin main` (19 commits) | ผู้รับผิดชอบ: **ผู้ใช้** (agent ไม่ push แทน) | ✅ ขนานได้

### B. งานที่ปลดล็อก Gate C — ต้องทำก่อนขอ maintenance window

5. สืบเส้นทางรัน Gate A/C บน host จริง (ต่อจาก `.tmp-inspect-pma-sso.mts` ที่ Codex ทำค้าง): DirectAdmin `CMD_PHPMYADMIN` SSO ใช้ได้ไหม, มี SQL tab ไหม, export ของ panel ให้ engine/row-count/index metadata ครบพอให้ `scripts/restore-db.mts` ยอมรับหรือไม่, พื้นที่ว่างพอทำ InnoDB conversion 16 ตารางไหม | ผู้รับผิดชอบ: `hosting-deploy-specialist` | ⏳ รอคำตอบข้อ 3 ในหมวดคำถาม (ตัวสืบเป็น read-only ทำก่อนได้ แต่ข้อสรุปต้องผู้ใช้เลือกทาง)
6. `scripts/restore-db.mts` — ระบุให้ชัดว่า verifier ต้องการ field ใดใน `schema-metadata.json` บ้าง เพื่อเป็น checklist เทียบกับ panel export (อ่านอย่างเดียว ยังไม่แก้โค้ด) | ผู้รับผิดชอบ: `hosting-deploy-specialist` | ✅ ขนานได้กับ #5

### C. Sprint 2 จริง — เริ่มเมื่อ owner อนุมัติเท่านั้น

7. Gate A — รัน inventory read-only ตาม SQL ใน `myisam-innodb-atomicity-investigation.md:259–282` เก็บเฉพาะ aggregate (server version, default engine, `SHOW ENGINES`, 16 ตาราง + engine + size, 11 constraint, 11 orphan count) ห้ามมีแถวข้อมูลลูกค้า | ผู้รับผิดชอบ: `hosting-deploy-specialist` | ⏳ รอ approval ข้อ 1
8. Gate B — อัปโหลด maintenance page + append `.htaccess` แล้วพิสูจน์ว่า GET / public POST / admin POST / `/api` / `/files` ได้ 503 ทั้งหมด และ row count ไม่ขยับหลัง test POST | ผู้รับผิดชอบ: `hosting-deploy-specialist` | ⏳ รอ #3, #7 และ approval maintenance window
9. Gate C — backup + ดาวน์โหลด off-host + พิสูจน์ restore เข้า clone ก่อนแตะ DDL | ผู้รับผิดชอบ: `hosting-deploy-specialist` | ⏳ รอ #5, #8
10. Gate D — `ALTER TABLE ... ENGINE=InnoDB` ทีละตาราง ตามลำดับ 16 บรรทัดใน runbook แล้วเติม 11 FK จาก `prisma/migrations/20260809100858_init_mysql/migration.sql:223–253` **เฉพาะเมื่อ orphan = 0 ทุกตัว** | ผู้รับผิดชอบ: `hosting-deploy-specialist` | ⏳ รอ #9 + approval แยกต่อ batch
11. Gate E — `ENGINE_GATE=GREEN`, re-check counts/hashes/orphans, test mutation + ตรวจ Audit Log ใน admin UI แล้วค่อยปลด maintenance | ผู้รับผิดชอบ: `hosting-deploy-specialist` | ⏳ รอ #10
12. เขียนหลักฐาน `docs/plans/assets/pages-cms-result/s02-production-innodb/manifest.md` (before + after summary ตาม protocol แผนแม่) + `npx tsx scripts/smoke-test-production.mts` | ผู้รับผิดชอบ: `hosting-deploy-specialist` | ⏳ รอ #11

### D. Verify ก่อนปิดแต่ละก้อน

13. Verify หมวด A: `npx tsx scripts/verify-all.mts` เขียวทั้งท่อ (รวม build), `npm run build && npm run start`, เปิด `/th` และ `/en` ของทั้ง 6 หน้า ตาม `.claude/skills/verify/SKILL.md` — build ผ่านอย่างเดียวไม่นับ | ผู้รับผิดชอบ: `nextjs-dev` | ⏳ รอ #1, #2
14. Verify หมวด C: read-only smoke ตาม `pages-cms-live-verification-matrix.md` — public TH/EN 200 ทุก route, login guard + private file 401 ไม่เปลี่ยน, admin อ่านได้ | ผู้รับผิดชอบ: `hosting-deploy-specialist` | ⏳ รอ #11

---

## Out of scope

- **Sprint 3–12 ทุกอย่าง** (Pages schema, registry, admin shell, cutover ทีละหน้า) — ห้ามเริ่มก่อน Sprint 2 เขียว ตาม non-negotiable rule ของแผนแม่
- **GitHub issue ที่เปิดค้าง 12 ใบ** (#38 cookie banner TH บนหน้า /en, #37 portfolio, #36/#32 lead notification, #34 About ตัวเลขขัดกัน ฯลฯ) — คนละสายงานกับ pages-cms ถ้าจะทำต้องเป็น sprint แยก ไม่แทรกระหว่าง maintenance window
- **แปลง production กลับเป็น MyISAM เป็น rollback ปกติ** — runbook ห้ามไว้ชัดเจน ตารางที่แปลงแล้วถือว่า valid
- **`--with-storage` ตอน restore** — เป็น approval คนละใบ ห้ามอนุมานจากการอนุมัติ restore ฐานข้อมูล
- **refactor `admin-sidebar.tsx` เกินจุดที่ verifier ฟ้อง** — surgical changes ตาม AGENTS.md
