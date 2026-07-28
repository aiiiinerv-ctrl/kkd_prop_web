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
