<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# KKD PROPERTY — Solar Installation Website

Bilingual (TH default / EN) company site + admin backend. Stack: Next.js 16 App Router, TypeScript, Tailwind v4, Prisma 7 + SQLite (better-sqlite3 adapter), next-intl v4, Auth.js v5 beta, shadcn/ui base-nova, Zustand, TanStack Query.

## Working rules

- **Ask before assuming.** If a requirement is ambiguous (which page, which locale, paid vs free flow), ask — don't pick silently.
- **Surgical changes.** Touch only files relevant to the task. Don't refactor adjacent code or add speculative features/config.
- **TH/EN always move together.** Every user-facing string exists twice:
  - Static UI → `src/messages/th.json` **and** `en.json` (same key path)
  - DB content → paired columns `xxxTh`/`xxxEn` (read via `pickLocale()` in `src/lib/i18n-content.ts`)
  A change that edits one language and not the other is incomplete.
- **Admin mutations must be audited.** Every create/update/delete in `src/actions/` goes through `withAudit()` (`src/lib/audit.ts`) and starts with `requireAdmin()`/`requireRole()`. Never trust the proxy alone.
- **Never put secrets in audit snapshots** — see `auditView()` in `src/actions/users.ts`.
- **Uploads never go in `public/`.** Files live under `STORAGE_ROOT` via `src/lib/storage`; payment slips use `private/` keys (admin-only via `/files` route).
- Verify per `.claude/skills/verify/SKILL.md` before declaring a change done.

## Version constraints (verified — do not "fix")

- `src/proxy.ts` is Next 16's rename of middleware.ts — don't rename it back.
- `next-auth` must stay ≥ 5.0.0-beta.31 (earlier betas lack Next 16 peer dep).
- Prisma 7 config lives in `prisma.config.ts` (not in schema); client generates to `src/generated/prisma`. After schema changes: `npx prisma migrate dev` regenerates it.
- `TabsContent` has `keepMounted` on purpose — TH/EN tabbed admin forms submit hidden-tab fields. Removing it silently breaks content editing.
- Tabbed dialog forms use `noValidate` deliberately; zod on the server is the source of truth.

## Commands

```bash
npm run dev                      # dev server
npm run build && npm run start   # production (catches proxy/static issues dev hides)
npx prisma migrate dev           # after schema changes
npx prisma db seed               # idempotent; admin creds from .env
npx tsx scripts/e2e-booking.mts  # E2E: public lead forms (server must be running)
npx tsx scripts/e2e-admin.mts    # E2E: auth guard, login, slip access
npx tsx scripts/e2e-admin-crud.mts  # E2E: leads pipeline, content CRUD, audit
```

E2E scripts drive system Chrome (`channel: "chrome"`) — no Playwright browser download needed. They are idempotent against the persistent `prisma/dev.db`.
