# Archived: Fly.io deploy config (superseded)

**Status:** dead, kept for historical reference only. Do not resurrect as a runnable
deploy config without a full rewrite.

Removed 2026-08-16 in [#40](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/40).
The Fly.io deploy plan this config was written for was abandoned; production is now
DirectAdmin/CloudLinux shared hosting via `scripts/build-shared-hosting-deploy.mts` +
`deploy/docker-build/Dockerfile.shared-hosting` (see
`docs/plans/kkd-shared-hosting-redeploy-runbook.md` for the live deploy process).

**Why this had to be deleted, not just left alone:** `fly.toml` still set
`DATABASE_URL = "file:/data/prod.db"` (SQLite) after the project's MySQL migration
(`@prisma/adapter-mariadb`). The Docker image would build fine (schema-agnostic at
build time) but the container would boot-loop on every start — `prisma migrate
deploy` running a MySQL-only Prisma client against a SQLite path with no MySQL to
connect to. Nobody was watching Fly logs, so the failure would be silent.

Archived below verbatim for anyone who needs to see what the old Fly-based deploy
looked like.

## `Dockerfile` (was at repo root)

```dockerfile
# Production deploy for KKD PROPERTY.
# The SQLite database and uploaded files live on a persistent Fly volume mounted at
# /data (DATABASE_URL=file:/data/prod.db, STORAGE_ROOT=/data/storage — see fly.toml).
# storage/private (payment slips) is excluded from the build context entirely via
# .dockerignore — only storage/public (portfolio images, safe to expose) is included,
# baked into the image at /app/storage-seed/public and copied onto the volume by
# docker-entrypoint.sh on first boot only, so the image never overwrites real data.

FROM node:20-bookworm-slim AS base

FROM base AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ openssl && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ openssl && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Dummy value so prisma.config.ts (which requires DATABASE_URL to resolve at config-load
# time) doesn't fail during `prisma generate` — client generation only reads the schema,
# it never connects. The real DATABASE_URL is supplied at runtime via fly.toml [env].
ENV DATABASE_URL="file:./build.db"
RUN npx prisma generate
# Public pages read Prisma directly during static generation, so the dummy build
# database needs its schema (empty tables are fine — content pages just render empty).
RUN npx prisma migrate deploy
RUN npm run build

FROM base AS runner
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY storage/public ./storage-seed/public
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000
CMD ["./docker-entrypoint.sh"]
```

## `docker-entrypoint.sh` (was at repo root, only invoked by the `Dockerfile` above)

```sh
#!/bin/sh
# Runs on every container boot. Ensures the persistent Fly volume mounted at
# /data is populated with the seed storage assets on first boot, then applies
# any pending migrations and runs the (idempotent) seed before starting the
# server. Safe to run on every restart — none of these steps should touch or
# discard existing data on the volume.
set -e

STORAGE_ROOT="${STORAGE_ROOT:-/data/storage}"

if [ ! -d "$STORAGE_ROOT/public" ] || [ -z "$(ls -A "$STORAGE_ROOT/public" 2>/dev/null)" ]; then
  echo "First boot: seeding $STORAGE_ROOT/public from image-baked assets"
  mkdir -p "$STORAGE_ROOT"
  cp -r /app/storage-seed/public "$STORAGE_ROOT/public"
fi

npx prisma migrate deploy
npx prisma db seed
exec npm run start
```

## `fly.toml` (was at repo root)

```toml
app = "kkd-property"
primary_region = "sin"

[build]

[env]
  DATABASE_URL = "file:/data/prod.db"
  STORAGE_ROOT = "/data/storage"

[[mounts]]
  source = "kkd_property_data"
  destination = "/data"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = "stop"
  auto_start_machines = true
  min_machines_running = 0
  processes = ["app"]

[[vm]]
  size = "shared-cpu-1x"
  memory = "512mb"
```
