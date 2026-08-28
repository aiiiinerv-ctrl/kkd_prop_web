# About CMS enhancement — prototype evidence (#84)

Date: 2026-08-28  
Ticket: [#84](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/84)  
Decisions: [`about-cms-enhancement-grilling-decisions.md`](../../about-cms-enhancement-grilling-decisions.md)

## Artifact

| File | Purpose |
| --- | --- |
| `preview.html` | Interactive admin + public split-view mock (no backend) |

## How to view (live web-view)

```bash
cd docs/plans/assets/about-cms-enhancement-prototype
python3 -m http.server 8765
# open http://localhost:8765/preview.html
```

Or open `preview.html` directly in Chrome (file:// works; Lucide CDN needs network).

## What it demonstrates

- **New:** credentials section title + subtitle before 3 cards
- **New:** Lucide allowlist icon picker per card (6 slots)
- **Standard scope:** stats label fields + testimonials heading (form only; preview focuses on credentials band)
- TH/EN admin tabs + public preview locale toggle
- Empty credentials heading → cards only (edge S2)

## Not in prototype

- Save/audit/version (execution phase)
- Full About page (hero, team band, stats render)
- Production routes or Prisma

## Owner sign-off

Moved to sprint plan [`about-cms-enhancement-implementation-sprints.md`](../../about-cms-enhancement-implementation-sprints.md) § Sign-off (#85).

Prototype verified: HTTP 200 via `python3 -m http.server 8765` (2026-08-28).
