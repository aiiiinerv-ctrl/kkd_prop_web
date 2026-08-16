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

- Prisma migration สำหรับ dev อยู่ที่ `prisma/migrations/20260816163000_add_promo_landing_paths/migration.sql`
- Production ใช้ phpMyAdmin-safe SQL ด้านล่าง: DDL ใช้ `IF NOT EXISTS`, กำหนด `ENGINE=InnoDB`, และ seed ใช้ `INSERT IGNORE` จึงรันซ้ำได้
- อ่าน `docs/plans/kkd-shared-hosting-redeploy-runbook.md` จบก่อน deploy
- production schema ก่อน code; deploy และ smoke test หลังผู้ใช้อนุมัติเท่านั้น

```sql
CREATE TABLE IF NOT EXISTS `PromoLandingPath` (
  `id` VARCHAR(191) NOT NULL,
  `path` VARCHAR(180) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `PromoLandingPath_path_key` (`path`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT IGNORE INTO `PromoLandingPath` (`id`, `path`, `createdAt`) VALUES
  ('landing_th_packages', '/th/packages', CURRENT_TIMESTAMP(3)),
  ('landing_th_home', '/th', CURRENT_TIMESTAMP(3)),
  ('landing_th_booking', '/th/booking', CURRENT_TIMESTAMP(3)),
  ('landing_th_calculator', '/th/calculator', CURRENT_TIMESTAMP(3)),
  ('landing_th_about', '/th/about', CURRENT_TIMESTAMP(3)),
  ('landing_th_contact', '/th/contact', CURRENT_TIMESTAMP(3)),
  ('landing_th_cookie_policy', '/th/cookie-policy', CURRENT_TIMESTAMP(3)),
  ('landing_th_portfolio', '/th/portfolio', CURRENT_TIMESTAMP(3)),
  ('landing_th_services', '/th/services', CURRENT_TIMESTAMP(3)),
  ('landing_th_testimonials', '/th/testimonials', CURRENT_TIMESTAMP(3));
```
