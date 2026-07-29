# KKD Production Host Mapping — Scope & Task Breakdown

Status: **SUPERSEDED — สมมติฐาน VPS ดิบผิด, แผนนี้ไม่ใช้แล้ว**

**อัปเดต (2026-07-29):** สมมติฐานที่ว่า `27.254.62.185` เป็น VPS ดิบ (self-host ด้วย Docker/PM2) **ผิด** — ยืนยันจาก screenshot จริงที่ผู้ใช้ส่งมาว่าเป็น **DirectAdmin control panel แบบ shared hosting** (HostNeverDie แพ็กเกจ SH-Flash-1, `ssh=OFF`, `git=OFF`) รัน Docker ไม่ได้เลยตามที่เป็นอยู่ งาน Docker/docker-compose/provisioning guide ในแผนนี้ (task #1-3) **ถูกยกเลิกทั้งหมดกลางทาง ไม่ใช่แค่ pause** — ไฟล์ที่เริ่มทำไป (`docker-compose.yml`) ถูก revert ทิ้งแล้ว ไม่มีการ commit ใดๆ

แผน deploy ที่ใช้จริงตอนนี้คือ CloudLinux Node.js Selector ผ่านเว็บพาเนล — ดูรายละเอียดที่ `docs/plans/kkd-shared-hosting-deploy-guide.md` (งานแยกต่างหาก ไม่ใช่ scope ของแผนนี้อีกต่อไป)

Sprint 8-9 (backup script + final verification) ที่ระบุไว้ในแผนนี้ว่าทำขนานกับงาน deploy — **ทำเสร็จแล้วเป็นอิสระจากการยกเลิก Docker** (ไม่เกี่ยวกับรูปแบบ hosting) ดูผลที่ `docs/plans/kkd-spec-remediation.md` (Sprint 8/9)

## บริบท (คำตอบยืนยันจากผู้ใช้)

1. IP `27.254.62.185` = **VPS ดิบ** ต้อง self-host เอง (Docker/PM2 เอง) — **ยืนยันเป็น production host จริง** แทนแผนเดิม Fly.io/Firebase
2. "Map host" = **DNS A record จริงที่ registrar** ของ `kkdproperty.co.th` และ `www` (ไม่ใช่แค่ dev-only `/etc/hosts`)
3. Server ปลายทางเป็น **เครื่องเปล่า** — ไม่มี Docker/env/database/STORAGE_ROOT ใด ๆ อยู่ก่อน ต้อง provision จากศูนย์
4. Sprint 8-9 (backup script + final verification) กับงาน deploy จริง ให้ทำ **ขนานกัน** ไม่ต้องรอกัน

## ข้อจำกัดสำคัญ

**ไม่มี SSH access ไปยัง VPS จริง** — งานที่ต้องรันบนเครื่องปลายทางจริง (ติดตั้ง Docker, ตั้ง nginx/reverse proxy, ออก TLS cert, ตั้ง DNS ที่ registrar) **ไม่มี agent ตัวไหน execute ตรงให้ได้** ผลลัพธ์ของงานเหล่านี้ในเซสชันนี้คือ **สคริปต์/เอกสารขั้นตอนที่ผู้ใช้ copy-paste รันเอง** เท่านั้น งานที่ agent ทำได้จริงคือส่วนที่อยู่ในโค้ด/เอกสาร (เตรียม Dockerfile ให้ใช้กับ VPS ได้, เขียน provisioning guide, ตรวจ deploy surface, backup script, final verification)

## Work Breakdown (finalized)

| # | Task | Priority | Dependency | ขนานได้ | ประมาณเวลา | ผู้รับผิดชอบ | ประเภท |
|---|------|----------|------------|---------|------------|--------------|--------|
| 1 | ตรวจ/ปรับ `Dockerfile` (+ `docker-compose.yml` ถ้ายังไม่มี) ให้ใช้ deploy บน VPS ดิบได้จริง — persistent volume สำหรับ SQLite (`prisma/dev.db`) และ `STORAGE_ROOT`, ไม่พึ่ง Fly-specific config | สูง | ไม่มี | ✅ | 0.5 วัน | nextjs-dev | Agent-executable |
| 2 | เขียน provisioning guide แบบทีละขั้น (`docs/plans/kkd-vps-provisioning-guide.md`): apt update, ติดตั้ง Docker/Docker Compose, ตั้ง nginx reverse proxy, ออก TLS cert ด้วย certbot, ตั้ง firewall (ufw), คำสั่งรัน container พร้อม env vars ที่ต้องตั้ง | สูง | รอ #1 | ⏳ | 0.5 วัน | deploy-verify | Agent-executable (เอกสาร/สคริปต์ให้ผู้ใช้รันเอง) |
| 3 | รัน `deploy-verify` subagent ตรวจ deploy surface (Dockerfile ที่แก้ใน #1, `.dockerignore`, env/secrets boundary, ตรวจว่าไม่มี config ผูกกับ Fly-only feature ที่จะพังบน VPS ดิบ) | สูง | รอ #1 | ⏳ | 0.5 วัน | deploy-verify | Agent-executable |
| 4 | ทำ Sprint 8 (backup script `scripts/backup-db.mts`) ให้เสร็จ — copy SQLite + storage/private ไปยัง timestamped snapshot พร้อม instruction ผูก cron บน VPS จริง (ผูกจริงเป็น manual step ของผู้ใช้ตาม provisioning guide #2) | กลาง | ไม่มี | ✅ | 1 วัน | nextjs-dev | Agent-executable |
| 5 | ทำ Sprint 9 (final verification): เช็ค `BookingStatus` 7 vs 8 ค่าเทียบ PDF spec, `i18n-parity-checker`, `audit-compliance-reviewer` (role scoping), ขยาย e2e scripts, `design-business-reviewer` (real render หน้าใหม่) | กลาง | ไม่มี (ขนานกับ deploy งานทั้งหมด) | ✅ | 1-2 วัน | nextjs-dev + i18n-parity-checker + audit-compliance-reviewer + design-business-reviewer | Agent-executable |
| 6 | **[MANUAL]** ตั้งค่า DNS A record จริงที่ registrar: `kkdproperty.co.th` → `27.254.62.185`, `www.kkdproperty.co.th` → `27.254.62.185` | สูง | ไม่มี | ✅ | 15 นาที + รอ propagation (นาที-ชม.) | ผู้ใช้ (ต้อง login registrar) | **ผู้ใช้รันเอง** |
| 7 | **[MANUAL]** Provision VPS จริงตามเอกสาร #2 — SSH เข้าเครื่อง, รันคำสั่ง apt/docker/nginx/certbot ทีละขั้น, ตั้ง env vars, mount volume, รัน container | สูง | รอ #1, #2 | ⏳ | 1-2 วัน | ผู้ใช้ (มี SSH access) | **ผู้ใช้รันเอง** |
| 8 | **[MANUAL]** Cutover + smoke test จริงบน production URL หลัง DNS propagate — ตรวจ TH/EN, admin login, booking flow, PromptPay QR, file storage | สูง | รอ #6, #7 | ⏳ | 0.5 วัน | ผู้ใช้ (รัน e2e scripts ชี้ไปที่ production URL เอง หรือ agent เตรียม script ให้ล่วงหน้าใน #5) | **ผู้ใช้รันเอง** (script เตรียมไว้แล้วจาก #5) |

## สรุปการแบ่งงาน

**Dispatch ให้ orchestrator ตอนนี้ (agent-executable, ทำในเซสชันนี้ได้):** #1, #2, #3, #4, #5 — ทั้งหมดขนานกันได้ตามที่ผู้ใช้ยืนยัน (ข้อ 4) ยกเว้น #2-#3 ที่รอ #1 เสร็จก่อนเล็กน้อย (ต้องมี Dockerfile สุดท้ายก่อนเขียน guide/ตรวจ)

**Manual — ผู้ใช้ต้องทำเอง (ไม่มี SSH access ให้ agent):** #6 (DNS), #7 (provisioning จริงบน VPS), #8 (cutover/smoke test จริง) — agent เตรียมสคริปต์/เอกสาร/checklist ให้ครบใน #1-#5 แล้ว ผู้ใช้ copy-paste รันเองตามลำดับ #6 → #7 → #8

## หมายเหตุ

- `deploy-verify` เดิมตรวจกับ Fly.io/Firebase config เป็นหลัก — งาน #2/#3 รอบนี้เป็นการขยายขอบเขตไปยัง self-host VPS scenario เป็นครั้งแรก ควร flag ให้ผู้ใช้ทราบถ้าพบว่า config ปัจจุบันผูกกับ Fly-specific feature มากจนต้องเขียน Dockerfile ใหม่แยกต่างหาก (ไม่ใช่แค่ปรับของเดิม)
- Sprint 8/9 เป็นงานเดิมที่ค้างอยู่ในแผน remediation (`docs/plans/kkd-spec-remediation.md`) ไม่ใช่งานใหม่จากการ map host — ยืนยันแล้วว่าทำขนานกับ deploy งานได้ ไม่ block กัน
