# PLAN — ISSUE_142_home_faq_background

> Dual source of truth with GitHub [#142](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/142).

## Meta

| Field | Value |
|---|---|
| GitHub | https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/142 |
| Opened | 2026-09-25 |
| Status (disk) | active — draft plan รอ owner review; live triage status is GitHub labels |
| Triage labels | `enhancement`, `needs-triage` → promote เป็น `ready-for-agent` หลัง owner อนุมัติ plan |
| Type | enhancement |

## Goal

- Admin อัปโหลด/เปลี่ยน/ลบ รูปพื้นหลังส่วน FAQ บนหน้าแรกได้จาก `/admin/pages/home` — รูปเดียวทั้ง TH/EN
- Public `/th` `/en`: มีรูป → section full-bleed + overlay ขาวโปร่งอัตโนมัติ เนื้อหาอยู่ใน `max-w-7xl`; ไม่มีรูป/blob หาย → เหมือนเดิมทุก pixel

## Scope

- **In-scope**
  - คอลัมน์ `HomePageContent.faqBackgroundImageKey` + prod DDL asset
  - Upload/remove lifecycle ใน `updateHomeContent` (audited, RBAC เดิม)
  - `FaqSection` branch markup + resolver fallback
  - Admin card พร้อม preview + overlay จำลอง + inline remove confirm
  - E2E ใน `scripts/e2e-admin-crud.mts`, reviews, deploy + smoke
- **Out-of-scope**
  - overlay slider, รูปแยกภาษา, ปุ่มลบรูป hero, extract image-card ร่วมกับ hero, section/หน้าอื่น, dark variant (รายละเอียดใน sprint plan)

## Checkpoint: Known / Unknown / Assumption

- **Known** (code/docs): ไม่ใช่ bug — ไม่เคยมีฟีเจอร์; pattern hero (`storePublicImage`, `resolveHomeHeroImage`, `homeContentAggregate`) reuse ได้; `HomeAdminShell` forward props ด้วย spread; `images.unoptimized: true`; `compressImage` cap 1920px; prod ไม่มี `_prisma_migrations` (#124)
- **Unknown**: owner มีรูปจริงสำหรับ FAQ แล้วหรือยัง (จำเป็นแค่ตอน S6 step 6 — ไม่ block การพัฒนา)
- **Safe assumptions**: overlay `bg-white/85` (S0 ยืนยัน); ไม่มี message key ใหม่

## Task table

| # | Work | Owner (agent / human) | Depends on | Parallel? | Status |
|---:|---|---|---|---|---|
| 0 | Owner review sprint plan | User | — | — | pending |
| S0 | Overlay spec lock (contrast AA) | `ux-ui-expert` | 0 | ✅ กับ S1 | pending |
| S1 | Schema + migration + prod DDL asset + view field | `nextjs-dev` | 0 | ✅ กับ S0 | pending |
| S2 | Server action upload/remove/lifecycle + review | `nextjs-dev` → `audit-compliance-reviewer` | S1 | ✅ กับ S3 | pending |
| S3 | Public render + resolver fallback | `nextjs-dev` | S1 (+S0 ค่า overlay) | ✅ กับ S2 | pending |
| S4 | Admin card (preview, inline remove confirm, hints) | `nextjs-dev` | S2, S3 | — | pending |
| S5 | E2E + verify-all + audit review + real-render design review (desktop/mobile) | `nextjs-dev` → `audit-compliance-reviewer` ∥ `design-business-reviewer` | S4 | reviewers ✅ | pending |
| S6 | Deploy: runbook → DDL → build/upload → smoke → owner อัปรูปจริง → re-review | `deploy-verify` → `hosting-deploy-specialist` + owner | S5 | — | pending |
| 7 | Owner accept + close #142 + move folder to `backlogs/done/` | User | S6 | — | pending |

## Parallel lanes

- P1: S0 (`ux-ui-expert`) ∥ S1 (`nextjs-dev`)
- P2: S2 ∥ S3 (หลัง S1)
- P3: S5 reviewers `audit-compliance-reviewer` ∥ `design-business-reviewer`

## Sequential chain

1. Owner review → S0 ∥ S1
2. S2 ∥ S3 → S4 → S5
3. S6 (DDL ก่อน code เสมอ ตาม runbook)

## Definition of Done

- [ ] Behavior matches Goal — ไม่มีรูป = markup FAQ เดิม (`/th`, `/en`)
- [ ] Verify skill evidence: `verify-all.mts` + `e2e-home-cms.mts` ✓ lines
- [ ] `audit-compliance-reviewer` pass บน `src/actions/home-content.ts`
- [ ] `design-business-reviewer` pass บน real render desktop + mobile (local และ production)
- [ ] Prod DDL applied + `SHOW COLUMNS` verified ก่อน restart
- [ ] `smoke-test-production.mts --check/--expect-text` green ทั้งก่อนและหลังอัปรูป
- [ ] No secrets in PLAN, INDEX, or GitHub comments
- [ ] GitHub issue commented with outcome and closed (owner)
- [ ] Folder moved to `backlogs/done/`; `backlogs/INDEX.md` updated

## Evidence

### 1) Research

- Scope: FAQ section ของหน้าแรก + admin `/admin/pages/home`
- Files explored: `prisma/schema.prisma` (HomePageContent L455), `src/actions/home-content.ts`, `src/components/site/faq-section.tsx`, `src/app/[locale]/home-content.tsx` (L96–188, L386), `src/lib/content/{index,views}.ts`, `src/lib/admin-content.ts`, `src/lib/images.ts`, `src/lib/storage/local.ts`, `src/app/admin/(dashboard)/pages/home/{page,home-client,home-admin-shell}.tsx`, `scripts/e2e-{admin-crud,home-cms}.mts`, `scripts/smoke-test-production.mts`, `next.config.ts`
- Current state: production baseline 2026-09-25 — FAQ `<section class="mx-auto max-w-7xl px-4 py-16 sm:px-6">` พื้นเรียบ ไม่ full-bleed
- Constraints: surgical; DDL มือบน phpMyAdmin; admin Thai-only

### 2) Fix / diagnosis

- Sprint plan: [`docs/plans/home-faq-background-tasks.md`](../../docs/plans/home-faq-background-tasks.md)

### 3) Quality

- (กรอกหลัง S5/S6 ตาม template "สรุปสิ่งที่แก้ไปแล้ว" ใน sprint plan §9)

### 4) Risk / follow-up

- Residual risk: รูปแนวนอนถูก crop มากบนมือถือ (section สูง) — design reviewer ตัดสิน
- Follow-up candidates: ปุ่มลบรูป hero + shared image-card
