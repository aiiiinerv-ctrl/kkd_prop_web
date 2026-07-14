<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# KKD PROPERTY — Solar Installation Website

Bilingual (TH default / EN) company site + admin backend. Stack: Next.js 16 App Router, TypeScript, Tailwind v4, Prisma 7 + SQLite (better-sqlite3 adapter), next-intl v4, Auth.js v5 beta, shadcn/ui base-nova, Zustand, TanStack Query.

## Architecture

**Two root layouts, no shared `app/layout.tsx`.** `src/app/[locale]/layout.tsx` owns `<html lang={locale}>` for the public site (header/footer, NextIntlClientProvider); `src/app/admin/layout.tsx` is a second root layout (Thai-only UI, noindex, QueryProvider + sonner). Fonts (Noto Sans + Noto Sans Thai) are declared in both.

**Request routing** (`src/proxy.ts`): `/admin/*` gets an optimistic cookie redirect to login (real authorization is always re-checked server-side via `requireAdmin()`); everything else goes through next-intl locale middleware (`/` → `/th`). `api`, `files`, and dotted paths are excluded from the matcher.

**Data flow — three patterns, pick by direction:**
- Public pages read Prisma directly in RSC (`revalidate = 300` on content pages).
- Admin *reads* for filterable lists go through GET `/api/admin/*` consumed by TanStack Query hooks (`src/hooks/admin/`).
- All *mutations* (public form submits + admin CRUD) are server actions in `src/actions/` returning `{ok}|{error}` unions; admin ones call `revalidatePath` so public pages update immediately.

**Lead capture flow:** booking page (two-tab client form, react-hook-form) → `submit-quote.ts` / `submit-survey-booking.ts` (zod re-validation from `src/lib/validations/`, in-memory IP rate limit) → Prisma create → `notifyNewLead()` fan-out (`src/lib/notifications/` — Resend + LINE providers, each enabled only when its env vars are set, `Promise.allSettled`, never throws so a notification outage can't lose a lead).

**Audit trail:** `withAudit()` in `src/lib/audit.ts` is the single choke point — it runs the mutation then stores full before/after JSON snapshots on `AuditLog`; the admin audit page computes field diffs from the snapshots client-side. Logins are also recorded (in `authorize()`).

**Storage:** `src/lib/storage/` driver interface (local disk under `STORAGE_ROOT`, key-sanitized). Keys are namespaced `public/…` (served with immutable cache) vs `private/slips/…` (requires admin session) — both via `src/app/files/[...key]/route.ts`, never from Next's `public/` dir.

**i18n:** locale config in `src/i18n/`; static strings in `src/messages/{th,en}.json` (namespaced per page); DB content uses paired `xxxTh`/`xxxEn` columns read with `pickLocale()`. SEO metadata per page via `pageMetadata()` in `src/lib/seo.ts` (hreflang th/en/x-default).

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
- **Section padding convention:** content sections use `py-16`; banner/CTA-style sections (`cta-banner`, footer) use `py-14` — don't introduce new padding values without reason.
- Verify per `.claude/skills/verify/SKILL.md` before declaring a change done.
- **Development plans live in `docs/plans/*.md`** — sprint-structured, committed before implementation starts.

## Agent model tiers

Project agents live in `.claude/agents/`; each file's frontmatter pins its model. Pick tier by judgment required, not by effort:

- **haiku** — mechanical, checklist-style checks with a binary answer (e.g. `i18n-parity-checker`: TH/EN message-key parity). No taste, no architecture.
- **sonnet** — default tier: implementation (`nextjs-dev`) and rule-based adversarial review (`audit-compliance-reviewer`, `deploy-verify`), where the invariants are written down and the job is verifying them.
- **opus** — high-judgment work: design authority (`ux-ui-expert`) and design/business review of real renders (`design-business-reviewer`). This site's history is design rejected at the real-render stage, so both the design side and its reviewer run on opus.
- **fable** — orchestration and highly ambiguous multi-agent work only; not assigned to any project agent.

Escalation is by role, not by retry: sonnet implements → independent reviewers check → opus judges taste/business fit. Don't silently change an agent's tier — propose it to the user first.

## Commit convention

[Conventional Commits v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/): `<type>(scope): <description>`, body explains *why*, footers after a blank line.

- **Types:** `feat` (new user-facing capability → SemVer MINOR), `fix` (bug patch → PATCH), plus `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`. Breaking changes: `!` after type/scope or an uppercase `BREAKING CHANGE:` footer → MAJOR.
- **Scopes (use these, keep them stable):** `site` (public pages/components), `admin` (dashboard), a feature name when the change is one vertical slice (`testimonials`, `portfolio`, `calculator`, `booking`, `themes`), `deploy` (Dockerfile/fly/firebase), `agents` (.claude/), `e2e` (scripts), `preview` (static-preview). Add a new scope only for a genuinely new area.
- **One type per commit.** If a change needs both `feat` and `fix`, split it into two commits.
- Description in imperative mood, lowercase after the colon, no trailing period.

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
