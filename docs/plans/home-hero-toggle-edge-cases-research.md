# Home hero toggle — edge-case catalog

Wayfinder ticket: [#135](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/135), map [#132](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/132).

**Status: findings addressed, feature deployed to production 2026-09-07.** The fallback-to-Hero fail-safe (item 1) and the `OFF`-for-home server guard (item 7) were both implemented and live-verified in S1/S3 — see `docs/plans/home-hero-toggle-implementation-sprints.md`.

## 1. BANNER mode selected but no slides ever saved — real gap found

`pageBannerFormSchema`'s `superRefine` already blocks saving an invalid slide count (FIXED needs exactly 1, SLIDES needs 2–5), so the **banner form itself** can never be saved empty.

But `heroMode` (on `HomePageContent`) and the `PageBanner` row (separate table, separate form/action) are independent. An admin can save `heroMode = BANNER` via the Home content form *before ever saving a banner* — no `PageBanner` row for `pageSlug: "home"` exists yet. `PageBanner` (`src/components/site/page-banner.tsx:9`) already returns `null` when `getPageBanner()` finds nothing — so the public homepage would render **a blank gap where the hero used to be**.

**Decision needed in the sprint plan:** the public render must fall back to the classic Hero whenever `heroMode === "BANNER"` but no active `PageBanner` row/slides exist for `"home"` — never render nothing. This is a fail-safe, not just UX polish.

## 2. Toggling back and forth

Per the #133 resolution, classic-hero fields are hidden-not-deleted and the `PageBanner` row persists independently (separate table, never deleted on switch-away) — confirmed no data loss by design. No further action needed.

## 3. Concurrent edits

`HomePageContent.version` and `PageBanner.version` are independent optimistic-lock counters on independent tables, mutated by two independent server actions. Two admins editing different halves (one flips `heroMode`, another edits slides) don't collide at the DB layer — each save is protected by its own version check. Worst case is a momentarily confusing UI (heroMode says BANNER, slide editor still shows stale data) until the next page load — acceptable, no new locking needed.

## 4. Responsive / mobile

Classic hero is a tall (`min-h-[600px]`) stacked layout carrying the full marketing copy on mobile. Banner mode replaces it with a slim `aspect-[21/9] max-h-[240px]` strip with no text — a deliberate consequence of the locked destination (banner replaces the whole hero). Not a bug, but call it out explicitly in the live-verify matrix so it isn't mistaken for a regression during mobile review.

## 5. Locale fallback for incomplete alt text

Already enforced at the schema level — `pageBannerSlideSchema` requires both `altTh` and `altEn` (`requiredAlt`), consistent with the 7 existing pages. No new edge case.

## 6. Upload validation / aspect-ratio mismatch

Existing banner upload validation (JPEG/PNG/WebP ≤5MB via `storePublicImage`) has no aspect-ratio enforcement — a portrait photo gets hard-cropped in the 21:9 strip. This is a pre-existing gap shared with the 7 existing pages, not introduced here. Worth an admin UI hint ("แนะนำรูปแนวนอน") but not a blocking decision for this map.

## 7. `heroMode` vs `PageBanner.mode` can disagree — defense-in-depth needed

`heroMode` (HERO/BANNER) lives on `HomePageContent`; the FIXED/SLIDES sub-choice lives on `PageBanner.mode` (`OFF | FIXED | SLIDES`) for `pageSlug: "home"`. The #133 resolution already drops `OFF` from the Home admin UI's mode dropdown, but that's a client-side restriction only — nothing stops `pageBannerFormSchema` from accepting `mode: "OFF"` for `pageSlug: "home"` if some other path ever submits it.

**Concrete follow-up for the sprint plan:** add a server-side `superRefine` rule rejecting `mode === "OFF"` when `pageSlug === "home"`, so the constraint holds even if the UI restriction is ever bypassed or a future caller reuses the action.

## Summary of required follow-ups for the sprint plan

1. Public render must fall back to classic Hero when `heroMode === "BANNER"` but no valid/active banner slides exist for `"home"` (never render a blank gap).
2. Server-side validation: reject `mode: "OFF"` for `pageSlug: "home"` in `pageBannerFormSchema`.
3. Live-verify matrix should explicitly call out the mobile height/copy reduction in BANNER mode as expected, not a regression.
