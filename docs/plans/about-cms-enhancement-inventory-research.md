# Research: About admin inventory & root cause

Date: 2026-08-28  
Wayfinder ticket: [Research: About admin inventory & root cause](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/78)  
Map: [Map: About page CMS — credentials heading, editable icons](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/77)

## Method

Primary sources only:

- `src/app/admin/(dashboard)/pages/about/about-client.tsx`, `about-admin-shell.tsx`, `page.tsx`
- `src/app/[locale]/about/page.tsx`
- `src/actions/about-content.ts`, `src/lib/validations/about-content.ts`
- `src/lib/content/views.ts` (`AboutContentView`, `toAboutContentView`)
- `src/components/site/stats-row.tsx`, `testimonials-section.tsx`
- `prisma/schema.prisma` (`AboutContent`)
- `src/messages/{th,en}.json` (`about`, `home` for stats labels)
- `docs/plans/pages-cms-content-ownership-decisions.md` (About section)
- `docs/plans/pages-cms-sprint6-about-tasks.md`, `prisma/schema.prisma` comment L327–328

No code was changed for this research.

## Owner requirement (map #77)

> ในระบบหลังบ้าน หน้าเกี่ยวกับเรา ให้สามารถเปลี่ยนข้อความต่างๆและไอคอนได้เอง เพิ่มให้กรอกข้อความก่อน Card จดทะเบียนในไทย

## Current admin surface

| Route | Roles | Tabs |
| --- | --- | --- |
| `/admin/pages/about` | `ADMIN`, `SALES`, `MARKETING`, `EDITOR` (via `canManageContent`) | Content + Properties (Properties only if `canManageSiteSettings`) |
| `/admin/content/about` | same | 307 → `/admin/pages/about?tab=content` (Sprint 12 shim) |

Mutation: `updateAboutContent` → `auditedAggregate` on `AboutContent` with optimistic `version`.

## Requirement vs current matrix

| User ask | Public render | Admin editable today? | Schema / action | Root cause |
| --- | --- | --- | --- | --- |
| เปลี่ยนข้อความหัวข้อ/intro | `SectionHeading` L102–106 | **Yes** — `titleTh/En`, `introTh/En` | Fields + UI + action | Met |
| เปลี่ยนข้อความ 3 กล่อง credentials (รวม “จดทะเบียนในไทย”) | Cards L114–124 | **Yes** — `credRegistered*` … `credExperience*` title+desc | Fields + UI + action | Met for card copy |
| **ข้อความก่อน Card จดทะเบียน** (หัวข้อ section ก่อน 3 กล่อง) | **No heading rendered** — section jumps to grid L110–127 | **No field** | Not in schema | **Gap:** Sprint 6 modeled per-card copy only; team section got `teamTitle/teamDesc` + `SectionHeading` (L132–136) but credentials section never got equivalent `credSectionTitle/Desc` |
| เปลี่ยนไอคอน 6 การ์ด | Lucide imports hard-coded L1, L48–64, L66–82 | **No** — UI warns “ไอคอน…แก้จากหน้านี้ไม่ได้” L165–166 | No icon columns | **By design:** `pages-cms-content-ownership-decisions.md` L106–108: “icons and count stay template-owned” for credentials and team |
| Stats labels | `StatsRow` uses `getTranslations("home")` L40 — **not** AboutContent | **No UI** (toggle only) | `stats*LabelTh/En` in schema + `ABOUT_FIELDS` in action L28–33 | **Partial implementation:** Sprint 3 added DB columns + backfill; Sprint 6 admin/public never wired labels |
| Testimonials heading | `TestimonialsSection` reads `c?.testimonialsTitle` L167–168 | **No UI** (featured pickers only) | Schema + action fields exist | Same partial wiring gap |
| `numbersTitle` / stats section heading | **Not shown** on About page at all | N/A | Explicitly excluded from `AboutContent` per schema comment L327–328 and old site-content plan | Intentional — lives in messages only, unused on About today |

## Icon mapping (template-owned today)

| Slot | Lucide component | Position | Admin label hint |
| --- | --- | --- | --- |
| Credential 1 (registered) | `Building2` | left | ไอคอนรูปตึก |
| Credential 2 (engineer) | `BadgeCheck` | middle | ตราประทับติ๊กถูก |
| Credential 3 (experience) | `Award` | right | เหรียญรางวัล |
| Team 1 | `PencilRuler` | left | ดินสอกับไม้บรรทัด |
| Team 2 | `Wrench` | middle | ประแจ |
| Team 3 | `Headset` | right | หูฟัง |

Icons bind to **array index**, not semantic field — swapping card text in admin without moving icons is safe; swapping **meaning** between slots while keeping icons fixed is the documented UX risk (admin copy L165–166).

## Public read path

```
about/page.tsx
  → PAGE_REGISTRY.about.contentRollout === "pages"
  → getAboutContent(locale) → AboutContentView (locale-picked strings)
  → pick(db, messageKey) when row missing → whole-record message fallback
  → CREDENTIALS / TEAM arrays attach hardcoded icon components
```

`AboutContentView` (views.ts L225–252) does **not** expose stats label fields even though DB stores them.

## Root cause summary

1. **Credentials section heading (primary new ask):** Product gap — not an bug. Team section pattern (`teamTitle` + `SectionHeading`) was never replicated for credentials. Closest legacy string is `messages.about.numbersTitle` but that names the **stats** band, not credentials, and is unused on the live About page.

2. **Editable icons (primary new ask):** Not a missing implementation accident — **conflicts with approved ownership doc** that locked icons as template-owned (same pattern as Home feature row). Fulfilling the owner request requires **reopening** that decision (#82 grilling), then schema + admin + public work.

3. **“เปลี่ยนข้อความต่างๆ” broadly:** Most card/section copy is already editable; remaining text gaps are **stats labels**, **testimonials chrome**, and **credentials section heading** — backend half-exists for stats/testimonials without UI or public reader wiring.

## Must-change candidates (for later execution — not approved here)

| # | Change | Layers touched |
| --- | --- | --- |
| 1 | Add `credSectionTitleTh/En`, `credSectionDescTh/En` (or single title if owner prefers) | migration, validation, action, admin UI, public `SectionHeading`, backfill from messages or empty |
| 2 | Icon control per card (if owner picks strategy in #82) | migration enum/string columns, allowlist validation, admin picker, public dynamic icon render |
| 3 | Wire stats labels + optional stats section title | extend `AboutContentView`, `StatsRow` props or About-local wrapper, admin fields |
| 4 | Wire testimonials title/subtitle in admin UI | admin fields only (public already reads DB) |
| 5 | Update ownership doc / ADR if icons become admin-editable | docs only |

## Out of scope for this ticket

- Edge cases (#79), impact (#80), security (#81)
- Prototype and sprint sign-off
- Production code

## Recommended next map steps

1. Parallel **#79–#81** can proceed immediately.
2. **#82 Grilling** must resolve icon strategy vs ownership doc conflict before sizing Exec sprints.
3. **#83 Grilling** should lock whether “ข้อความก่อน Card” means credentials section heading only, or also stats/testimonials completeness.
