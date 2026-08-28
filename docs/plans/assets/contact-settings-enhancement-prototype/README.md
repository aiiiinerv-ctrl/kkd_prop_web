# Prototype: Contact settings — baseline vs target (web-view)

Date: 2026-08-28  
Wayfinder: [#94](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/94) · Map [#88](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/88)

## Capture URLs (local `npm run start`)

| Surface | URL |
| --- | --- |
| Admin contact tab | `http://localhost:3000/admin/settings` → `#st-tab-contact` |
| Public contact TH | `http://localhost:3000/th/contact` |
| Public contact EN | `http://localhost:3000/en/contact` |
| Footer check | `http://localhost:3000/th` → `#site-footer` |

## Baseline (pre-E1)

- Contact grid: **Address, Phone, LINE, Facebook, Hours** — max 5 cards
- **No email card**; IG/TikTok/YouTube ไม่ปรากฏแม้ seed มี URL
- Footer: social icon row ครบ 5 เมื่อ DB มี URL

## Target (post-E1, decision G1–G2)

- Grid cards: Address, Phone, **Email**, **each social with URL**, Hours
- Social order: LINE → Facebook → Instagram → TikTok → YouTube
- Empty DB field (row exists): **omit card** (G5)
- Card pattern unchanged: icon orange, label bold, value/link muted

## Manual verify script

1. Login admin → Settings → ติดต่อ & Social
2. Confirm all 5 social URLs filled (seed defaults)
3. Open `/th/contact` — expect **≥7 cards** (addr, phone, email, 5 social, hours) when seed full
4. Clear Instagram URL → save → IG card **gone** on contact; footer IG icon **gone**
5. Repeat `/en/contact` — EN labels, TH fallback on blank EN address if applicable
