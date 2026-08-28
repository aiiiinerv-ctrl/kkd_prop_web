# Contact settings enhancement — implementation sprints (DRAFT)

Date: 2026-08-28  
Wayfinder map: [Map: Contact settings — admin แก้ติดต่อ/โซเชี่ยล](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/88)  
Status: **Deployed production 2026-08-28** — no DDL; smoke ✓ (`/th/contact` Instagram, `/en/contact` Email)

> ตาม owner rules: อย่าแก้โค้ดจน research + grilling + live-verify matrix ล็อกแล้ว

## Destination (proposed)

แอดมินแก้ contact + social **ครบ** ที่ `/admin/settings` → **ติดต่อ & Social** — ระบบอ่านจาก `SiteSettings` แหล่งเดียว แสดงสอดคล้องที่ **footer** และ **หน้า contact** (+ consumer ที่ map ใน impact research)

## Executive summary

| Layer | Verdict |
| --- | --- |
| Admin `/admin/settings` → ติดต่อ & Social | **Met** |
| Footer public render | **Mostly met** |
| Contact page public render | **Not met** — primary gap |
| Security / DDL | **Adequate / none needed** |

Research pack complete (#89–#92). **Frontier: [#93 Grilling](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/93)**.

## Research pack (inputs)

| Asset | Ticket |
| --- | --- |
| [`contact-settings-enhancement-inventory-research.md`](contact-settings-enhancement-inventory-research.md) | #89 ✓ |
| [`contact-settings-enhancement-edge-cases-research.md`](contact-settings-enhancement-edge-cases-research.md) | #90 ✓ |
| [`contact-settings-enhancement-impact-research.md`](contact-settings-enhancement-impact-research.md) | #91 ✓ |
| [`contact-settings-enhancement-security-research.md`](contact-settings-enhancement-security-research.md) | #92 ✓ |

Mother context: [`site-content-cms-tasks.md`](site-content-cms-tasks.md), [`site-content-cms-ui-spec.md`](site-content-cms-ui-spec.md) § Tab 3

## Proposed sprint breakdown (revise after #93)

### Phase 0 — Map (current)

Investigate only — tickets #89–#96. **No code changes.**

Owner authorized execution 2026-08-28 via *ดำเนินการตามที่คุณแนะนำได้เลย*.

## E1 — Contact page parity ✓ (2026-08-28)

### Before-fix summary

| Layer | Gap |
| --- | --- |
| `contact/page.tsx` | LINE+FB cards only; no email; no IG/TikTok/YouTube |
| Icons | Duplicated SVG in footer vs contact |
| Messages | Missing `contact.email`, `instagram*`, `tiktok*`, `youtube*` keys |
| e2e | Footer phone only; no `/th/contact` assert |

### After-fix summary

| Layer | Change |
| --- | --- |
| `contact/page.tsx` | Cards from `socialLinks` (5) + email; null-hide when row exists (G5) |
| `social-brand-icons.tsx` | Shared icon map; footer imports |
| `messages/{th,en}.json` | +8 contact keys (TH/EN parity) |
| `home-client.tsx` | Link to `/admin/settings` for full edit |
| `e2e-admin-crud.mts` | Assert phone on `/th/contact` |

**Verify:** `npm run build` ✓ · `curl /th/contact` shows Instagram, TikTok, YouTube, email, LINE OA ✓

## E2 — Fallback + JSON-LD ✓ (2026-08-28)

### Before-fix summary

| Layer | Gap |
| --- | --- |
| `site-footer.tsx` | Hardcoded `tel:0824731567` / `mailto:` when all DB fields null |
| `home-content.tsx` / `booking/page.tsx` | Local FALLBACK constants always override cleared DB values |
| `local-business-jsonld.tsx` | Hardcoded address/hours; LINE fallback in `sameAs` when social cleared |
| Policy | G5 applied on contact page only |

### After-fix summary

| Layer | Change |
| --- | --- |
| `src/lib/site-contact.ts` | `pickSiteContactValue` + `resolveQuickContact` — G5 single choke point |
| Footer | Message fallback **only when no DB row**; no hardcoded tel/mailto |
| Home / booking | Use resolver; hide quick-contact / LINE / tel links when null |
| JSON-LD | Address + `openingHours` from DB when set; no phantom `sameAs` when cleared |

**Verify:** `npm run build` ✓ · e2e-admin-crud contact block ✓

**Before-fix:** footer/jsonld/home/booking ยังมี hardcoded tel/email/LINE เมื่อ settings ว่าง

**Work:**

- Centralize fallback policy (messages vs empty) ตาม grilling decision
- JSON-LD: wire address/hours ถ้า owner ล็อกใน #93
- Extend e2e: แก้ contact tab → assert `/th/contact` + footer

### E3 — Live-verify + review (exec)

- Matrix จาก #95 — web-view desktop/tablet/mobile TH+EN
- `audit-compliance-reviewer` on mutations (already audited — confirm no regression)
- `design-business-reviewer` empty states + social row UX
- Verify skill full loop

## Non-negotiables (draft)

- **No DDL** unless inventory พบ gap schema (unlikely)
- TH+EN pairs unchanged; public EN→TH via `pickLocale`
- `requireRole` + `withAudit` on mutations — no new bypass
- `revalidatePath` list ใน `site-settings.ts` — extend ถ้าเพิ่ม consumer
- Before/after summary ทุก exec sprint
- Live-verify ก่อน merge แต่ละ sprint

## Open decisions (→ #93 grilling)

1. Contact page: การ์ดแยก per social vs แถวไอคอนเดียวกับ footer?
2. Social display text: ใช้ messages (`lineValue`) หรือ derive/handle จาก URL?
3. Home ContactSection: ลบ / read-only link / เก็บ shortcut?
4. JSON-LD address + openingHours: จาก DB columns ใหม่ vs คง hardcode?
5. Fallback policy: แสดง seed/messages เมื่อ admin ลบค่า vs ซ่อน element?

## Out of scope

- Admin UI redesign ทั้ง tab (ยกเว้น field clarity จาก prototype)
- New social platforms
- Footer nav / service links CMS
