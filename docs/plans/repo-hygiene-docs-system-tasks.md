# Repo Hygiene + Documentation System — Task Breakdown

อ้างอิง:

- `git status` (2026-08-27) — untracked: `.agents/`, `.claude/skills/*` (13 โฟลเดอร์, ยกเว้น `verify` ที่ track อยู่แล้ว), `skills-lock.json`, `docs/plans/pages-cms-codex-handoff-tasks.md`
- `docs/plans/pages-cms-codex-handoff-tasks.md` — Default #4 (บรรทัด 47) เคยเสนอ "`.agents/`, `.claude/skills/*`, `skills-lock.json` → เสนอใส่ `.gitignore`" ไว้แล้วแต่ยังไม่ execute — แผนนี้ทำให้เสร็จ ไม่ใช่เปิดประเด็นใหม่
- `docs/adr/0008-dual-backlog-sot-github-and-local-plan.md` + `backlogs/README.md` — **ตัดสินใจแล้ว**: `backlogs/` กับ `docs/plans/*.md` เป็น dual SoT ที่ตั้งใจแยกกัน (`backlogs/README.md` บรรทัด "Out of scope": "Replacing `docs/plans/*.md` sprint plans") — แผนนี้ **ไม่แตะ** โครงสร้างนั้น เสนอแค่ทำ index ให้ `docs/plans/` อ่านง่ายขึ้น
- `AGENTS.md` — Working rules: surgical changes, commit convention

ยืนยันจากของจริงแล้ว (ไม่ใช่จากความจำ):
- `.tmp-inspect-pma-sso.mts` ที่ handoff doc เดิมเป็นห่วง (บรรทัด 33, 46) — **ไม่มีอยู่แล้วบน disk** ไม่ต้องทำอะไรต่อ
- `git rev-list --count origin/main..HEAD` = `0` — ประเด็น "ahead 19 commits ยังไม่ push" ในเอกสารเดิม (25 ส.ค.) **แก้ไปแล้ว** ก่อนวันนี้
- `.claude/skills/code-review/SKILL.md` กับ `.agents/skills/code-review/SKILL.md` เนื้อหา**เหมือนกันทุกตัวอักษร** (diff ว่าง) — เป็นการ mirror ของ skill installer ตัวเดียวกัน ไม่ใช่ของคนละที่มาโดยบังเอิญ
- ไม่มีไฟล์ใดใน `.claude/agents/*.md` หรือ `AGENTS.md` อ้างถึง `.agents/` หรือ `skills-lock.json` — เป็นพื้นที่ที่ยังไม่มีเจ้าของ/convention เขียนไว้จริง
- `docs/plans/` มี 44 ไฟล์ ตั้งแต่ 12 ก.ค. – 27 ส.ค. 2569 ไม่มี `docs/plans/README.md` หรือ index ใด ๆ บอกว่าไฟล์ไหน active/ไฟล์ไหนปิดงานแล้ว (ต่างจาก `backlogs/INDEX.md` ที่มี TOC ชัดเจน)

## Default ที่ตัดสินใจแล้ว (ไม่ block ถามผู้ใช้)

1. **ไม่แตะโครงสร้าง `backlogs/` vs `docs/plans/`** — ADR 0008 ตัดสินใจไปแล้วและมีเหตุผลบันทึกไว้ครบ การมาเสนอรวม/ย้ายซ้ำเป็นการรื้อของที่ปิดเคสแล้ว
2. **`docs/plans/pages-cms-codex-handoff-tasks.md` → commit ตามปกติ ไม่ต้องถาม** — เป็นเอกสารจริงที่ `pages-cms-implementation-sprints.md` และไฟล์อื่นอ้างถึงอยู่แล้ว ไม่ใช่ artifact ของ tool
3. **ทำ index ให้ `docs/plans/` แทนการย้าย/archive ไฟล์เก่า** — 44 ไฟล์อ้างอิงกันเองด้วย relative link จำนวนมาก (เช่น `pages-cms-codex-handoff-tasks.md` ลิงก์ไป 5 ไฟล์ในโฟลเดอร์เดียวกัน) การย้ายไฟล์เข้า `archive/` เสี่ยง broken link ข้ามเอกสารโดยไม่มีใครเห็นจนกว่าจะมีคนตามลิงก์ — ทำ index (ไม่ย้ายไฟล์จริง) ได้ประโยชน์เดียวกัน (หาไฟล์ active ได้เร็ว) โดยความเสี่ยงต่ำกว่ามาก ถ้าอยากย้ายจริงในอนาคตค่อยทำเป็นแผนแยก
4. **เพิ่มบันทึกสั้น ๆ ว่าทำไม `.claude/skills/` กับ `.agents/skills/` ซ้ำกัน** ใน `docs/agents/domain.md` เพื่อกัน agent รุ่นหลังเข้าใจผิดว่าเป็นขยะซ้ำแล้วลบทิ้งข้างใดข้างหนึ่ง (สองโฟลเดอร์นี้เป็น mirror ของ skill installer ตัวเดียวกัน สำหรับ tool คนละตัวที่อ่านคนละ path)

## คำถามที่ต้องผู้ใช้ตอบก่อนเริ่ม

1. **`.agents/`, `.claude/skills/*` (ยกเว้น `verify` ที่ track อยู่แล้ว), `skills-lock.json` → ใส่ `.gitignore` หรือ commit เข้า repo?**
   Repo นี้เป็น **public** (ดูคอมเมนต์ `.gitignore` เรื่อง `docs/stuffs/`) เนื้อหาที่ `skills-lock.json` ดึงมาเป็นของ third-party (`mattpocock/skills` บน GitHub) — commit เข้า repo public หมายถึง redistribute โค้ด/เอกสารของคนอื่นโดยไม่ได้ตรวจ license เอกสาร handoff เดิม (25 ส.ค.) เสนอ gitignore ไว้เป็น default แต่ยังไม่ได้รับการยืนยัน ถ้าไม่ตอบ จะ**ไม่ทำ** ส่วนนี้ในรอบนี้ (ปล่อย untracked ต่อไป) เพราะเดาผิดแล้วเสียหายจริง (ประวัติ git ที่แก้คืนยาก + license risk)
2. **ต้องการให้ archive แผนเก่าใน `docs/plans/` (ย้ายไฟล์จริง) เพิ่มจาก index ไหม?** ถ้าใช่ ต้องระบุเกณฑ์ว่า "เก่า/ปิดงานแล้ว" คืออะไร (เช่น sprint ที่ deploy ขึ้น production แล้ว) เพราะ PM จะไม่เดาเองว่าไฟล์ไหน "จบแล้วจริง" — งานนี้จะเป็นแผนแยกถ้าตอบว่าต้องการ

## Task List

1. `docs/plans/pages-cms-codex-handoff-tasks.md` — `git add` + commit (`docs(pages-cms): add codex hand-off continuation tasks`) | ผู้รับผิดชอบ: `nextjs-dev` | ✅ done (bundled with hygiene commit 2026-08-27)
2. `.gitignore` — เพิ่ม/ไม่เพิ่ม entry สำหรับ `.agents/`, `.claude/skills/*` (ยกเว้น `!.claude/skills/verify/`), `skills-lock.json` ตามคำตอบคำถาม #1 ข้างบน; ถ้า commit แทน ให้ `git add` แล้ว commit แยก (`chore(agents): vendor mattpocock skill packs`) | ผู้รับผิดชอบ: `nextjs-dev` | ⏳ รอคำตอบคำถาม #1
3. `docs/agents/domain.md` — เพิ่มย่อหน้าสั้นอธิบายว่า `.claude/skills/` และ `.agents/skills/` เป็น mirror ของ skill installer เดียวกัน (อ้าง `skills-lock.json`), ห้ามลบข้างใดข้างหนึ่งเพียงเพราะดูซ้ำ | ผู้รับผิดชอบ: `nextjs-dev` | ✅ done (2026-08-27)
4. `docs/plans/README.md` (ไฟล์ใหม่) — index สั้นตามแบบ `backlogs/README.md`: อธิบาย `docs/plans/` เก็บอะไร (multi-sprint implementation plans ที่ commit ถาวร), ลิงก์ไป ADR 0008 + `backlogs/README.md` อธิบายจุดต่างจาก `backlogs/`, และตารางสถานะ (Active / Reference / Historical) — จัดสถานะโดยตรวจจริง (เทียบ GitHub + `backlogs/done/`) | ผู้รับผิดชอบ: `nextjs-dev` | ✅ done (2026-08-27)
5. Verify: `git status --porcelain` ต้องว่างหรือมีเฉพาะรายการที่ตั้งใจปล่อย untracked ตามคำตอบคำถาม #1, เปิด `docs/plans/README.md` อ่านลิงก์ทุกอันต้อง resolve ได้จริง (ไม่มี 404 path), `git log --oneline -5` ต้องเห็น commit ใหม่ตรงตาม Commit convention ใน `AGENTS.md` | ผู้รับผิดชอบ: `nextjs-dev` | ⏳ หลัง commit + คำตอบ #1

ไม่ต้องใช้ `i18n-parity-checker` (ไม่แตะ `src/messages/`), ไม่ต้องใช้ `audit-compliance-reviewer` (ไม่แตะ `src/actions/`), ไม่ต้องใช้ `deploy-verify` (ไม่แตะ `deploy/`, `Dockerfile`, `fly.toml`)

## Out of scope

- ย้าย/archive ไฟล์เก่าใน `docs/plans/` จริง — เสี่ยง broken cross-link, ทำเฉพาะถ้าผู้ใช้ยืนยันคำถาม #2
- แก้โครงสร้าง `backlogs/` หรือ ADR 0008 — ปิดเคสแล้ว
- ทำอะไรกับ `.tmp-inspect-pma-sso.mts` — ไฟล์ไม่มีอยู่แล้วบน disk (ตรวจแล้ว 27 ส.ค.)
- Deploy/production — งานนี้เป็น repo-hygiene ล้วน ไม่แตะ host จริง ไม่ต้องอ่าน redeploy runbook
