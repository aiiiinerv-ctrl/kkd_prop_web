# Research: Home CMS slice inventory vs destination

Date: 2026-08-27  
Wayfinder ticket: [Research: inventory Home hero/contact/Our service/FAQ vs destination](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/53)  
Map: [Map: Home CMS slice — hero, contact, Our service, FAQ](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/52)

## Method

Primary sources only (no secondary paraphrase as authority):

- `src/app/[locale]/home-content.tsx`
- `src/components/site/faq-section.tsx`
- `src/messages/{th,en}.json` (`home`, `faq`)
- `prisma/schema.prisma` (`SiteSettings`, `AboutContent`, absence of Home models)
- `src/actions/site-settings.ts`, `src/app/admin/(dashboard)/settings/*`
- `src/app/admin/(dashboard)/admin-sidebar.tsx`
- `docs/plans/pages-cms-current-state-inventory.md` (2026-08-25 baseline)
- `docs/plans/pages-cms-content-ownership-decisions.md`
- `docs/plans/pages-cms-data-model-migration-decision.md`
- Map #52 Notes (locked charting decisions)

No code was changed for this research.

## Destination reminder (map #52)

Admin can edit Home **hero** (copy + image), **contact values** via Shared Site Content (SiteSettings) with Home-adjacent UX, **Our service** (Services CTA copy), and **FAQ** (CRUD up to 20, TH+EN). Icons stay template-owned. Latest Works and SEO/Properties out of scope. Foundation gates before write.

## Current vs destination matrix

| Surface | Current owner (evidence) | Editable in admin today? | Destination | Gap |
| --- | --- | --- | --- | --- |
| Hero copy (kicker, title parts, subtitle, CTAs, quick-contact label, features labels, proof) | `messages.home.*` via `getTranslations("home")` in `home-content.tsx` | No | `HomePageContent` Page Content | Missing model + admin + public reader |
| Hero image | Static `/marketing/hero-solar.jpg` in `public/` + hard-coded `Image` `src` | No | Managed upload under e.g. `public/pages/home/hero/` per data-model decision | Missing upload lifecycle + Page Content field |
| Feature / channel icons | Lucide / `IconFacebook` hard-coded in `home-content.tsx` | No | Remain template-owned | **None** (aligned) |
| Phone / LINE / Facebook **values** | `SiteSettings` via `getSiteSettings`; fallbacks in `home-content.tsx` | Yes — `/admin/settings` contact tab → `updateContactSettings` (`ADMIN`\|`MARKETING` only) | Same SiteSettings source; also editable from Home admin UI with site-wide warning | Home-adjacent UX missing; role set narrower than Page Content roles (`ADMIN`\|`SALES`\|`MARKETING`\|`EDITOR`) |
| Our service (Services CTA) | `messages.home.actionRowBadge\|Title\|Text\|Link` | No | Home Page Content optional section copy | Missing CMS fields + admin |
| FAQ section chrome (badge, title, intro, LINE button) | `messages.faq.*` in `FaqSection` | No | Home Page Content FAQ chrome | Missing CMS fields + admin |
| FAQ Q&A list | Fixed `QUESTION_KEYS = q1…q5` + `a1…a5` in `faq-section.tsx` + messages | No add/remove/reorder; only by shipping code + message edits | `HomeFaqItem` children, max 20, sortOrder, TH+EN required | Missing child model + aggregate save + UI |
| Latest Works | messages + `getLatestProjects` | Partial (portfolio CRUD elsewhere; not curated Home refs) | **Out of scope** for map #52 | Intentionally deferred |
| Home SEO | `PageSeo` / Settings SEO tab | Yes (Settings) | **Out of scope** for map #52 | Intentionally deferred |
| Admin Home / Pages route | No `/admin/pages/*`; sidebar “เนื้อหาหน้าเว็บ” → `/admin/content/about` only | N/A | Pages CMS Home Content editor | Missing IA + route |

## Delta vs `pages-cms-current-state-inventory.md` (2026-08-25)

Baseline inventory remains **directionally correct** for Home: no Home content model/admin/action. Recorded deltas / sharpenings for this slice:

1. **FAQ is not under `home` messages** — it is the separate `faq` namespace consumed only by `FaqSection`. Inventory’s “FAQ-adjacent” wording is easy to misread; cardinality is enforced in **code** (`QUESTION_KEYS` length 5), not only in JSON.
2. **Contact values are already CMS-backed** in `SiteSettings` and editable in Settings today. The Home gap is **not** “contact cannot be stored,” but “no Home editor surface + role mismatch vs future Page Content editors.”
3. **Still no** `HomePageContent` / `HomeFaqItem` in `prisma/schema.prisma` (only `SiteSettings`, `AboutContent`, `PageSeo` among page-ish models).
4. **Still no** Pages sidebar tree / `/admin/pages/home`.
5. Production InnoDB gate ([#51](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/51)) remains open — blocks **safe write enablement**, but is a **separate** root cause from “no editor seam exists in the app.”

## Root cause (answer to the ticket question)

Admin cannot meet the destination for **hero copy, hero image, Our service, and FAQ CRUD** because those surfaces are still **compile-time / deploy-time owned**:

1. **No Page Content seam for Home** — unlike About (`AboutContent` + `/admin/content/about` + `src/actions/about-content.ts`), Home has no Prisma model, no admin route, no server action, no validation schema, and no audit entity. Public Home reads only `next-intl` messages and a static file path.
2. **FAQ cardinality is hard-coded** — `FaqSection` maps a fixed five-key tuple. Add/remove/reorder is impossible without a code change; messages alone cannot grow the list.
3. **Hero image is not storage-keyed** — it is a repo file under `public/marketing/`, not a `STORAGE_ROOT` / `/files/…` managed key, so there is no admin upload path wired to Home.
4. **Contact is a partial exception** — values already live in Shared Site Content (`SiteSettings`) and can be changed in Settings by `ADMIN`\|`MARKETING`. Destination still needs a Home-adjacent editor that writes the **same** row (no duplicate Home-only contact fields). Icon glyphs are correctly non-editable already.

Secondary blocker (ops, not missing feature seam): map Notes require foundation gates (backup / InnoDB / FK / aggregate audit transaction) before enabling Home writes in production — tracked via [#51](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/51) and ticket [#57](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/57). That explains why implementation must wait, not why the editor is absent today.

## Implications for later tickets (not resolved here)

- Sprint plan should treat **About** as the closest existing pattern to copy (singleton Page Content), plus a **new FAQ child aggregate** pattern that About does not have.
- Contact work is mostly **UX + optional role policy**, not a new data store.
- Live-verify must prove message → DB cutover for hero/Our service/FAQ and Settings↔Home dual entry for contact without dual writers on different columns.

## Sources checklist

| Claim area | Source path |
| --- | --- |
| Home render + static hero + contact fallbacks + action row | `src/app/[locale]/home-content.tsx` |
| FAQ fixed keys | `src/components/site/faq-section.tsx` |
| Copy namespaces | `src/messages/th.json`, `src/messages/en.json` |
| Schema | `prisma/schema.prisma` |
| Contact admin mutate | `src/actions/site-settings.ts`, `src/app/admin/(dashboard)/settings/settings-client.tsx` |
| Sidebar | `src/app/admin/(dashboard)/admin-sidebar.tsx` |
| Approved future model | `docs/plans/pages-cms-data-model-migration-decision.md` |
| Prior inventory | `docs/plans/pages-cms-current-state-inventory.md` |
