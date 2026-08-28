# Contact settings enhancement — live verification matrix

Date: 2026-08-28  
Map: [#88](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/88)  
Decisions: [`contact-settings-enhancement-grilling-decisions.md`](contact-settings-enhancement-grilling-decisions.md)

## Purpose

Acceptance contract for E1 (contact page parity). Not a substitute for `.claude/skills/verify/SKILL.md`.

Legend: **P** = must pass · **B** = blocker · **M** = manual web-view · **A** = automated

## E1 — Contact page parity

| ID | Check | Sev | How | Pass |
| --- | --- | --- | --- | --- |
| E1-1 | `/admin/settings` contact tab saves | P | M/A | Toast success; AuditLog SiteSettings |
| E1-2 | `/th/contact` shows email card when DB email set | P | M | Card visible |
| E1-3 | `/th/contact` shows IG/TikTok/YouTube when URLs set | P | M | Cards match footer icons count |
| E1-4 | Clear social URL → card omitted on contact | P | M | G5 null-hide |
| E1-5 | `/en/contact` EN labels | P | M | i18n keys |
| E1-6 | External social links `rel="noopener noreferrer"` | P | M | view-source / devtools |
| E1-7 | `npm run build` | B | A | No TS errors |
| E1-8 | e2e-admin-crud contact section | P | A | phone + contact page assert |
| E1-9 | Home ContactSection link to Settings | P | M | Link visible ADMIN/MARKETING |

## Evidence folder (optional)

`docs/plans/assets/contact-settings-enhancement-result/e1/`
