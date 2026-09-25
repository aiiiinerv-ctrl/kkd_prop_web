# Calculator Excel import — Codex hand-off continuation tasks

Date: 2026-09-26 (hand-off เพราะ Codex ชน usage limit ระหว่างปิด S6 + มีโค้ด S7 ค้างใน working tree)

อ้างอิง:

- [`calculator-excel-import-sprints.md`](calculator-excel-import-sprints.md) — แผนแม่ S0–S10
- [`calculator-excel-import-admin-ui-spec.md`](calculator-excel-import-admin-ui-spec.md) — S6a UI spec
- GitHub: [#143](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/143) · plan [#149](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/149)
- หลักฐาน S6 (เครื่อง dev, ไม่ commit): `/tmp/kkd-s6-review/*.png`, `/tmp/kkd-s6-verification/`

ข้อเท็จจริงที่ห้ามแก้ (quote จาก #150 / แผนแม่):

> "default table ให้ผลเท่ากับ `calculateSavings` เดิมทุก 100 ฿ ในช่วง 500–8,000 (ก่อนลบโค้ดเก่า)"

> Prod baseline S0: slider `min=500 max=8000 step=100`; Packages 3/5/10 kW = ฿99,000 / ฿155,000 / ฿285,000

> S9 ห้ามรัน `DROP COLUMN` บน prod — DDL additive เท่านั้น

---

## สถานะปัจจุบัน (ยืนยันจาก git + ไฟล์จริง 2026-09-26)

| รายการ | สถานะ | หลักฐาน |
|---|---|---|
| HEAD / remote | 🟢 `94c57f1` = tip ของ S5 docs; `main` ตรง `origin/main` | `git log -1`, `git status -sb` |
| S0–S5 + S6a | 🟢 committed + reviewed (S1 tracker ยังเขียน "pending review" ทั้งที่ script sweep ผ่าน) | sprint + สรุปในแผนแม่ |
| **S6 Admin Excel card** | 🟢 code+e2e committed (`cfe7c4a`…`36b6c69`); independent review pending | git log |
| **S7 Public size table** | 🟢 code+e2e committed (`7385a5c`…`32c3edd`); verify tip ผ่าน (build/verify-calculator/e2e-calculator/e2e-admin); independent review pending | `/tmp/kkd-s67-*.log` |
| Working tree ปน S6+S7 | 🟡 ไฟล์ uncommitted กินทั้ง admin และ public ในชุดเดียว | `git status` 13 modified + 2 untracked S6 (+ `deploy/restart-passenger.sh` งานอื่น) |
| S8–S10 | ⬜ ยังไม่เริ่ม | แผนแม่ |
| `deploy/restart-passenger.sh` | ⬜ **อย่าแตะ** — untracked นอก scope calculator | `?? deploy/restart-passenger.sh` |

**สรุปหนึ่งประโยค:** Codex ส่งมอบ S6 ที่ e2e ผ่านบน `next start :3100` แล้ว และมีโค้ด S7 ปนอยู่ใน tree — งานที่ถูกตัดกลางคือ *commit แยกประเภท + independent review + ปิด DoD S7 (e2e public / baseline / reviewers)* ไม่ใช่เริ่ม implement จากศูนย์

### ช่องว่าง DoD ที่ยังค้าง

**S6**

- [ ] Commit ตาม conventional commits ในแผน (แยก `feat` / `refactor` / `fix` / `test` — อย่ารวมประเภท)
- [ ] `audit-compliance-reviewer` บน `src/actions/calculator-config.ts` (+ import actions ถ้า diff แตะ)
- [ ] `design-business-reviewer` บน admin real render (มี screenshot `/tmp/kkd-s6-review/` แล้ว แต่ยังไม่ใช่ independent review)
- [ ] อัปเดต tracker ในแผนแม่ → S6 done (reviewed)

**S7**

- [ ] ยืนยันโค้ดครบ DoD (ดูเหมือนครบ: `recommendFromTable`, tiles, tooLarge/belowFirst/coversFullBill/noPayback, CTA ≤ `AVG_MONTHLY_BILL_MAX`, messages key parity, ลบ `system3kw`/`tierZone*`) — `nextjs-dev` ต้อง grep + อ่าน diff จริงก่อน commit
- [ ] ต่อ `scripts/e2e-calculator-config.mts` ตามแผน: หลัง apply → `/th|en/calculator` เห็นขนาดใหม่ / tooLarge / 100%; reset → 3/5/10
- [ ] Production-mode baseline 7 บิล = S0; `verify-calculator.mts` เขียว; `e2e-booking.mts` (CTA prefill)
- [ ] `i18n-parity-checker` + `design-business-reviewer` (TH/EN × desktop/mobile)
- [ ] Commit แยกจาก S6 ตามแผน

---

## Default ที่ตัดสินใจแล้ว (ไม่ block ถามผู้ใช้ — ค้านเป็นข้อได้)

1. **ปิด S6 ก่อน (commit + review) แล้วค่อยปิด S7 เป็นชุดถัดไป** — แม้แผนอนุญาตขนาน คนละ agent แต่ tree ตอนนี้ปนกัน; แยก commit ตามขอบเขตไฟล์สำคัญกว่า throughput (convention one-type-per-commit + rollback ของ S6 ไม่กระทบ public จนกว่า S7 จะขึ้น)
2. **อย่า stash ทิ้ง S7** — คงโค้ด S7 ใน tree ระหว่าง commit S6 โดย stage เฉพาะ path ของ S6; ถ้า `git add -p` ยุ่ง ให้ commit S6 files เป็นชุดแล้วค่อย S7 (ลำดับ commit ใน history ต้อง S6 ก่อน S7)
3. **ไฟล์ S6 ที่ stage ได้:**  
   `calculator-size-table-card.tsx`, `calculator-config-tab.tsx`, `calculator-admin-shell.tsx`, `calculator-config-client.tsx`, admin `page.tsx`, `calculator-config.ts` (actions+zod), `calculator-import.ts` (ถ้าเป็น bugfix ของ S6), `scripts/e2e-calculator-config.mts` (ส่วน admin import — ถ้า e2e มีทั้ง S6+S7 ให้แยก commit `test` หลัง S7 หรือ commit test กับ S6 เฉพาะส่วน admin แล้วต่อท้าย S7 ใน commit ถัดไป)
4. **ไฟล์ S7 ที่ห้ามปน commit S6:**  
   `src/app/[locale]/calculator/*`, `src/messages/{th,en}.json`, `src/lib/validations/lead.ts`
5. **`deploy/restart-passenger.sh` ไม่ commit ในสายนี้** — นอก scope; ปล่อย untracked หรือให้ owner เปิดงาน deploy แยก
6. **S1 tracker → ปิดเป็น done** เมื่ออัปเดตแผน — equality sweep 76/76 + script เป็น reviewer ตามแผนอยู่แล้ว ไม่ต้องรอคน
7. **Reviewer model:** ใช้ specialist agents ตามชื่อในแผน (`audit-compliance-reviewer`, `design-business-reviewer`, `i18n-parity-checker`) บน Cursor ด้วย model ที่ session ใช้ได้ (`inherit`) — **ไม่เปลี่ยน tier ในไฟล์ agent**; บันทึกในสรุปหลังแก้ว่า "reviewed under Cursor inherit because Claude Sonnet/Opus quota exhausted" เพื่อ audit trail (ดูคำถาม owner ด้านล่างถ้าไม่ยอม)
8. **อย่าเริ่ม S8** จนกว่า S6+S7 review เขียวและ equality sweep ยังผ่านบน tip ล่าสุด

---

## คำถามที่ต้องผู้ใช้ตอบ

**ตอบแล้ว 2026-09-26:** owner **approve = (ก)** — independent reviewers รันบน Cursor (`inherit`) ได้; เดินหน้าปิด S6→S7

---

## Task List

1. `docs/plans/calculator-excel-import-sprints.md` — อัปเดต Status/tracker: ชี้มาที่ handoff นี้; S1 → done; S6/S7 ระบุ "code in WT, reviews pending" | ผู้รับผิดชอบ: `nextjs-dev` (docs ในชุด commit) หรือทำพร้อมข้อ 7 | ✅ ขนานได้กับ #2
2. Stage + commit **S6 เท่านั้น** ตาม commit list ในแผนแม่ (feat import card → refactor drop fields → fix kw unit ถ้ายังแยกได้ → test e2e admin) — ห้ามรวม public/messages/lead | ผู้รับผิดชอบ: `nextjs-dev` | ⏳ หลังยืนยัน diff สะอาด
3. รัน verify ชุด S6 ซ้ำบน production mode: `npm run build`, `npx tsx scripts/e2e-calculator-config.mts` (admin ส่วน), `e2e-admin.mts`, `e2e-admin-crud.mts` | ผู้รับผิดชอบ: `nextjs-dev` | ⏳ #2
4. `audit-compliance-reviewer` — ตรวจ `src/actions/calculator-config.ts` + `calculator-import.ts` หลัง diff S6 | ผู้รับผิดชอบ: `audit-compliance-reviewer` | ✅ ขนานกับ #5 ได้หลัง #2
5. `design-business-reviewer` — admin `/admin/pages/calculator` real render desktop+mobile (ใช้หรือเทียบ `/tmp/kkd-s6-review/`) | ผู้รับผิดชอบ: `design-business-reviewer` | ✅ ขนานกับ #4
6. ปิด DoD S7 ที่ยังขาด: ต่อ e2e public ใน `scripts/e2e-calculator-config.mts`; รัน `verify-calculator.mts`, `e2e-booking.mts`; baseline 7 บิล TH/EN = S0 | ผู้รับผิดชอบ: `nextjs-dev` | ⏳ แนะนำหลัง #2–#3 (S6 committed) เพื่อไม่ปน test กับ admin-only
7. Commit **S7** ตามแผน: `feat(site): …` · `refactor(site): share lead bill max…` · `test(e2e): cover public…` | ผู้รับผิดชอบ: `nextjs-dev` | ⏳ #6
8. `i18n-parity-checker` บน messages ที่แตะ | ผู้รับผิดชอบ: `i18n-parity-checker` | ✅ ขนานหลัง #7 (หรือก่อน commit ถ้า key นิ่งแล้ว)
9. `design-business-reviewer` — public `/th|en/calculator` desktop+mobile (gate ก่อน S8) | ผู้รับผิดชอบ: `design-business-reviewer` | ⏳ #7
10. อัปเดต "สรุปหลังแก้" S6 + S7 ในแผนแม่ + tracker → done (reviewed) | ผู้รับผิดชอบ: `nextjs-dev` | ⏳ #4–#9
11. Verify รวม (อ้าง `.claude/skills/verify/SKILL.md`): `npm run build` · `verify-calculator.mts` · `verify-calculator-import.mts` · `e2e-calculator-config.mts` · `e2e-booking.mts` · เปิด `/th|en/calculator` + `/admin/pages/calculator` | ผู้รับผิดชอบ: `nextjs-dev` | ⏳ #10

## Out of scope

- S8 cleanup / S9 prod deploy / S10 Excel go-live — ห้ามเริ่มใน handoff นี้
- `deploy/restart-passenger.sh` และงาน hosting อื่น
- ลบ i18n keys ตาย (`billRange*` ฯลฯ) — chore แยก (C2)
- DROP คอลัมน์บน prod
- Push ไป `origin` — รอคำสั่ง owner
