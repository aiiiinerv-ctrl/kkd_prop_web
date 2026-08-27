# Pages CMS Sprint 7 — Services — Task Breakdown

อ้างอิง: mother Sprint 7 · `#70` · PLAN `backlogs/ISSUE_070_pages_cms_sprint7_services/PLAN.md`

## Defaults

1. ไม่มี DDL · ไม่ copy Service rows  
2. Empty group ซ่อน · Page Content ยังเก็บไว้  
3. Settings ตัด services  
4. Redirect ชั่วคราวจาก `/admin/services`  
5. EDITOR publish/delete เหมือนเดิม  

## Tasks

1. `registry.ts` — services: adminContentEnabled, propertiesAdminEnabled, contentRollout pages  
2. `pages/services/` — shell + page-content client + embed ServicesClient; old page → redirect  
3. `admin-sidebar.tsx` — ลิงก์ Pages Services  
4. `services-page-content.ts` — auditedAggregate + version + visibility  
5. Properties panel pageKey=services; Settings reject services  
6. Public `services/page.tsx` — registry + visibility + empty-group hide  
7. Service CRUD revalidate → `/admin/pages/services`  
8. e2e paths + verify + `s07-services/manifest.md`
