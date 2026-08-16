# Admin Landing Path Management — Task Breakdown

## Goal

ให้ ADMIN เพิ่ม landing path ที่มีอยู่จริงจาก dialog สร้าง/แก้ไขช่องทางโปรโมทได้เอง โดยไม่ต้องแก้ source code และ deploy เพียงเพื่อเพิ่มตัวเลือกใหม่

## Decisions

- เก็บตัวเลือกใน `PromoLandingPath`; `PromoChannel.landingPath` ยังคงเป็น string เพื่อไม่เพิ่ม foreign-key migration บน production MyISAM
- migration เติม 10 public top-level paths ปัจจุบันเป็นข้อมูลตั้งต้น
- รับเฉพาะ relative path ใต้ `/th` หรือ `/en`; ไม่รับ URL เต็ม, query, hash, dot segment, `/admin`, `/api`, `/files`
- ก่อนบันทึก server ต้องตรวจปลายทางบน public site และปฏิเสธ 404/5xx
- Admin UI ภาษาไทยอย่างเดียวตาม architecture เดิม
- ยังไม่มี delete path ในรอบนี้; ป้องกันการทำ promo link เดิมเสียโดยไม่จำเป็น

## Sprint 1 — Data and audited mutation

1. เพิ่ม `PromoLandingPath` ใน `prisma/schema.prisma` (`id`, unique `path`, `createdAt`)
2. สร้าง migration และ seed 10 paths ปัจจุบันแบบ idempotent
3. เพิ่ม `PromoLandingPath` ใน audit entity vocabulary
4. เพิ่ม `createLandingPath()` ใน `src/actions/channels.ts`: `requireRole("ADMIN")`, zod validation, same-site existence check, `auditedEntity()`, duplicate-safe result
5. เปลี่ยน channel create/update validation จาก compile-time enum เป็น membership check ใน `PromoLandingPath`

## Sprint 2 — Inline admin UI

1. หน้า `/admin/channels` query landing paths และส่งเข้า client
2. dialog ช่องทางแสดง DB-backed dropdown
3. ปุ่ม “เพิ่ม path” เปิด input inline; บันทึกสำเร็จแล้วเพิ่ม option และเลือกค่านั้นทันที
4. แสดง error จาก server action ผ่าน toast; state pending ห้าม submit ซ้ำ

## Sprint 3 — Verification and review

1. `npx prisma migrate dev` และ `npx prisma db seed` สองรอบ
2. `npm run build`
3. production-mode `/admin/channels`: เพิ่ม path จริงสำเร็จ, path 404 ถูกปฏิเสธ, path ใหม่ใช้สร้าง/แก้ channel ได้
4. `npx tsx scripts/e2e-admin-crud.mts`
5. audit review: authorization + snapshots + no secret
6. code review ตาม standards/spec

## Production gate

- เขียน phpMyAdmin-safe DDL/seed SQL ใน migration notes
- อ่าน `docs/plans/kkd-shared-hosting-redeploy-runbook.md` จบก่อน deploy
- production schema ก่อน code; deploy และ smoke test หลังผู้ใช้อนุมัติเท่านั้น
