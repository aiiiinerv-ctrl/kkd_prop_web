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
