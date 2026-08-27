# Pages CMS Sprint 6 — About — Task Breakdown

อ้างอิง: mother Sprint 6 · `#69` · PLAN `backlogs/ISSUE_069_pages_cms_sprint6_about/PLAN.md`

## Defaults

1. ไม่มี DDL · รักษา AboutContent.id  
2. Featured ว่าง → public ใช้ published ทั้งหมด (baseline); มี selection แล้วใช้ curated  
3. Settings ตัด about  
4. 307 ไม่ใช่ 308 จาก `/admin/content/about`

## Tasks

1. `src/lib/pages/registry.ts` — about: adminContentEnabled, propertiesAdminEnabled, contentRollout pages  
2. `src/app/admin/(dashboard)/pages/about/` — shell + client; old page → redirect 307  
3. `admin-sidebar.tsx` — ลิงก์ Pages About  
4. `about-content.ts` — auditedAggregate + version + visibility + featured sync (max 3)  
5. Properties panel pageKey=about; Settings reject about  
6. Public `about/page.tsx` — registry gate + visibility + featured/CTA  
7. Block testimonial delete when featured  
8. e2e paths + verify + `s06-about/manifest.md`
