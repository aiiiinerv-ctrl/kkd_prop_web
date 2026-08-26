# PLAN — ISSUE_032_lead_notifications_resend_line

## Meta

| Field | Value |
|---|---|
| GitHub | https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/32 |
| Opened | 2026-08-13 |
| Status (disk) | active |
| Triage labels | `enhancement`, `ready-for-human` |
| Type | enhancement (ops secrets) |

## Goal

- Enable at least one live notification channel (Resend and/or LINE) for new leads in production without losing leads when notify fails.

## Scope

- **In-scope**: production env secrets + verify fan-out; docs for operator
- **Out-of-scope**: redesign of `notifyNewLead` architecture (already fail-soft)

## Checkpoint: Known / Unknown / Assumption

- **Known**: Code already fans out via providers when env vars set; #36 is related ops readiness.
- **Unknown**: Customer-supplied Resend API key / LINE tokens.
- **Safe assumptions**: App code path needs secrets, not a rewrite.

## Task table

| # | Work | Owner | Depends on | Parallel? | Status |
|---:|---|---|---|---|---|
| 1 | Provide Resend and/or LINE credentials | User / customer | — | — | **blocked** |
| 2 | Set panel env; restart; submit test lead | `hosting-deploy-specialist` + User | 1 | — | pending |
| 3 | Confirm delivery; delete test lead | User | 2 | — | pending |
| 4 | Close #32 (and consider #36); done + INDEX | User / agent | 3 | — | pending |

## Definition of Done

- [ ] Real notify path observed for a `[TEST]` lead
- [ ] No secrets committed
- [ ] #32 closed; folder done; INDEX updated

## Evidence

### 1) Research
- `src/lib/notifications/`; AGENTS.md lead capture flow

### 2–4)
- (fill when executed)
