# KKD PROPERTY — ปรับปรุง Deploy Workflow ให้สะดวกขึ้น (Shared Hosting, No SSH)

Owner ของแผนนี้: `pm-expert` (scope/breakdown) → ส่งต่อ `orchestrator` เพื่อ dispatch จริง
Status: DONE (2026-08-15) — task 1 (runbook), 3 (`deploy/upload-dist.sh`), 4 (`scripts/smoke-test-production.mts`)
และ 5 (AGENTS.md Commands) ส่งมอบครบแล้ว เก็บไฟล์นี้ไว้เป็นบันทึกเหตุผลเบื้องหลัง ไม่ใช่ backlog ที่ยังรอคิว

## ที่มา / ปัญหา

รอบล่าสุด (ลบตาราง comparison จากหน้า calculator) ใช้เวลานานเกินงานจริงเพราะ 3 อย่าง:

1. คำสั่ง FTP upload ที่ให้ user รันผ่าน `!` โดน line-wrap จนพัง **2 รอบ** — ต้องเปลี่ยนมาเขียนเป็น shell script ไฟล์แยกแทน
2. ต้องเดา/ลองผิดลองถูก path format ของ DirectAdmin classic API (extract, edit) **ซ้ำๆ ในแต่ละรอบ** ทั้งที่เคยไขปริศนานี้ไปแล้วในรอบก่อนหน้า (บันทึกอยู่ใน Claude memory เท่านั้น ไม่เคยลงเป็นไฟล์ในโปรเจกต์)
3. panel ไม่ให้ error message ที่ชัดเจน ต้อง verify เองทุกขั้นตอน (list directory, เช็ค BUILD_ID, ฯลฯ) แบบ manual

ข้อเท็จจริงสำคัญที่ต้องยึดไว้ (ห้ามเปลี่ยน เพราะเป็นบทเรียนจากอุบัติเหตุจริง):

- FTP upload ไป production **ต้องให้ user รันเองผ่าน `!` เท่านั้น** — ไม่ใช่แค่เพราะ auto-mode classifier บล็อก แต่มีหลักฐานเชิงประจักษ์ว่า agent's Bash tool เคยทำให้ upload timeout กลางทาง จน `production.db` เสียหาย (กู้คืนจาก backup ได้ ไม่มี data loss ถาวร) ส่วน user รันคำสั่งเดียวกันผ่าน `!` เสร็จใน 2-26 วินาทีทุกครั้ง — เป็นความต่างด้าน reliability จริง ไม่ใช่แค่ policy

## Scope

**อยู่ใน scope:** ปรับปรุงกระบวนการ/tooling/เอกสาร ให้รอบ redeploy ถัดไปเร็วขึ้นและพลาดน้อยลง โดยไม่แตะ safety guardrail ที่มีเหตุผลรองรับแล้ว

**ไม่อยู่ใน scope:**
- แก้ auto-mode classifier ให้ agent รัน FTP/curl ไป production เองได้ — มีอุบัติเหตุจริงรองรับว่าไม่ควรทำ (ดูส่วน "ทางเลือกที่ไม่แนะนำ")
- เปลี่ยน hosting provider หรือ deploy target
- งาน feature ของเว็บไซต์เอง (ไม่เกี่ยวกับรอบนี้)

## คำถามที่ต้องตอบก่อนเริ่ม (สมมติฐานที่ใช้ไปพลางก่อนถ้าไม่ตอบ)

1. **ขยาย scope ของ `hosting-deploy-specialist` ให้เป็นเจ้าของ "routine incremental redeploy" อย่างเป็นทางการ (ไม่ใช่แค่ initial pipeline setup ตามที่ description ปัจจุบันเขียนไว้) — ยืนยันไหม?**
   สมมติฐานที่ใช้: ใช่ เพราะ agent นี้เข้าใจ panel/pipeline อยู่แล้ว และการแก้ description ทำได้ผ่าน agent-scaling-protocol (ขอ confirm ก่อนแก้ไฟล์ agent เสมอ) — งานนี้ยัง**ไม่ได้แก้ไฟล์ agent จริง** เป็นแค่ข้อเสนอในแผน รอ orchestrator/user ตัดสินตอน dispatch
2. **ให้เก็บ runbook ไว้ที่ `docs/plans/` (ตาม convention เดิม) หรือแยกโฟลเดอร์ `docs/deploy/` ใหม่?**
   สมมติฐานที่ใช้: `docs/plans/` ตาม convention ที่มีอยู่แล้ว (agent description ของ hosting-deploy-specialist ก็อ้างอิง `docs/plans/*.md` อยู่แล้ว) — ไม่สร้างโฟลเดอร์ใหม่โดยไม่จำเป็น

## แผนงาน

| # | Task | Priority | Dependency | ขนานได้ไหม | ประมาณเวลา | ผู้รับผิดชอบที่เหมาะ |
|---|------|----------|-----------|:---:|------|----------------------|
| 1 | เขียน **runbook รวม** `docs/plans/kkd-shared-hosting-redeploy-runbook.md`: รวมความรู้ที่กระจัดกระจายอยู่ใน Claude memory เท่านั้น (DirectAdmin extract path format ที่ถูกต้อง, restart-via-edit-resave trick, BUILD_ID verification method, `.env.hosting-panel` credential location, กฎ "FTP ต้องให้ user รันผ่าน `!`") ให้เป็นไฟล์ในโปรเจกต์ที่ agent ตัวไหนก็อ่านได้โดยไม่ต้องพึ่ง memory ของ session เดิม | สูง | - | ✅ | 45 นาที | `hosting-deploy-specialist` (ตรงตาม Method step 4 ของ agent นี้อยู่แล้ว — เขียนลง `docs/plans/*.md`) |
| 2 | ขอ confirm จากผู้ใช้ + ปรับ **description/scope ของ `hosting-deploy-specialist`** ให้ระบุชัดว่าครอบคลุม routine incremental redeploy ด้วย ไม่ใช่แค่ initial hosting-integration setup — และให้ agent อ้างอิง runbook จาก task 1 เป็น step แรกเสมอ | สูง | ไม่ผูกทางเทคนิคกับ 1 (เป็นการตัดสินใจ scope) | ✅ | 15 นาที (เป็น discussion+approve ไม่ใช่ implementation) | `orchestrator` + ผู้ใช้ (ตาม agent-scaling-protocol: ต้องขอ confirm ก่อนแก้ไฟล์ agent เสมอ) |
| 3 | สร้าง **script template แบบ one-shot** สำหรับรวมขั้นตอนต่อรอบ (generate upload command / extract API call / restart call เป็นไฟล์ `.sh` เดียว) แก้ปัญหา line-wrap ที่เคยพัง 2 รอบ — user ยังคง**รันเองผ่าน `!` เหมือนเดิม** เปลี่ยนแค่ "รันไฟล์เดียว" แทน "copy-paste หลายคำสั่ง" | สูง | 1 (ต้องใช้ path format ที่ยืนยันแล้วจาก runbook) | ⏳ | 1-1.5 ชม. | `hosting-deploy-specialist` |
| 4 | สร้าง/ขยาย **automated smoke-test script** `scripts/smoke-test-production.mts` รวม 4 จุดตรวจมาตรฐาน (homepage 200, `/admin` → 307, `/files/...` → 401, feature-specific check ที่รับ parameter ได้ต่อรอบ) ให้รันคำสั่งเดียวแทนตรวจ manual ทีละจุด | กลาง | - | ✅ | 45 นาที | `hosting-deploy-specialist` (เข้าใจ production target โดยตรง, รูปแบบคล้าย `scripts/e2e-*.mts` ที่มีอยู่แล้ว) |
| 5 | อัปเดตส่วน **Commands** ใน `AGENTS.md` ให้ชี้ไปยัง runbook (task 1) และ smoke-test script (task 4) เป็น entry point เดียวสำหรับ redeploy รอบถัดไป | กลาง | 1, 4 | ⏳ | 15 นาที | `hosting-deploy-specialist` |
| 6 | Dry-run กระบวนการใหม่ทั้งหมดกับ redeploy จริงรอบถัดไป แล้วปรับ runbook ตามผลจริง (feedback loop เดียวกับที่เคยทำตอนไข path format ของ DirectAdmin) | ต่ำ | 1, 2, 3, 4, 5 | ⏳ | ตามรอบ redeploy จริง | `hosting-deploy-specialist` (execute) + `pm-expert` (ติดตาม, อัปเดต memory หลังจบ) |

## ทางเลือกที่ประเมินแล้ว — ไม่แนะนำให้ทำ

**แก้ auto-mode classifier / permission ให้ agent รัน FTP/curl ไป production เองได้โดยตรง**

- **เหตุผลที่ไม่แนะนำ:** มีอุบัติเหตุจริงรองรับแล้วว่าการให้ agent's Bash tool รัน upload ไป production ทำให้ timeout กลางทางและ `production.db` เสียหาย (กู้คืนได้ แต่เสี่ยงซ้ำ) ในขณะที่ user รันคำสั่งเดียวกันผ่าน `!` สำเร็จทุกครั้งใน 2-26 วินาที — นี่คือความต่างด้าน**reliability จริง** ไม่ใช่แค่ policy gate ที่แก้แล้วจบ
- ถ้าจะพิจารณาอีกครั้งในอนาคต ต้องมีหลักฐานใหม่ว่าปัญหา reliability ของ agent Bash ต่อ FTP target นี้ถูกแก้แล้ว (เช่น เปลี่ยน protocol, เพิ่ม timeout, ทดสอบซ้ำหลายรอบ) — ไม่ใช่แค่ปลด classifier
- **สรุป:** คง policy เดิมไว้ (user รันผ่าน `!` เสมอ) แต่ลดความเจ็บปวดด้วย task 3 (one-shot script) แทน

## สรุป Risk ต่อทางเลือกที่แนะนำ

| ทางเลือก | ความเสี่ยงถ้าทำ | ความเสี่ยงถ้าไม่ทำ |
|---|---|---|
| Runbook รวม (task 1) | ต่ำ — เป็นเอกสารล้วน ไม่แตะ production | สูง — ความรู้ยังกระจายอยู่ใน memory เท่านั้น เสี่ยงลืม/เดาใหม่ทุกรอบเหมือนที่ผ่านมา |
| ขยาย scope agent (task 2) | ต่ำ-กลาง — ถ้าไม่ระบุ boundary ชัด อาจทำให้ agent ทำ routine work ปนกับ high-stakes initial-setup work จนขาด rigor ที่ควรมีตอนงาน setup ครั้งแรก — ต้องเขียน description แยกชัดว่า routine redeploy ใช้ checklist จาก runbook, initial/non-standard setup ยังต้องสืบสวนเต็มรูปแบบเหมือนเดิม | กลาง — ยังไม่มีใครเป็นเจ้าของ routine redeploy อย่างชัดเจน ทุกรอบเริ่มจากศูนย์ |
| One-shot script (task 3) | กลาง — ถ้า template ไม่ยืดหยุ่นพอ (ชื่อไฟล์/path เปลี่ยนทุกรอบ) อาจต้องแก้ script ทุกครั้งอยู่ดี ต้องออกแบบให้ parameterize ง่าย | กลาง — ยังเสี่ยง line-wrap พังซ้ำแบบที่เจอมาแล้ว 2 รอบ |
| Smoke-test script (task 4) | ต่ำ — เป็น read-only check ทั้งหมด | ต่ำ-กลาง — เสียเวลา manual verify ทุกจุดทุกรอบ แต่ไม่ถึงขั้นเสี่ยง production |
| ไม่แก้ classifier (คงเดิม) | ไม่มี — คือการไม่เปลี่ยนอะไร | ไม่มี — เป็นการปฏิเสธทางเลือกที่มีความเสี่ยงสูงกว่าอยู่แล้ว |
