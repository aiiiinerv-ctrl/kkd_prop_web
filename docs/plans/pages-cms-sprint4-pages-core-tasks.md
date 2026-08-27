# Pages CMS Sprint 4 — Shared pages core — Task Breakdown

อ้างอิง:

- `docs/plans/pages-cms-implementation-sprints.md` — Sprint 4
- `docs/plans/pages-cms-live-verification-matrix.md` (model script + axe)
- `docs/plans/pages-cms-data-model-migration-decision.md` (registry + aggregate)
- `docs/plans/pages-cms-routing-cache-impact-analysis.md`
- GitHub `#67` · PLAN `backlogs/ISSUE_067_pages_cms_sprint4_core/PLAN.md`
- Home pilot already live: `src/lib/pages-registry.ts`, `src/lib/audit.ts` (`auditedAggregate`), `src/actions/home-content.ts`, `src/app/admin/(dashboard)/pages/home/*`

## Default ที่ตัดสินใจแล้ว (ไม่ block ถามผู้ใช้)

1. **Rollout flags** — `home` = `pages` (คงของจริงหลัง H3); `about|services|packages|portfolio|calculator` = `legacy`. ไม่รีเซ็ต Home เป็น legacy.
2. **ไม่มี DDL / backfill** — ใช้ข้อมูล Sprint 3 (#66).
3. **UX** — สกัด shell จาก H2; ไม่เปิด `ux-ui-expert` ยกเว้นติด blocker.
4. **Nav** — คงลิงก์ “หน้าแรก (Pages)”; ไม่โชว์ต้นไม้ 6 หน้าจนกว่าแต่ละหน้า cutover.
5. **Deploy prod** — ทำหลัง local green + owner OK เท่านั้น.
6. **Featured Portfolio** — ยังเลื่อน (S4-F).
7. **โมดูล** — ย้าย/ขยายเป็น `src/lib/pages/` (entry สาธารณะเดียว); ลบหรือ re-export จาก `pages-registry.ts` ให้ Home ไม่พัง.

## คำถามที่ต้องตอบก่อนเริ่ม

ไม่มี — defaults ด้านบนล็อกแล้ว

## Task List

1. **Registry module** — สร้าง `src/lib/pages/` (เช่น `index.ts`, `registry.ts`, `types.ts`) ครบ 6 keys: `labelTh`, `adminContentPath`, `publicPaths`, `contentRollout`, cache consumers / role hints ตาม routing + ownership docs; migrate callers จาก `src/lib/pages-registry.ts` | ผู้รับผิดชอบ: `nextjs-dev` | ✅ ขนานได้หลัง claim

2. **Validations** — เพิ่ม `src/lib/validations/page-content/` (shared paired text, version, image-op hooks) + `page-properties.ts` (canonical, robots, high-risk); คง `home-content.ts` แล้วค่อยให้ Home schema compose จาก shared primitives | ผู้รับผิดชอบ: `nextjs-dev` | ✅ ขนานกับ #3 หลัง #1

3. **Audit seam** — ทบทวน `auditedAggregate()` ใน `src/lib/audit.ts`; เพิ่ม helper จำกัดขนาด snapshot / เอกสาร invariant ถ้ายังขาด; **ห้าม** ทำลาย `src/actions/home-content.ts` consumer | ผู้รับผิดชอบ: `nextjs-dev` | ✅ ขนานกับ #2

4. **Actions seam** — เพิ่ม `src/actions/pages/` (deny unknown keys; derive IDs/paths จาก registry; Properties ADMIN/MARKETING fresh role read); adapter ให้ Home ใช้ shared helpers โดยไม่ dual-write สาธารณะ | ผู้รับผิดชอบ: `nextjs-dev` | ⏳ รอ #2 #3

5. **Admin shell + route** — `src/components/admin/pages/` (shell, TH/EN tabs `keepMounted`, unsaved guard stubs, status/warning panels, responsive page selector fed by registry); `src/app/admin/(dashboard)/pages/[page]/page.tsx` fail-closed/`notFound` สำหรับ key ที่ยังไม่มี admin surface; **อย่า** ลบ `pages/home/` จนกว่า wire ใน #6 เสร็จ | ผู้รับผิดชอบ: `nextjs-dev` | ✅ ขนานกับ #2–3 หลัง #1

6. **Home adopt shell** — ให้ `pages/home/home-client.tsx` (หรือ thin wrapper) ใช้ shared shell โดยฟิลด์/FAQ/Contact RBAC เดิมครบ; sidebar ยังชี้ `/admin/pages/home` | ผู้รับผิดชอบ: `nextjs-dev` | ⏳ รอ #4 #5

7. **Verify + evidence** — ตาม matrix:
   - เพิ่ม/รัน `scripts/verify-pages-cms-model.mts` (keys, partition, schemas, canonical, aggregate limits)
   - Playwright-compatible axe บน shell fixture (desktop/tablet/mobile); serious/critical ต้อง fail
   - `npm run build`; `npx tsx scripts/e2e-admin.mts`; `npx tsx scripts/e2e-admin-crud.mts` (no regress)
   - Ad hoc: Home save → 1 version + 1 audit; stale version conflict; dormant `/admin/pages/about` (etc.) not found; FINANCE denied
   - เขียน `docs/plans/assets/pages-cms-result/s04-pages-core/manifest.md` (+ automated-checks / screenshots ตามที่ทำได้)
   | ผู้รับผิดชอบ: `nextjs-dev` | ⏳ รอ #6

8. **Audit compliance** — รัน `audit-compliance-reviewer` บน actions ใหม่/ที่แตะใน Sprint นี้ | ผู้รับผิดชอบ: `audit-compliance-reviewer` | ⏳ รอ #4 #6

9. **i18n** — รัน `i18n-parity-checker` **เฉพาะเมื่อ** แตะ `src/messages/{th,en}.json` (admin Thai-only ปกติไม่ต้อง) | ผู้รับผิดชอบ: `i18n-parity-checker` | ✅ ถ้าแตะ messages

10. **Close-out** — comment evidence บน #67; close; ย้าย PLAN → `backlogs/done/`; อัปเดต `backlogs/INDEX.md` | ผู้รับผิดชอบ: orchestrator | ⏳ รอ #7–9

## Out of scope

- Public cutover / registry flip สำหรับหน้า besides Home ที่เป็น `pages` แล้ว
- Sprint 5 “Home Properties tracer” เต็มรูปแบบ / Featured Portfolio
- เปิด parent Pages nav ครบ 6 ลูก
- InnoDB / backup / production DDL
- ออกแบบ visual ใหม่ทั้งหน้า

## First wave (หลัง claim #67)

ขนานได้ทันที: **Task 1** แล้วตามด้วย **2 ∥ 3 ∥ 5** → **4** → **6** → **7** → reviewers.
