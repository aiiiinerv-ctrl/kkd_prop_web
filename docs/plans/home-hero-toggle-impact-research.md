# Home hero toggle — impact analysis

Wayfinder ticket: [#134](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/134), map [#132](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/132).

## 1. SEO / OG image

`pageMetadata()` (`src/lib/seo.ts`) resolves `openGraph.images` from `PageSeo.ogImageKey` — a field the admin edits separately under Pages Properties, completely independent of the hero image or banner slides. **Switching `heroMode` has zero effect on OG image or any other SEO metadata.** No action needed here.

## 2. LCP / Core Web Vitals

- Classic hero: `<Image priority>` inside a `min-h-[320px]` flex-1.2 column (RSC, `home-content.tsx`).
- Banner: `PageBannerFixed`/`PageBannerCarousel` also set `priority` on the visible image (`page-banner-carousel.tsx:25,92`); `PageBannerCarousel` is a client component (`"use client"`) but still server-rendered on first paint — hydration doesn't delay the LCP image itself.
- **No LCP regression risk.** The real difference is visual weight: banner caps at `aspect-[21/9] max-h-[240px]`, far shorter than the current `min-h-[600px]` split hero. This is an intended consequence of the locked destination (banner replaces the whole hero, no text), not a technical defect — flag it in the live-verify checklist so the shorter homepage hero isn't mistaken for a bug during review.

## 3. Migration

- New `heroMode` enum column (`HERO | BANNER`) on `HomePageContent`. The table is a singleton (`key: "home"`), so a Prisma `@default(HERO)` on the column is sufficient — the existing production row picks it up automatically on `npx prisma migrate dev` / deploy, no custom backfill script needed.
- `src/lib/backfill/home-content.ts` does **not** need changes — it only seeds the row if missing; the schema default handles `heroMode` for both fresh and existing rows.

## 4. Revalidation — bug found

`bannerRevalidatePaths()` (`src/lib/page-banners.ts:59-62`) builds the public path as `` `/${slug}` `` with a single special-case for `"about"`. For a `"home"` slug this produces `/th/home` and `/en/home`, which **do not exist** — home lives at the locale root (`/th`, `/en`). This must be special-cased the same way `about` is, or saving the home banner will silently fail to revalidate the actual homepage. **Concrete fix required in the sprint plan.**

## 5. Action / audit wiring

- Home content fields (including the new `heroMode`) continue through `updateHomeContent` (`src/actions/home-content.ts`), already an audited aggregate (`auditedAggregate`, entityType `"HomePageContent"`) — adding `heroMode` to `HOME_CONTENT_FIELDS` gets it audited for free.
- Banner slide data goes through the existing `updatePageBanner` action (`src/actions/page-banners.ts`), audited separately under entityType `"PageBanner"` with `pageSlug: "home"`. This mirrors how the 7 existing pages work — two independent forms/saves on the same admin page, each already RBAC-gated identically (`ADMIN`/`SALES`/`MARKETING`/`EDITOR`). No RBAC mismatch.

## 6. E2E coverage — gap found

`scripts/e2e-admin-crud.mts` has **no coverage of the page-banner system at all** (grep for "banner" returns nothing) — a pre-existing gap from map #107, not introduced by this effort. Since this change touches the homepage (highest-traffic page), recommend the sprint plan add at minimum: switch to BANNER mode + save valid slides + verify public homepage renders banner, switch back to HERO + verify classic hero returns intact.

## Summary of required follow-ups for the sprint plan

1. Fix `bannerRevalidatePaths()` to special-case `"home"` → root path (bug, not just a nice-to-have).
2. Add `heroMode` with `@default(HERO)` — no custom backfill needed.
3. Add minimal E2E coverage for the toggle + banner save on Home.
4. No SEO or LCP code changes required; note the shorter banner height as an expected visual change in the live-verify matrix.
