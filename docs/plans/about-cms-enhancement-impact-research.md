# Research: About CMS enhancement impact analysis

Date: 2026-08-28  
Wayfinder ticket: [Research: About CMS impact analysis](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/80)  
Map: [Map: About page CMS — credentials heading, editable icons](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/77)

Related:

- Inventory: [`about-cms-enhancement-inventory-research.md`](about-cms-enhancement-inventory-research.md)
- Edge cases: [`about-cms-enhancement-edge-cases-research.md`](about-cms-enhancement-edge-cases-research.md)

No code was changed for this research.

## Question answered

If we deliver map #77 (credentials section heading, optional icon control, text completeness on **existing** About Pages CMS), what breaks, what must change, and how that interacts with production (#75 live), Sprint 12 (#76), and observation rules.

## Executive finding

Impact is **incremental on top of Sprint 6 (#69)** — not a new page cutover. Foundation gates (InnoDB, aggregate audit, registry) are **already satisfied**. The work is mostly **additive columns + admin/public wiring** inside the existing `AboutContent` singleton.

Two impact tiers depend on #82:

| Tier | Scope | DDL | Deploy risk |
| --- | --- | --- | --- |
| **A — Text only** | Credentials section heading + admin fields for stats/testimonials labels + public wiring | 2–4 nullable VARCHAR/TEXT pairs (+ optional stats section title) | **Low** — same pattern as Sprint 3 additive columns |
| **B — Icons (Lucide allowlist)** | Six nullable `VARCHAR` icon keys + public icon map | +6 columns | **Low–Med** — requires ownership doc amendment |
| **C — Icons (upload)** | Six storage keys under `public/pages/about/icons/` | +6 columns + upload UI + backup namespace | **Med–High** — storage lifecycle, MIME guards, backup gate |

**Independent of Sprint 12:** This enhancement can ship **before or after** 2026-09-11. Sprint 12 removes 307 shims only — it does not block About field additions. Coordinate e2e updates so Sprint 12 and About enhancement PRs do not fight the same test lines.

---

## Impact matrix

| Area | Current | Impact of map #77 | Must change | If skipped / wrong |
| --- | --- | --- | --- | --- |
| **Prisma / DDL** | `AboutContent` has text + visibility + stats/testimonial labels; no cred section heading; no icon columns | Additive `ALTER TABLE AboutContent ADD COLUMN …` only (Sprint 6 rule: preserve `id`) | Migration + `prisma migrate dev`; prod hand SQL doc like Sprint 3 | Old app ignores new cols (safe); new app on old DB → 500 on missing columns |
| **Backfill** | `pages-cms-sprint3.ts` backfills About from messages | Extend backfill for new heading (empty or derived — **not** `numbersTitle`); icon defaults null → code fallback | Idempotent backfill run 2×; digest update if scripted | Public differs per env until backfill |
| **`AboutContentView` / reader** | Picks locale fields; no cred heading; no stats labels; icons not in view | Extend view + `about/page.tsx` `SectionHeading` before credentials grid; pass stats labels into `StatsRow` | `views.ts`, public page, possibly `StatsRow` props | N1 edge: labels in DB invisible on site |
| **`StatsRow` component** | Only used on About; reads `home` messages for labels | Add optional `labelOverrides` prop — **About-only caller** | `stats-row.tsx` + about page | Home unaffected (only About imports it) |
| **Icons public render** | Hardcoded Lucide in `CREDENTIALS`/`TEAM` arrays | Dynamic lookup from allowlist map or `<img src=/files/…>` | New `src/lib/about-icons.ts` or similar; admin picker | Invalid key → fallback icon (I1) |
| **`updateAboutContent`** | `ABOUT_FIELDS` + featured sync + audited aggregate | New fields in schema, zod, FormData, snapshot | `about-content.ts`, `about-content.ts` validation | Audit missing new fields |
| **Admin UI** | `about-client.tsx` — text + toggles + featured | New section for cred heading; icon pickers; stats/testimonial text fields | `about-client.tsx`, `page.tsx` props | Owner requirement unmet |
| **Messages / i18n** | `about.*` keys for whole-record fallback | **Keep keys** during observation (Sprint 11/12 rule); new fields need **no** message key unless whole-row fallback extended | Optionally add `credSectionTitle` to messages for backfill source only | Deleting keys breaks emergency fallback |
| **Ownership doc** | Icons template-owned | **Must amend** `pages-cms-content-ownership-decisions.md` if icons editable | Docs + grilling record (#82) | Policy drift |
| **Audit UI** | `AboutContent` label exists | Snapshot grows; diffs show new fields/icon keys | No code if generic JSON diff | Large snapshots still OK |
| **Revalidation** | `contentRevalidatePaths("about")` → `/th/about`, `/en/about`, admin path | **Unchanged** — same paths | None | N/A |
| **ISR** | `revalidate = 300` on about page | Save triggers revalidate via aggregate | Already wired | Stale ≤5m if revalidate forgotten |
| **E2E admin CRUD** | `ABOUT CONTENT` block edits title, checks audit | Add cred heading save + public assert; optional icon assert | `e2e-admin-crud.mts` | Regression undetected |
| **E2E pages CMS** | Public `/th/about` 200; legacy 307 | Add `--expect-text` for new heading marker post-save (optional) | `e2e-pages-cms.mts` or smoke script | Deploy false confidence |
| **E2E RBAC** | `/admin/content/about` 307 paths | **No change** unless Sprint 12 lands same sprint | Sprint 12 inventory owns shim removal | — |
| **verify-pages-cms-model** | Six pages partition | **No registry change** unless icon enum exported | Unlikely | — |
| **verify-audit-module** | `AboutContent` in entity labels | Still listed | None | — |
| **Backup / restore** | `AboutContent` in `BACKUP_MODELS` | Tier A/B: no change. Tier C: ensure `public/pages/about/` in storage backup | `storage-engine-contract` if new namespace | Restore missing icons |
| **Sprint 12 (#76)** | 307 shims, message fallbacks, `usePages` branches | **Parallel-safe** — enhancement does not remove shims. Avoid same PR as Sprint 12 cleanup | Schedule: enhancement redeploy **independent** | Merge conflict in `about/page.tsx` if simultaneous |
| **Prod deploy** | Pages bundle live #75 | Routine incremental redeploy per runbook; **DDL before or with** deploy | Human FTP + panel extract; optional smoke `--check /th/about` | Missing column on write |
| **Static preview / Firebase** | May lag main | Out of auto-deploy unless separately built | Note in sprint plan | Preview stale |
| **Observation window** | Until 2026-09-11 | Enhancement **does not** remove fallbacks or shims — compatible with observation | Keep `pick()` whole-record fallback when row missing | Accidental fallback removal |

---

## Scope variants (planning signal)

### Minimum (Tier A — likely first exec sprint)

| Item | Files (indicative) |
| --- | --- |
| `credSectionTitleTh/En`, `credSectionDescTh/En` | schema, migration, validation, action, admin, public |
| Admin UI for `testimonialsTitle/Subtitle`, `stats*Label` | admin client only (schema exists) |
| Wire stats labels + testimonials (public) | `views.ts`, `about/page.tsx`, `StatsRow` |

**DDL columns:** ~4–12 nullable strings (depending on #83 stats section title decision).

### With Lucide icons (Tier A+B)

| Item | Additional |
| --- | --- |
| Six `credRegisteredIcon`, … columns or JSON blob | Prefer six columns for audit clarity |
| Allowlist zod + admin `<Select>` + public map | `src/lib/about/lucide-icons.ts` |
| Ownership doc update | `pages-cms-content-ownership-decisions.md` |

**No storage / backup change.**

### With uploaded icons (Tier C — highest impact)

| Item | Additional |
| --- | --- |
| Upload action or reuse portfolio pattern | `src/actions/*`, storage driver |
| Keys `public/pages/about/icons/{slot}` | `/files` route (existing) |
| Backup includes namespace | verify backup scripts |
| Security review #81 mandatory | MIME/size/SVG policy |

---

## Consumer / revalidation graph

| Mutation | Must refresh (today) |
| --- | --- |
| `updateAboutContent` | `/th/about`, `/en/about`, `/admin/pages/about` |
| `updatePageProperties(about)` | + `/admin/settings`, `/sitemap.xml` (unchanged) |
| Testimonial publish/delete | About page if featured/listed — existing |

No new reverse-reference tables for Tier A/B.

---

## Production deploy sequence (recommended)

1. **Local:** migrate + backfill + verify pipeline green  
2. **Prod DDL:** additive `ALTER` on `AboutContent` (panel/phpMyAdmin or migration route — follow Sprint 3 runbook pattern)  
3. **Deploy:** `dist.zip` via shared-hosting runbook  
4. **Smoke:** `smoke-test-production.mts --check /th/about --expect-text "<marker>"`  
5. **Optional:** admin save canary on prod (read runbook write-path section)

**Rollback:** Redeploy previous `dist.zip`; DB columns remain (harmless). Content in new columns preserved.

---

## Interaction with Sprint 12 (#76)

| Sprint 12 change | About enhancement interaction |
| --- | --- |
| Remove `/admin/content/about` 307 | Independent — admin already uses `/admin/pages/about` |
| Simplify `usePages` / `pick()` in public reader | **Touch same file** (`about/page.tsx`) — merge carefully |
| Remove message fallbacks | **Do not** tie enhancement to fallback removal — S12-B keeps fallbacks |
| e2e legacy 307 tests → 404 | Enhancement tests should target canonical paths only |

**Recommendation:** Ship About enhancement **before** Sprint 12 execute, or in the **same** deploy after Sprint 12 code merge — not two production deploys fighting `about/page.tsx` without integration test.

---

## Risks ranked for sprint planning (#85)

1. **Deploy new code before DDL** → 500 on save/read missing columns (**Blocker**).  
2. **Icon upload without security #81** → XSS/storage abuse (**Blocker** if Tier C).  
3. **Stats labels wired in admin but not public** → false “done” (**High** — N1).  
4. **Ownership doc not updated for icons** → audit/compliance drift (**High**).  
5. **Concurrent edit with Sprint 12 cleanup** → merge conflicts in about page + e2e (**Med**).  
6. **Using `numbersTitle` for credentials heading** → wrong section semantics (**Med**).  
7. **Removing message keys in same release** → breaks whole-record fallback (**Med** — violates observation).

---

## Before-fix / after-fix summary ritual (execution preview)

**Before implement (must-change list — draft):**

- Schema: new AboutContent columns (heading ± icons ± stats title)  
- Backfill script idempotency  
- `about-content` action + validation + audit snapshot fields  
- Admin form sections + labels (TH/EN tabs)  
- Public `about/page.tsx` + `AboutContentView` + `StatsRow` overrides  
- Optional: icon allowlist module  
- E2E: admin save + public marker  
- Docs: ownership amendment if icons  
- Prod: additive DDL + redeploy smoke  

**After implement (changed list — template):**

- Enumerate columns added, fields in admin, public markers verified TH+EN, e2e output, prod smoke SHA, rollback SHA  

---

## Implications for ticket #85 (sprint sign-off)

Must include:

1. Tier A vs B vs C decision from #82  
2. Exact column list from #83  
3. DDL + deploy ordering  
4. Sprint 12 coordination note  
5. Live-verify matrix rows for new heading + icons + stats labels  
6. Explicit “message fallbacks retained”  
7. No Sprint 12 shim removal in this effort unless merged deliberately  

---

## Sources

- Inventory #78, edge cases #79  
- `docs/plans/pages-cms-sprint6-about-tasks.md`, `s06-about/manifest.md`  
- `docs/plans/pages-cms-sprint12-execute-runbook.md`, `#76` inventory  
- `docs/plans/kkd-shared-hosting-redeploy-runbook.md`  
- `src/actions/about-content.ts`, `src/app/[locale]/about/page.tsx`, `src/lib/pages/registry.ts`  
- `scripts/e2e-admin-crud.mts`, `scripts/e2e-pages-cms.mts`
