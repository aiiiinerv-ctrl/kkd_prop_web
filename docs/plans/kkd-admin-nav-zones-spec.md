# Admin Sidebar Navigation Zones — Implementation Spec

**Status:** Final, ready for implementation
**Source map:** [#125 — Reorganize admin sidebar into navigation zones](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/125) (closed) + children #126–#131 (all closed)
**Author:** `ux-ui-expert` (design authority) · **Implementer:** `nextjs-dev`
**Mockup:** published Artifact (link in the handoff message) — desktop ADMIN, desktop FINANCE, mobile closed, mobile drawer open

This document is the single source of truth. Where a fragment in #126 conflicts with a
refinement in #127 or #130, **this document wins** — the reconciliations are called out inline.

---

## 0. Verified current state (re-checked against `main` before writing)

| Fact | Value |
| --- | --- |
| Sidebar file | `src/app/admin/(dashboard)/admin-sidebar.tsx`, one flat `ITEMS` array of 16 links |
| Sidebar shell | `<aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-background md:flex">` — 240px, hidden below `md` **with no mobile replacement today** |
| Nav body | `<nav className="flex-1 space-y-0.5 p-3">` — no `overflow-y-auto` |
| Bottom block | `border-t border-border p-3 space-y-0.5` with `แผนผังเว็บไซต์` + `ดูหน้าเว็บไซต์`, same `text-sm font-medium` as main items |
| Topbar | `admin-topbar.tsx` — server component, `ระบบหลังบ้าน` left, name + role badge + logout right |
| Drawer primitive | none. `src/components/ui/dialog.tsx` wraps `@base-ui/react/dialog`. **`sheet.tsx` does not exist** |
| Brand tokens (`globals.css`) | `--primary: #003b8e`, `--brand-orange: #d99a1b`, `--brand-gold: #f0b429`, `--muted: #e5edf6`, `--muted-foreground: #526272`, `--border: #cdd9e5`, `--background: #eef3f8`, `--radius: 0.75rem` |

**Drift found — one item.** #129 says the `(Pages)` suffix is dropped from **6** content items.
The live file carries the suffix on **7**: services, packages, portfolio, calculator, about,
home, contact. **Ruling: all 7 drop it** (§5). Nothing else has drifted since the map closed.

---

## 1. Zone taxonomy (from #126)

Three labelled zones, plus **แดชบอร์ด pinned above all zones with no header of its own**.
Zone labels are Thai-only (the admin UI is Thai-only per project architecture).

| Order | Zone key | Header label (TH) | Intent |
| --- | --- | --- | --- |
| — | `pinned` | *(none — no header rendered)* | Single entry point, always first |
| 1 | `sales` | `งานขายและการตลาด` | Everything that moves a lead toward a sale, plus the data that reports on it |
| 2 | `content` | `เนื้อหาเว็บไซต์` | Everything that changes what the public site shows |
| 3 | `system` | `ระบบ` | Oversight, configuration, accountability |

**Correction to an earlier draft of this document:** an intermediate pass renamed these zones
to `งานขายและลูกค้า` / `ระบบและรายงาน` and moved `รายงาน` (Reports) into the `ระบบ` zone. Both
changes contradicted #126's closed ruling, which explicitly placed Reports in `sales` (zone
name `งานขายและการตลาด`) with the reasoning: *"Reports → งานขายและการตลาด, not its own zone and
not ระบบ... ระบบ is worse — Reports is business data, not configuration."* The table below has
been corrected to match #126 verbatim; the names and placement above are final.

### Full item → zone → order table

Roles are unchanged from the current file — **this reorganization must not alter a single
`roles` array.** Any RBAC change is out of scope and must be raised as its own issue.

| # | Zone | Order | Final label | `href` | Icon | Roles |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | pinned | 1 | แดชบอร์ด | `/admin` (`exact`) | `LayoutDashboard` | ADMIN, SALES, FINANCE, MARKETING, EDITOR, EXECUTIVE |
| 2 | sales | 1 | ลูกค้า (Leads) | `/admin/leads` | `ClipboardList` | all roles |
| 3 | sales | 2 | การจองสำรวจ | `/admin/bookings` | `CalendarCheck` | ADMIN, SALES, FINANCE, EDITOR |
| 4 | sales | 3 | ช่องทางโปรโมท | `/admin/channels` | `Megaphone` | ADMIN, CHANNEL_EXECUTIVE, MARKETING, EDITOR |
| 5 | sales | 4 | รายงาน | `/admin/reports` | `FileBarChart` | ADMIN, FINANCE, MARKETING, EDITOR, EXECUTIVE |
| 6 | content | 1 | หน้าแรก | `/admin/pages/home` | `LayoutTemplate` | ADMIN, SALES, MARKETING, EDITOR |
| 7 | content | 2 | บริการ | `/admin/pages/services` | `Wrench` | ADMIN, SALES, MARKETING, EDITOR |
| 8 | content | 3 | แพ็กเกจ | `/admin/pages/packages` | `Package` | ADMIN, SALES, MARKETING, EDITOR |
| 9 | content | 4 | ผลงาน | `/admin/pages/portfolio` | `Images` | ADMIN, SALES, MARKETING, EDITOR |
| 10 | content | 5 | รีวิวลูกค้า | `/admin/testimonials` | `MessageSquareQuote` | ADMIN, SALES, MARKETING, EDITOR |
| 11 | content | 6 | เครื่องคำนวณ | `/admin/pages/calculator` | `Calculator` | ADMIN, SALES, MARKETING, EDITOR |
| 12 | content | 7 | เกี่ยวกับเรา | `/admin/pages/about` | `FileText` | ADMIN, SALES, MARKETING, EDITOR |
| 13 | content | 8 | ติดต่อเรา | `/admin/pages/contact` | `Phone` | ADMIN, SALES, MARKETING, EDITOR |
| 14 | system | 1 | ผู้ใช้ระบบ | `/admin/users` | `Users` | ADMIN, EXECUTIVE |
| 15 | system | 2 | ประวัติการแก้ไข | `/admin/audit` | `ScrollText` | ADMIN, EXECUTIVE |
| 16 | system | 3 | ตั้งค่าระบบ | `/admin/settings` | `Settings` | ADMIN, MARKETING |

Utility (bottom block, outside all zones — §6):

| # | Final label | `href` | Icon | Roles |
| --- | --- | --- | --- | --- |
| 17 | แผนผังเว็บไซต์ | `/admin/sitemap` | `Map` | all |
| 18 | ดูหน้าเว็บไซต์ | `/th` | `Home` | all |

**Why `ช่องทางโปรโมท` sits in `sales`, not `content`:** it is lead-attribution data, not page
copy, and it is the only non-lead surface `CHANNEL_EXECUTIVE` can reach — grouping it with
`ลูกค้า (Leads)` gives that role one coherent populated zone instead of two orphan items.

---

## 2. Zone header visual spec — **resolves the open thread**

This is the one item the map never pixel-specified. Final answer, all three sub-questions:

### 2.1 Icon: **no icon.** Headers are text only.

Rationale: item rows already carry `size-4` lucide icons in a 10px-gutter column. A second
icon at the header level either duplicates that gutter (visual stutter) or breaks it
(misalignment). At 11px a header icon also renders as noise, not signal. Three labels across
~640px of nav height do not need iconographic reinforcement.

### 2.2 Header typography and spacing (exact)

```tsx
// zone group wrapper
<div className="mt-4 border-t border-border/60 pt-3">
  {/* zone header */}
  <div className="px-3 pb-1.5 text-[11px] font-semibold leading-4 tracking-[0.04em] text-muted-foreground">
    {zone.label}
  </div>
  <div className="space-y-0.5">{/* item rows */}</div>
</div>
```

| Property | Value | Note |
| --- | --- | --- |
| Font size | `text-[11px]` | one full step below the 14px item rows |
| Line height | `leading-4` (16px) | |
| Weight | `font-semibold` (600) | |
| Tracking | `tracking-[0.04em]` | **not** `0.08em`, and **no `uppercase`** — reconciles #126, which sketched `uppercase tracking-wider` from a Latin-first instinct. Thai has no case, so `uppercase` is a no-op on the labels that actually ship, and tracking above ~0.05em visibly loosens Thai glyph clusters. 0.04em gives the "label" read without hurting Thai. |
| Color (populated zone) | `text-muted-foreground` (**full opacity**) | #526272 on #ffffff = **6.4:1**, passes AA for 11px text. Do **not** use `/70` or `/60` — that lands near 2.9:1 and fails. This overrides any opacity value sketched in #126. |
| Color (empty zone, §2.3) | `text-muted-foreground/50` | Locked by #127: an empty (RBAC-filtered-to-zero) zone's header is deliberately de-emphasized below AA — it carries no primary reading task, only "this category exists, you have nothing in it." Conditional on `zone.items.length === 0`, nothing else changes (no `<ul>` renders underneath). |
| Selectable / interactive | no | plain `<div>`, no hover, no focus ring, not a button (#127: never collapsible) |
| Padding | `px-3 pb-1.5` | `px-3` aligns the header's left edge with item-row text padding |
| Separator | `border-t border-border/60` on the group wrapper | 1px `#cdd9e5` at 60% — present on **every** zone group including the first, so the pinned แดชบอร์ด is also separated from zone 1. No `first:` exception. |
| Space above separator | `mt-4` (16px) | |
| Space below separator | `pt-3` (12px) | total header-to-previous-item gap = 16 + 1 + 12 = **29px** |
| Gap header → first item | 6px (`pb-1.5`) | |
| Gap between item rows | `space-y-0.5` (2px), unchanged | |

### 2.3 Empty-zone treatment (#127, locked by the map itself in #125) — **final rule**

**Locked decision — not open to re-litigation by this spec.** The wayfinder map (#125) recorded
as a top-level decision, before any ticket delegated design judgment: *"Empty zones always show
their header — zone headers stay visible even when a role's RBAC filter leaves zero items in
that zone, so sidebar structure is identical across roles."* #127 then specified exactly how:
**the header still renders, dimmed to `text-muted-foreground/50`, with no `<ul>` and no
placeholder body underneath it.** It does not disappear.

(An earlier draft of this document proposed dropping empty zones entirely, reasoning that a
dimmed header "reads as a permissions error." That reasoning does not get to override a decision
the user made directly and #127 already closed on the record — it is corrected here.)

A zone reduced to a **single** item still renders its header normally — no special casing, no
"promote the orphan out of its zone" logic. Consistent structure across roles is the whole
point of the locked rule.

Worked examples (see mockup), using the corrected §1 taxonomy:
- **ADMIN** — 3 zone headers, 15 zoned items + pinned. All three headers at full opacity, all
  populated.
- **FINANCE** — pinned แดชบอร์ด + `งานขายและการตลาด` (ลูกค้า, การจองสำรวจ, รายงาน — 3 of 4 sales
  items; ช่องทางโปรโมท is not in FINANCE's roles) at full opacity + `เนื้อหาเว็บไซต์` header shown
  **dimmed at `/50`, no items underneath** + `ระบบ` header also shown **dimmed at `/50`, no items
  underneath**. All three headers are always present; only two are populated for this role.
- **CHANNEL_EXECUTIVE** — no pinned แดชบอร์ด (already excluded today) + `งานขายและการตลาด` shown
  at full opacity with 2 items (ลูกค้า, ช่องทางโปรโมท — this role is not in `การจองสำรวจ` or
  `รายงาน`'s roles) + `เนื้อหาเว็บไซต์` header dimmed, empty + `ระบบ` header dimmed, empty.

---

## 3. Desktop `<aside>` behavior (#127)

```tsx
<aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-background md:flex">
  <div className="border-b border-border p-5"><BrandLogo /></div>
  <nav className="flex-1 overflow-y-auto p-3">…</nav>   {/* ← overflow-y-auto added */}
  <div className="shrink-0 border-t border-border p-3">…</div>  {/* ← shrink-0 added */}
</aside>
```

- Width stays **`w-60` (240px)**. #131's live measurement confirmed the longest label
  (`ประวัติการแก้ไข`) fits with room to spare; no widening needed.
- **Always expanded. No collapse toggle, no accordion, no persisted open/closed state, no
  `localStorage`.** Zones are structure, not a control surface.
- `overflow-y-auto` moves to `<nav>` so the logo header and the utility footer stay pinned
  while only the zone list scrolls. `space-y-0.5` is removed from `<nav>` (spacing now lives on
  the zone group wrappers and their inner `space-y-0.5`).
- Utility footer gets `shrink-0` so it cannot be compressed by a tall zone list.
- Item row classes are **unchanged** from today, including the active treatment
  `border-brand-orange bg-primary/8 text-primary` and hover `hover:bg-muted hover:text-foreground`.
  This refactor changes grouping and labels only — do not restyle rows.

---

## 4. Mobile drawer (#128)

Today the sidebar simply vanishes below `md`; there is no mobile navigation at all. This is the
highest-impact part of the change.

### 4.1 Trigger and breakpoint

- Breakpoint stays **`md` (768px)** — matches the existing `md:flex` so there is never a state
  with both sidebar and hamburger, or neither.
- Trigger lives at the **far left of the topbar**, before `ระบบหลังบ้าน`:
  ```tsx
  <button
    type="button"
    aria-label="เปิดเมนู"
    className="relative -ml-1 inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:hidden"
  >
    <Menu className="size-5" />
  </button>
  ```
  `size-11` = **44×44px**, the touch-target floor. Do not use `<Button size="icon">` (36px).

### 4.2 Drawer visual spec

| Property | Value |
| --- | --- |
| Side | left, full height |
| Width | `w-[272px]` — **272px** (#128; wider than desktop's 240 because the drawer has no adjacent content to balance against, and 272 leaves ≥48px of overlay tap-to-close on a 320px viewport) |
| Max width | `max-w-[85vw]` guard for ≤320px devices |
| Background | `bg-background` |
| Edge | `border-r border-border` |
| Elevation | `shadow-lg` (project token) |
| Overlay | `bg-black/40` — override `DialogOverlay`'s `bg-black/10`, which is too faint over the light admin `#eef3f8`. Keep the `backdrop-blur-xs` from the primitive. |
| Z-index | `z-50` (matches dialog primitive) |
| Header | same `border-b border-border p-5` + `<BrandLogo />` as desktop, plus a `size-11` close button (`X`, `aria-label="ปิดเมนู"`) at the right of that row |
| Body | identical zone markup to desktop, `flex-1 overflow-y-auto p-3` |
| Footer | identical utility block to desktop |
| Row height | item rows use **`py-3`** in the drawer (48px) instead of desktop's `py-2.5` (40px) — the only row-style divergence between the two surfaces |
| Motion | `translate-x-[-100%] → 0`, **200ms**, `ease-out`; overlay fades `duration-100`. Both animate out on close. |
| Reduced motion | `motion-reduce:transition-none` on drawer and overlay |

### 4.3 Behavior

- Opens on trigger tap; closes on: close button, overlay tap, `Escape`, **and route change**
  (`useEffect` on `usePathname()` → `setOpen(false)`). Route-change close is mandatory —
  without it the drawer covers the page the user just navigated to.
- Focus is trapped inside the drawer while open and returns to the trigger on close (Base UI
  Dialog gives both for free — do not hand-roll).
- Body scroll lock comes from the dialog primitive; do not add a second one.
- Drawer is rendered **once** in the dashboard layout, not per page.

### 4.4 Unread-lead badge on mobile

- The badge inside the drawer's `ลูกค้า (Leads)` row is **identical** to desktop (same markup,
  same `bg-brand-orange text-black`, same `aria-label`, same `99+` cap).
- Additionally, when `unreadLeadCount > 0` the **hamburger shows an indicator dot** so the count
  is discoverable without opening the drawer:
  ```tsx
  <span aria-hidden className="absolute right-2 top-2 size-2 rounded-full bg-brand-orange ring-2 ring-background" />
  ```
  Dot only — no number. A number at that size is unreadable and the exact figure is one tap away.
  The hamburger's `aria-label` becomes `เปิดเมนู (มี Lead ใหม่)` when the dot is showing, so the
  indicator is not sighted-only.
- `useUnreadLeadCount()` is called **once**, in the drawer/nav client component, and the count is
  passed down — not called twice in two components.

### 4.5 Topbar restructuring

```
mobile  (<md):  [☰]  ระบบหลังบ้าน  ······················  [ROLE badge] [⎋]
desktop (≥md):       ระบบหลังบ้าน  ······  ชื่อผู้ใช้  [ROLE badge]  [⎋ ออกจากระบบ]
```

- Left cluster becomes `flex items-center gap-2` holding the hamburger (`md:hidden`) + the
  `ระบบหลังบ้าน` title.
- User name gets `hidden sm:inline` — it is the first thing to sacrifice at 375px.
- Logout button label gets `hidden sm:inline` on the text span; the icon and the 44px hit area
  stay at all widths. Add `aria-label="ออกจากระบบ"` to the button since the text can be hidden.
- Topbar padding becomes `px-4 py-3 md:px-6` so the 44px hamburger does not crowd the edge.
- **`admin-topbar.tsx` stays a server component.** The hamburger + drawer live in a separate
  client component (`admin-mobile-nav.tsx`) that the topbar renders. Do not add `"use client"`
  to the topbar — it would pull the logout server action's form into the client boundary.

### 4.6 Shared `nav-items.ts` — mandatory

Desktop sidebar and mobile drawer **must not** each own a copy of the item list. Extract to
`src/app/admin/(dashboard)/nav-items.ts`:

```ts
import type { LucideIcon } from "lucide-react";
import type { Role } from "@/lib/auth";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  roles: Role[];
};
export type NavZone = { key: "sales" | "content" | "system"; label: string; items: NavItem[] };

export const PINNED_ITEM: NavItem;
export const NAV_ZONES: NavZone[];
export const UTILITY_ITEMS: NavItem[];

/** All zones in canonical order, each with its items filtered to `role` (an empty
 *  `items` array means the caller renders that zone's header dimmed per §2.3 — zones
 *  are never dropped). */
export function visibleZones(role: Role): NavZone[];
/** null when the role cannot see the dashboard (e.g. CHANNEL_EXECUTIVE). */
export function visiblePinned(role: Role): NavItem | null;
```

The existing role-matrix comment block at the top of `admin-sidebar.tsx` moves verbatim into
this file — it is the explanation for the `roles` arrays and must travel with them.

---

## 5. Label changes (#129)

Drop the ` (Pages)` suffix. **7 items**, not 6 — see the drift note in §0.

| Before | After |
| --- | --- |
| `บริการ (Pages)` | `บริการ` |
| `แพ็กเกจ (Pages)` | `แพ็กเกจ` |
| `ผลงาน (Pages)` | `ผลงาน` |
| `เครื่องคำนวณ (Pages)` | `เครื่องคำนวณ` |
| `เกี่ยวกับเรา (Pages)` | `เกี่ยวกับเรา` |
| `หน้าแรก (Pages)` | `หน้าแรก` |
| `ติดต่อเรา (Pages)` | `ติดต่อเรา` |

The `เนื้อหาเว็บไซต์` zone header now carries the meaning the suffix was carrying, and carries it
once instead of seven times. `ลูกค้า (Leads)` **keeps** its parenthetical — "Leads" is the term the
sales team actually says out loud, and it is not a redundant category marker.

These are sidebar labels only. Page `<h1>`s, breadcrumbs, and `ROLE_LABELS` are untouched.

---

## 6. Bottom utility footer (#130)

**Stays unlabeled** — no `ทางลัด` / `อื่นๆ` header. Two items do not justify a fourth header, and a
header there would make the block read as a peer of the three zones rather than a subordinate.

Its subordination is carried by typography instead:

```tsx
<div className="shrink-0 border-t border-border p-3">
  <a className={cn(
    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-normal transition-colors",
    active ? "bg-primary/8 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
  )}>
    <Icon className="size-3.5" />
    …
  </a>
</div>
```

| | Zone items | Utility items | Zone headers |
| --- | --- | --- | --- |
| Size | `text-sm` (14px) | `text-xs` (12px) | `text-[11px]` |
| Weight | `font-medium` (500) | `font-normal` (400) | `font-semibold` (600) |
| Tracking | normal | normal | `0.04em` |
| Icon | `size-4` | `size-3.5` | none |
| Row padding | `px-3 py-2.5` | `px-3 py-2` | `px-3 pb-1.5` |
| Left active bar | `border-l-[3px]` | **none** (unchanged from today) | n/a |
| Interactive | yes | yes | no |

Three distinct type roles, no two of which can be confused: headers are the smallest **and**
heaviest **and** non-interactive; utility rows are small and light; zone items are the largest.
`text-muted-foreground` at #526272 keeps 12px utility rows at 6.4:1 — AA-safe.

- Row gap in the block: `space-y-0.5`, unchanged.
- **Mobile exception:** in the drawer, utility rows use `py-2.5` (44px total) to stay tappable,
  while keeping `text-xs` / `size-3.5`. Type stays subordinate; the hit area does not.
- `ดูหน้าเว็บไซต์` keeps `href="/th"` and gains nothing else (no `target="_blank"` — out of scope).

---

## 7. File-by-file changes

| File | Action | What |
| --- | --- | --- |
| `src/app/admin/(dashboard)/nav-items.ts` | **new** | Item/zone data + types + `visibleZones()` / `visiblePinned()`. Carries the role-matrix comment moved out of the sidebar. No JSX, no `"use client"`. |
| `src/app/admin/(dashboard)/admin-sidebar.tsx` | **rewrite body** | Delete the local `ITEMS` array; import from `nav-items`. Render pinned item → `visibleZones(role).map()` with §2.2 group markup → utility footer (§6). Add `overflow-y-auto` to `<nav>`, `shrink-0` to the footer. Extract the row renderer into a shared `NavRow` (see next line). Item row styles otherwise unchanged. |
| `src/app/admin/(dashboard)/nav-row.tsx` | **new (recommended)** | `"use client"` presentational row shared by sidebar and drawer, props `{ item, active, badge, dense }` where `dense=false` → `py-2.5`, `dense=true` → `py-3`. Prevents the two surfaces drifting. If `nextjs-dev` prefers, this may instead live as a non-exported component inside `admin-sidebar.tsx` and be imported by the drawer — but it must exist exactly once. |
| `src/app/admin/(dashboard)/admin-mobile-nav.tsx` | **new** | `"use client"`. Owns drawer open state, `useUnreadLeadCount()`, route-change close, the hamburger + dot, and the drawer contents (§4). Takes `role: Role`. |
| `src/app/admin/(dashboard)/admin-topbar.tsx` | **edit** | Stays a server component. Renders `<AdminMobileNav role={role} />` at the head of the left cluster; applies the responsive hiding in §4.5. |
| `src/components/ui/sheet.tsx` | **new** | Thin left-side sheet over `@base-ui/react/dialog`, mirroring `dialog.tsx`'s structure: `Sheet`, `SheetTrigger`, `SheetContent` (side-left, `w-[272px] max-w-[85vw]`, slide transition), `SheetOverlay` (`bg-black/40`), `SheetTitle` (used as an `sr-only` accessible name — the drawer must have one). Do not install a new dependency; do not fork `dialog.tsx` wholesale. |
| `src/app/admin/(dashboard)/layout.tsx` | **no change** | Composition is unchanged; the drawer ships inside the topbar. |
| `src/hooks/admin/use-unread-lead-count.ts` | **no change** | |
| `src/messages/{th,en}.json` | **no change** | Admin UI is Thai-only and not routed through next-intl. |

**Out of scope — do not touch:** any `roles` array, page `<h1>`s, `ROLE_LABELS`, the active-row
color treatment, sidebar width, `dialog.tsx`.

---

## 8. Acceptance checklist

`nextjs-dev` self-verifies all of these before calling the work done. (#128's 6 points +
#131 Part B's 8 points, merged and de-duplicated.)

**Structure & data**
1. `nav-items.ts` is the only place item data exists — `grep` for `"/admin/leads"` in
   `src/app/admin/` returns the nav-items module and nothing else that defines a nav entry.
2. Every `roles` array is byte-identical to the pre-change file. No role gained or lost a link.
3. All 7 `(Pages)` suffixes are gone; `ลูกค้า (Leads)` still has its parenthetical.
4. Zone order is `งานขายและการตลาด` (4 items, incl. รายงาน) → `เนื้อหาเว็บไซต์` (8 items) →
   `ระบบ` (3 items), with แดชบอร์ด pinned above zone 1 and no header of its own.

**Per-role rendering**
5. Log in as ADMIN: 3 zone headers (all full-opacity), 15 zone items, pinned dashboard, 2
   utility rows.
6. Log in as FINANCE: all 3 zone headers render. `งานขายและการตลาด` is full-opacity with 3 items
   (ลูกค้า, การจองสำรวจ, รายงาน). `เนื้อหาเว็บไซต์` and `ระบบ` are both present but dimmed
   (`text-muted-foreground/50`) with zero items underneath each — **never absent, never a full
   0.5-opacity header sitting with no gap above the next real header.**
7. Log in as CHANNEL_EXECUTIVE: no pinned dashboard row (already excluded today).
   `งานขายและการตลาด` renders full-opacity with 2 items (ลูกค้า, ช่องทางโปรโมท). `เนื้อหาเว็บไซต์`
   and `ระบบ` both render dimmed and empty — same rule as FINANCE, not folded away.

**Desktop**
8. Sidebar is 240px, always expanded, with no collapse control anywhere.
9. With every zone visible, the nav body scrolls (`overflow-y-auto`) while the logo header and
   utility footer stay fixed; the footer is never compressed.
10. Active-route highlight still lands on the right row for `/admin` (exact) vs. `/admin/pages/home`
    (prefix), including nested routes like `/admin/leads/{id}`.

**Mobile (test at 375×667 and 320×568)**
11. Hamburger is ≥44×44px, visible only below 768px, and never co-exists with the desktop sidebar.
12. Drawer opens/closes via trigger, close button, overlay tap, `Escape`, and automatically on
    route change; focus returns to the hamburger on close.
13. Drawer rows are ≥44px tall; nothing in the topbar overflows or wraps at 320px.
14. With an unread lead, the badge shows in the drawer **and** the hamburger dot is visible; the
    hamburger's `aria-label` mentions the new lead.

**Quality gates**
15. Zone header text is `#526272` at full opacity (AA 6.4:1) — no reduced-opacity muted text
    anywhere in the nav.
16. No Thai label wraps to a second line at 240px desktop or 272px drawer width.
17. `npm run build` clean; `npx tsx scripts/e2e-admin.mts` and `scripts/e2e-admin-crud.mts` pass
    (they navigate via sidebar links — a broken `href` fails them).
18. `prefers-reduced-motion: reduce` disables the drawer slide.

---

## 9. Commit guidance

One `refactor(admin):` commit for the extraction + zoning, or split as:

```
refactor(admin): extract sidebar nav items into shared nav-items module
feat(admin): group sidebar navigation into three labelled zones
feat(admin): add mobile drawer navigation for the admin dashboard
```

One type per commit, per `AGENTS.md`.
