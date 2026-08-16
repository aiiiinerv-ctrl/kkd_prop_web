# Guardrails for external AI CLI handoffs (codex / cursor-agent / antigravity)

kkd_prop runs **Next.js 16**, not the Next.js most models were trained on. codex,
cursor-agent, and antigravity have no memory of this repo's `AGENTS.md` and will
default to Next 15-era patterns unless told otherwise. When orchestrator hands a
**write-mode** task in this repo to one of these tools, paste this file's content
(or a link to it, if the tool can read local files) into the brief.

## Non-negotiable version constraints

- **`src/proxy.ts` is Next 16's rename of `middleware.ts`.** Do not rename it
  back to `middleware.ts` — that is the old convention, not a mistake to fix.
- **`next-auth` must stay ≥ 5.0.0-beta.31.** Earlier betas lack the Next 16
  peer dependency. Do not downgrade it to "stabilize" the version.
- **Prisma 7 config lives in `prisma.config.ts`**, not in `schema.prisma`.
  Don't move datasource/config blocks back into the schema file. The client
  generates to `src/generated/prisma` — after any schema change, run
  `npx prisma migrate dev` to regenerate it; don't hand-edit generated output.
- **`TabsContent` uses `keepMounted` on purpose.** TH/EN tabbed admin forms
  submit hidden-tab fields. Removing it silently breaks content editing —
  it will look fine locally and lose data in the other locale on submit.
- **Tabbed dialog forms use `noValidate` deliberately.** Zod validation on
  the server is the source of truth; don't add HTML5 `required`/pattern
  validation back onto these fields.

## Repo-wide rules that still apply to external-tool output

- **TH/EN always move together.** Any user-facing string added or changed
  needs both `src/messages/th.json` and `en.json` (same key path), or both
  `xxxTh`/`xxxEn` DB columns. A diff touching only one language is incomplete.
- **Admin mutations must be audited.** Every create/update/delete in
  `src/actions/` must call `requireAdmin()`/`requireRole()` and wrap the
  mutation in `withAudit()` (`src/lib/audit.ts`). Never trust `src/proxy.ts`
  alone for authorization.
- **Never put secrets in audit snapshots** — see `auditView()` in
  `src/actions/users.ts` for the redaction pattern to follow.
- **Uploads never go in `public/`.** Files live under `STORAGE_ROOT` via
  `src/lib/storage`; payment slips use `private/` keys, served only through
  `src/app/files/[...key]/route.ts` with an admin-session check.
- **Surgical changes only.** Don't refactor adjacent code, rename unrelated
  symbols, or add abstractions/config beyond what the task asked for.

## Before trusting external-tool output

Per `orchestrator.md`'s handoff rules: read every file the external tool
claims to have changed or created before folding it into a report. Run
`npx tsc --noEmit` and, for anything touching `src/`, `prisma/`, or
`messages/`, follow `.claude/skills/verify/SKILL.md` before calling the work
done.
