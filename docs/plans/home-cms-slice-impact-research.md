# Research: impact analysis for Home CMS slice

Date: 2026-08-27  
Wayfinder ticket: [Research: impact analysis for Home CMS slice](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/55)  
Map: [Map: Home CMS slice — hero, contact, Our service, FAQ](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/52)

Related assets (not re-litigated here):

- Inventory: [`home-cms-slice-inventory-research.md`](home-cms-slice-inventory-research.md)
- Edge cases: [`home-cms-slice-edge-cases-research.md`](home-cms-slice-edge-cases-research.md)
- Full six-page routing/cache analysis: [`pages-cms-routing-cache-impact-analysis.md`](pages-cms-routing-cache-impact-analysis.md)
- Mother plan: [`pages-cms-implementation-sprints.md`](pages-cms-implementation-sprints.md) Sprint 3–5

No code was changed for this research.

## Question answered

If we deliver map #52 Destination (Home Page Content + FAQ aggregate + Shared contact from Home admin, **without** Latest Works featured or Home SEO/Properties move), what breaks, what must change, and how that nests inside Sprint 3–5.

## Executive finding

Impact is **real but narrower than full Sprint 5**. The hard dependencies are the same foundation spine (InnoDB → additive schema → aggregate audit seam → admin shell → Home cutover). Map #52 **trims** Sprint 5 acceptance (no featured portfolio, no Properties cutover) but **does not** let you skip Sprint 3–4 if you want atomic FAQ+hero saves.

Contact dual-entry is the main *new* operational risk relative to mother Sprint 5 text: Home UI and Settings must share one `SiteSettings` writer policy without creating a second contact store.

## Impact matrix (Home slice)

| Area | Current | Impact of Destination | Must change | If skipped / wrong |
| --- | --- | --- | --- | --- |
| **Prisma / schema** | No `HomePageContent` / `HomeFaqItem`; `SiteSettings` + `AboutContent` exist | Need additive Home parent + FAQ children (+ optional `version`); SiteSettings may need contact/concurrency version later | Sprint-3-style DDL + backfill from `home` + `faq` messages + hero blob copy | No durable CMS; or unsafe MyISAM writes |
| **Data model vs map trim** | Mother Sprint 3 also adds Featured Portfolio, all page singletons, PageSeo extensions | Map can **defer** `HomeFeaturedPortfolioProject` and PageSeo column use for Home Properties | Sprint plan must list exact tables for *this* slice vs full Sprint 3 | Either over-build unused tables or under-build and block FAQ/hero |
| **`src/lib/audit.ts`** | `auditedEntity()` = one row + static `revalidate(row)` after commit | FAQ children + hero key need **one** transaction + one audit snapshot + version check | Deepen audit seam (Sprint 4) before Home write | Orphan FAQ rows, missing audit, lost updates |
| **Actions** | No Home actions; `updateContactSettings` / About / PageSeo exist | New Home aggregate action; contact may call existing SiteSettings path or shared helper | New `src/actions/*` + zod; `requireRole` aligned with ownership | Dual writers / RBAC holes |
| **Revalidation** | Home `revalidate = 300` on `page.tsx`; SiteSettings already revalidates `/th`,`/en` + layouts | Home Content save must refresh `/th`,`/en` (+ admin Home route); contact already covers site-wide consumers | Explicit targets from trusted registry key `home`; do not rely on layout side effects alone | Stale ISR for 300s on `/th`/`/en` |
| **Storage** | Hero in Next `public/marketing/`; CMS images under `STORAGE_ROOT` via `/files` | Hero moves to e.g. `public/pages/home/hero/` managed keys; backup must include namespace | Upload pipeline + backup/restore gate (#57) | DB key without blob; restore gap |
| **SiteSettings dual entry** | Settings Tab 3 only (`ADMIN`\|`MARKETING`) | Home admin also edits phone/LINE/FB **same columns** | Shared mutation helper; site-wide warning; role policy one place | Divergent values or EDITOR bypass via Home |
| **Messages / i18n** | `home` + `faq` namespaces drive public UI | After cutover: whole-record fallback only if row absent; keep keys during observation | Reader in `home-content.tsx` / `FaqSection`; TH+EN parity on save | Per-field mix / EN blank |
| **Public `/th` `/en`** | `HomeContent` RSC + static FAQ keys | Reader switches to DB views; FAQ becomes dynamic list | Component rewrite; accordion empty-safe | Runtime crash or wrong copy |
| **Admin routes / sidebar** | No `/admin/pages/*`; “เนื้อหาหน้าเว็บ” → About only | Add at least `/admin/pages/home` (Content); optional Pages tree stub | `admin-sidebar.tsx` + new page RSC/client form | Orphan feature unreachable |
| **Proxy** | `/admin/*` cookie gate; `files` excluded from matcher | New admin path covered automatically; `/files/...` for hero already outside matcher | None for proxy logic | N/A |
| **SEO / Settings e2e** | `e2e-admin-crud.mts` edits Home **PageSeo** in Settings | Map keeps SEO in Settings — **this suite stays valid** for Home title | Do not remove Home SEO test in this slice | False “Home CMS done” if only SEO moves |
| **E2E / RBAC** | About path + `canManageContent` / `canManageSiteSettings` checks | Need Home Content route + FAQ/hero assertions; contact role tests if Home exposes contact | Extend `e2e-rbac-sprint2.mts`, `e2e-admin-crud.mts`, possibly channel-tracking home CTAs | Regressions unnoticed |
| **Audit UI** | Labels for known entity types | New `HomePageContent` entity type + FAQ-in-snapshot diffs | Admin audit presentation | Unreadable history |
| **Shared CTA banner** | Mother Sprint 5 includes Shared CTA cutover | **Out of map #52** unless owner expands | Leave `cta-banner` on current source | Scope creep |

## Consumer / revalidation graph (slice)

| Mutation | Must refresh |
| --- | --- |
| Home Page Content (+ FAQ + hero key) | `/th`, `/en`, `/admin/pages/home` (canonical) |
| Contact fields via Home or Settings | Existing SiteSettings list: `/th`,`/en`, about, contact, settings, locale layouts — **keep one shared list** |
| Portfolio item publish (unchanged) | Still affects Home **Latest Works** (message+latest query) — out of CMS slice but still a live dependency |

No Featured Reference reverse graph in this slice (deferred).

## Contingency with mother Sprint 3–5

```text
Sprint 1–2 foundation (Gate B–E / #51 / #57)
    → Sprint 3 additive schema + backfill
    → Sprint 4 registry + aggregate audit + Pages shell
    → Sprint 5 Home cutover
```

| Mother sprint | Full plan does | Map #52 slice should |
| --- | --- | --- |
| **3** | All page singletons, FAQ, featured refs, PageSeo extensions, SiteSettings CTA fields, hero backfill | **Minimum:** `HomePageContent` + `HomeFaqItem` + hero storage backfill + Home message/`faq` backfill. **Defer OK:** other page tables, `HomeFeaturedPortfolioProject`, Home Properties/OG columns *if* clearly scheduled later. **Risky defer:** skipping audit/`version` columns on Home parent |
| **4** | Six-page registry, aggregate audit seam, full Pages sidebar | **Minimum:** audit aggregate seam + registry entry for `home` + Home admin route. Sidebar may show Home-only child first |
| **5** | Home Content **and** Properties, Shared CTA, featured portfolio, move Home SEO out of Settings | **Trim to:** Home Content (hero, Our service, FAQ) + contact dual UX + live-verify. **Explicitly omit:** Properties tab cutover, Featured Portfolio, Shared CTA migration, Settings SEO ownership move |

**Do not** invent a parallel “Home-only CMS” outside this spine — map Notes forbid it. **Do** publish a trimmed sprint doc (#58) that cites mother plan section numbers and lists omissions so future six-page work is not blocked.

## Files / surfaces most likely touched at implement time

(Planning signal only — not an implementation checklist commitment.)

- `prisma/schema.prisma` + additive SQL / backfill
- `src/lib/audit.ts`, `src/lib/content/*`, validations, new Home action(s)
- `src/app/[locale]/home-content.tsx`, `src/components/site/faq-section.tsx`
- `src/app/admin/(dashboard)/pages/home/**` (new), `admin-sidebar.tsx`
- `src/actions/site-settings.ts` (shared contact helper / roles)
- `src/app/files/[...key]/route.ts` (consume existing public key auth rules)
- `scripts/e2e-admin-crud.mts`, `scripts/e2e-rbac-sprint2.mts`
- Backup scripts / runbooks for `public/pages/`
- `src/messages/{th,en}.json` retained as whole-record fallback

Unaffected by design (this slice): booking lead actions, calculator formulas, `src/proxy.ts` matcher shape, Firebase static-preview (unless separately deployed).

## Risks ranked for sprint planning

1. **Skipping aggregate audit / InnoDB** → FAQ/hero integrity failure (Blocker; #57).  
2. **Dual contact writers with divergent roles** → privilege or silent LWW (High; edge T3/T4).  
3. **Partial Sprint 3** that omits Home tables but implements UI → fake progress (High).  
4. **ISR `revalidate=300` without explicit path refresh** → “save worked” but public lags (High).  
5. **Leaving Home SEO e2e as only Home proof** → false confidence (Med).  
6. **Building Featured Portfolio “because Sprint 5 says so”** → scope creep vs map (Med).

## Implications for ticket #58 (sprint plan)

Must include:

1. Exact schema subset for slice vs deferred mother Sprint 3 objects.  
2. Before-fix summary of actions/routes/components/scripts.  
3. Explicit “SEO stays in Settings” and “Latest Works unchanged.”  
4. Shared contact mutation design.  
5. Revalidation list for Home Content vs contact.  
6. Dependency on #57 gates before production write.  
7. FAQ max decision pointer (12 vs 20 — see edge research).

## Sources

- `docs/plans/pages-cms-implementation-sprints.md` (Sprint 3–5)  
- `docs/plans/pages-cms-routing-cache-impact-analysis.md`  
- `docs/plans/pages-cms-data-model-migration-decision.md`  
- Map #52 Notes; inventory + edge research assets  
- `src/lib/audit.ts`, `src/actions/site-settings.ts`, `src/app/[locale]/page.tsx`  
- `src/proxy.ts`, `scripts/e2e-admin-crud.mts`, `scripts/e2e-rbac-sprint2.mts`  
