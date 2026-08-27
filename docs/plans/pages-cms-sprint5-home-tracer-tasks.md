# Pages CMS Sprint 5 — Home tracer — Task Breakdown

อ้างอิง: mother Sprint 5 · `#68` · PLAN `backlogs/ISSUE_068_pages_cms_sprint5_home_tracer/PLAN.md`  
Home Content cutover ทำไปแล้ว (H1–H3) — sprint นี้เหลือ **Properties + Shared CTA**

## Default ที่ตัดสินใจแล้ว

1. Featured Portfolio เลื่อนต่อ  
2. ไม่มี DDL  
3. Settings ตัด `home` ออกจาก SEO UI + reject ฝั่ง server  
4. Properties เขียนได้เฉพาะ `home` (`propertiesAdminEnabled`)  
5. Shared CTA แก้ที่ Home admin (ส่วน Shared) หรือ Settings — **เลือก: แท็บ/ส่วนบน `/admin/pages/home` สำหรับ MARKETING/ADMIN** เพื่อรวม tracer ไว้ที่ Pages  
6. Prod deploy หลัง local green + owner OK

## Task List

1. `src/lib/pages/registry.ts` + types — เพิ่ม `propertiesAdminEnabled` (home=true) | `nextjs-dev` | ✅  
2. `src/lib/pages/access.ts` — `requireFreshPropertiesRole()` อ่าน `AdminUser` จาก DB | `nextjs-dev` | ✅  
3. `src/actions/pages/update-page-properties.ts` — Home write ผ่าน `auditedAggregate` + OG `storePublicImage` + high-risk ack | `nextjs-dev` | ⏳ 1–2  
4. `src/components/admin/pages/` + `pages/home` — แท็บ Content/Properties | `nextjs-dev` | ⏳ 3  
5. `src/actions/site-settings.ts` + `settings-client.tsx` — ตัด home; reject key | `nextjs-dev` | ✅ ขนานกับ 3  
6. `src/lib/seo.ts` + `views.ts` PageSeoView — robots/canonical/OG | `nextjs-dev` | ✅ ขนาน  
7. Shared CTA: validation + `updateSharedCta` + `getSharedCta` + `cta-banner.tsx` + Home UI | `nextjs-dev` | ⏳ หลัง 2  
8. Verify: build, model script, e2e-admin(+crud), auth smoke Properties; evidence `s05-home/` | `nextjs-dev` | ⏳  
9. audit-compliance (manual OK if subagent limited) | reviewer | ⏳  

## Out of scope

- Featured Portfolio, About cutover, axe full pack, DDL
