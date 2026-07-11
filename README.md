# KKD PROPERTY — Solar Installation Website

Bilingual (TH/EN) company website + admin backend for KKD PROPERTY CO., LTD.

## Stack

- **Next.js 16** (App Router) + **TypeScript** + **Tailwind CSS v4**
- **Prisma 7** + SQLite (better-sqlite3 adapter; schema is Postgres-portable)
- **next-intl v4** — TH (default) / EN locale routing via `src/proxy.ts`
- **Auth.js v5** (next-auth beta) — credentials login, ADMIN/EDITOR roles
- **Zustand** — client UI state · **TanStack Query** — admin data tables
- **shadcn/ui** (base-nova) — admin components, code-owned in `src/components/ui`
- **Resend + LINE Messaging API** — new-lead notifications (env-toggled)

## Getting started

```bash
npm install
cp .env.example .env        # fill in AUTH_SECRET, ADMIN_* at minimum
npx prisma migrate deploy   # create the SQLite DB
npx prisma db seed          # admin user + TH/EN content + sample data
npm run dev                 # http://localhost:3000
```

- Public site: `/th` (default) and `/en` — 8 pages × 2 locales
- Admin: `/admin` — login with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`

## Project layout

| Path | What lives there |
| --- | --- |
| `src/app/[locale]/` | Public pages (home, about, services, packages, portfolio, booking, contact, calculator) |
| `src/app/admin/` | Admin backend (dashboard, leads, content CRUD, channels, users, audit log) |
| `src/app/files/[...key]/` | Serves uploads — `public/*` cached, `private/*` (payment slips) requires admin session |
| `src/actions/` | Server actions (public form submits + admin mutations, all audited via `withAudit`) |
| `src/lib/notifications/` | Email (Resend) + LINE push providers — enabled per env vars, never blocks a lead |
| `src/lib/storage/` | Storage abstraction — local disk now (`STORAGE_ROOT`), S3-swappable later |
| `src/messages/` | UI strings `th.json` / `en.json`; DB content uses per-locale columns (`titleTh`/`titleEn`) |
| `prisma/` | Schema, migrations, idempotent seed |
| `scripts/` | Playwright E2E scripts (`npx tsx scripts/e2e-*.mts`, uses system Chrome) |

## Notifications

Both channels are optional and independent — leave the env vars blank to disable:

- **Email**: `RESEND_API_KEY`, `NOTIFY_EMAIL_FROM`, `NOTIFY_EMAIL_TO`
- **LINE**: `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_NOTIFY_TO` (LINE Messaging API via your LINE OA — LINE Notify was discontinued in 2025)

## Deployment notes

- SQLite + local file storage → needs a persistent-disk host (VPS/Docker). For Vercel, switch `DATABASE_URL` to Postgres (swap the Prisma adapter) and implement the S3 storage driver.
- `npm run build && npm run start` for production; uploaded files live outside `.next` and survive rebuilds.

## Coming from Flutter?

| Flutter | This project |
| --- | --- |
| `Provider` / `ChangeNotifier` | Zustand store (`src/store/`) |
| Repository + cache layer | TanStack Query (`src/hooks/admin/`) |
| Custom widget package | shadcn/ui components you own in `src/components/ui` |
| `pubspec.yaml` | `package.json` |
| Hot reload | Fast Refresh (`npm run dev`) |
