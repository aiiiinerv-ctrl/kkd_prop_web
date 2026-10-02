# Calculator: toggle On-grid / Hybrid + แก้ตารางเองในหลังบ้าน — sprint plan

Date: 2026-10-02
GitHub map: [#153](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/153) · plan ticket [#159](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/159)
Backlog: [`backlogs/done/ISSUE_153_calculator_hybrid_toggle_map/PLAN.md`](../../backlogs/done/ISSUE_153_calculator_hybrid_toggle_map/PLAN.md)
Precedent (รูปแบบ + กลไกที่ต่อยอด): [`calculator-excel-import-sprints.md`](calculator-excel-import-sprints.md) (map #143, S0–S9 ขึ้น prod แล้ว)

อ้างอิงการตัดสินใจ (ถ้าแผนนี้ขัดกับ source ให้ source ชนะ แล้วแก้แผน):

| Ticket / asset | เรื่อง | ใช้ใน sprint |
|---|---|---|
| [#154](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/154) + [`research-154`](../../backlogs/done/ISSUE_153_calculator_hybrid_toggle_map/research-154-hybrid-read-contract.md) | สัญญาการอ่านชีต Hybrid (§2), ผลกับไฟล์จริง (§3), edge case E1–E16 (§4) | R2-S1, R2-S2, R2-S13 |
| [#155](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/155) | ราคาที่ใช้ได้ (>0, ต้องมีราคาฐานยี่ห้อเดียวกัน), ไม่มีราคา → ซ่อนคืนทุน + CTA, browser ได้แค่ราคาต่ำสุด | R2-S1, R2-S4, R2-S9 |
| [#156](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/156) | kW ใช้กติกา On-grid, phase ราคาต่ำกว่า, แบตเริ่มเล็กสุด >0 / ใกล้สุดเมื่อ kW เปลี่ยน, cap ที่ค่าไฟ, slider ช่วงตายตัว, คงค่าไฟเมื่อสลับ | R2-S1, R2-S9 |
| [#157](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/157) + [`design-157`](../../backlogs/done/ISSUE_153_calculator_hybrid_toggle_map/design-157-public-hybrid-toggle.md) | **Variant B** (tab หัวการ์ด + segmented แบตฝั่งผล), กติการ่วม §0/§4–§6, ข้อควรระวัง 2 ข้อ | R2-S8, R2-S9 |
| [#158](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/158) + [`research-158`](../../backlogs/done/ISSUE_153_calculator_hybrid_toggle_map/research-158-data-model-impact.md) | **แกนหลัก**: data model §1, validator ร่วม §2, projection §3, actions §4, lead §5, DDL/ความเสี่ยง §6, impact §7 | ทุก sprint |
| [#161](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/161) | แก้เฉพาะค่า input + เพิ่ม/ลบแถว, save = เวอร์ชันในประวัติเดียวกับ import, import ทับทั้งชุด, export round-trip, validator ร่วม, **แยก 2 release** | R1 ทั้งหมด |
| [#162](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/162) + [`design-162`](../../backlogs/done/ISSUE_153_calculator_hybrid_toggle_map/design-162-admin-table-editor.md) | **แบบ B** (รายการอ่านอย่างเดียว + Dialog ทีละขนาด + แถบตรวจและบันทึก), Q1–Q6 ตอบแล้ว | R1-S5, R1-S6, R2-S6, R2-S7 |
| [#163](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/163) | D3 ไม่มีชีต Hybrid = ลบตาราง (เตือนเด่น) · D4 ชีต Hybrid ผิด = reject ทั้งไฟล์ · D5 save = ยืนยัน diff แล้วใช้ทันที · D6 export ราคาเป็นตัวเลข | R1-S4, R2-S2, R2-S4, R2-S5 |
| [#160](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/160) (out of scope) | ไม่รอเจ้าของยืนยันข้อมูล — ระบบ validate/warn แทน | Risk R14 |

ข้อเท็จจริงที่ห้ามแก้ (quote จาก map #153 และ ticket ที่ปิดแล้ว):

> "ประหยัด/เดือน = (ผลิตต่อวัน kWh + ขนาดแบต kWh) × 4.5 × 30 แม้สูตรนี้นับแบตเป็นพลังงานที่เพิ่มขึ้น" — #153 ข้อ 2 (โค้ดใช้ `(kw × sunHours + batteryKwh) × pricePerKwh × days` จากค่าที่ import, research-154 E7)
> "ประหยัด = min(…, ค่าไฟ) … คิดระยะคืนทุนจากยอดที่ cap แล้ว" — #156 ข้อ 4
> "หน้าเว็บเริ่มต้นที่ On-grid และซ่อน toggle ถ้ายังไม่มีตาราง Hybrid ตัวเลขหลัง deploy จึงเหมือนเดิม" — #153 ข้อ 6
> "server คำนวณราคาที่ใช้ได้ต่ำสุดต่อแถว แล้วส่งให้ browser แค่ตัวเลขเดียว ไม่มีชื่อยี่ห้อและไม่มีราคาแยกยี่ห้อ" — #155 ข้อ 5
> "CTA ส่ง `system` ตามโหมดที่ลูกค้าดูอยู่ทั้ง 2 โหมด … `battery` ส่งเฉพาะ Hybrid" — #157
> "สร้างตาราง Hybrid ใหม่ในหลังบ้านไม่ได้ ต้อง import Excel ก่อน · warning แผง >20% เฉพาะ Hybrid · แก้ kW ของขนาดเดิมไม่ได้ · กล่อง "แทนที่ทั้งชุด" เฉพาะเมื่อชุดปัจจุบันเป็น MANUAL" — #162

ค่าจากไฟล์จริงที่ใช้ตรวจหลัง go-live (ไม่มีราคา — research-154 §3/§5, design-157 §7): Hybrid 52 แถว / 13 ขนาด (5–125 kW), ช่วงค่าไฟ 3,000–150,000 ฿, E3 = 42 ช่อง, E4 = 7 แถวไม่มีราคา, E5 = 20/30/50/99.9 kW, คืนทุน 2.68–4.48 ปี

---

## Status

**2026-10-02**: แผนร่าง — ยังไม่เริ่ม implement. **เงื่อนไขก่อนเริ่ม: On-grid S10 (`calculator-excel-import-sprints.md` §S10 — ADMIN อัปโหลด `คำนวณติดตั้ง.xlsx` บน prod แล้วยืนยัน) ต้องเสร็จก่อน** ณ วันที่เขียน On-grid S10 ยัง `pending` (ดู S0)

## Sprint tracker

ชื่อ sprint ใช้ prefix `R1-` / `R2-` เพื่อไม่ให้ชนกับ "On-grid S10" ของแผนต้นแบบ

| Sprint | เป้าหมาย | Implement | Reviewer อิสระ | ขนาน/รอ | Est. | Status |
|---:|---|---|---|---|---:|---|
| **S0** | Gate On-grid S10 + live baseline prod/local | `nextjs-dev` (browser/curl + `pma-readonly-query`) | — | เริ่มก่อน | 0.25 d | done (baseline 3 = skip) |
| **R1 — On-grid: แก้เอง + export + ประวัติรวม** | | | | | | |
| **R1-S1** | แยก validator On-grid ออกจาก parser (ไม่เปลี่ยนพฤติกรรม) + ตำแหน่ง issue แบบกลาง | `nextjs-dev` | golden-output script (= reviewer) | ⏳ S0 | 0.75 d | done |
| **R1-S2** | Schema R1 (`source` + ฟิลด์ไฟล์ nullable) + DDL asset + rollback SQL asset + ผู้อ่าน `fileName` | `nextjs-dev` | `deploy-verify` | ✅ ขนานกับ R1-S1 | 0.5 d | done — `deploy-verify` PASS, `audit-compliance-reviewer` PASS |
| **R1-S3** | Export On-grid (สูตร + result) + route `/api/admin/calculator/export` + round-trip test | `nextjs-dev` | `audit-compliance-reviewer` (route auth/headers) | ⏳ R1-S1 · ✅ ขนานกับ R1-S2 | 1 d | done — Excel check ✓, `audit-compliance-reviewer` PASS |
| **R1-S4** | Action `saveCalculatorTables` (On-grid) + preview/apply/reset รู้จัก `source` | `nextjs-dev` | `audit-compliance-reviewer` | ⏳ R1-S1, R1-S2 · ✅ ขนานกับ R1-S3 | 1 d | done — e2e 4 กรณี ✓, รอ `audit-compliance-reviewer` |
| **R1-S5** | แท็บ "ตารางขนาดระบบ": โครงหน้า, ย้ายแผงนำเข้า, กล่องที่ใช้อยู่ + ปุ่ม export, ประวัติ 2 แหล่ง, รายการ On-grid อ่านอย่างเดียว | `nextjs-dev` | `design-business-reviewer` (admin real render) | ⏳ R1-S2, R1-S3 | 1 d | done — e2e ✓, รอ `design-business-reviewer` |
| **R1-S6** | ตัวแก้แบบ B: Dialog, working copy, แถบบันทึก, Dialog ยืนยัน diff (+ warning Package), conflict + e2e | `nextjs-dev` | `design-business-reviewer` (admin real render) | ⏳ R1-S4, R1-S5 | 1.5 d | done — e2e ✓, รอ `design-business-reviewer` |
| **R1-S7** | Release R1: runbook → snapshot → DDL → deploy → smoke + rollback runbook (R2 ของ research-158) | `hosting-deploy-specialist` + human (`!`, phpMyAdmin) | `deploy-verify` (ก่อน upload) | ⏳ R1-S1…S6 | 0.5 d | pending |
| **R2 — Hybrid** | | | | | | |
| **R2-S0** | Gate R1 นิ่งบน prod + baseline หลัง R1 | `nextjs-dev` | — | ⏳ R1-S7 | 0.25 d | pending |
| **R2-S1** | Pure lib Hybrid: `HybridRow`, schema, สูตร, ราคาที่ใช้ได้, `recommendHybrid` + projection | `nextjs-dev` | — (verify script = reviewer) | ⏳ R2-S0 | 1 d | pending |
| **R2-S2** | Reader + validator + diff + messages ชีต Hybrid + import ไฟล์เดียว 2 ชีต (D3/D4) + fixture สังเคราะห์ | `nextjs-dev` | `audit-compliance-reviewer` (guard review) | ⏳ R2-S1 | 1.5 d | pending |
| **R2-S3** | Schema R2 (3 คอลัมน์) + DDL asset | `nextjs-dev` | `deploy-verify` | ✅ ขนานกับ R2-S1/S2 | 0.5 d | pending |
| **R2-S4** | Actions + read path: preview/apply/save/reset รู้จัก Hybrid, `getCalculatorConfig` คืน projection + payload test | `nextjs-dev` | `audit-compliance-reviewer` | ⏳ R2-S2, R2-S3 | 1 d | pending |
| **R2-S5** | Export ชีต Hybrid (merged block, กลุ่มยี่ห้อ) + round-trip 2 ชีต | `nextjs-dev` | `audit-compliance-reviewer` | ⏳ R2-S2 · ✅ ขนานกับ R2-S4 | 0.75 d | pending |
| **R2-S6** | หลังบ้าน: แท็บย่อย On-grid/Hybrid, รายการ + Dialog Hybrid, save 2 ตาราง | `nextjs-dev` | `design-business-reviewer` (admin real render) | ⏳ R2-S4 | 1.25 d | pending |
| **R2-S7** | หลังบ้าน: preview นำเข้า 2 ชีต, กล่อง "Hybrid จะถูกลบ", reject แยกชีต, ประวัติ/reset copy | `nextjs-dev` | `design-business-reviewer` (admin real render) | ⏳ R2-S4 · ✅ ขนานกับ R2-S6 (คนละไฟล์) | 0.75 d | pending |
| **R2-S8** | Lead fields: `interestedBatteryKwh`, booking `system`/`battery`, ช่องแบตในแท็บ quote, lead detail, แจ้งเตือน, export รายงาน | `nextjs-dev` | `audit-compliance-reviewer`, `i18n-parity-checker`, `design-business-reviewer` (booking form) | ⏳ R2-S3 · ✅ ขนานกับ R2-S1/S2/S4–S7 | 1 d | pending |
| **R2-S9** | หน้า public Variant B: tab หัวการ์ด, segmented แบต, phase pill, CTA | `nextjs-dev` | `i18n-parity-checker`, `design-business-reviewer` (TH/EN × desktop/375px) | ⏳ R2-S4, R2-S8 · ✅ ขนานกับ R2-S6/S7 | 1.5 d | pending |
| **R2-S10** | Release R2: runbook → snapshot → DDL → deploy → smoke + write-path lead | `hosting-deploy-specialist` + human | `deploy-verify` | ⏳ R2-S1…S9 | 0.5 d | pending |
| **R2-S11** | Post-deploy: ADMIN อัปโหลดไฟล์ 2 ชีตจริงบน prod → ตรวจ toggle + lead | owner/ADMIN (human) + agent browser | `design-business-reviewer` (prod render) | ⏳ R2-S10 | 0.25 d | pending |
| **R2-S12** | Cleanup: ลบ prototype worktree/branch #157/#162 + ปิด backlog | main session (หลัง user ยืนยัน) | — | ⏳ R2-S11 | 0.1 d | pending |

**รวม ≈ 17 dev-days** — S0 0.25 · R1 6.25 · R2 10.35
Critical path ≈ 11.5 d: S0 → R1-S1 → R1-S4 → R1-S6 → R1-S7 (≈ 5 d) → R2-S0 → R2-S1 → R2-S2 → R2-S4 → R2-S6 → R2-S10 → R2-S11 (≈ 6.5 d) เมื่อ R1-S2/S3, R2-S3/S5/S7/S8/S9 ขนาน
ระยะห่างระหว่าง R1-S7 กับ R2-S0: ให้ R1 อยู่บน prod อย่างน้อย 2–3 วันทำการ (ดู R2-S0) — ไม่นับเป็น dev-day

ทุก sprint ปิดแล้ว main ต้อง shippable:
- R1-S1/S3 เพิ่มของที่ยังไม่มี UI เรียก; R1-S2 เพิ่มคอลัมน์ที่โค้ดเดิมไม่สนใจ; R1-S4–S6 เปลี่ยนเฉพาะหลังบ้าน → **หน้า public On-grid ไม่เปลี่ยนเลยทั้ง R1**
- R2-S1–S7 ไม่แตะ public; R2-S8 เพิ่มช่องในฟอร์มที่เห็นเฉพาะเมื่อติ๊ก HYBRID; R2-S9 render toggle เฉพาะเมื่อมีตาราง Hybrid → หลัง deploy R2 หน้า public ยังเหมือนเดิมจนกว่า R2-S11

---

## Default ที่ตัดสินใจแล้ว (ไม่ block ถามผู้ใช้ — ค้านเป็นข้อได้)

1. **Snapshot prod ก่อน DDL = phpMyAdmin Export ของตารางที่โดนแตะ (SQL, structure + data) แล้วดาวน์โหลดออกจาก server** — R1: `CalculatorConfig`, `CalculatorImport`; R2: + `Lead`. เหตุผล: `scripts/backup-db.mts` รันบน host ไม่ได้ (runbook: `tsx` ไม่ถูก bundle, MySQL ไม่รับ connection จากภายนอก) และ route `/api/operations/pages-cms-backup` ต้องเปิดด้วย env var ซึ่งการแก้ env ผ่าน Node.js Selector จะเขียน `.htaccess` ใหม่ (เสี่ยงหลุด canonical redirect). ฝั่ง **local** ใช้ `npx tsx scripts/backup-db.mts` ก่อน `prisma migrate dev` ทุกครั้ง. ทางที่ไม่เลือก: ข้าม snapshot แบบ On-grid S9 — R2 แตะ `Lead` ซึ่งเป็นข้อมูลลูกค้า
2. **Rollback R1 หลังมีแถว MANUAL = backfill ค่าแทน ไม่ DELETE** — SQL asset ใน R1-S2 ใส่ค่าแทนลงฟิลด์ไฟล์ที่เป็น null ของแถว `source='MANUAL'` เพื่อให้ Prisma client เก่าอ่านได้ ประวัติไม่หาย และ audit ยังชี้ไปที่แถวเดิม. ทางที่ไม่เลือก: ลบแถว MANUAL (เสียประวัติ, และถ้าแถวนั้นเป็นชุดที่ใช้อยู่ `sizeTableImportId` จะชี้ไปที่แถวที่ไม่มีแล้ว)
3. **Dedupe sha256 ต้องไม่คืนแถว EXCEL ที่ parse ก่อน R2** — ไฟล์ที่อัปโหลดใน On-grid S10 คือไฟล์เดียวกับที่จะใช้ใน R2-S11 (มีชีต Hybrid อยู่แล้วแต่ตอนนั้นถูกข้าม). ถ้า dedupe เจอแถวเดิมที่ `hybridRows IS NULL` และไฟล์ใหม่มีชีต Hybrid → parse ใหม่และสร้างแถว EXCEL ใหม่ (index `sha256` ไม่ใช่ unique จึงทำได้). ไม่แก้ส่วนนี้ = เจ้าของอัปโหลดแล้ว toggle ไม่ขึ้นโดยไม่มี error
4. **Merge 1φ/3φ ของ On-grid อยู่ฝั่ง import (reader) ไม่ใช่ validator ร่วม** — ตัวแก้ในหลังบ้านเก็บ phase เป็น set บนแถวเดียว จึงไม่มีกรณี "1φ/3φ ค่าไม่ตรง". `validateOnGridTable(rows: SizeRow[])` คุมกติการะดับตาราง (ช่วงค่า, kW ซ้ำ, billMin<billMax, billMax เพิ่มเคร่งครัด, roof) ส่วน import เก็บ `sourceRows: number[]` ต่อแถวเพื่อแปลงตำแหน่งกลางกลับเป็นเลขแถว Excel. ต่างจาก research-158 §2 (ดู C3)
5. **โค้ด Hybrid แยก 2 ไฟล์ตามความปลอดภัยของข้อมูล ไม่ใช่ของโค้ด** — `src/lib/calculator-hybrid.ts` (client-safe: types, zod, สูตรประหยัด, ราคาที่ใช้ได้, `recommendHybrid`) และ `src/lib/calculator-hybrid-projection.ts` (`toPublicHybridTable` — comment หัวไฟล์ "server-only" เพราะ repo ไม่มี package `server-only`; ผู้เรียกเดียวคือ `getCalculatorConfig`). เหตุผล: #162 บังคับให้ validator/diff import ได้ฝั่ง client และ `recommendHybrid` ต้องรันใน browser
6. **Validator/diff ฝั่ง client ห้าม import จาก `src/lib/calculator-import/index.ts`** (ตัวนั้นดึง `exceljs`/`jszip`) — client component import ตรงจาก `validate-on-grid.ts`, `validate-hybrid.ts`, `diff.ts`, `messages.ts` เท่านั้น. DoD มี grep ตรวจ
7. **Route export ใช้ pattern ของ `/api/admin/reports/export`** (`auth()` → 401 JSON, role ไม่ใช่ ADMIN → 403 JSON) แทน `requireRole()` ที่ redirect — e2e จะ assert status ได้ตรง ๆ และลิงก์ดาวน์โหลดไม่บันทึกหน้า login เป็นไฟล์. Header: `Content-Type` xlsx, `Content-Disposition: attachment; filename="kkd-calculator-tables-<YYYYMMDD>.xlsx"`, `X-Content-Type-Options: nosniff`, `Cache-Control: no-store`. ไม่ audit (อ่านอย่างเดียว — research-158 §4)
8. **Export R1 มีชีต On-grid ชีตเดียว; R2 เพิ่มชีต Hybrid เฉพาะเมื่อมีตาราง Hybrid** — ไม่มีตาราง = ไม่มีชีต ซึ่ง round-trip ได้ผลเดิม (D3: นำเข้าไฟล์ไม่มีชีต Hybrid = ไม่มีตาราง Hybrid)
9. **คอลัมน์ export ของชีต On-grid = คอลัมน์ที่ reader อ่าน + คอลัมน์สูตร (ผลิต/ประหยัด) พร้อม `result`** ตามลำดับและ label ของไฟล์ต้นแบบ — **ไม่มี** คอลัมน์ "ประเภท" และราคายี่ห้อ On-grid เพราะระบบไม่เคยเก็บ (On-grid S2: "ไม่เก็บ category/ราคา"). ไฟล์ต้นฉบับของเจ้าของยังเป็นที่เก็บข้อมูลส่วนนั้น — ข้อความใต้ปุ่ม export (design-162 §10) ใช้ตามสเปก
10. **`saveCalculatorTables` เขียน 2 ครั้งตาม pattern เดิม** — เช็ค `version` → `calculatorImportEntity.create({source:"MANUAL"})` → `calculatorConfigEntity.update(...)`. ถ้าขั้นที่สองชน conflict/ล้ม แถว MANUAL ที่สร้างแล้วจะค้างในประวัติเป็นเวอร์ชันที่ยังไม่ถูกใช้ (มองเห็นได้, กด "ใช้ชุดนี้" ได้, ไม่กระทบหน้าเว็บ) — ยอมรับ เหมือน preview → apply ของ On-grid. ทางที่ไม่เลือก: transaction ข้าม 2 `auditedEntity` (ต้องแก้ `src/lib/audit.ts` = นอก scope)
11. **Server ไม่เชื่อ payload ของ save** — zod cap: On-grid ≤ 200 แถว, Hybrid ≤ 500 แถว, ยี่ห้อ ≤ 10 ชื่อ; **ชุดชื่อยี่ห้อต้องเท่ากับตารางที่ใช้อยู่ทุกตัวและลำดับเดิม** (แก้ชื่อยี่ห้อได้ทาง Excel อย่างเดียว); ถ้าตารางที่ใช้อยู่ไม่มี Hybrid แต่ payload ส่ง `hybrid` มา → reject (Q1 ของ #162)
12. **Warning แผงต่างจากสูตร (E5) ใช้สูตร `(kW × 1.2) / 0.63` ทั้งตอน import และตอนแก้เอง** — validator ร่วมไม่เห็นคอลัมน์ `จำนวนคำนวณ` ของ Excel และ design-162 §8.5 อนุญาตให้ใช้สูตรทั้งสองทาง. R2-S2 ยืนยันกับไฟล์จริงว่าได้ 4 ขนาดเดิม (20/30/50/99.9)
13. **Segmented แบตบนมือถือ (<640px) ตัดเป็น 2 แถว ไม่เลื่อนแนวนอน** — `grid grid-cols-3` บนจอเล็ก, `flex` ตั้งแต่ `sm:` (6 ตัวเลือก = 2 แถวพอดี). เหตุผล: ตัวเลือกที่ถูกซ่อนท้ายแถบคือแบตใหญ่ที่ลูกค้าอยากลอง ซ่อนแล้วเสีย conversion ส่วนสัญญาณ "เลื่อนได้" มองข้ามง่ายบนมือถือ. `design-business-reviewer` เป็นคนตัดสินบน real render — ถ้าค้าน กลับไปทำแบบเลื่อน + fade ขอบ
14. **ใส่ข้อความสมมติฐานแบต (`batteryAssumption`) ใต้ gold badge เมื่อแบต > 0** — ปิดหัวข้อ "Not yet specified" ของ map ด้วย copy จาก design-157 §5 (TH "คิดจากแบตชาร์จเต็มและใช้หมดวันละ 1 รอบ" / EN "Assumes one full battery charge used per day"). `design-business-reviewer` ตัดสินถ้อยคำบน render จริง
15. **ป้าย audit `CalculatorImport`** ใน `src/lib/enum-labels.ts` เปลี่ยนจาก "ชุดตารางคำนวณ (Excel)" เป็น "ชุดตารางคำนวณ" (ตอนนี้มาจากการแก้เองได้ด้วย) — 1 บรรทัด, อยู่ใน R1-S2
16. **Fixture ทั้งหมดสังเคราะห์ตอนรัน** (repo PUBLIC) — ชีต Hybrid ใช้ยี่ห้อ `BrandA…BrandE` และราคาสังเคราะห์; ไฟล์จริงใช้เป็น optional check ที่พิมพ์แค่จำนวน (แถว, ขนาด, ช่อง E3, แถว E4, ขนาด E5) ไม่พิมพ์ราคา/ยี่ห้อ. golden output ของ R1-S1 เขียนลง `$TMPDIR` ไม่ commit
17. **Prototype เป็นแบบอ้างอิงเท่านั้น ห้าม cherry-pick/merge** — โดยเฉพาะ `_prototype/load-hybrid.ts` / `_proto/load-hybrid.ts` (อ่านไฟล์ Excel จริงตอน runtime), `variant-switcher.tsx`, `proto-switcher.tsx` และการแก้ `next.config.ts` / `page-shell.tsx` ใน branch prototype
18. **`e2e-booking.mts` hardcode `localhost:3000`** (fail เดิมที่บันทึกไว้ใน On-grid S7) — รัน production server ที่ port 3000 เมื่อต้องใช้ script นี้ ไม่แก้ script (surgical) เว้นแต่ fail ด้วยเหตุอื่น
19. **`LEAD_PII_FIELDS` ไม่เพิ่ม `interestedBatteryKwh`** (research-158 §5 — บริบทระบบ ไม่ใช่ PII)

## ข้อขัดแย้งระหว่าง sources (บันทึกไว้ ไม่ได้แก้เงียบ)

| # | ขัดกัน | ใช้อะไรในแผนนี้ | เหตุผล |
|---|---|---|---|
| C1 | design-157 §8 แนะนำ Variant A | **Variant B** | user เลือกจาก real render (#157 Resolution) |
| C2 | design-157 §0 ให้ user ตัดสินว่า On-grid ส่ง `system` ไหม | ส่ง `system` ทั้ง 2 โหมด, `battery` เฉพาะ Hybrid | #157 comment (user ตัดสิน) |
| C3 | research-158 §2 วาง merge 1φ/3φ ใน validator ร่วม | merge อยู่ฝั่ง import (Default #4) | ตัวแก้เก็บ phase เป็น set — กติกา mismatch ไม่มีความหมายนอก import |
| C4 | research-158 §3 วาง `toPublicHybridTable` ใน `calculator-hybrid.ts` แบบ server-only | แยกไฟล์ projection (Default #5) | #162 ต้องการ validator/recommend ฝั่ง client |
| C5 | research-158 §4 route export ใช้ `requireRole("ADMIN")` | `auth()` + 401/403 (Default #7) | pattern ของ `/api/admin/*` เดิม, e2e assert ได้ |
| C6 | design-157 §2 (B) ใช้ segmented `overflow-x-auto`; #157 ให้ตัดสินตอน implement | wrap 2 แถว (Default #13) | ตัดสินแล้ว — reviewer ค้านได้ |
| C7 | research-154 E13 "Reject หรือ Warn" | **Reject** | research-158 §1.3 (zod ต้องมีแถวแบต 0) + design-162 §5.4 (ลบแถวแบต 0 ไม่ได้) |
| C8 | design-162 §8.5 E5 ตอน import ใช้คอลัมน์ cached | สูตรทั้งสองทาง (Default #12) | validator ร่วมเห็นแค่ข้อมูลที่เก็บ; สเปกอนุญาต |
| C9 | prototype #162 ตั้ง `max-w-5xl` ที่ `PageShell`, ไม่มี warning Package, ประวัติ/save/export เป็น stub | ความกว้างตั้งที่ container ของแท็บ `size-table` เท่านั้น; warning Package อยู่ใน Dialog ยืนยัน; ทุกอย่างต่อ action จริง | #162 Resolution "ที่ prototype ทำต่างจาก spec" |

## Risk table

| # | ความเสี่ยง | โอกาส | ผลกระทบ | ลดความเสี่ยง | Sprint |
|---|---|---|---|---|---|
| R1 | ราคาแยกยี่ห้อ/ชื่อยี่ห้อหลุดไป browser (RSC payload) | กลาง | สูง (ต้นทุนคู่ค้า) | projection (Default #5) + test serialize ใน `verify-calculator.mts` + e2e grep HTML `/th|en/calculator` ว่าไม่มีชื่อยี่ห้อ fixture + `audit-compliance-reviewer` | R2-S1, R2-S4, R2-S9 |
| R2 | Rollback code R1 หลังมีแถว MANUAL → โค้ดเก่าเจอ `fileName`/`fileKey` เป็น null (R1-S2 ทดสอบแล้ว: หน้า admin ยัง render 200 ได้ แต่ยังไม่ได้ทดสอบ upload/dedupe/apply และ interaction ฝั่ง client กับแถว NULL; `deploy-verify` ประเมินว่าเสี่ยงต่ำแต่ไม่ใช่ศูนย์) | ต่ำ | กลาง | rollback SQL asset (Default #2) + ขั้นตอนใน R1-S7; ขอให้ save ด้วยมือครั้งแรกบน prod หลังผ่าน smoke เท่านั้น | R1-S2, R1-S7 |
| R3 | Refactor parser เปลี่ยนพฤติกรรม On-grid ที่ใช้อยู่บน prod | กลาง | สูง (ไฟล์เดิม reject/ตัวเลขเปลี่ยน) | golden output ก่อน/หลัง (ทุก fixture + ไฟล์จริงถ้ามี) ต้องเท่ากันทุกไบต์; `verify-calculator-import.mts` เดิมต้องเขียวก่อนเพิ่มอะไร | R1-S1 |
| R4 | Export แล้ว import กลับไม่เท่าเดิม | กลาง | กลาง | round-trip test ทั้ง 2 ชีตใน verify script (deep-equal, 0 warning จากสูตร) + e2e ดาวน์โหลดแล้วอัปโหลดกลับ | R1-S3, R2-S5 |
| R5 | Excel จริง/ราคาจริงเข้า repo PUBLIC | กลาง | สูง | fixture สังเคราะห์ (Default #16); `/stuffs/` ignored อยู่แล้ว; ทุก DoD มี `git diff --stat` ไม่มี `.xlsx` และ grep ชื่อยี่ห้อจริงในไฟล์ที่ commit = 0 | ทุก sprint |
| R6 | DDL ไม่ลงบน prod แต่โค้ดขึ้น → R1: admin calculator 500; **R2: ทุก quote submit 500 (เสีย lead)** | กลาง (เคยเกิด 2026-08-12) | สูงมาก (R2) | runbook rule #2: `SHOW COLUMNS` ด้วยตาเองก่อน restart; R2 write-path test ด้วย lead `[TEST]` | R1-S7, R2-S10 |
| R7 | Variant B ทำให้โหมด On-grid ต่างจาก prod ที่อนุมัติไว้ (#147) / design ถูก reject ที่ real render | กลาง | กลาง | tab หัวการ์ด render เฉพาะเมื่อมีตาราง Hybrid; On-grid ใช้ JSX เดิมทุกตัวอักษรนอกจากหัวการ์ด; e2e เทียบ DOM ของการ์ดเมื่อไม่มีตาราง Hybrid; `design-business-reviewer` gate | R2-S9, R2-S11 |
| R8 | แบต 6 ตัวเลือกบน 375px ล้น/ถูกซ่อน | สูง | กลาง | wrap 2 แถว (Default #13) + screenshot 375px ใน DoD | R2-S9 |
| R9 | Rollback R2 → R1 แล้วมีการ apply ระหว่างนั้น → `hybridSizeTable` ค้างไม่ตรงกับเวอร์ชันที่ใช้อยู่เมื่อ deploy R2 กลับ | ต่ำ | กลาง | ขั้น rollback R2 ตั้ง `hybridSizeTable = NULL`; ก่อน re-deploy กด "ใช้ชุดนี้" กับชุดที่มี Hybrid | R2-S10 |
| R10 | แก้ทับกัน (2 แท็บ / แก้เองชนกับ import) | ต่ำ | กลาง | optimistic lock `version` เดิม; ปุ่มนำเข้า/ใช้ชุดนี้ disabled ระหว่าง dirty; Dialog conflict ไม่ refresh เอง | R1-S4, R1-S6 |
| R11 | Payload save ที่ปลอมขึ้น (แก้ชื่อยี่ห้อ, สร้าง Hybrid เอง, แถวมหาศาล) | ต่ำ | กลาง | Default #11 + `audit-compliance-reviewer` | R1-S4, R2-S4 |
| R12 | Dedupe คืนแถวเก่าที่ไม่มี Hybrid → อัปโหลดแล้ว toggle ไม่ขึ้น | สูง (ไฟล์เดียวกับ On-grid S10) | กลาง | Default #3 + e2e อัปโหลดไฟล์เดิมซ้ำหลังเพิ่มชีต | R2-S4, R2-S11 |
| R13 | โค้ด prototype หลุดเข้า main (อ่าน Excel จริงตอน runtime) | ต่ำ | สูง | Default #17; DoD grep `_proto\|_prototype\|variant-switcher\|load-hybrid` ใน `src/` = 0 | R1-S5…R2-S9 |
| R14 | ข้อมูลในไฟล์เจ้าของผิด (แผงผิด 4 ขนาด, ราคาแบตอย่างเดียว 42 ช่อง) | สูง (มีอยู่แล้ว) | กลาง | ไม่รอเจ้าของ (#160) — warning E3/E4/E5 ใน preview/save; R2-S11 ส่ง screenshot warning ให้ owner | R2-S2, R2-S11 |
| R15 | สูตรนับแบตเป็นพลังงานเพิ่ม → ลูกค้าเข้าใจผิด | กลาง | กลาง | `batteryAssumption` (Default #14), cap ที่ค่าไฟ, design reviewer ตัดสิน copy | R2-S9 |
| R16 | Lead เก็บขนาดแบตทั้งที่ไม่ได้เลือก HYBRID | กลาง | ต่ำ | server ล้างเป็น null เมื่อ `interestedSystems` ไม่มี HYBRID + test | R2-S8 |
| R17 | การแจ้งเตือน lead ยังไม่เปิดใช้บน prod (#32) → ตรวจบรรทัดแบตบน prod ไม่ได้ | สูง | ต่ำ | ตรวจด้วยการเรียก formatter ใน local + log "no providers configured" ตาม verify skill | R2-S8 |

---

## S0 — Gate On-grid S10 + live baseline (prod + local)

**สรุปก่อนแก้**
- ทำไม: #153 ข้อ 8 — ต้องจบ On-grid S10 ก่อน และ user rule ให้ live-verify ก่อนแก้; baseline เป็น target ของ "R1 ไม่เปลี่ยน public" และ smoke ของทั้งสอง release
- Gate (ถ้าไม่ผ่าน = หยุด ไม่เริ่ม R1-S1):
  1. "สรุปหลังแก้" ของ On-grid S10 ใน `docs/plans/calculator-excel-import-sprints.md` ถูกกรอกแล้ว และ Status ของแผนนั้นเป็น S10 done
  2. `npx tsx scripts/pma-readonly-query.mts "SELECT id, sizeTableImportId, version, updatedAt FROM CalculatorConfig"` → `sizeTableImportId` ไม่เป็น null
  3. `npx tsx scripts/pma-readonly-query.mts "SELECT COUNT(*), MIN(createdAt), MAX(createdAt) FROM CalculatorImport"` → บันทึกจำนวน
- Baseline ที่ต้องบันทึก (ไม่ใส่ราคา/ชื่อยี่ห้อ):
  1. Prod public `/th/calculator` + `/en/calculator` (browser จริง): slider `min/max/step`, ขนาด/หลังติดตั้ง/ประหยัด/คืนทุน ที่ค่าไฟ 2,500 · 3,000 · 4,500 · 9,500 · 25,500 · 120,000 · 3,000,000 (พิมพ์) — screenshot desktop + 375px TH/EN (เก็บในเครื่อง ไม่ commit)
  2. Prod `/th/booking?tab=quote` checkbox ระบบที่สนใจ (ON_GRID/HYBRID/OFF_GRID) — screenshot
  3. Prod admin (owner login ให้ หรือระบุ skip): แท็บ "ตัวเลขการคำนวณ" + การ์ด Excel + ประวัติ
  4. Local: `npm run build` ✓ + `verify-calculator.mts` ✓ + `verify-calculator-import.mts` ✓ บน `main` ล่าสุด (เป็นจุดเริ่มของ golden output R1-S1)
  5. Content marker สำหรับ R1-S7: `curl -s -o /dev/null -w "%{http_code}" https://kkdproperty.co.th/api/admin/calculator/export` → คาด 404 ก่อน R1
- ไฟล์: แผนนี้ (หัวข้อ "สรุปหลังแก้" ของ S0) เท่านั้น

**DoD**
- [ ] Gate 1–3 ผ่าน (หลักฐานใน "สรุปหลังแก้")
- [ ] ตาราง baseline 7 ค่าไฟ × TH/EN
- Commit: `docs(calculator): record hybrid toggle live baseline`

**Rollback:** ไม่มี (บันทึกอย่างเดียว)

**สรุปหลังแก้** (2026-10-02 — prod อ่านอย่างเดียว: public page + SELECT ผ่าน `pma-readonly-query.mts`; ไม่ login admin)

**Gate**
1. ผ่านแบบมีเงื่อนไข — "สรุปหลังแก้" ของ On-grid S10 กรอกแล้ว (commit `docs(calculator): record excel size table go-live on production`) และ Status/tracker เป็น done* แต่หลักฐานข้อ 2/4 ของ S10 และการยืนยันจาก owner **ยังไม่มี** (ต้องใช้สิทธิ์ admin)
2. ผ่าน — `CalculatorConfig`: `sizeTableImportId` = `y7254twnizpdfr0tvqc6aem6` (ไม่ null), version 5, updatedAt 2026-09-25 20:01:35
3. ผ่าน — `CalculatorImport`: COUNT = 3, MIN createdAt 2026-09-25 20:01:18, MAX 2026-10-02 09:27:28 (ไฟล์ 2 ชุดล่าสุดยังไม่ถูก apply — ดูรายละเอียดใน S10 ของแผน On-grid)

**Baseline**
1. Public calculator (TH และ EN ได้ค่าตัวเลขเหมือนกัน). slider `min/max/step` = 500 / 8,000 / 100 (ค่าตั้งต้น 3,500)

| ค่าไฟ/เดือน | ขนาดที่แนะนำ | ค่าไฟหลังติดตั้ง | ประหยัด/เดือน | คืนทุน |
|---:|---|---:|---:|---|
| 2,500 | 3 kW | 475 | 2,025 | ~4.9 ปี |
| 3,000 | 5 kW (1 หรือ 3 เฟส), ยอดนิยม, ครอบคลุม 100% | — | 3,000 | ~5.2 ปี |
| 4,500 | 6 kW | 450 | 4,050 | ไม่แสดง → "ขอใบเสนอราคาเพื่อดูระยะคืนทุน" |
| 9,500 | 10 kW (1 หรือ 3 เฟส) | 2,750 | 6,750 | ~4.2 ปี |
| 25,500 | 40 kW, ครอบคลุม 100% | — | 25,500 | ไม่แสดง → CTA |
| 120,000 | 125 kW | 35,625 | 84,375 | ไม่แสดง → CTA |
| 3,000,000 (พิมพ์) | TH "ระบบเกิน 3,000 kW ปรึกษาทีมงาน" / EN "System larger than 3,000 kW — talk to our team" | — | — | — |

   (แถว 3,000 / 25,500 หน้าเว็บไม่แสดงตัวเลขค่าไฟหลังติดตั้ง แต่แสดงข้อความ "ครอบคลุมค่าไฟเต็ม 100%" แทน) Screenshot เก็บในเครื่องเท่านั้น (ไม่ commit): 28 ไฟล์ = 7 ค่าไฟ × TH/EN × desktop 1280px/375px (+ 2 ไฟล์ booking), ที่ scratchpad ของ session นี้ `shots/`
2. Prod `/th|en/booking?tab=quote`: checkbox `interestedSystems` มี 3 ค่า (ON_GRID / HYBRID / OFF_GRID) ทั้ง TH และ EN; screenshot เก็บในเครื่อง (`shots/{th,en}-booking-quote.png`)
3. Prod admin: **skip** — ต้องให้ owner login (ไม่ได้ login/กดอะไรใน admin บน prod)
4. Local บน `main` (working tree หลัก, MySQL ใน docker ทำงานอยู่): `npm run build` — `✓ Compiled successfully` + `Finished TypeScript` ไม่มี error; `verify-calculator.mts` — All assertions passed; `verify-calculator-import.mts` — All assertions passed
5. Content marker: `GET https://kkdproperty.co.th/api/admin/calculator/export` → **404** (ตามคาด ก่อน R1)

สถานะ: S0 ทำครบตามที่ทำได้โดยไม่ใช้สิทธิ์ admin. ยังไม่เริ่ม R1-S1. ก่อนเริ่มควรให้ owner ยืนยันข้อค้างของ On-grid S10

---

# Release R1 — On-grid: แก้ตารางเอง + export + ประวัติรวม

ยังไม่มีแท็บย่อย Hybrid (Q6 ของ #162) — แท็บ "ตารางขนาดระบบ" แสดงรายการ On-grid ตรง ๆ

## R1-S1 — แยก validator On-grid ออกจาก parser (ไม่เปลี่ยนพฤติกรรม)

**สรุปก่อนแก้**
- ทำไม: #161 ข้อ 4 — import และการแก้เองต้องใช้ validator ตัวเดียวกัน; ตอนนี้ `parse-on-grid.ts` (597 บรรทัด) รวมการอ่านชีตกับการตรวจตารางไว้ด้วยกัน และ import `exceljs` จึงใช้ฝั่ง client ไม่ได้
- ขั้นแรก (ก่อนแก้โค้ด): เขียน golden output ของ `importOnGridSizeTable()` ทุก fixture ใน `scripts/lib/calculator-import-fixtures.ts` + ไฟล์จริงถ้ามี (rows, warnings, issues ทั้งข้อความ) ลง `$TMPDIR/kkd-r1s1-golden.json` ด้วย throwaway script (ไม่ commit)
- ไฟล์:
  - `src/lib/calculator-import/read-on-grid.ts` (ใหม่ — ย้ายจาก `parse-on-grid.ts`) — หา sheet/header/คอลัมน์, อ่าน cell → raw rows พร้อม `excelRow`, issue ระดับ cell, **merge 1φ/3φ** + `phaseMismatch` (Default #4) → `{ rows: SizeRow[]; sourceRows: number[][]; issues; warnings }`
  - `src/lib/calculator-import/validate-on-grid.ts` (ใหม่, **client-safe — ห้าม import exceljs/jszip**) — `validateOnGridTable(rows: SizeRow[]): { rows; issues: TableIssue[]; warnings }` ย้ายกติการะดับตารางจาก `parse-on-grid.ts:474-580` (billMin/billMax, billMax เพิ่มเคร่งครัด, kW ซ้ำ, roof fallback, `sizeTableSchema` เป็นด่านสุดท้าย)
  - `src/lib/calculator-import/messages.ts` — type `TableIssue = { table: "onGrid" | "hybrid"; rowIndex: number; field?: string; message: string }` + ตัวแปลง `toExcelLocation(issue, sourceRows)` ให้ข้อความ import ออกมาเหมือนเดิมทุกตัวอักษร
  - `src/lib/calculator-import/parse-on-grid.ts` — เหลือ `parseOnGridSheet()` เป็น wrapper (`read` → `validate` → แปลงตำแหน่ง) เพื่อให้ผู้เรียกเดิมไม่ต้องแก้; หรือลบถ้า `grep -rn parseOnGridSheet src scripts` เหลือแค่ `index.ts` (ให้ nextjs-dev เลือก บันทึกใน "สรุปหลังแก้")
  - `src/lib/calculator-import/index.ts` — re-export ตามเดิม
  - `scripts/verify-calculator-import.mts` — เพิ่ม section "shared validator": เรียก `validateOnGridTable` ตรงกับ `DEFAULT_SIZE_TABLE` (0 issue), billMax ไม่เพิ่ม (issue ชี้ `rowIndex`/`field` ถูก), kW ซ้ำ, ค่าเกินช่วง
  - `CONTEXT.md` (subsection Calculator) — ศัพท์ "ชุดตาราง (เวอร์ชัน)", "แก้ในหลังบ้าน (MANUAL)", "validator ร่วม"
- ไม่แตะ: action, UI, schema

**DoD**
- [ ] golden output หลังแก้ deep-equal กับก่อนแก้ทุก fixture (+ ไฟล์จริงถ้ามี) — แสดงผลเทียบใน "สรุปหลังแก้"
- [ ] `npx tsx scripts/verify-calculator-import.mts` ✓ ทุกบรรทัด (เดิม + ใหม่) · `npx tsx scripts/verify-calculator.mts` ✓
- [ ] `grep -n "exceljs\|jszip" src/lib/calculator-import/validate-on-grid.ts src/lib/calculator-import/diff.ts src/lib/calculator-import/messages.ts` → ว่าง
- [ ] `npx tsc --noEmit -p .` · `npx eslint <ไฟล์ที่แตะ>` · `npm run build` ✓ Compiled + Finished TypeScript
- [ ] `git diff --stat` ไม่มี `.xlsx`
- Commits: `refactor(calculator): split on-grid sheet reader from shared table validator` · `test(calculator): cover shared on-grid table validator` · `docs(calculator): add table version terms to context`

**Rollback:** revert — ไม่มีพฤติกรรมเปลี่ยน, ไม่มีผู้เรียกใหม่

**สรุปหลังแก้ (2026-10-02)**
- ไฟล์: `read-on-grid.ts` (ใหม่ — `git mv` จาก `parse-on-grid.ts`; อ่านชีต/merge 1φ/3φ → `{rows, sourceRows, warnings, rowsRead, skippedSheets}`), `validate-on-grid.ts` (ใหม่, import แค่ zod schema + `messages.ts`), `messages.ts` (+ `TableIssue`, `TableWarning`, builder, `toExcelLocation`), `parse-on-grid.ts` (เหลือ `parseOnGridSheet()` wrapper: read → `validateOnGridTable` → `toExcelLocation`), `index.ts` (แก้แค่ comment), `verify-calculator-import.mts` (+ section "shared validator" 8 assertions), `CONTEXT.md` (+ 3 ศัพท์)
- **เลือกเก็บ wrapper ไม่ลบ**: `index.ts` เป็นผู้เรียกเดียว แต่ `export * from "./parse-on-grid"` ทำให้ `parseOnGridSheet`/`ParseOnGridResult` เป็น API สาธารณะของ module; เก็บไว้แล้ว `index.ts` ไม่ต้องแก้ logic และ R1-S4 มีจุดประกอบ pipeline จุดเดียว
- **Golden (ก่อน/หลัง)**: เขียนด้วย throwaway wrapper ที่ดักทุกการเรียก `importOnGridSizeTable()` ของ `verify-calculator-import.mts` เดิม (HEAD) → 18 การเรียก (fixture สังเคราะห์ทุกตัว + `stuffs/คำนวณติดตั้ง.xlsx` + `docs/stuffs/…` เมื่อมีไฟล์) เก็บ rows/warnings/issues เต็มข้อความที่ `$TMPDIR/kkd-r1s1-golden.json`; หลังแก้ `cmp` = **เท่ากันทุก byte** (sha1 เหมือนกัน). golden ชุดนี้ไม่มี fixture ของ out-of-range / bill-min-gte-max / duplicate-same-phase / text-number / not-sorted จึงเพิ่มชุดเสริม 12 เคส (รวมเคสผสม range+bill-max-missing, range+gte) รันบน HEAD (stash) เทียบกับหลังแก้ = **เท่ากันทุก byte** เช่นกัน (ไม่ commit)
- **ต่างจากแผน**: (1) ตรวจ range ต่อแถว + `billMin<billMax` อยู่ใน validator เป็นฟังก์ชันระดับแถว `validateOnGridRowRanges/Bill` ที่ reader เรียกระหว่างอ่าน เพื่อให้เคสผสม (range + bill-max-missing ในแถวเดียวกัน) รายงานครบเหมือนเดิม; `validateOnGridTable` เรียกชุดเดียวกันซ้ำสำหรับตารางที่แก้เอง (2) `TableIssue` เพิ่ม `code` และ `data?` (ต้องใช้สร้างข้อความ Excel เดิมกลับ) (3) `toExcelLocation(issue, sourceRows, columns?)` รับ map field→อักษรคอลัมน์ เพราะข้อความ out-of-range ระบุคอลัมน์ (4) roof fallback (× 2.7) ยังอยู่ใน reader เพราะ warning ระบุเลขแถว Excel; validator ตรวจ roof ผ่าน zod schema ด่านสุดท้าย (5) `rowIndex` ของ validator = index ใน array ที่ส่งเข้า (ไม่ใช่ลำดับหลังเรียง) (6) เพิ่มโค้ด `duplicate-kw` ใหม่สำหรับตารางที่แก้เอง — import ไปไม่ถึงเพราะ reader merge ซ้ำก่อน
- Verify: golden เท่ากัน · `verify-calculator-import.mts` 72 ✓ · `verify-calculator.mts` ✓ · `tsc --noEmit` / `eslint` สะอาด · grep exceljs/jszip ใน validate-on-grid/diff/messages = ว่าง (import chain ของ validate-on-grid = zod + messages เท่านั้น; ไม่ได้ทดสอบ build ด้วย client component ชั่วคราว) · `npm run build` ✓ Compiled + Finished TypeScript · `e2e-calculator-config.mts` ✓ · `git diff --stat` ไม่มี `.xlsx`

---

## R1-S2 — Schema R1 + DDL asset + rollback SQL + ผู้อ่าน `fileName`  ✅ ขนานกับ R1-S1

**สรุปก่อนแก้**
- ทำไม: `CalculatorImport` ต้องเก็บเวอร์ชันที่ไม่มีไฟล์ (research-158 §1.2, H3)
- ไฟล์:
  - `prisma/schema.prisma` `CalculatorImport` — `source String @default("EXCEL") @db.VarChar(10)`; `fileName String? @db.VarChar(120)`, `fileKey String? @db.VarChar(120)`, `sha256 String? @db.Char(64)`, `sizeBytes Int?`. ไม่ rename `rows`, ไม่แตะ `CalculatorConfig`
  - `prisma/migrations/<ts>_calculator_import_source_manual/migration.sql` — จาก `npx prisma migrate dev` (รัน `npx tsx scripts/backup-db.mts` ก่อน)
  - `docs/plans/assets/calculator-hybrid-r1-production-ddl.sql` (ใหม่) — engine pre-check (`information_schema.TABLES` ของ `CalculatorImport` = InnoDB) → `ALTER TABLE CalculatorImport ADD COLUMN IF NOT EXISTS source VARCHAR(10) NOT NULL DEFAULT 'EXCEL', MODIFY fileName VARCHAR(120) NULL, MODIFY fileKey VARCHAR(120) NULL, MODIFY sha256 CHAR(64) NULL, MODIFY sizeBytes INT NULL;` (collation/charset คัดลอกจาก migration.sql ห้ามเขียนเดา) → verify `SHOW CREATE TABLE CalculatorImport` + `SELECT source, COUNT(*) FROM CalculatorImport GROUP BY source` (คาด EXCEL ทั้งหมด). additive/relax เท่านั้น ไม่มี DROP
  - `docs/plans/assets/calculator-hybrid-r1-rollback-manual-rows.sql` (ใหม่ — ใช้เฉพาะตอน rollback code R1, Default #2):
    ```sql
    UPDATE CalculatorImport
       SET fileName = 'manual-edit.xlsx',
           fileKey  = CONCAT('private/calculator-imports/', id, '.xlsx'),
           sha256   = REPEAT('0', 64),
           sizeBytes = 0
     WHERE source = 'MANUAL' AND fileName IS NULL;
    SELECT COUNT(*) FROM CalculatorImport
     WHERE fileName IS NULL OR fileKey IS NULL OR sha256 IS NULL OR sizeBytes IS NULL;  -- ต้องได้ 0
    ```
  - ผู้อ่านที่ type เปลี่ยนเป็น nullable (แก้ให้ build ผ่านโดยไม่เปลี่ยนพฤติกรรม): `src/actions/calculator-import.ts` (snapshot projection + `source`; dedupe `where: { sha256, source: "EXCEL" }`), `src/app/admin/(dashboard)/pages/calculator/page.tsx` (history select + `source`), `calculator-size-table-card.tsx` (ลิงก์ดาวน์โหลดเฉพาะเมื่อ `fileKey` มีค่า)
  - `src/lib/enum-labels.ts` — `CalculatorImport: "ชุดตารางคำนวณ"` (Default #15)
  - `scripts/lib/storage-engine-contract.ts` — **ไม่แตะ** (ไม่มีตารางใหม่ — research-158 H5)

**DoD**
- [ ] `npx tsx scripts/backup-db.mts` ก่อน migrate → `npx prisma migrate dev` ✓ → `npx prisma db seed` ×2 ✓
- [ ] `npx tsx scripts/verify-storage-engine.mts` ✓ · `npx tsx scripts/restore-db.mts` (dry-run) ✓
- [ ] rollback SQL ทดสอบบน local: สร้างแถว MANUAL ด้วยมือ (Prisma Studio/SQL) → รัน asset → checkout โค้ดก่อน R1-S2 ใน worktree ชั่วคราว → `/admin/pages/calculator` render ได้ไม่ 500 → ลบ worktree
- [ ] `npm run build` ✓ · `npm run start` + `npx tsx scripts/e2e-calculator-config.mts` ✓ (upload/apply/rollback เดิมไม่พัง) · `npx tsx scripts/e2e-admin.mts` ✓ (`/files` calculator-imports ADMIN-only)
- [ ] `deploy-verify` ตรวจ 2 asset: InnoDB pre-check, ชนิดตรง migration, idempotent, ไม่มี DROP, rollback SQL ไม่แตะแถว EXCEL
- Commits: `feat(calculator): allow calculator import versions without a source file` · `docs(deploy): add production ddl and rollback sql for calculator table versions`

**Rollback (local):** `git revert` + `npx prisma migrate reset`. **Prod:** ยังไม่เกี่ยว (รันใน R1-S7)

**สรุปหลังแก้ (2026-10-02)**
- **เวอร์ชัน DB (เช็คก่อนเขียน SQL)**: prod = **MariaDB 10.6.24-cll-lve** (`@@version_comment` = MariaDB Server; `CalculatorImport` = InnoDB, `utf8mb4_unicode_ci`; อ่านผ่าน `pma-readonly-query.mts` SELECT อย่างเดียว) · local docker = **MySQL 8.0.46**. ต่างจากข้อสมมติในแผน/brief ที่ว่าอาจเป็น MySQL: prod เป็น MariaDB จึงใช้ `ADD COLUMN IF NOT EXISTS` ได้ (เหมือน asset DDL ก่อนหน้า) และ DDL asset ใส่คำเตือนห้ามรันบน MySQL 8 + ขั้น 0b เช็ค `information_schema.COLUMNS` ถ้าวันหนึ่งต้องรันบน MySQL
- ไฟล์: `prisma/schema.prisma`, `prisma/migrations/20261002165047_calculator_import_source_manual/migration.sql` (จาก `migrate dev`; ก่อนหน้านั้นรัน `backup-db.mts`), `docs/plans/assets/calculator-hybrid-r1-production-ddl.sql`, `docs/plans/assets/calculator-hybrid-r1-rollback-manual-rows.sql`, `src/actions/calculator-import.ts` (snapshot + `source` ไม่มี rows/fileKey; dedupe `where {sha256, source:"EXCEL"}`; `fileName ?? ` ที่ return เพื่อให้ type เป็น string), `pages/calculator/page.tsx` (select `source`+`fileKey` แต่ส่งให้ client แค่ `hasSourceFile: boolean` — ไม่ส่ง storage key; MANUAL แสดงชื่อ "แก้ในหลังบ้าน"), `calculator-size-table-card.tsx` (ลิงก์ดาวน์โหลดเฉพาะ `hasSourceFile`), `src/lib/enum-labels.ts`, `scripts/e2e-calculator-config.mts` (บรรทัด 364 รอป้ายใหม่ — ป้ายเดิม "(Excel)" ถูก Default #15 เปลี่ยน e2e จึงต้องตามไปด้วย)
- DDL asset: คอลัมน์/ชนิดคัดลอกจาก `migration.sql`; charset/collation ไม่ได้เขียนใหม่ (ตารางมี `utf8mb4_unicode_ci` อยู่แล้ว, ALTER ไม่เปลี่ยน); ไม่มี DROP, ไม่ใช้ stored procedure
- Verify: `backup-db` → `migrate dev` ✓ → `db seed` ×2 ✓ · `tsc` / `eslint` สะอาด · `npm run build` ✓ Compiled + Finished TypeScript · `verify-storage-engine` ENGINE_GATE=GREEN · `restore-db` dry-run ✓ · `e2e-calculator-config` ✓ ทุกบรรทัด (รวม AUDIT ป้ายใหม่) · `e2e-admin` ✓ ทุกบรรทัด (calculator-imports ADMIN 200 / anon+FINANCE 401)
- **ทดสอบ rollback SQL บน local**: แทรกแถว MANUAL (ฟิลด์ไฟล์ NULL) → รัน asset (แถวถูก backfill, verify COUNT = 0, รันซ้ำได้ 0 แถวถูกแก้) → worktree ชั่วคราวที่ `$TMPDIR` จาก `70d4dc6` (prisma generate จาก schema เก่า, build ✓, ชี้ DB เดียวกัน) → login ADMIN แล้ว `/admin/pages/calculator` = **200** และเห็น `manual-edit.xlsx` ในประวัติ → ลบ worktree + แถวทดสอบแล้ว (`git worktree list` เหลือของเดิม). **ข้อสังเกต**: control (ตั้งฟิลด์ไฟล์เป็น NULL, ไม่รัน asset) โค้ดเก่าก็ยัง render 200 เช่นกัน — Prisma 7 + driver adapter ไม่ throw ตอนอ่าน NULL ใน String field ที่หน้านี้ใช้ ดังนั้นความเสี่ยง R2 ที่ระบุ ("throw ที่ fileName null") ไม่เกิดบนเส้นทางนี้ในการทดสอบ; asset ยังมีประโยชน์ (ชื่อไฟล์/ลิงก์ในประวัติโค้ดเก่าไม่ว่าง) แต่เป็น defense-in-depth มากกว่า blocker. ไม่ได้ทดสอบเส้นทาง upload/dedupe ของโค้ดเก่ากับแถว NULL
- ต่างจากแผน: เพิ่ม `hasSourceFile`/`source` ใน `SizeTableHistoryItem`; แก้ e2e 1 บรรทัด (ไม่อยู่ในรายการไฟล์ของแผน); ไม่แตะ `storage-engine-contract.ts`; ไม่แตะ prod (SELECT อย่างเดียว)

---

## R1-S3 — Export On-grid + route + round-trip  (⏳ R1-S1, ✅ ขนานกับ R1-S2)

**สรุปก่อนแก้**
- ทำไม: #161 ข้อ 3/5 — เจ้าของต้องดาวน์โหลดตารางปัจจุบัน แก้ใน Excel แล้วนำเข้ากลับโดยค่าที่แก้เองไม่หาย
- ไฟล์:
  - `src/lib/calculator-import/export.ts` (ใหม่, server-only comment) — `buildCalculatorWorkbook({ onGrid }): Promise<Buffer>` ด้วย ExcelJS: ชื่อชีต `On-grid`, header 2 แถว (group/sub) ด้วย label ที่ `read-on-grid.ts` ใช้หา (ห้าม hardcode label ซ้ำ — export ค่าคงที่ mapping จาก reader), แถวละ (kW, phase) แยก 1φ/3φ เหมือนไฟล์ต้นแบบ, ค่าที่กรอกเป็น value, ช่องคำนวณ (ผลิต kWh/วัน, kWh/เดือน, หลังคา, ประหยัด/เดือน) เป็น `{ formula, result }` (research-158 H6); คอลัมน์ตาม Default #9
  - `src/app/api/admin/calculator/export/route.ts` (ใหม่) — `GET`: `auth()` → 401 / role ≠ ADMIN → 403 (Default #7) → อ่าน `CalculatorConfig` → `resolveSizeTable` → `buildCalculatorWorkbook` → headers ตาม Default #7; error → 500 JSON ทั่วไป (ไม่ส่ง `err.message`)
  - `scripts/verify-calculator-import.mts` — round-trip: `DEFAULT_SIZE_TABLE` และตาราง fixture หลายขนาด (มี 1φ/3φ, ทศนิยม, MW) → export → `importOnGridSizeTable` → deep-equal, 0 issue, 0 warning ของสูตร
  - `scripts/e2e-admin.mts` — anon → 401, FINANCE/MARKETING → 403, ADMIN → 200 + `content-disposition: attachment` + `x-content-type-options: nosniff` + `cache-control: no-store`
- Security: route อ่านอย่างเดียว; proxy ไม่ครอบ `/api` จึงต้องตรวจ session ใน route เสมอ

**DoD**
- [ ] `npx tsx scripts/verify-calculator-import.mts` ✓ รวม round-trip
- [ ] `npm run build` ✓ · `npm run start` → `npx tsx scripts/e2e-admin.mts` ✓ ทุกบรรทัด
- [x] เปิดไฟล์ที่ export ใน Excel/Numbers ด้วยตา: header 2 แถว, สูตรคำนวณใหม่ได้, ไม่มี error cell — ตรวจ 2026-10-02 ด้วย Microsoft Excel (AppleScript `calculate full` แล้วอ่านทุก cell): 21 คอลัมน์ × 7 แถว สูตรคำนวณได้ทุกช่อง ไม่มี error, ค่าตรง (3 kW → 15 / 450 / หลังคา 16.2 / ประหยัด 2,025 / ปี 20,250)
- [ ] `audit-compliance-reviewer`: route ตรวจ session + role ก่อนอ่าน DB, headers ครบ, ไม่มี stack ใน response
- [ ] `git diff --stat` ไม่มี `.xlsx`
- Commits: `feat(calculator): export active on-grid size table as template-faithful excel` · `test(calculator): prove on-grid excel export round-trips through import`

**Rollback:** revert — ยังไม่มีปุ่มใน UI

**สรุปหลังแก้:** เพิ่ม `export.ts` (`buildCalculatorWorkbook`, ชีต `On-grid` 21 คอลัมน์, header 2 แถว merge แบบไฟล์ต้นแบบ, ค่ากรอก = value, คอลัมน์คำนวณ = สูตร + `result`, ช่องหลังคาเป็นสูตร `จำนวนติดตั้ง*2.7` เฉพาะเมื่อค่าตรงสูตร ไม่งั้นคงเป็น value) · export `ON_GRID_HEADER` จาก `read-on-grid.ts` แล้วให้ `findColumns` ใช้ค่าชุดเดียวกัน (label ไม่ซ้ำ) · route `GET /api/admin/calculator/export` (`auth()` → 401, ไม่ใช่ ADMIN → 403, headers ตาม Default #7, 500 JSON ทั่วไป) · round-trip ใน `verify-calculator-import.mts` (`DEFAULT_SIZE_TABLE`, ตารางสังเคราะห์, ไฟล์จริงถ้ามี → deep-equal + 0 warning) · e2e-admin เพิ่ม anon 401 / FINANCE, MARKETING 403 / ADMIN 200 + headers. ต่างจากแผน: สูตร "จำนวนคำนวณ" ใช้ของไฟล์ต้นแบบ `((kW*0.15)+kW)/0.63` ไม่ใช่ `kW*1.2/0.63` ของ Default #12 (คอลัมน์นี้ importer ไม่อ่าน). ตรวจเพิ่มหลัง commit: เปิดใน Microsoft Excel ผ่าน (DoD ข้อ 3) และ `audit-compliance-reviewer` PASS 4/4 (สิทธิ์ 401/403 ก่อนอ่าน DB, headers, ส่งออกแค่ On-grid, read-only)

**Status:** code เสร็จ + verify ผ่าน (รอตาคน/reviewer ตาม DoD)


---

## R1-S4 — Action `saveCalculatorTables` (On-grid) + preview/apply/reset รู้จัก `source`  (⏳ R1-S1, R1-S2)

**สรุปก่อนแก้**
- ทำไม: research-158 §4 — การแก้เองต้องเป็นเวอร์ชันในประวัติเดียวกัน, ผ่าน validator ตัวเดียวกัน, audit ครบ
- ไฟล์:
  - `src/actions/calculator-import.ts`
    - **ใหม่** `saveCalculatorTables({ onGrid, version })`: `requireRole("ADMIN")` → zod รูปข้อมูล + cap (Default #11) → `validateOnGridTable` (ตัวเดียวกับ import) → มี issue คืน `{ ok: false, issues: TableIssue[] }` → โหลด config, `version` ไม่ตรง → `{ conflict: true }` → `calculatorImportEntity.create({ source: "MANUAL", rows, warnings, fileName/fileKey/sha256/sizeBytes: null, uploadedById })` → `calculatorConfigEntity.update({ sizeTable, sizeTableImportId, version + 1 })` → revalidate `/admin/pages/calculator`, `/th/calculator`, `/en/calculator` → `{ ok: true, importId, version }` (Default #10)
    - signature รับ object เพื่อให้ R2-S4 เพิ่ม `hybrid` ได้โดยไม่เปลี่ยนผู้เรียก
    - `previewCalculatorImport` — create ด้วย `source: "EXCEL"`; dedupe เฉพาะ EXCEL; คืน `activeSource`, `activeSavedAt`, `activeSavedByName` (สำหรับกล่อง "แทนที่ทั้งชุด" — design-162 §8.3 ข้อ 3)
    - snapshot projection ของ `CalculatorImport` + `source` (ยังไม่มี `rows`/`fileKey`)
  - `src/actions/calculator-config.ts` — `resetCalculatorConfigToDefaults` ไม่เปลี่ยน logic ใน R1 (hybrid ยังไม่มี)
  - `src/lib/calculator-import/messages.ts` — ข้อความ issue ของการแก้เอง (`Hybrid/On-grid {kw} kW: …` ตาม design-162 §8.5 คอลัมน์ "แก้ในหลังบ้าน")
- หมายเหตุ: action ต้องการ session จริง → e2e ผ่าน UI อยู่ใน R1-S6 (เหมือน On-grid S5)

**DoD**
- [ ] `npm run build` ✓ · `verify-calculator.mts` ✓ · `verify-calculator-import.mts` ✓
- [ ] `npm run start` → `e2e-calculator-config.mts` ✓ (flow เดิม) · `e2e-admin-crud.mts` ✓ (audit ไม่พัง)
- [ ] `audit-compliance-reviewer`: ทุก export เริ่ม `requireRole("ADMIN")`; create/update ผ่าน `auditedEntity`; snapshot ไม่มี `rows`/`fileKey`; server ไม่เชื่อ client (validate ซ้ำ + cap); error ไม่รั่ว stack; dedupe ไม่คืนแถว MANUAL
- Commits: `feat(calculator): save hand-edited on-grid size table as a new table version`

**Rollback:** revert — ยังไม่มี UI เรียก

**สรุปหลังแก้:** เพิ่ม `saveCalculatorTables({ onGrid, version })` ใน `src/actions/calculator-import.ts` — `requireRole("ADMIN")` → zod รูปข้อมูล (≤ 200 แถว) → `validateOnGridTable` (ไม่ผ่านคืน `{ ok:false, issues }` พร้อม `rowIndex`/`field`, ข้อความขึ้นต้น "On-grid {kw} kW:" ผ่าน `toManualLocation` ใหม่ใน `messages.ts`) → เช็ค `version` (ชน = `{ conflict:true }`) → สร้าง `CalculatorImport` MANUAL (ฟิลด์ไฟล์ null) → update config (+1 version) ผ่าน `auditedEntity` ทั้งคู่ → `{ ok, importId, version }`. `previewCalculatorImport` คืน `activeSource/activeSavedAt/activeSavedByName` เพิ่ม และสร้างแถวด้วย `source:"EXCEL"` ชัดเจน (dedupe เดิมกรอง EXCEL อยู่แล้ว). snapshot projection ของ import มี `source` อยู่แล้วจาก R1-S2 จึงไม่แก้. `resetCalculatorConfigToDefaults` ไม่แก้.
- e2e: `scripts/e2e-save-calculator-tables.mts` (POST server action ตรงพร้อม session) — Next ลงทะเบียน action ในมานิเฟสต์เมื่อมี client อ้างถึงเท่านั้น ตอนนี้ยังไม่มี UI จึงสคริปต์ SKIP (exit 0) จนกว่า R1-S6 จะมาถึง; ตอนรันจริงใช้ harness ชั่วคราวใน card (ย้อนแล้ว ไม่ได้ commit) — Reject, save + public + audit + rollback, conflict, MARKETING ผ่านครบ
- ข้อแตกต่างจากแผน: ไม่มี (ข้อ "ชื่อ field/คืน activeSource" ทำตามแผน)
- follow-up (`fix(calculator): make table version lock atomic for save and apply`): finding ของ `audit-compliance-reviewer` — เช็ค `version` นอก transaction ไม่ atomic. เพิ่ม `auditedEntity.updateVersioned(id, expectedVersion, data)` ใน `src/lib/audit.ts` (conditional `updateMany` + increment ใน tx เดียวกับการเขียนและ audit, ชน = `{ conflict:true }` ไม่มี side effect) ใช้ใน `saveCalculatorTables` และ `applyCalculatorImport` + ครอบ try/catch ขั้น update. ยังเขียน 2 ครั้งตาม Default #10 (แถว MANUAL ของผู้แพ้ race ค้างในประวัติ). e2e: เคส "ส่งพร้อมกัน 2 คำขอด้วย version เดียวกัน" ทั้ง save และ apply ใน `e2e-save-calculator-tables.mts` -> 1 ok + 1 conflict ✓ (ใช้ harness ชั่วคราว ถอดแล้ว)

- follow-up 2 (`fix(calculator): use the atomic version guard for calculator config saves`): finding ของ `audit-compliance-reviewer` บน `51a0406` — `updateCalculatorConfig`/`resetCalculatorConfigToDefaults` ยังเช็ค version นอก tx แล้ว `update` ไม่มีเงื่อนไขที่ DB จึงเขียนทับ save/apply ของตารางเงียบ ๆ ได้. ย้ายทั้งคู่ไป `calculatorConfig.updateVersioned` (ครอบ try/catch คืนข้อความคงที่, `requireRole("ADMIN")` ยังเป็นบรรทัดแรก, snapshot full เหมือนเดิม). reset ไม่ได้รับ version จาก UI (ปุ่มไม่ส่ง; ไม่เปลี่ยน contract) จึงล็อกด้วย version ที่อ่านก่อนเขียนทันที — กัน writer ที่ commit คั่นกลาง ได้ `{ conflict:true }` -> toast เดิม. `updateVersioned` รับ `data: UpdateData & { version?: never }` ให้ type ห้ามส่ง `version` (ไม่ใช้ `Omit` เพราะจะทำให้ Prisma XOR union พัง). e2e: เพิ่มเคส config save ชนกับ table save และกับ apply ด้วย version เดียวกัน -> 1 ok + 1 conflict ✓ ใน `e2e-save-calculator-tables.mts` (raw multipart POST; ใช้ harness ชั่วคราวให้ action ถูกลงมานิเฟสต์ แล้วถอดแล้ว)

---

## R1-S5 — แท็บ "ตารางขนาดระบบ": โครงหน้า + นำเข้า + ประวัติ + export + รายการอ่านอย่างเดียว  (⏳ R1-S2, R1-S3)

**สรุปก่อนแก้**
- ทำไม: design-162 §1.2 L1, §2, §8–§10 — แยกตารางออกจากแท็บตัวเลข; ทำส่วนที่ไม่ต้องมีตัวแก้ก่อนเพื่อให้ sprint เล็กและ review ได้
- อ้างอิง markup: `prototype/162-admin-table-editor` @ `b814f4c` (`?variant=B`) — ดูเป็นแบบเท่านั้น (Default #17)
- ไฟล์ (ใน `src/app/admin/(dashboard)/pages/calculator/`):
  - `calculator-admin-shell.tsx` — แท็บ `value="size-table"` `id="calculator-tab-size-table"` เฉพาะ `canManageConfig`, ลำดับ เนื้อหา · แบนเนอร์ · ตัวเลขการคำนวณ · ตารางขนาดระบบ · Properties, `TabsContent keepMounted`; description ของ PageShell ตาม §2.1
  - `calculator-config-tab.tsx` — เอาการ์ดตารางออก + บรรทัดชี้แท็บใหม่ (§2.2); copy reset ฉบับ R1 (ยังไม่พูดถึง Hybrid)
  - `calculator-size-table-card.tsx` → rename เป็น `calculator-import-panel.tsx` (เหลือ upload/reject/preview/apply); ข้อความกล่องคำอธิบายฉบับ R1 ("นำเข้าแล้วจะแทนที่ตารางทั้งชุด รวมถึงค่าที่แก้ในหลังบ้าน"); กล่อง "แทนที่ทั้งชุด" เมื่อชุดที่ใช้อยู่เป็น MANUAL (§8.3 ข้อ 3, Q5)
  - `calculator-tables-tab.tsx` (ใหม่) — container `mx-auto max-w-5xl min-w-0 space-y-6` **ที่ระดับแท็บ ไม่ใช่ `PageShell`** (C9); กล่อง "ที่ใช้อยู่" (§10) + `<a id="calc-export" href="/api/admin/calculator/export">` + ปุ่มนำเข้า (`aria-expanded`); รายการ On-grid
  - `calculator-table-list.tsx` (ใหม่) — `OnGridList` อ่านอย่างเดียว คอลัมน์ §4.2 (ผลิต/ประหยัดใช้ฟังก์ชันเดียวกับ public), ปุ่ม "แก้ไข"/"+ เพิ่มขนาด" render แต่ disabled จนถึง R1-S6
  - `calculator-version-history.tsx` (ใหม่ — ย้ายจากการ์ดเดิม) — ป้าย "Excel: <ไฟล์>" / "แก้ในหลังบ้าน", ดาวน์โหลดต้นฉบับเฉพาะ EXCEL, confirm/toast ตาม §9 (ไม่มีบรรทัด Hybrid ใน R1)
  - `page.tsx` — ส่ง `active.source`, history `source`/`savedByName`/`onGridCount` (นับฝั่ง server ไม่ส่ง rows ทั้งก้อน)
  - `scripts/e2e-calculator-config.mts` — อัปเดต selector ตาม id ใหม่ (§13.4) ให้ flow upload/apply/rollback/reset เดิมผ่าน + export ดาวน์โหลดได้
- ไม่แตะ: `src/components/admin/pages/page-shell.tsx`, `next.config.ts`

**DoD**
- [ ] `npm run build` ✓ · `npm run start` → `e2e-calculator-config.mts` ✓ · `e2e-admin.mts` ✓ · `e2e-admin-crud.mts` ✓
- [ ] Production mode: ADMIN เห็นแท็บใหม่, export ดาวน์โหลดได้, upload/apply/ใช้ชุดนี้ทำงาน; MARKETING/EDITOR ไม่เห็นแท็บ
- [ ] `grep -rn "_proto\|_prototype\|variant-switcher\|load-hybrid" src` → ว่าง
- [ ] `design-business-reviewer` บน admin real render desktop 1280 + tablet 768 + มือถือ 375 (ความกว้างแท็บ, ป้ายแหล่งที่มา, ความชัดของปุ่ม export/นำเข้า)
- Commits: `feat(admin): move calculator size table into its own tab with export and version history` · `test(e2e): follow calculator size table tab selectors`

**Rollback:** revert — action/schema ยังรองรับ UI เดิม

**สรุปหลังแก้:** เพิ่มแท็บ "ตารางขนาดระบบ" (`value="size-table"`, ADMIN เท่านั้น, `TabsContent keepMounted`) ต่อจากแท็บตัวเลข, description ของ PageShell อัปเดต. `calculator-size-table-card.tsx` -> `calculator-import-panel.tsx` (git mv; เหลือ upload/reject/preview/apply + กล่อง "แทนที่ทั้งชุด" เมื่อชุดที่ใช้อยู่เป็น MANUAL + ข้อความ "แทนที่ตารางทั้งชุด"). ใหม่: `calculator-tables-tab.tsx` (กล่อง "ที่ใช้อยู่" + `#calc-export` -> route R1-S3 + `#calc-import-toggle` พับ/กางแผงนำเข้า), `calculator-table-list.tsx` (`OnGridList` อ่านอย่างเดียว, ปุ่ม แก้ไข/เพิ่มขนาด disabled), `calculator-version-history.tsx` (ป้าย "Excel: <ไฟล์>" / "แก้ในหลังบ้าน", ดาวน์โหลดต้นฉบับเฉพาะ `hasSourceFile`), `calculator-table-format.ts`. `calculator-config-tab.tsx` เอาการ์ดออก + บรรทัดชี้แท็บใหม่ + copy reset ("เวอร์ชันในประวัติ"). `page.tsx` ส่ง `active.source`/`hasSourceFile`, history `onGridCount` (นับฝั่ง server). e2e `e2e-calculator-config.mts` ตาม selector ใหม่ + เคส list/export/toggle/ป้ายประวัติ/MARKETING ไม่เห็นแท็บ. ผ่าน: build, `e2e-calculator-config`, `e2e-admin`, `e2e-admin-crud`, `verify-calculator`; `grep _proto…` ใน src ว่าง; real render 1280/820 ไม่ล้น (scrollWidth = clientWidth).
- ข้อแตกต่างจากแผน: (1) `PageShell` เป็น `max-w-3xl` และห้ามแตะ จึง `max-w-5xl` บน container ของแท็บอย่างเดียวไม่ขยายจริง — ใช้ความกว้างชัดเจน `w-[min(64rem,calc(100vw-4rem))] md:w-[min(64rem,calc(100vw-19rem))]` (หัก sidebar w-60 + padding ของ main) ที่ระดับแท็บ; (2) เพิ่ม helper `sizeRowKwhPerMonth`/`sizeRowMonthlySavingThb` ใน `src/lib/calculator.ts` ให้ public (`recommendFromTable`) กับรายการใช้ร่วมกัน (นิพจน์เดิม); (3) "disabled นำเข้า/ใช้ชุดนี้ระหว่างมีค่าแก้ค้าง" ไม่ทำใน S5 — แผงของ S5 ไม่มี dirty state และแผนวางไว้ใน R1-S6; (4) ยังไม่ได้รัน `design-business-reviewer`.

---

## R1-S6 — ตัวแก้แบบ B (On-grid) + Dialog ยืนยัน diff + e2e  (⏳ R1-S4, R1-S5)

**สรุปก่อนแก้**
- ทำไม: #161 ข้อ 1/2/4, #163 D5, design-162 §4–§7 — เจ้าของแก้จุดเล็กได้เอง, ยืนยัน diff ก่อนใช้ทันที
- ไฟล์:
  - `src/hooks/admin/use-table-draft.ts` (ใหม่) — reducer working copy `{ baseVersion, onGrid: DraftRow<SizeRow>[], hybrid: null }` (§6.1); dirty แบบ deep-equal (แก้กลับ = ไม่ dirty); เรียก `validateOnGridTable` กับทั้งตาราง (blur + ตกลง)
  - `on-grid-size-dialog.tsx` (ใหม่) — ช่อง §5.3, `type="text" inputMode="decimal"` (ห้าม `type="number"`), kW readOnly สำหรับขนาดเดิม (Q3), กล่องคำนวณ, ลบขนาด, error/warning summary + focus link (§5.1)
  - `save-tables-dialog.tsx` (ใหม่) — §7: summary, ผลต่อบิลตัวอย่าง (ชุดเดียวกับ `diffSizeTables`), diff list, **กล่องคำเตือนรวมทั้งตาราง เรียง Package → slider (จาก `diffSizeTables` เดิม — ปิดช่องว่างของ prototype, C9)**, conflict box (§7.4, ไม่ refresh เอง), T-7 server reject
  - `calculator-tables-tab.tsx` — แถบบันทึก sticky (§6.2), disable นำเข้า/ใช้ชุดนี้ระหว่าง dirty + hint, `beforeunload`, `aria-live` (§13.2), focus หลังบันทึก
  - `calculator-table-list.tsx` — สถานะแถว §4.1 (แก้แล้ว/ใหม่/จะลบ/ผิด/เตือน + ป้ายข้อความ)
  - `scripts/e2e-calculator-config.mts` — แก้ขนาด → ตรวจและบันทึก → public `/th|en/calculator` เปลี่ยน → ประวัติมี "แก้ในหลังบ้าน" → ใช้ชุดก่อนหน้า (rollback) → เพิ่มขนาด billMax ผิด → ปุ่มบันทึก disabled + ป้าย "ผิด" → conflict 2 context → export → นำเข้าไฟล์ที่ export กลับ → ตารางเท่าเดิม → reset; audit page มี `CalculatorImport` CREATE (source MANUAL) + `CalculatorConfig` UPDATE
- UX: ใช้ `noValidate` ตาม convention; Dialog เต็มจอบน <640px

**DoD**
- [x] `npm run build` ✓ · `npm run start` → `e2e-calculator-config.mts` ✓ ทุกบรรทัด · `e2e-admin-crud.mts` ✓ · `e2e-admin.mts` ✓
- [x] `/th/calculator` + `/en/calculator` หลัง reset → ตัวเลขเท่า baseline S0 (public ไม่เปลี่ยนจาก R1)
- [x] `grep -rln "\"use client\"" src/app/admin | xargs grep -n "calculator-import\"\|calculator-import/index\|exceljs"` → ว่าง (Default #6)
- [ ] `design-business-reviewer` บน admin real render: T-1…T-8 desktop + 375 (Dialog เต็มจอ, แถบบันทึก, ความเข้าใจของ diff สำหรับเจ้าของที่ไม่ใช่สาย tech)
- Commits: `feat(admin): edit on-grid size table by hand with diff confirmation` · `test(e2e): cover manual size table edit, save, conflict and round-trip`

**Rollback:** revert UI — แถว MANUAL ที่สร้างระหว่างทดสอบอยู่ใน dev DB เท่านั้น

**สรุปหลังแก้:** ตัวแก้แบบ B (On-grid) ใช้งานจริงบนแท็บ "ตารางขนาดระบบ". ใหม่: `src/hooks/admin/use-table-draft.ts` (reducer working copy `{ baseVersion, rows[] }`, dirty = deep-equal กับค่าเดิม จึงแก้กลับแล้วแถบหาย, `validateDraft` = ช่องว่าง/ไม่ใช่ตัวเลขฝั่ง client + `validateOnGridTable` ตัวเดียวกับ server), `calculator-num-input.tsx` (text + `inputMode=decimal`, จัดรูปแบบตอน blur), `on-grid-size-dialog.tsx` (§5: kW ขนาดเดิม readOnly, error ตอน blur + `aria-invalid` + ข้อความใต้ช่อง + กล่องสรุปที่มีลิงก์ focus, ลบขนาด, inline confirm ทิ้งค่า), `save-tables-dialog.tsx` (§7: ผลต่อบิลตัวอย่าง + diff list จาก `diffSizeTables` + กล่องเตือนรวม Package -> slider, ตัด 10 รายการ + "แสดงทั้งหมด", กล่อง conflict `#calc-tables-conflict` ไม่ refresh เอง, server reject T-7). แก้: `calculator-tables-tab.tsx` (แถบบันทึก sticky, "ไปที่จุดแรก", ยกเลิกทั้งหมดแบบ inline confirm, `beforeunload`, `aria-live`, focus heading หลังบันทึก, ปุ่มนำเข้า disabled ระหว่าง dirty + hint), `calculator-table-list.tsx` (สถานะแถว แก้แล้ว/ใหม่/จะลบ/ผิด n + `<mark>` ค่าที่เปลี่ยน), `calculator-version-history.tsx` (`locked` + hint, 5 แถวแรก + "แสดงทั้งหมด (อีก n เวอร์ชัน)"), `calculator-table-format.ts` (ย้าย helper diff/format มาใช้ร่วมกับ import panel), `page.tsx` (ส่ง `packages` + `sliderMaxBill` สำหรับ warning).
- ข้อจาก review R1-S5 ที่รวมใน sprint นี้: (1) ปุ่ม "แก้ไข" บน tablet 820px — **ย้ายปุ่มและป้ายสถานะเข้าไปในเซลล์ "ขนาด" ที่ sticky-left** (ไม่ทำ sticky-right: ต้องปักคอลัมน์ที่สองทับเซลล์ที่เลื่อนผ่านใต้มัน และป้าย "ผิด n" ก็ยังตกขอบจอ; รวมไว้ที่เซลล์ระบุตัวแถวทำให้ทั้งปุ่มและสถานะเห็นตลอดโดยไม่ต้องเลื่อน) จึงยุบคอลัมน์ "สถานะ" แยกเข้าไปอยู่ใต้ขนาด; (2) ประวัติแสดง 5 แถวแรก + ปุ่ม "แสดงทั้งหมด"; (3) ปุ่ม disabled มีข้อความ `text-xs text-muted-foreground` เสมอ (`#calc-import-lock-hint`, `#calc-history-lock-hint`, `#calc-edit-lock-hint`); (4) real render 1280 + 820 ครบทุกสถานะที่ระบุ (เก็บใน scratchpad ไม่ commit) โดย `e2e-calculator-config.mts` assert ว่าหน้า**ไม่ล้นแนวนอน**ที่ 1280/820 ในทุกสถานะ.
- e2e: `e2e-calculator-config.mts` เพิ่มบล็อก R1-S6 (แก้ -> แถบ/ล็อกนำเข้า/สลับแท็บ -> แก้กลับแถบหาย -> เพิ่มขนาดผิด -> error ชี้ช่อง/ปุ่มบันทึก disabled/ไปที่จุดแรก -> Dialog ยืนยัน diff -> บันทึก -> public `/th` `/en` เปลี่ยน + ประวัติ "แก้ในหลังบ้าน" -> ลบ/คืนขนาด + ล็อก "ใช้ชุดนี้" -> ใช้ชุดนี้ย้อนกลับ -> conflict 2 context -> export -> นำเข้าไฟล์เดิม (กล่อง "แทนที่ทั้งชุด") ตารางเท่าเดิม -> audit MANUAL CREATE + config UPDATE ไม่มี rows/fileKey -> MARKETING เรียก save action ตรง ๆ ถูก redirect -> reset ผ่าน UI กลับ baseline). `e2e-save-calculator-tables.mts` ไม่ SKIP แล้ว (action ถูกลงมานิเฟสต์) ทุกเคสรวม concurrency ผ่านโดยไม่ใช้ harness.
- ข้อแตกต่างจากแผน: (1) ปุ่ม "แก้ไข" + ป้ายสถานะอยู่ในเซลล์ขนาด แทนคอลัมน์ท้ายแถว (เหตุผลข้างบน); (2) ช่วงที่แผงนำเข้าเปิดอยู่ ปุ่มแก้ไข/เพิ่มขนาดถูก disabled พร้อมข้อความ "ปิดการนำเข้าไฟล์ก่อน…" (ไม่อยู่ในสเปก — กัน preview ที่เปิดอยู่ถูกแทนด้วยค่าที่แก้ค้าง); (3) `NumInput` ใช้ `flushSync` ตอน focus เพื่อสลับข้อความจัดรูปแบบ -> ค่าดิบและ select พร้อมกัน (ไม่งั้นการพิมพ์ทับ/automation ต่อท้ายตัวเลขเดิม); (4) แก้ช่องว่างที่ขาดในกล่อง "แทนที่ทั้งชุด" ("…KKD Adminค่าที่แก้ไว้") เป็นข้อความต่อเนื่องของ R1-S5; (5) ไม่มีคำเตือนระดับแถวสำหรับ On-grid (Q2: ใช้เฉพาะ Hybrid) — คำเตือนที่เหลือคือ Package/slider ใน Dialog ยืนยัน; (6) grep DoD `calculator-import"` พบเฉพาะ `@/actions/calculator-import` (server action module) ไม่ใช่ `src/lib/calculator-import` — ไม่มี import ของ exceljs/lib index ฝั่ง client.
- หมายเหตุสถานะ: `e2e-admin.mts` บรรทัด `DASHBOARD: recent lead visible ✗` เป็น info เดิม (ค้นหา lead ทดสอบชื่อ "ทดสอบ นัดสำรวจ" ซึ่งไม่เกี่ยวกับงานนี้) ไม่ทำให้ script fail. ยังไม่ได้รัน `design-business-reviewer`.

---

## R1-S7 — Release R1 (prod)

**สรุปก่อนแก้**
- ทำไม: ขึ้นหลังบ้านใหม่โดยหน้า public ไม่เปลี่ยน; มีขั้น rollback ที่ต่างจากปกติ (research-158 R2)
- ขั้นตอน (ตามลำดับ ห้ามข้าม):
  1. **อ่าน `docs/plans/kkd-shared-hosting-redeploy-runbook.md` ทั้งไฟล์** (FTP โดย human `!`, schema first verified, content markers)
  2. `deploy-verify`: artifact build + `calculator-hybrid-r1-production-ddl.sql` (additive/relax, InnoDB, ไม่มี DROP) + ยืนยันว่า migration `drop_legacy_calculator_params` ไม่อยู่ในรายการที่จะรัน (#151 ยังเปิด)
  3. Snapshot (Default #1): phpMyAdmin Export `CalculatorConfig` + `CalculatorImport` → ดาวน์โหลดออก server; บันทึกชื่อไฟล์ + ขนาด
  4. phpMyAdmin (human, DB `kkdprop1_kkdproperty`): รัน DDL asset → `SHOW CREATE TABLE CalculatorImport` เห็น `source` + 4 ฟิลด์เป็น NULL ได้ → ตรวจด้วยตาเองก่อนไปต่อ (`pma-readonly-query.mts` ใช้ยืนยันซ้ำได้)
  5. Marker ก่อน upload: `/api/admin/calculator/export` → 404 (บันทึกใน S0)
  6. `hosting-deploy-specialist`: `npx tsx scripts/build-shared-hosting-deploy.mts` → human `! noglob deploy/upload-dist.sh 2>&1 | tail -40` → extract → restart (touch `tmp/restart.txt`)
  7. Marker หลัง: `/api/admin/calculator/export` → **401**; `npx tsx scripts/smoke-test-production.mts --check /th/calculator --expect-text "คำนวณ" --check /en/calculator --expect-text "How Much Is Your Bill"` ✓; `/api/admin/leads` → 401
  8. Browser จริง `/th|en/calculator` ที่ค่าไฟ baseline S0 → ตัวเลขเท่าเดิมทุกจุด (desktop + 375)
  9. Admin prod (owner login): แท็บ "ตารางขนาดระบบ" แสดงชุดที่ใช้อยู่จาก On-grid S10 เป็น "Excel: <ไฟล์>", ประวัติครบ, ดาวน์โหลด export ได้ — **ยังไม่ save ด้วยมือ**
  10. หลังผ่านข้อ 7–9 (จุดนี้เป็นต้นไป rollback ต้องใช้ขั้น "หลังมีแถว MANUAL"): owner แก้ 1 ค่าที่กระทบลูกค้าน้อยที่สุด (`roofM2` ของขนาดใหญ่สุด) → ตรวจและบันทึก → ตรวจ tile หลังคาบนหน้า public เปลี่ยน → "ใช้ชุดนี้" กับชุด Excel เดิม → ค่ากลับ — ยืนยัน write path + rollback ของ R1 บน prod ภายในไม่กี่นาที
- **ขั้น rollback R1 (เขียนลง "สรุปหลังแก้" ให้ใช้ได้ทันที):**
  - ก่อนมีแถว MANUAL บน prod (ก่อนข้อ 10): upload artifact ก่อนหน้า (runbook) → restart → จบ (คอลัมน์ใหม่ไม่กระทบโค้ดเก่า)
  - หลังมีแถว MANUAL: (a) `pma-readonly-query.mts "SELECT COUNT(*) FROM CalculatorImport WHERE source='MANUAL'"` → (b) human รัน `docs/plans/assets/calculator-hybrid-r1-rollback-manual-rows.sql` ใน phpMyAdmin → query ท้าย asset ได้ 0 → (c) upload artifact ก่อนหน้า → restart → (d) เปิด `/admin/pages/calculator` ต้องไม่ 500. **ห้ามกลับลำดับ (c) ก่อน (b)**
  - DDL ผิด: import snapshot ข้อ 3 ผ่าน phpMyAdmin
- Release note: ฟิลด์ไฟล์ของ `CalculatorImport` เป็น NULL ได้แล้ว; แถว MANUAL ไม่มีไฟล์ต้นฉบับ

**DoD**
- [ ] หลักฐานข้อ 3, 4, 7, 8, 9, 10 ใน "สรุปหลังแก้" (output/screenshot — ไม่มีราคา)
- [ ] อัปเดต Status ของแผนนี้
- Commit: `docs(deploy): record calculator table editing release evidence`

**Rollback:** ตามขั้น rollback R1 ข้างบน

**สรุปหลังแก้:** _(กรอกหลังทำ)_

---

# Release R2 — Hybrid

## R2-S0 — Gate R1 นิ่ง + baseline หลัง R1

**สรุปก่อนแก้**
- ทำไม: R2 แตะ `Lead` และหน้า public — ต้องรู้ว่า R1 ไม่มีปัญหาค้างก่อนซ้อนของใหม่
- Gate: R1 อยู่บน prod ≥ 2–3 วันทำการ, ไม่มี error ใน admin calculator ที่ owner รายงาน, ไม่มี issue เปิดที่เกี่ยวกับ R1
- Baseline: ทำซ้ำ S0 ข้อ 1–2 (public calculator 7 ค่าไฟ + booking quote) บน prod หลัง R1 + `SELECT source, COUNT(*) FROM CalculatorImport GROUP BY source` + `SHOW COLUMNS FROM Lead` (ยืนยันยังไม่มี `interestedBatteryKwh`)
- Content marker สำหรับ R2-S10: เลือก string ที่โค้ด R2 เพิ่มใน HTML ที่ render จริงโดยไม่ต้องมีตาราง Hybrid (ผู้สมัคร: `ขนาดแบตที่สนใจ` ใน `/th/booking` ถ้า messages ของ booking ถูกส่งไปกับ provider) — ยืนยันกับ local production build ใน R2-S8 แล้วบันทึกค่าก่อน deploy (คาด 0)

**DoD:** หลักฐานใน "สรุปหลังแก้" · Commit: `docs(calculator): record post-r1 baseline for hybrid release`

**Rollback:** ไม่มี

**สรุปหลังแก้:** _(กรอกหลังทำ)_

---

## R2-S1 — Pure lib Hybrid + projection  (⏳ R2-S0)

**สรุปก่อนแก้**
- ทำไม: กติกา #155/#156 ทดสอบได้โดยไม่มี DB/UI และต้องพิสูจน์ "ไม่มีราคาแยกยี่ห้อใน payload" ก่อนมีผู้เรียก
- ไฟล์:
  - `src/lib/calculator-hybrid.ts` (ใหม่, client-safe — Default #5)
    - `type HybridRow` ตาม research-158 §1.3 (`brandPrices: { brand; priceThb: number | null }[]`)
    - `hybridTableSchema` (zod): key (kw, phase, batteryKwh) ไม่ซ้ำ; ค่าร่วม (sunHours, days, pricePerKwh, panels, roofM2, billMin, billMax) เท่ากันทุกแถวใน kW เดียวกัน; billMax ต่อ kW เพิ่มเคร่งครัด; ทุก kW/phase มีแถวแบต 0 (C7); ชื่อยี่ห้อตรงกันทุกแถว; ช่วงค่าเหมือน `sizeTableSchema`
    - `hybridMonthlySaving(row)` = `(kw × sunHours + batteryKwh) × pricePerKwh × days`
    - `usablePrices(rows)` — ราคา > 0 และแถวแบต > 0 ใช้ได้เมื่อยี่ห้อเดียวกันใน kW/phase เดียวกันมีราคาแถวแบต 0 > 0 (E3); คืนราคาต่ำสุด + ยี่ห้อ (ยี่ห้อใช้เฉพาะหลังบ้าน)
    - `type PublicHybridSize` ตาม research-158 §3
    - `recommendHybrid(bill, table: PublicHybridSize[], preferredBatteryKwh: number | null, multiplier)` → union เดียวกับ `recommendFromTable` + `batteryKwh` (derive), `batteryOptions`, `phases`: kW เล็กสุดที่ `billMax > bill`; แบต null → เล็กสุด > 0; ไม่มีในตัวเลือก → ใกล้สุด (เสมอ → เล็กกว่า); cap ที่ค่าไฟ; payback จากยอดหลัง cap, null เมื่อไม่มีราคา; `belowFirstRow`/`tooLarge`
  - `src/lib/calculator-hybrid-projection.ts` (ใหม่, comment "server-only") — `toPublicHybridTable(rows: HybridRow[]): PublicHybridSize[]`: รวม phase ต่อ kW, แบตแต่ละตัวใช้ phase ที่ราคาต่ำกว่า (#156 ข้อ 2), `minPriceThb` ไม่มียี่ห้อ
  - `scripts/verify-calculator.mts` — section Hybrid (ตารางสังเคราะห์ BrandA…E): ทุกกติกา #156 ข้อ 1–7 ที่ทดสอบได้ในฟังก์ชัน pure, E3 (ราคาแบตอย่างเดียวไม่นับ), E4 (ไม่มีราคา → payback null), cheaper-phase, **`JSON.stringify(toPublicHybridTable(rows))` ไม่มี `"brand"` และไม่มีชื่อ BrandA…E และไม่มีราคาที่ไม่ใช่ min**; ตัวเลข design-157 §7 กับตารางสังเคราะห์ที่ตั้งค่าร่วมเท่าไฟล์จริง (ค่าไฟ 9,500 → 10 kW แบต 16 ประหยัด 8,910 หลังติดตั้ง 590)
  - `CONTEXT.md` — ศัพท์ "Hybrid row", "ราคาที่ใช้ได้", "Public Hybrid table (projection)"

**DoD**
- [ ] `npx tsx scripts/verify-calculator.mts` ✓ ทั้งหมด (On-grid equality sweep 76/76 ยังเขียว)
- [ ] `grep -n "exceljs\|jszip\|prisma" src/lib/calculator-hybrid.ts` → ว่าง
- [ ] `npx tsc --noEmit -p .` · `npm run build` ✓
- Commits: `feat(calculator): add hybrid table model, usable price rule and battery recommendation` · `test(calculator): cover hybrid recommendation rules and public projection`  · `docs(calculator): add hybrid terms to context`

**Rollback:** revert — ไม่มีผู้เรียก

**สรุปหลังแก้:** _(กรอกหลังทำ)_

---

## R2-S2 — Reader + validator + diff ชีต Hybrid + import ไฟล์เดียว 2 ชีต  (⏳ R2-S1)

**สรุปก่อนแก้**
- ทำไม: research-154 §2 (สัญญาการอ่าน) + D3/D4 — จุดรับไฟล์ภายนอกเป็นพื้นผิว security; ทำ pure + test ก่อนต่อ action
- ไฟล์ (ใต้ `src/lib/calculator-import/`):
  - `read-hybrid.ts` (ใหม่) — sheet `/^hybrid$/i`; marker `ผลิตพลังงานต่อวัน`; mapping คอลัมน์ research-154 §2.3 (group `ขนาดกำลังผลิต` → sub `ขนาด`/`หน่วย`/`Phase`/`ขนาดแบตเตอรี่`; ราคาเลือกจาก **group `ยี่ห้อ`** เท่านั้น ไม่ใช่กลุ่มคืนทุน); หยุดที่แถวว่างแรก (ไม่อ่านบล็อก HUAWEI, E16); trim หน่วย (E15); ราคา 0/ว่าง → null (E1/E2); ไม่ออก `formulaCachedWarning` สำหรับคอลัมน์ราคา; cap 1000×100 เดิม
  - `validate-hybrid.ts` (ใหม่, client-safe) — `validateHybridTable(rows: HybridRow[])` → issues E11/E12/E13 (Reject) + warnings: **E3 รวมเป็นข้อเดียว** (ตัวอย่าง ≤ 3), **E5 ข้อละ kW** (สูตร Default #12), E4 ต่อ kW; ผ่าน `hybridTableSchema` เป็นด่านสุดท้าย
  - `diff.ts` — `diffHybridTables(current, next, multiplier)` key = (kW, phase, แบต), ผลต่อบิลตัวอย่าง Hybrid (แบตเริ่มต้นตาม #156) + สถานะคืนทุน "แสดง/ไม่แสดง"
  - `messages.ts` — copy ใหม่ตาม design-162 §8.4/§8.5 คำต่อคำ (prefix "ชีต Hybrid แถว {r}")
  - `index.ts` — `importCalculatorWorkbook(buf, fileName)` = validate-xlsx → On-grid (บังคับ) + Hybrid (ถ้ามี) → `{ onGrid, hybrid: HybridRow[] | null, hasHybridSheet, issues, warnings }`; **ชีต Hybrid มี issue = reject ทั้งไฟล์ (D4)**; ไม่มีชีต = `hybrid: null` (D3); `Hybrid` ไม่อยู่ใน `skippedSheets` อีก
  - `scripts/lib/calculator-import-fixtures.ts` — ชีต Hybrid สังเคราะห์ (merged block, header 2 แถว, กลุ่มยี่ห้อ BrandA…E + กลุ่มคืนทุนชื่อซ้ำ, บล็อกล่างหลังแถวว่าง): ไฟล์ดี, ไม่มีชีต, ไม่มีกลุ่มยี่ห้อ, แถวซ้ำ, ค่าร่วมไม่ตรง, ไม่มีแบต 0, แบตติดลบ, ราคาไม่ใช่เลข, E3 หลายช่อง, E5, E4, หน่วยมี space, ไม่มีแถวว่างคั่นบล็อกล่าง
  - `scripts/verify-calculator-import.mts` — assert Reject/Warn/Accept ทุก fixture; optional ไฟล์จริง → Accept **52 แถว / 13 ขนาด**, E3 = 1 warning (42 ช่อง), E5 = 20/30/50/99.9, E4 = 7 แถว — พิมพ์จำนวนเท่านั้น (Default #16)

**DoD**
- [ ] `npx tsx scripts/verify-calculator-import.mts` ✓ ทุก fixture + ไฟล์จริง ✓ หรือ skipped ชัด · `verify-calculator.mts` ✓
- [ ] `grep -n "exceljs\|jszip" src/lib/calculator-import/validate-hybrid.ts` → ว่าง
- [ ] `npm run build` ✓ · `git diff --stat` ไม่มี `.xlsx` · grep ชื่อยี่ห้อจริง (Solis/DEYE/Sungrow/Growwatt/EnergyLib) ในไฟล์ที่ commit ใต้ `scripts/` และ `src/` → ว่าง
- [ ] `audit-compliance-reviewer` อ่าน `read-hybrid.ts`/`validate-hybrid.ts`/`index.ts` เทียบ research-154 §2/§4 (guard ก่อน exceljs, ไม่ evaluate สูตร, ข้อความ clip ค่า cell)
- Commits: `feat(calculator): read and validate hybrid sheet from the calculator workbook` · `test(calculator): cover hybrid sheet edge cases with synthesized fixtures`

**Rollback:** revert — ยังไม่มีผู้เรียก

**สรุปหลังแก้:** _(กรอกหลังทำ)_

---

## R2-S3 — Schema R2 + DDL asset  ✅ ขนานกับ R2-S1/S2

**สรุปก่อนแก้**
- ไฟล์:
  - `prisma/schema.prisma` — `CalculatorConfig.hybridSizeTable Json?`; `CalculatorImport.hybridRows Json?`; `Lead.interestedBatteryKwh Int?`
  - `prisma/migrations/<ts>_add_hybrid_calculator_tables_and_lead_battery/migration.sql` (`backup-db.mts` ก่อน)
  - `docs/plans/assets/calculator-hybrid-r2-production-ddl.sql` (ใหม่) — engine pre-check 3 ตาราง → `ALTER TABLE CalculatorImport ADD COLUMN IF NOT EXISTS hybridRows JSON NULL;` · `ALTER TABLE CalculatorConfig ADD COLUMN IF NOT EXISTS hybridSizeTable JSON NULL;` · `ALTER TABLE Lead ADD COLUMN IF NOT EXISTS interestedBatteryKwh INT NULL;` → `SHOW COLUMNS` ทั้ง 3 ตาราง. ไม่มี DROP, ไม่มี default ที่มีราคา (D1)
  - `prisma/seed.ts` — ไม่แก้ (null = ไม่มี Hybrid); ยืนยัน idempotent
  - `scripts/lib/storage-engine-contract.ts` — ไม่แตะ (ไม่มีตารางใหม่)

**DoD**
- [ ] `backup-db.mts` → `prisma migrate dev` ✓ → `db seed` ×2 ✓ · `verify-storage-engine.mts` ✓ · `restore-db.mts` dry-run ✓
- [ ] `npm run build` ✓ · `npm run start` → `npx tsx scripts/verify-all.mts` ✓ (booking/admin/admin-crud ไม่พังจากคอลัมน์ใหม่)
- [ ] `deploy-verify` ตรวจ DDL asset (InnoDB pre-check, ชนิดตรง migration, idempotent, ไม่มี DROP)
- Commits: `feat(calculator): add hybrid table columns and lead battery size` · `docs(deploy): add production ddl for hybrid calculator release`

**Rollback (local):** revert + `prisma migrate reset`

**สรุปหลังแก้:** _(กรอกหลังทำ)_

---

## R2-S4 — Actions + read path Hybrid  (⏳ R2-S2, R2-S3)

**สรุปก่อนแก้**
- ไฟล์:
  - `src/actions/calculator-import.ts`
    - `previewCalculatorImport` → `importCalculatorWorkbook`; create `{ source: "EXCEL", rows, hybridRows }`; คืน diff 2 ตาราง + `hasHybridSheet` + `activeHybridCounts`; **dedupe ตาม Default #3**; snapshot projection + `hybridRowCount`
    - `applyCalculatorImport` — `hybridSizeTable: imp.hybridRows ?? Prisma.JsonNull` + `hybridTableSchema.safeParse` ซ้ำ
    - `saveCalculatorTables({ onGrid, hybrid, version })` — `validateHybridTable` + Default #11 (ยี่ห้อตรงชุดที่ใช้อยู่, ห้ามสร้าง Hybrid ใหม่); create MANUAL `{ rows, hybridRows }`; update config ทั้ง 2 ตารางใน `update()` ครั้งเดียว
  - `src/actions/calculator-config.ts` — `resetCalculatorConfigToDefaults` + `hybridSizeTable: Prisma.JsonNull`
  - `src/lib/content/index.ts` `getCalculatorConfig` — + `hybridTable: PublicHybridSize[] | null` ผ่าน `hybridTableSchema.safeParse` → `toPublicHybridTable` (parse ไม่ผ่าน → `null` + `console.error` — public ซ่อน toggle แทนพัง); **ห้ามคืน `HybridRow` ดิบ**
  - `src/app/[locale]/calculator/page.tsx` — ยังไม่ส่ง `hybridTable` ให้ client (R2-S9 ทำ) → public ไม่เปลี่ยน
  - `src/app/admin/(dashboard)/pages/calculator/page.tsx` — ส่ง `hybrid: HybridRow[] | null`, `brands`, history `hybridSizeCount`/`hybridRowCount` (ADMIN-only tab)
  - `scripts/e2e-calculator-config.mts` — upload fixture 2 ชีต → preview แสดงทั้งสอง → ยืนยัน → อัปโหลดไฟล์ On-grid อย่างเดียว → เตือน Hybrid จะถูกลบ (D3) → ไฟล์ Hybrid ผิด → reject ทั้งไฟล์ (D4) → อัปโหลดไฟล์ที่ sha256 ซ้ำกับแถวเก่าที่ไม่มี Hybrid → ได้ Hybrid (Default #3) → reset ล้าง Hybrid

**DoD**
- [ ] `npm run build` ✓ · `verify-calculator.mts` ✓ · `verify-calculator-import.mts` ✓
- [ ] `npm run start` → `e2e-calculator-config.mts` ✓ · `e2e-admin-crud.mts` ✓
- [ ] HTML ของ `/th/calculator` + `/en/calculator` หลัง apply fixture 2 ชีต: `curl -s … | grep -c "BrandA\|brandPrices"` = 0
- [ ] `audit-compliance-reviewer`: requireRole/withAudit ครบ, payload ปลอม (ยี่ห้อเปลี่ยน, สร้าง Hybrid เอง, แถวเกิน cap) ถูก reject, snapshot import ไม่มี rows, `getCalculatorConfig` ไม่ส่ง brand
- Commits: `feat(calculator): import, save and apply hybrid table alongside on-grid` · `test(e2e): cover two-sheet calculator import, hybrid removal and reject`

**Rollback:** revert — public ยังไม่อ่าน `hybridTable`

**สรุปหลังแก้:** _(กรอกหลังทำ)_

---

## R2-S5 — Export ชีต Hybrid + round-trip 2 ชีต  (⏳ R2-S2, ✅ ขนานกับ R2-S4)

**สรุปก่อนแก้**
- ไฟล์:
  - `src/lib/calculator-import/export.ts` — `buildCalculatorWorkbook({ onGrid, hybrid })`: ชีต `Hybrid` เฉพาะเมื่อ `hybrid` มีค่า (Default #8); header 2 แถวตาม mapping ของ `read-hybrid.ts`; merged block ต่อ kW สำหรับค่าร่วม (research-154 §1 ข้อ 2); Phase/แบตกรอกทุกแถว; กลุ่ม `ยี่ห้อ` ตามลำดับ brands; **ราคาเป็นตัวเลข ไม่สร้างสูตรราคาแบต ไม่มีบล็อก HUAWEI (D6)**; ช่องคำนวณเป็นสูตร + `result`
  - `src/app/api/admin/calculator/export/route.ts` — ส่ง `hybridSizeTable` เข้า builder
  - `scripts/verify-calculator-import.mts` — round-trip 2 ชีต (fixture + ตารางที่มี null price, 1φ/3φ ชุดแบตต่างกัน) → `importCalculatorWorkbook` → deep-equal ทั้งคู่, ไม่มี warning ของสูตร; ไม่มี Hybrid → export ไม่มีชีต → import กลับได้ `hybrid: null`

**DoD**
- [ ] `verify-calculator-import.mts` ✓ รวม round-trip 2 ชีต · `npm run build` ✓ · `e2e-admin.mts` ✓ (route เดิม)
- [ ] เปิดไฟล์ export ด้วยตา: merged block ถูกที่, สูตรคำนวณได้
- [ ] `audit-compliance-reviewer`: route ยังเป็น ADMIN-only (ไฟล์มีราคาทุกยี่ห้อ), `no-store`
- Commits: `feat(calculator): include hybrid sheet in calculator excel export` · `test(calculator): prove two-sheet export round-trips through import`

**Rollback:** revert — export กลับเป็น On-grid อย่างเดียว

**สรุปหลังแก้:** _(กรอกหลังทำ)_

---

## R2-S6 — หลังบ้าน: แท็บย่อย + รายการ/Dialog Hybrid + save 2 ตาราง  (⏳ R2-S4)

**สรุปก่อนแก้**
- ไฟล์ (ใน `src/app/admin/(dashboard)/pages/calculator/` + hook):
  - `calculator-tables-tab.tsx` — `<Tabs defaultValue="on-grid">` + `TabsList variant="line"` + **`keepMounted` ทั้งสองแท็บย่อย** (AGENTS.md: ห้ามเอาออก); label "On-grid ({n})" / "Hybrid ({k} ขนาด)" / "Hybrid (ไม่มี)" + Badge "ผิด {e}"
  - `calculator-table-list.tsx` — `HybridList` คอลัมน์ §4.3 (คืนทุนจาก `usablePrices`, ยี่ห้อที่มีราคา); empty state §4.5 **ไม่มีปุ่มเพิ่มขนาด** (Q1)
  - `hybrid-size-dialog.tsx` (ใหม่) — §5.4: ค่าร่วม + เฟสที่มี (เพิ่ม/เอาออก + inline confirm), ตารางราคา phase × แบต × ยี่ห้อ (หัวยี่ห้อเป็นข้อความ + Lock), 0 → ว่างตอน blur, ช่อง E3 "ไม่นำมาคิด", แถวแบต 0 ลบไม่ได้, เพิ่มแถวแบต, ประหยัด/คืนทุน + ยี่ห้อที่ใช้คิด (admin เห็นได้), E5 warning
  - `use-table-draft.ts` — `hybrid: DraftHybridSize[] | null`, validate ด้วย `validateHybridTable`
  - `save-tables-dialog.tsx` — คอลัมน์ Hybrid ในผลต่อบิลตัวอย่าง (ตัดเมื่อไม่มีทั้งก่อน/หลัง), diff ราคา/แถวแบต, คำเตือนเรียง Package → ไม่มีราคา → แผง → E3
  - `scripts/e2e-calculator-config.mts` — แก้ราคา Hybrid → บันทึก → ประวัติ MANUAL มี Hybrid → ช่อง E3 แสดง "ไม่นำมาคิด" → error ในแท็บย่อยที่ไม่ได้เปิดแสดง Badge → "ไปที่จุดแรก" สลับแท็บ+เปิด Dialog
- id ตาม design-162 §13.4 (`{kw}` แทน `.` ด้วย `_`)

**DoD**
- [ ] `npm run build` ✓ · `npm run start` → `e2e-calculator-config.mts` ✓ · `e2e-admin-crud.mts` ✓
- [ ] `grep -rn "_proto\|_prototype\|variant-switcher\|load-hybrid" src` → ว่าง · ไม่มี client component import `calculator-import/index`
- [ ] `design-business-reviewer` บน admin real render (ข้อมูล fixture สังเคราะห์): รายการ Hybrid + Dialog desktop 1280 / tablet 768 / 375 — ความอ่านง่ายของตารางราคา, ป้าย "ไม่นำมาคิด"
- Commits: `feat(admin): edit hybrid size table with per-brand prices in the size table tab` · `test(e2e): cover manual hybrid table editing`

**Rollback:** revert — action ยังรับ `hybrid: null` ได้

**สรุปหลังแก้:** _(กรอกหลังทำ)_

---

## R2-S7 — หลังบ้าน: preview นำเข้า 2 ชีต + ประวัติ + reset copy  (⏳ R2-S4, ✅ ขนานกับ R2-S6)

**สรุปก่อนแก้**
- ไฟล์ (แตะคนละไฟล์กับ R2-S6 — ถ้าต้องแก้ `calculator-tables-tab.tsx` ให้รอ R2-S6 merge ก่อน):
  - `calculator-import-panel.tsx` — กล่องคำอธิบาย §8.2 + รายการคอลัมน์ 2 ชีต; preview §8.3 (meta line, กล่อง "แทนที่ทั้งชุด" เฉพาะ MANUAL, **กล่อง `calc-import-hybrid-removed` `border-2 border-destructive`** เฉพาะไม่มีชีต Hybrid และตารางที่ใช้อยู่มี Hybrid, ส่วนชีต On-grid / ชีต Hybrid เรียงต่อกันไม่ใช้ Tabs, confirm แบบ destructive เมื่อจะลบ Hybrid); reject §8.4 แยกกลุ่มชีต + " · ทั้งไฟล์ไม่ผ่าน แม้ชีต On-grid จะถูกต้อง"
  - `calculator-version-history.tsx` — บรรทัด 2 "On-grid {n} ขนาด · Hybrid {k} ขนาด"/"ไม่มี Hybrid", confirm "ใช้ชุดนี้" เตือนเมื่อเวอร์ชันไม่มี Hybrid (§9)
  - `calculator-config-tab.tsx` — copy reset ฉบับ R2 (§11)
  - `scripts/e2e-calculator-config.mts` — assert กล่อง `calc-import-hybrid-removed`, reject แยกชีต, history counts

**DoD**
- [ ] `npm run build` ✓ · `npm run start` → `e2e-calculator-config.mts` ✓
- [ ] `design-business-reviewer` บน admin real render: preview 2 ชีต, กล่องลบ Hybrid (เด่นพอแต่ไม่ตื่นตูม), reject 2 ชีต — desktop + 375
- Commits: `feat(admin): preview two-sheet calculator import with hybrid removal warning`

**Rollback:** revert — preview กลับเป็นแบบ On-grid (action ยังคืนข้อมูลเดิมได้)

**สรุปหลังแก้:** _(กรอกหลังทำ)_

---

## R2-S8 — Lead fields + booking  (⏳ R2-S3, ✅ ขนานกับ R2-S1…S7)

**สรุปก่อนแก้**
- ทำไม: #153 ข้อ 7, research-158 §5, design-157 §6
- ไฟล์:
  - `src/lib/booking-links.ts` `bookingLinkParamsSchema` (`.strict()`) — + `system: z.enum(["on-grid","hybrid"]).optional()`, `battery: z.string().regex(/^\d{1,4}$/).optional()`
  - `src/app/[locale]/booking/page.tsx` — `system` → `initialInterestedSystems` ผ่าน `SERVICE_SLUG_TO_INTERESTED_SYSTEM`; `battery` เป็นค่าเริ่มต้นเฉพาะเมื่อ `system=hybrid` และชนะ draft
  - `src/app/[locale]/booking/booking-forms.tsx` — prop `showBatteryField` ให้ `BillAndSystemsFields`; **QuoteForm เท่านั้น**; render ใต้ checkbox HYBRID เมื่อติ๊ก (`ml-6 mt-1 border-l-2 border-border pl-3`), `type="number" inputMode="numeric" min=0 max=10000 step=1`, label/hint ผูก `aria-describedby`; เอาติ๊กออก = ซ่อนแต่เก็บค่าใน form state
  - `src/lib/validations/lead.ts` — `interestedBatteryKwh` int 0–10000 optional
  - `src/actions/submit-quote.ts` — บันทึก `interestedBatteryKwh`; **ล้างเป็น null ถ้า `interestedSystems` ไม่มี `HYBRID`** (R16); survey ไม่แตะ
  - `src/app/admin/(dashboard)/leads/[id]/page.tsx` + `lead-detail-client.tsx` — แสดง "ขนาดแบตที่สนใจ: N kWh" เมื่อมีค่า
  - `src/lib/notifications/format.ts` — บรรทัด `แบตเตอรี่ที่สนใจ: N kWh` เมื่อมีค่า
  - `src/lib/reports/export-rows.ts` — คอลัมน์ "ขนาดแบตที่สนใจ (kWh)" ทั้ง 2 ชีต
  - `src/messages/th.json` **และ** `en.json` namespace `booking` — `fieldBatteryKwh`, `fieldBatteryKwhPlaceholder`, `fieldBatteryKwhHint` (design-157 §5)
  - `scripts/e2e-booking.mts` — `/th/booking?tab=quote&system=hybrid&battery=16&bill=9500` → HYBRID ติ๊ก + ช่องแบต = 16 → submit → row มี `interestedSystems` HYBRID + `interestedBatteryKwh=16`; เอาติ๊ก HYBRID ออกแล้ว submit → `interestedBatteryKwh` null; `/en/booking` เหมือนกัน (Default #18: server :3000)
- ไม่แตะ: `LEAD_PII_FIELDS` (Default #19), survey form

**DoD**
- [ ] `npx prisma migrate dev` ไม่มี drift · `npm run build` ✓
- [ ] `npm run start` (port 3000) → `npx tsx scripts/e2e-booking.mts` ✓ ทั้งสองบรรทัด + กรณีใหม่ · `e2e-admin-crud.mts` ✓ (lead detail) · ส่ง lead ตอนไม่มี env แจ้งเตือน → log "no providers configured" และ submit สำเร็จ (verify skill)
- [ ] เรียก formatter ใน local กับ lead ที่มีแบต → มีบรรทัดแบต (R17)
- [ ] `grep` key ใหม่ทั้ง 3 ใน th.json และ en.json · `i18n-parity-checker` ✓
- [ ] `audit-compliance-reviewer` (`submit-quote.ts`: zod re-validate, rate limit เดิม, ล้างค่าเมื่อไม่มี HYBRID, ไม่มีช่องทางใส่ค่าโดยไม่ผ่าน zod)
- [ ] `design-business-reviewer` บน real render `/th|en/booking?tab=quote` desktop + 375 (ช่องแบตเมื่อติ๊ก/ไม่ติ๊ก)
- [ ] บันทึก content marker ที่ใช้ใน R2-S10 (ดู R2-S0) จาก local production build
- Commits: `feat(booking): capture interested battery size on hybrid quote leads` · `test(e2e): cover hybrid battery prefill and quote submission`

**Rollback:** revert — คอลัมน์ `interestedBatteryKwh` ว่างไม่กระทบโค้ดเดิม

**สรุปหลังแก้:** _(กรอกหลังทำ)_

---

## R2-S9 — หน้า public Variant B  (⏳ R2-S4, R2-S8; ✅ ขนานกับ R2-S6/S7)

**สรุปก่อนแก้**
- ทำไม: #157 (Variant B), #156, #155 ข้อ 3–4, #153 ข้อ 6
- อ้างอิง markup: `prototype/157-calculator-hybrid-toggle` @ `7de89c1` (`?variant=B`) — ดูเป็นแบบเท่านั้น (Default #17)
- **ข้อควรระวัง 2 ข้อของ #157 (ต้องมีหลักฐานใน "สรุปหลังแก้"):**
  1. **On-grid ต้องเหมือนเดิมนอกจากหัวการ์ด** — ฝั่งผล, บรรทัดขนาดระบบ, `phaseBoth`, `popularSuffix`, CTA ใช้ JSX เดิมทุกตัวอักษร; เมื่อ `hybridTable == null` หรือว่าง **ไม่ render แถบ tab ทั้งแถบ** → DOM ของการ์ดเท่ากับก่อนแก้ (e2e เทียบ `outerHTML` ของการ์ดก่อน/หลังที่ค่าไฟ baseline)
  2. **แบต 6 ตัวเลือกบนมือถือ** — wrap 2 แถวที่ <640px (Default #13), ทุก segment `min-h-11`; screenshot 375px ที่ 50 kW และ 60 kW
- ไฟล์:
  - `src/app/[locale]/calculator/page.tsx` — ส่ง `hybridTable={calculatorConfigResult.hybridTable}` (`PublicHybridSize[] | null`)
  - `src/store/use-calculator-store.ts` — `systemMode: "onGrid" | "hybrid"` (เริ่ม `onGrid`), `preferredBatteryKwh: number | null`, ไม่ persist ข้ามการโหลดหน้า; ถ้า `hybridTable` ว่างแต่ store เป็น hybrid → บังคับ onGrid ตอน render
  - `src/app/[locale]/calculator/calculator-client.tsx` — แถบ tab หัวการ์ด (design-157 §2: `grid grid-cols-2 border-b`, `min-h-14`, สีแบบ tab booking, บรรทัดรอง `modeOnGridShort`/`modeHybridShort`), **semantics เป็น radiogroup** ไม่ใช่ tablist; โหมด Hybrid ใช้ `recommendHybrid`; slider ชุดเดียวช่วงตายตัว; ช่องพิมพ์ `max` = billMax แถวสุดท้ายของโหมดที่ใช้อยู่; สลับโหมดไม่แก้ `bill`; CTA `bookingHref({ tab: "quote", bill, system, battery })` (C2; `bill` ยังจำกัดด้วย `AVG_MONTHLY_BILL_MAX`)
  - `src/app/[locale]/calculator/battery-picker.tsx` (ใหม่) — กล่องบนสุดฝั่งผล: หัว `{kw} kW Hybrid` + PhasePill, caption `batteryFor`, segmented radiogroup `name="calc-battery"`, `batteryAutoAdjusted` `aria-live="polite"`; ซ่อนเมื่อ tooLarge (ยังจำค่า)
  - `src/app/[locale]/calculator/system-mode-tabs.tsx` (ใหม่) — แถบหัวการ์ด
  - `src/app/[locale]/calculator/phase-pill.tsx` (ใหม่)
  - `src/messages/th.json` **และ** `en.json` namespace `calculator` — key จาก design-157 §5 ที่ B ใช้: `modeLabel`, `modeOnGrid`, `modeHybrid`, `modeOnGridShort`, `modeHybridShort`, `hybridResultSize`, `phaseSupportBoth`, `phaseOnly1`, `phaseOnly3`, `batteryLabel`, `batteryFor`, `batteryNone`, `batteryOption`, `batteryAutoAdjusted`, `batteryAssumption` (Default #14). **ไม่เพิ่ม** key ของ A/C (`modeOnGridHint`, `modeHybridHint`, `batteryStepCount`, `batteryDecrease`, `batteryIncrease`)
  - `scripts/e2e-calculator-config.mts` (ส่วน public) — ไม่มี Hybrid → ไม่มีแถบ tab + DOM การ์ดเท่าเดิม; apply fixture 2 ชีต → tab ขึ้น, สลับ Hybrid: แบตเริ่มเล็กสุด >0, ลากข้าม kW → แบตใกล้สุด + ข้อความปรับให้, ลากกลับ → แบตเดิมกลับมา, ค่าไฟต่ำกว่าช่วง → belowFirstRow, ≥ billMax สุดท้าย → tooLarge, แถวไม่มีราคา → `noPaybackCta`, CTA href มี `system=hybrid&battery=…` / On-grid มี `system=on-grid` ไม่มี `battery`; HTML ไม่มีชื่อยี่ห้อ fixture (R1)
- Copy EN: `nextjs-dev` ร่าง, `design-business-reviewer` ตัดสิน tone

**DoD**
- [ ] `npm run build` ✓ · `verify-calculator.mts` ✓
- [ ] `npm run start` → `e2e-calculator-config.mts` ✓ · `e2e-booking.mts` ✓ (CTA → booking prefill)
- [ ] Production mode `/th/calculator` + `/en/calculator` ไม่มีตาราง Hybrid → ตัวเลขเท่า baseline R2-S0 ทุกค่าไฟ และไม่มีแถบ tab
- [ ] `grep` key ใหม่ทุกตัวใน th.json และ en.json · `i18n-parity-checker` ✓
- [ ] `grep -rn "_proto\|_prototype\|variant-switcher\|load-hybrid" src` → ว่าง
- [ ] `design-business-reviewer` บน real render (fixture สังเคราะห์ที่ค่าร่วมเท่าไฟล์จริง) **TH/EN × 1280 / 375** ใน 5 สถานะของ design-157 §7 + โหมด On-grid เทียบ baseline — **gate: ถ้า reject กลับ `nextjs-dev` ก่อน R2-S10**
- Commits: `feat(site): add on-grid and hybrid toggle with battery choice to calculator` · `test(e2e): cover public hybrid calculator states and cta`

**Rollback:** revert — `hybridTable` ไม่ถูกส่งให้ client, หน้าเป็น On-grid อย่างเดียว

**สรุปหลังแก้:** _(กรอกหลังทำ)_

---

## R2-S10 — Release R2 (prod)

**สรุปก่อนแก้**
- ทำไม: ขึ้นโค้ด Hybrid ทั้งหมดโดยหน้า public ยังเหมือนเดิม (ยังไม่มีตาราง Hybrid) — แยกจากการเปิดใช้ข้อมูล (R2-S11)
- ขั้นตอน (ตามลำดับ ห้ามข้าม):
  1. **อ่าน `docs/plans/kkd-shared-hosting-redeploy-runbook.md` ทั้งไฟล์**
  2. `deploy-verify`: artifact + `calculator-hybrid-r2-production-ddl.sql` (additive, InnoDB 3 ตาราง, ไม่มี DROP, ไม่มี `drop_legacy_calculator_params`)
  3. Snapshot (Default #1): phpMyAdmin Export `CalculatorConfig`, `CalculatorImport`, `Lead` → ดาวน์โหลดออก server
  4. phpMyAdmin (human): รัน DDL → `SHOW COLUMNS FROM Lead` เห็น `interestedBatteryKwh` + `SHOW COLUMNS` อีก 2 ตาราง — **ตรวจเองก่อน restart (R6: Lead ขาดคอลัมน์ = ทุก quote 500)**
  5. Marker ก่อน upload (จาก R2-S0/R2-S8) → คาด 0
  6. `hosting-deploy-specialist`: build → human `!` FTP → extract → restart
  7. Marker หลัง ≥ 1; `smoke-test-production.mts --check /th/calculator --expect-text "คำนวณ" --check /en/calculator --expect-text "How Much Is Your Bill" --check /th/booking --expect-text "<marker>"` ✓; `/api/admin/leads` → 401
  8. Write path: browser จริง `/th/booking?tab=quote&system=hybrid&battery=16` → lead ชื่อ `[TEST] hybrid r2` → POST 200 → admin lead detail แสดง HYBRID + 16 kWh → ลบ lead
  9. `/th|en/calculator` → **ไม่มีแถบ tab**, ตัวเลขเท่า baseline R2-S0 (desktop + 375)
  10. Admin prod: แท็บย่อย Hybrid = "Hybrid (ไม่มี)", export ได้ชีต On-grid ชีตเดียว
- **ขั้น rollback R2:**
  1. upload artifact R1 → restart
  2. human ใน phpMyAdmin: `UPDATE CalculatorConfig SET hybridSizeTable = NULL;` (R9 — กันตารางค้างเมื่อ deploy R2 กลับมา) → ก่อน re-deploy R2 ให้กด "ใช้ชุดนี้" กับเวอร์ชันที่มี Hybrid
  3. คอลัมน์ R2 ปล่อยไว้ (additive); `Lead.interestedBatteryKwh` ที่บันทึกแล้วยังอยู่ (โค้ด R1 ไม่อ่าน)
  4. ถ้าต้อง rollback ลึกถึงก่อน R1 → ใช้ขั้น rollback R1 (R1-S7) ต่อ
  5. DDL ผิด → import snapshot ข้อ 3

**DoD**
- [ ] หลักฐานข้อ 3, 4, 7, 8, 9, 10 ใน "สรุปหลังแก้"
- [ ] อัปเดต Status ของแผนนี้
- Commit: `docs(deploy): record hybrid calculator release evidence`

**Rollback:** ตามขั้น rollback R2 ข้างบน

**สรุปหลังแก้:** _(กรอกหลังทำ)_

---

## R2-S11 — Post-deploy: ADMIN อัปโหลดไฟล์ 2 ชีตจริงบน prod แล้วตรวจ toggle (ขั้นตอนข้อมูล ไม่ใช่ deploy)

**สรุปก่อนแก้**
- ทำไม: #153 ข้อ 6 — toggle ขึ้นเมื่อมีตาราง Hybrid เท่านั้น; เปลี่ยนหน้าเว็บด้วยข้อมูล ไม่ใช่โค้ด
- ขั้นตอน:
  1. Owner/ADMIN login prod → `/admin/pages/calculator` → แท็บ "ตารางขนาดระบบ" → นำเข้า `คำนวณติดตั้ง.xlsx` (จากเครื่อง owner — ไม่ผ่าน repo) — ไฟล์เดียวกับ On-grid S10 ต้องไม่ติด dedupe (Default #3)
  2. Screenshot preview ส่ง owner: On-grid ไม่เปลี่ยน (ถ้าไฟล์เดิม), Hybrid **13 ขนาด / 52 แถว**, คำเตือน E3 = 1 ข้อ (42 ช่อง), E5 = 20/30/50/99.9 kW, E4 = 80/99.9 kW แบต 100/200 + 125 kW (R14 — ข้อมูลเป็นความรับผิดชอบของเจ้าของ #160)
  3. ยืนยัน → `/th/calculator` + `/en/calculator` (desktop + 375) ตรวจตาม design-157 §7:

     | ค่าไฟ | คาด |
     |---:|---|
     | 9,500 | 10 kW รองรับ 1/3 เฟส, แบต 16, หลังติดตั้ง ฿590, ประหยัด ฿8,910, คืนทุน ~4.0 ปี |
     | 5,000 | 5 kW, แบต 16, ครอบคลุม 100%, คืนทุน ~4.6 ปี |
     | 120,000 | 125 kW 3 เฟส, แบต 100, ไม่มีคืนทุน → CTA ขอใบเสนอราคา |
     | 150,000 | tooLarge "ระบบเกิน 125 kW" |
     | 2,500 | 5 kW + หมายเหตุต่ำกว่าช่วง, คืนทุน ~9.3 ปี |
     | 50/60 kW | 6 ตัวเลือกแบต wrap 2 แถวบน 375px |

     และโหมด On-grid ที่ค่าไฟ baseline เท่า R2-S0
  4. Payload: `curl -s https://kkdproperty.co.th/th/calculator | grep -ci "solis\|deye\|sungrow\|growwatt\|energylib\|brandPrices"` = 0 (ทำซ้ำ `/en`)
  5. CTA โหมด Hybrid → booking prefill HYBRID + แบต → ส่ง lead `[TEST]` → ตรวจใน admin → ลบ
  6. Export จาก admin prod → ได้ 2 ชีต (เก็บในเครื่อง owner ไม่ commit)
  7. Audit page: `CalculatorImport` CREATE + `CalculatorConfig` UPDATE โดย owner
  8. `design-business-reviewer` บน prod render หลังมีตัวเลขจริง (TH/EN × desktop/375) — โดยเฉพาะ `batteryAssumption` และแถวที่ไม่มีคืนทุน
- **ไม่ต้อง deploy / restart** (apply ใช้ `revalidatePath`)

**DoD:** หลักฐานข้อ 2–8 (ไม่มีราคา) · owner ยืนยันในแชท/issue · Commit (docs only): `docs(calculator): record hybrid table go-live on production`

**Rollback:** "ใช้ชุดนี้" กับเวอร์ชันก่อนหน้า (ไม่มี Hybrid → toggle หาย) หรือ "คืนค่าเริ่มต้น" — มีผลทันที ไม่ต้อง deploy

**สรุปหลังแก้:** _(กรอกหลังทำ)_

---

## R2-S12 — Cleanup prototype + ปิด backlog  (⏳ R2-S11)

**สรุปก่อนแก้**
- ทำไม: prototype ใช้เป็นแบบอ้างอิงจนถึง go-live แล้วไม่มีค่าอีก; worktree ค้างทำให้ `git worktree list` สับสนและเสี่ยงหยิบโค้ดผิด
- ขั้นตอน (main session ทำหลัง **user ยืนยัน** เพราะลบ branch ที่ไม่เคย push = ย้อนไม่ได้):
  1. `git -C ../kkd_prop-proto-157 status --short` และ `git -C ../kkd_prop-proto-162 status --short` → ต้องว่าง (ถ้าไม่ว่าง หยุดถาม user)
  2. `git ls-remote --heads origin 'prototype/157-*' 'prototype/162-*'` → ยืนยันว่าไม่มีบน remote
  3. `git worktree remove ../kkd_prop-proto-157` · `git worktree remove ../kkd_prop-proto-162` · `git worktree prune`
  4. `git branch -D prototype/157-calculator-hybrid-toggle prototype/162-admin-table-editor`
  5. `git worktree list` เหลือ main อย่างเดียว · `git branch --list 'prototype/*'` ไม่มี 157/162
  6. Backlog: อัปเดต `backlogs/done/ISSUE_153_calculator_hybrid_toggle_map/PLAN.md` (DoD + ลิงก์แผนนี้) และ `backlogs/INDEX.md`; ย้ายไป `backlogs/done/` เมื่อ user ปิด #153 (ADR 0008)
- **ไม่ลบ** `prototype/147-calculator-size-table`, `prototype/121-*`, `prototype/pages-cms-navigation` (ไม่ใช่ของ map นี้ — ดู Out of scope)

**DoD:** ข้อ 5 ผ่าน · Commit: `docs(calculator): close hybrid toggle backlog after go-live`

**Rollback:** ไม่มี (ลบ branch แล้วย้อนไม่ได้ — จึงต้องผ่านข้อ 1–2 และ user ยืนยัน)

**สรุปหลังแก้:** _(กรอกหลังทำ)_

---

## Verification (รวม)

```bash
npm run build
npx tsx scripts/verify-calculator.mts           # On-grid equality 76/76 + Hybrid rules + projection payload
npx tsx scripts/verify-calculator-import.mts    # On-grid + Hybrid fixtures + round-trip 2 ชีต
npx tsx scripts/verify-storage-engine.mts       # ไม่มีตารางใหม่ — ต้องยังเขียว
npm run start &                                 # production mode (port 3000 สำหรับ e2e-booking)
npx tsx scripts/e2e-calculator-config.mts       # admin edit/import/export/rollback + public toggle
npx tsx scripts/e2e-admin.mts                   # export route 401/403/200 + /files ADMIN-only
npx tsx scripts/verify-all.mts                  # booking + admin + admin-crud
npx tsx scripts/smoke-test-production.mts --check /th/calculator --expect-text "คำนวณ"   # หลัง deploy
```
หน้าที่ต้องเปิดดู: `/th/calculator`, `/en/calculator` (1280 + 375, มี/ไม่มีตาราง Hybrid), `/th/booking?tab=quote`, `/en/booking?tab=quote`, `/admin/pages/calculator` (ADMIN + MARKETING), `/admin/leads/<id>`, `/admin/audit`

## Out of scope / follow-ups

- บล็อก HUAWEI แถว 57–79 ในฐานะตารางคำนวณ, ให้ลูกค้าเลือกยี่ห้อ, แก้สูตรให้ถูกหลักฟิสิกส์, formula engine (map #153 Out of scope)
- สูตรราคาแบตใน export (`ฐาน + ราคาแบต × n`) และการเก็บราคาแบตแยก (D6)
- สร้างตาราง Hybrid ใหม่จากหลังบ้านเมื่อยังไม่มี, แก้ชื่อยี่ห้อในหลังบ้าน (#162 Q1, research-158 §1.3)
- ตัวอย่างผลคำนวณ Hybrid ในแท็บ "ตัวเลขการคำนวณ" (#162 Q4)
- warning แผงต่างจากสูตรสำหรับ On-grid (#162 Q2)
- คอลัมน์ "ประเภท" และราคายี่ห้อ On-grid ในไฟล์ export (Default #9 — ระบบไม่เคยเก็บ)
- Transaction ข้าม 2 `auditedEntity` ใน save (Default #10 — ต้องแก้ `src/lib/audit.ts`)
- DROP คอลัมน์ legacy ของ `CalculatorConfig` บน prod (#151 แยก)
- แก้ `e2e-booking.mts` ให้รับ `BASE_URL` (Default #18 — chore แยกถ้า user ต้องการ)
- ลบ prototype branch เก่าที่ไม่ใช่ของ map นี้ (`prototype/147-calculator-size-table`, `prototype/121-ga-analytics-tab-ui`, `prototype/pages-cms-navigation`) — เสนอเป็น chore แยก
- เปิดใช้การแจ้งเตือน lead บน prod (#32)
