# PLAN — ISSUE_077_about_cms_enhancement_map

> Dual SoT with GitHub `#77` (wayfinder map).

## Meta

| Field | Value |
|---|---|
| GitHub | https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/77 |
| Opened | 2026-08-28 |
| Status | **charting** — research + grilling done; frontier #84 (prototype) |
| Labels | `wayfinder:map`, `enhancement` |

## Goal

Chart the route to admin-editable About credentials heading + icons + text completeness — **no production code in this map**.

## Requirement (owner)

> ในระบบหลังบ้าน หน้าเกี่ยวกับเรา ให้สามารถเปลี่ยนข้อความต่างๆและไอคอนได้เอง เพิ่มให้กรอกข้อความก่อน Card จดทะเบียนในไทย

## Known gap (confirmed #78)

| Area | Today | Gap |
| --- | --- | --- |
| Credential card text | Editable | **Met** |
| Credential **section** heading before cards | Not rendered | **New fields** needed |
| Icons (6 cards) | Hardcoded Lucide | **By design** — conflicts ownership doc; needs #82 |
| Stats/testimonials labels | Schema only | Admin UI + public wiring incomplete |

## Ticket frontier

See map body on #77. Research #78–#81 → grilling #82–#83 → prototype #84 → sign-off #85 → docs #86.

## Proposed execution sprints (draft — lock at #85)

| Sprint | Outcome | Blocked until |
| --- | --- | --- |
| A0 | Research docs (#78–#81) | — |
| A1 | Owner locks icon model + scope (#82–#83) | A0 |
| A2 | Live web-view prototype (#84) | A1 |
| A3 | Committed plan + verify matrix (#86) | A2, #85 |
| **Exec 1** | Additive schema + backfill defaults | Map closed + owner OK |
| **Exec 2** | Admin UI (heading + icon picker + gaps) | Exec 1 |
| **Exec 3** | Public reader + revalidate | Exec 2 |
| **Exec 4** | e2e + evidence + optional redeploy | Exec 3 |

Exec sprints open **after** map closes — not part of #77.

## Out of scope

- Sprint 12 cleanup (#76) unless impact research says otherwise
- Full About redesign
