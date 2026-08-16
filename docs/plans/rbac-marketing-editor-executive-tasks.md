# RBAC: MARKETING / EDITOR / EXECUTIVE — Task Breakdown

อ้างอิง:
- คำสั่งจากเจ้าของโปรเจกต์ (2026-08-16) — สิทธิ์ของ 3 role ใหม่ (quote ในตารางด้านล่าง ห้ามแก้)
- `AGENTS.md` — Working rules (TH/EN parity, `requireAdmin()`/`requireRole()` + `withAudit()`, surgical changes), Agent model tiers, Commit convention
- `docs/plans/sprint-4-lead-management-tasks.md` (lead scope filter + PII redaction), `docs/plans/sprint-5-reports-tasks.md` (gate ADMIN+FINANCE บน reports), `docs/plans/sa-channel-taxonomy-utm-tasks.md` (channels/executives), `docs/plans/kkd-shared-hosting-redeploy-runbook.md` (deploy)
- `scripts/e2e-rbac-sprint2.mts` — RBAC e2e ที่มีอยู่แล้ว **ต่อยอด อย่าเขียนใหม่**

**ข้อเท็จจริงจากผู้ใช้ที่ห้ามแก้ (quote ตรง):**
- MARKETING — "จัดการ content เต็มรูปแบบ: services, packages, portfolio, testimonials", "จัดการช่องทาง (channels) ได้", "เพิ่ม/จัดการผู้ดำเนินการ (channel executives) ได้", "ดู lead ได้ทั้งหมดแบบ read-only (เห็น PII เต็ม ไม่ redact) … แก้ไข lead ไม่ได้"
- EDITOR — "เพิ่มสิทธิ์จัดการผู้ดำเนินการ (channel executives) ได้", "ดูข้อมูลลูกค้า/lead ได้อย่างเดียว (read-only, เห็นข้อมูลเต็ม)", "เป็นผู้จัดการ บริการ (services) และ package", "ดูการจองสำรวจ (bookings) ได้อย่างเดียว", "จัดการผลงาน (portfolio) และรีวิว (testimonials) ได้", "ดูรายงาน (/admin/reports) ได้อย่างเดียว และสามารถ export ข้อมูลได้"
- EXECUTIVE — "ดู users และ audit log แบบ read-only เพื่อ oversight (เห็นได้ แต่แก้ไขไม่ได้)", "ดูรายงาน (/admin/reports) ได้อย่างเดียว", "ดูข้อมูลลูกค้า/lead ได้อย่างเดียว"

---

## สถานะจริงในโค้ดที่ตรวจแล้ว (2026-08-16) — ห้ามวางแผนสร้างซ้ำ

| ของ | สถานะ | ที่อยู่ |
|---|---|---|
| `enum Role { ADMIN SALES FINANCE CHANNEL_EXECUTIVE }` | มีแล้ว 4 ค่า, `@default(SALES)` บน `AdminUser.role` | `prisma/schema.prisma:10`, `:85` |
| `ROLES` / `zodEnum(ROLES)` | **derive จาก Prisma enum อัตโนมัติ** (`Object.values(Role)`) → role ใหม่ผ่าน zod ของ `src/actions/users.ts` ทันทีโดยไม่ต้องแก้ validation | `src/lib/enums.ts:34` |
| `getLeadScopeFilter` / `getBookingScopeFilter` | `switch` แบบ exhaustive บน `Role` union → **เพิ่ม role แล้ว TS จะ error ให้เอง** ใช้ compiler นำทางได้ | `src/lib/auth/index.ts:64`, `:93` |
| `canMutateLead` / `canMutateBooking` | fall-through `return false` → role ใหม่ **fail closed อัตโนมัติ ไม่ต้องแก้ logic** ยืนยันด้วย test พอ | `src/lib/auth/index.ts:126`, `:137` |
| `redactLeadPII` | ถูกเรียกเฉพาะเมื่อ `role === "CHANNEL_EXECUTIVE"` → role ใหม่เห็น PII เต็มอยู่แล้วตามสเปก **ไม่ต้องแก้** | `src/lib/auth/index.ts:165`, `src/app/api/admin/leads/route.ts:70` |
| `isPublished: Boolean` | **มีจริงทั้ง 4 content models** → ข้อจำกัด publish ของ EDITOR ทำได้จริง ไม่ต้องเพิ่มคอลัมน์ | `prisma/schema.prisma` Service:280 / Package:298 / PortfolioProject:319 / Testimonial:337 |
| หน้า content 4 หน้า + action 12 ตัว | ใช้ `requireAdmin()` **ไม่ใช่** `requireRole()` → FINANCE/CHANNEL_EXECUTIVE เข้าถึงได้ผ่าน URL ตรง (ช่องโหว่เดิม) | `services|packages|portfolio|testimonials/page.tsx:6`, `src/actions/{services,packages,portfolio,testimonials}.ts` |
| Role union แบบ hardcode ซ้ำ 5 ที่ | ต้องแก้ทุกที่ ไม่งั้น dropdown/sidebar ตกหล่นเงียบ ๆ | `src/types/next-auth.d.ts:8,15,24`, `admin-topbar.tsx:11`, `admin-sidebar.tsx:25`, `leads-client.tsx:29`, `users-client.tsx:32` |
| `ROLE_LABELS` | **ไม่มี** — label ไทยถูก hardcode ใน `<option>` ของ users-client | `src/lib/enum-labels.ts` (มี LEAD_STATUS_LABELS ฯลฯ แล้ว), `users-client.tsx:144-147` |
| role string ใน `src/messages/{th,en}.json` | **ไม่มีเลย** — admin UI เป็นไทยล้วนตาม ADR two-root-layouts | — |
| `channels-client` capability prop | มีแค่ `readOnly: boolean` ก้อนเดียว → **ไม่พอ** สำหรับ EDITOR (จัดการ executive ได้ แต่แก้ channel ไม่ได้) | `channels/page.tsx:37`, `channels-client.tsx:229` |
| RBAC e2e | มีแล้ว ครอบ SALES/FINANCE/CHANNEL_EXECUTIVE | `scripts/e2e-rbac-sprint2.mts` |
| seed test users ต่อ role | มีแล้ว 4 ราย (`*.test@kkdproperty.local`) | `prisma/seed.ts:66,224,235,258` |

---

## Default ที่ตัดสินใจแล้ว (ไม่ block ถามผู้ใช้ — ค้านเป็นข้อ ๆ ได้ตอน review)

1. **EDITOR = create/update ได้ แต่ publish/delete ไม่ได้ (ยืนยัน option ฐานของผู้ใช้)** — เพราะตรวจแล้วว่า `isPublished` **มีอยู่จริงในทั้ง 4 models** คำว่า "เป็นผู้จัดการ บริการ, package" จึงไม่ต้องตีความเป็น manage เต็มรูป ระบบรองรับ draft/publish ได้ตรง ๆ อยู่แล้ว
   - create → บังคับ `isPublished: false` เสมอ (ไม่สนค่าใน form)
   - update → **ไม่แตะ** `isPublished` (คงค่าเดิมใน DB ไม่ใช่ค่าจาก form)
   - delete → 403
   - บังคับที่ server action เป็นหลัก, UI แค่ซ่อนปุ่มตาม
   - ⚠️ **ข้อนี้คือจุดกำกวมเดียวของสเปก — ขอ confirm ก่อนเริ่ม Sprint 3** ถ้าผู้ใช้ต้องการ manage เต็มรูปจริง ให้ตัด task 3.2/3.3 ทิ้ง แล้ว EDITOR ใช้ gate เดียวกับ MARKETING
2. **MARKETING ได้ /admin/reports อ่าน + export** ทั้งที่สเปกไม่ได้พูดถึง — เพราะได้สิทธิ์เห็น lead PII เต็มไปแล้ว รายงานที่เป็นตัวเลขรวมจึงอ่อนไหวน้อยกว่าสิ่งที่ได้อยู่ และ "วัดผล campaign" คือหน้าที่ตรงตัวของหน้านี้ (ถ้าไม่เห็นด้วย → ตัด MARKETING ออกจาก task 2.6/2.7)
3. **EXECUTIVE ดูรายงานได้แต่ export ไม่ได้** — least privilege: ผู้ใช้ระบุ export ให้ EDITOR ชัดเจน แต่ไม่ระบุให้ EXECUTIVE จึงไม่แถมให้ ไฟล์ Excel มี PII ลูกค้าเต็ม และหลุดออกนอกระบบ audit ไม่ได้ (ค้านได้ 1 บรรทัด แก้ที่ task 2.7)
4. **MARKETING และ EXECUTIVE ไม่มีสิทธิ์แตะ /admin/bookings เลย** (ไม่ใช่ read-only) — สเปกให้ read-only bookings เฉพาะ EDITOR; booking มีที่อยู่ + สลิปการเงินซึ่งเกินขอบเขต "วัดผล campaign" และ "oversight"
5. **ทั้ง 3 role ใหม่ไม่มีสิทธิ์เปิดสลิปใน `/files/private/slips/*`** — สลิปเป็นข้อมูลการเงิน ไม่มี role ไหนใน 3 ตัวนี้ได้รับสิทธิ์การเงิน
6. **ทั้ง 3 role ใหม่เข้า `/admin` dashboard ได้** — dashboard โชว์ recent leads พร้อมชื่อ/เบอร์ ซึ่งทั้ง 3 role ได้สิทธิ์เห็นเต็มอยู่แล้ว จึงไม่ต้อง redirect แบบ CHANNEL_EXECUTIVE
7. **badge "lead ใหม่" ปิดสำหรับ 3 role ใหม่** (`/api/admin/leads/unread-count` คืน 0) — badge สื่อว่า "มีงานให้ทำ" แต่ role read-only กด follow-up ไม่ได้ ตัวเลขค้างจะกวนสายตาถาวร
8. **ปิดช่องโหว่ `requireAdmin()` บนหน้า content ไปพร้อมกัน** — ไม่ใช่ scope creep แต่เป็นเงื่อนไขบังคับ: จะแยกสิทธิ์ EDITOR ออกจาก MARKETING ไม่ได้เลยถ้ายังใช้ `requireAdmin()` ผลข้างเคียงคือ **FINANCE / CHANNEL_EXECUTIVE จะเข้าหน้า content ผ่าน URL ตรงไม่ได้อีก** (ตรงกับ sidebar ที่ซ่อนลิงก์ให้อยู่แล้ว) — แจ้งไว้ ไม่ถือเป็นการเปลี่ยนสเปก
9. **แทนที่ Role union hardcode 5 จุดด้วย `import type { Role } from "@/lib/auth"`** — surgical เพราะทุกไฟล์ต้องแก้อยู่แล้วเพื่อเพิ่ม 3 ค่า การ import ทำให้ครั้งหน้าเพิ่ม role แล้วไม่มีจุดตกหล่น
10. **default role ตอนสร้าง user ยังเป็น `SALES`** — ไม่เปลี่ยน ไม่มีเหตุผลให้เปลี่ยน
11. **ลำดับ `<option>` ใน dropdown เรียงตามระดับสิทธิ์**: SALES → EDITOR → MARKETING → FINANCE → CHANNEL_EXECUTIVE → EXECUTIVE → ADMIN

---

## คำถามที่ต้องตอบก่อนเริ่ม

1. **ยืนยัน default #1 (EDITOR publish/delete ไม่ได้)** — ถ้าตอบ "manage เต็มรูป" งานหายไป ~1 sprint
2. **จังหวะ deploy production** — การเพิ่มค่าใน MySQL `ENUM` ต้องรัน `ALTER TABLE AdminUser MODIFY COLUMN role ENUM(...)` **ด้วยมือผ่าน phpMyAdmin** (production ไม่มี SSH ตาม `docs/plans/kkd-shared-hosting-redeploy-runbook.md`) ต้องนัดเวลาที่เข้า panel ได้ — จะรวมกับรอบ deploy ถัดไป หรือทำรอบแยก?

---

## Permission matrix (สรุปให้ implementer ใช้เป็น source of truth)

| พื้นที่ | ADMIN | SALES | FINANCE | CHANNEL_EXEC | **MARKETING** | **EDITOR** | **EXECUTIVE** |
|---|---|---|---|---|---|---|---|
| `/admin` dashboard | ✔ | ✔ | ✔ | → redirect leads | **อ่าน** | **อ่าน** | **อ่าน** |
| `/admin/leads` list | เต็ม | เฉพาะของตน | อ่านเต็ม | scoped + redact | **อ่านเต็ม PII** | **อ่านเต็ม PII** | **อ่านเต็ม PII** |
| lead detail + mutate | ✔ | เฉพาะของตน | อ่าน | ✘ | **อ่านอย่างเดียว** | **อ่านอย่างเดียว** | **อ่านอย่างเดียว** |
| `/admin/bookings` | ✔ | เฉพาะของตน | อ่าน | ✘ | **✘** | **อ่านอย่างเดียว** | **✘** |
| services / packages / portfolio / testimonials | เต็ม | เต็ม | ✘ (ปิดใหม่) | ✘ (ปิดใหม่) | **เต็ม** | **create/update เท่านั้น** | **✘** |
| toggle `isPublished` | ✔ | ✔ | ✘ | ✘ | **✔** | **✘** | **✘** |
| delete content | ✔ | ✔ | ✘ | ✘ | **✔** | **✘** | **✘** |
| `/admin/channels` — channel CRUD | ✔ | ✘ | ✘ | อ่านของตน | **✔** | **อ่าน** | **✘** |
| channel executives CRUD | ✔ | ✘ | ✘ | ✘ | **✔** | **✔** | **✘** |
| `/admin/reports` อ่าน | ✔ | ✘ | ✔ | ✘ | **✔** | **✔** | **✔** |
| reports export (xlsx) | ✔ | ✘ | ✔ | ✘ | **✔** | **✔** | **✘** |
| `/admin/users` | เต็ม | ✘ | ✘ | ✘ | **✘** | **✘** | **อ่านอย่างเดียว** |
| `/admin/audit` | ✔ | ✘ | ✘ | ✘ | **✘** | **✘** | **อ่านอย่างเดียว** |
| `/admin/settings` | ✔ | ✘ | ✘ | ✘ | **✘** | **✘** | **✘** |
| `/files/private/slips/*` | ✔ | ของตน | ✔ | ✘ | **✘** | **✘** | **✘** |

---

## Hand-off status (2026-08-16 evening)

- Default #1 (EDITOR create/update, no publish/delete) — **confirmed by owner**
- `settings-client.tsx` Tabs scope creep — **reverted** (not part of this feat)
- Sprint 7 deploy — **deferred** to next production deploy window
- Task #33 audit-compliance-reviewer — **PASS** (1 LOW design note on `linkAdminUserToExecutive`, intentional)

## Task List

### Sprint 1 — Schema + auth primitives (blocking ทุกอย่าง)

1. `prisma/schema.prisma` — เพิ่ม `MARKETING`, `EDITOR`, `EXECUTIVE` ใน `enum Role` (บรรทัด 10) ต่อท้าย `CHANNEL_EXECUTIVE` ห้ามสลับลำดับค่าเดิม; ใส่ comment สั้นบอกว่า role ใหม่ = read-only + content ต่างระดับ; `@default(SALES)` คงเดิม แล้วรัน `npx prisma migrate dev --name add-marketing-editor-executive-roles` | ผู้รับผิดชอบ: `nextjs-dev` | ✅
2. `src/lib/auth/index.ts` — (a) `Role` union +3 ค่า (บรรทัด 8) (b) `getLeadScopeFilter` เพิ่ม `case "MARKETING": case "EDITOR": case "EXECUTIVE": return {}` (c) `getBookingScopeFilter` เพิ่ม `case "EDITOR": return {}` และ `case "MARKETING": case "EXECUTIVE": return { id: "__no_booking_access__" }` (fail closed, ให้ page/API gate เป็นด่านแรก) (d) เพิ่ม capability helper **export ทั้งหมด พร้อม JSDoc สไตล์เดียวกับ `canMutateLead`**: `canManageContent(role)` = ADMIN|SALES|MARKETING|EDITOR, `canPublishContent(role)` = ADMIN|SALES|MARKETING, `canDeleteContent(role)` = ADMIN|SALES|MARKETING, `canManageChannels(role)` = ADMIN|MARKETING, `canManageChannelExecutives(role)` = ADMIN|MARKETING|EDITOR, `canViewReports(role)` = ADMIN|FINANCE|MARKETING|EDITOR|EXECUTIVE, `canExportReports(role)` = ADMIN|FINANCE|MARKETING|EDITOR (e) **ไม่แตะ** `canMutateLead`/`canMutateBooking`/`redactLeadPII` (fail closed อยู่แล้ว) | `nextjs-dev` | ✅
3. `src/types/next-auth.d.ts` — แทน union hardcode 3 จุด (บรรทัด 8/15/24) ด้วย `Role` ที่ import จาก `@/lib/auth` | `nextjs-dev` | ✅
4. `src/lib/enum-labels.ts` — เพิ่ม `export const ROLE_LABELS: Record<Role, { label: string; description: string }>` ครบ 7 ค่า (ไทย) ย้ายข้อความเดิมจาก `users-client.tsx:144-147` มาเป็นค่าเริ่มต้น + เขียนของใหม่ 3 ตัว: MARKETING "การตลาด — จัดการเนื้อหา/ช่องทาง และดู lead", EDITOR "ผู้ดูแลเนื้อหา — แก้ไขเนื้อหา (ไม่มีสิทธิ์เผยแพร่/ลบ)", EXECUTIVE "ผู้บริหาร — ดูรายงานและข้อมูลภาพรวม" | `nextjs-dev` | ✅

### Sprint 2 — Page + API gates (ขนานกันได้เกือบทั้งหมด)

5–16. Page + API gates ตามแผน | `nextjs-dev` | ✅

### Sprint 3 — Content: gate + ข้อจำกัด publish/delete ของ EDITOR

> ✅ Default #1 confirmed by owner (2026-08-16) — EDITOR create/update, no publish/delete

17–19. Content page gates + server `isPublished`/`delete` restrictions + UI hide | `nextjs-dev` | ✅

### Sprint 4 — Channels + channel executives

20–23. Channels capability split + action gates | `nextjs-dev` | ✅

### Sprint 5 — UI: navigation, dropdown, read-only states

24–30. Sidebar/topbar/users/leads/bookings/reports/seed | `nextjs-dev` | ✅
- Deviation: #27 `canEdit` ใน leads-client ไม่จำเป็น (list ไม่มี mutation; gate อยู่ที่ detail) — ยอมรับ
- Deviation: `crud-page.tsx` เพิ่ม `canDelete` prop (default true) เพื่อรองรับ #19

### Sprint 6 — Verify + review

31. `scripts/e2e-rbac-sprint2.mts` — ต่อยอด assert ครบ 3 role ใหม่ | `nextjs-dev` | ✅ (slip assert ใช้ 401 ตามโค้ดจริง ไม่ใช่ 403 ในแผนเดิม)
32. Verify: build + seed + e2e-rbac + e2e-admin + e2e-admin-crud | `nextjs-dev` | ✅ ผ่านครบ (2026-08-16)
33. Audit/permission review อิสระ | `audit-compliance-reviewer` | ✅ PASS (LOW-1 `linkAdminUserToExecutive` intentional)
34. Commit ตาม Conventional Commits — 2 ก้อน feat + test | `nextjs-dev` | ✅ `e80667c` + `b3c17ed`

### Sprint 7 — Deploy (แยกรอบ รอผู้ใช้เคาะเวลา)

35. อ่าน `docs/plans/kkd-shared-hosting-redeploy-runbook.md` ให้จบก่อนแตะ production — โดยเฉพาะหัวข้อ schema-first | `hosting-deploy-specialist` | ⏳ รอ #34 + คำตอบคำถาม #2
36. รัน `ALTER TABLE` เพิ่มค่า enum บน production ผ่าน phpMyAdmin (production ไม่มี SSH) **ก่อน** อัปโค้ดใหม่ — โค้ดเก่าอยู่กับ enum ที่กว้างขึ้นได้ แต่โค้ดใหม่อยู่กับ enum เก่าไม่ได้; ถ่าย backup ด้วย `npx tsx scripts/backup-db.mts` ก่อน | `hosting-deploy-specialist` | ⏳ รอ #35
37. Deploy + `npx tsx scripts/smoke-test-production.mts` แล้ว login จริงด้วยบัญชี role ใหม่ 1 ราย | `hosting-deploy-specialist` | ⏳ รอ #36

---

## Out of scope

- **เพิ่ม role ที่ 8 ขึ้นไป / ทำ permission เป็น table-driven (RBAC engine)** — 7 role ยังเอาอยู่ด้วย helper functions; ถ้าเกิน 10 ค่อยคุยเรื่อง `Permission` model
- **Refactor `getLeadScopeFilter`/`getBookingScopeFilter` ให้ share โค้ดกัน** — ตอนนี้ซ้ำกันจริง แต่ AGENTS.md สั่ง surgical และสอง filter คืน type คนละตัว
- **เปลี่ยน `redactLeadPII` ให้ configurable ต่อ role** — role ใหม่ทั้ง 3 เห็น PII เต็มตามสเปก ไม่มี requirement ให้ redact
- **เพิ่ม workflow อนุมัติ (submit-for-review → approve) สำหรับ draft ของ EDITOR** — สเปกขอแค่ "ให้ ADMIN/MARKETING กดแทน" ซึ่ง toggle `isPublished` เดิมทำได้อยู่แล้ว
- **แก้ default role ตอนสร้าง user** — คงเป็น `SALES`
- **TH/EN message keys** — ยืนยันแล้วว่า admin UI เป็นไทยล้วน ไม่มี string ใหม่เข้า `src/messages/*.json` จึงไม่ต้องเรียก `i18n-parity-checker` ในสปรินต์นี้ (ถ้ามี implementer เผลอเพิ่ม key ให้เพิ่ม task นี้กลับมา)
- **`design-business-reviewer`** — งานทั้งหมดอยู่ใน `/admin` (noindex, ไทยล้วน, ไม่ใช่ conversion surface) และไม่มี public render เปลี่ยน จึงไม่เข้าเงื่อนไข "แผนที่แตะหน้าตาเว็บ"; ถ้าระหว่างทางมีการปรับ layout หน้า admin ที่มองเห็นได้ชัด ให้เพิ่มกลับเข้ามาเป็น task ปิดท้าย
